package users

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"time"

	"github.com/jackc/pgx/v5/pgconn"

	"kantinkampus/api/internal/audit"
	"kantinkampus/api/internal/platform/config"
	"kantinkampus/api/internal/platform/crypto"
	"kantinkampus/api/internal/platform/db"
	"kantinkampus/api/internal/platform/imaging"
	"kantinkampus/api/internal/platform/storage"
	"kantinkampus/api/internal/platform/validate"
)

var (
	ErrNotFound      = errors.New("Pengguna tidak ditemukan")
	ErrUsernameTaken = errors.New("Username sudah dipakai")
)

type Service struct {
	Cfg     *config.Config
	DB      *sql.DB
	Storage storage.Storage
	Audit   *audit.Repo
}

func NewService(cfg *config.Config, db *sql.DB, st storage.Storage, a *audit.Repo) *Service {
	return &Service{Cfg: cfg, DB: db, Storage: st, Audit: a}
}

type Profile struct {
	ID              string            `json:"id"`
	Username        string            `json:"username"`
	Email           string            `json:"email"`
	Role            string            `json:"role"`
	Status          string            `json:"status"`
	ProfileImageURL *string           `json:"profile_image_url"`
	Preferences     map[string]string `json:"preferences"`
	CreatedAt       time.Time         `json:"created_at"`
}

func (s *Service) Me(ctx context.Context, userID string) (*Profile, error) {
	var p Profile
	var imageKey sql.NullString
	var prefs []byte
	err := s.DB.QueryRowContext(ctx, `
		SELECT id, username, email_normalized, role, status, profile_image_key, preferences, created_at
		FROM users WHERE id = $1 AND status = 'active'`, userID).
		Scan(&p.ID, &p.Username, &p.Email, &p.Role, &p.Status, &imageKey, &prefs, &p.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	p.Preferences = decodePrefs(prefs)
	p.ProfileImageURL = storage.BestEffortSignedURL(ctx, s.Storage, imageKey, s.Cfg.SignedURLTTL)
	return &p, nil
}

type UpdateInput struct {
	Username    *string
	Preferences map[string]string
}

// InvalidError validasi domain dengan pesan per-field.
type InvalidError struct {
	Fields map[string]string
}

func (e *InvalidError) Error() string { return "Data tidak valid" }

// Update mengubah field profil yang diizinkan; email dan role tidak dapat
// diubah pada versi awal (PRD: reset email di luar cakupan).
func (s *Service) Update(ctx context.Context, userID string, in UpdateInput, requestID string) (*Profile, error) {
	fields := map[string]string{}
	if in.Username != nil {
		u, err := validate.NormalizeUsername(*in.Username)
		if err != nil {
			fields["username"] = err.Error()
		} else {
			in.Username = &u
		}
	}
	// Preferensi hanya ditulis bila klien mengirimnya;PATCH /me untuk
	// username tidak boleh menghapus preferensi tema yang tersimpan.
	var prefsJSON []byte
	if in.Preferences != nil {
		prefs, err := normalizePreferences(in.Preferences)
		if err != nil {
			fields["preferences"] = err.Error()
		} else {
			prefsJSON, _ = json.Marshal(prefs)
		}
	}
	if len(fields) > 0 {
		return nil, &InvalidError{Fields: fields}
	}

	_, err := s.DB.ExecContext(ctx, `
		UPDATE users
		SET username = COALESCE($2, username),
		    preferences = COALESCE($3, preferences),
		    updated_at = now()
		WHERE id = $1 AND status = 'active'`,
		userID, in.Username, prefsJSON)
	if err != nil {
		if isUniqueViolation(err) {
			return nil, ErrUsernameTaken
		}
		return nil, err
	}
	_ = s.Audit.Insert(ctx, s.DB, audit.Entry{
		ActorUserID: userID, Action: "profile_update", ResourceType: "user",
		ResourceID: userID, Outcome: "success", RequestID: requestID,
	})
	return s.Me(ctx, userID)
}

// UploadPhoto mengganti foto profil: validasi konten (PROF-02), key objek acak,
// objek lama dihapus best-effort setelah database diperbarui.
func (s *Service) UploadPhoto(ctx context.Context, userID string, data []byte, requestID string) (*Profile, error) {
	ext, err := imaging.ValidateImage(data, s.Cfg.MaxUploadBytes)
	if err != nil {
		return nil, err
	}
	uid, err := crypto.NewUUID()
	if err != nil {
		return nil, err
	}
	key := "profiles/" + uid + "." + ext
	if err := s.Storage.Upload(ctx, key, imaging.ContentType(ext), data); err != nil {
		return nil, err
	}

	var oldKey sql.NullString
	err = db.WithTx(ctx, s.DB, func(tx *sql.Tx) error {
		if err := tx.QueryRowContext(ctx, `
			SELECT profile_image_key FROM users
			WHERE id = $1 AND status = 'active'
			FOR UPDATE`, userID).Scan(&oldKey); err != nil {
			return err
		}
		_, err := tx.ExecContext(ctx, `
			UPDATE users SET profile_image_key = $2, updated_at = now()
			WHERE id = $1`, userID, key)
		return err
	})
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if oldKey.Valid && oldKey.String != "" {
		_ = s.Storage.Delete(ctx, oldKey.String) // best-effort
	}
	_ = s.Audit.Insert(ctx, s.DB, audit.Entry{
		ActorUserID: userID, Action: "profile_photo_upload", ResourceType: "user",
		ResourceID: userID, Outcome: "success", RequestID: requestID,
	})
	return s.Me(ctx, userID)
}

// DeletePhoto menghapus foto profil dari storage dan database.
func (s *Service) DeletePhoto(ctx context.Context, userID string, requestID string) (*Profile, error) {
	var oldKey sql.NullString
	err := db.WithTx(ctx, s.DB, func(tx *sql.Tx) error {
		// Kunci lama dibaca SEBELUM dikosongkan agar objek storage benar-benar dihapus.
		if err := tx.QueryRowContext(ctx, `
			SELECT profile_image_key FROM users
			WHERE id = $1 AND status = 'active'
			FOR UPDATE`, userID).Scan(&oldKey); err != nil {
			return err
		}
		_, err := tx.ExecContext(ctx, `
			UPDATE users SET profile_image_key = NULL, updated_at = now()
			WHERE id = $1 AND status = 'active'`, userID)
		return err
	})
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if oldKey.Valid && oldKey.String != "" {
		_ = s.Storage.Delete(ctx, oldKey.String)
	}
	_ = s.Audit.Insert(ctx, s.DB, audit.Entry{
		ActorUserID: userID, Action: "profile_photo_delete", ResourceType: "user",
		ResourceID: userID, Outcome: "success", RequestID: requestID,
	})
	return s.Me(ctx, userID)
}

func decodePrefs(b []byte) map[string]string {
	out := map[string]string{}
	if len(b) > 0 {
		_ = json.Unmarshal(b, &out)
	}
	return out
}

var allowedPrefs = map[string]map[string]bool{
	"theme_mode": {"light": true, "dark": true},
	"accent":     {"red": true, "yellow": true, "green": true, "blue": true, "purple": true},
}

func normalizePreferences(in map[string]string) (map[string]string, error) {
	if in == nil {
		return nil, nil
	}
	out := map[string]string{}
	for k, v := range in {
		allowedValues, ok := allowedPrefs[k]
		if !ok {
			continue
		}
		if !allowedValues[v] {
			return nil, errors.New("Nilai preferensi tidak valid untuk " + k)
		}
		out[k] = v
	}
	return out, nil
}

func isUniqueViolation(err error) bool {
	var pe *pgconn.PgError
	return errors.As(err, &pe) && pe.Code == "23505"
}

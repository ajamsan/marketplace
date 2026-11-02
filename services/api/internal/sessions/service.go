package sessions

import (
	"context"
	"database/sql"
	"errors"
	"log/slog"
	"time"

	"kantinkampus/api/internal/platform/crypto"
	"kantinkampus/api/internal/platform/db"
)

var (
	ErrInvalid  = errors.New("Sesi tidak valid")
	ErrRevoked  = errors.New("Sesi telah dicabut; silakan login kembali")
	ErrReuse    = errors.New("Token refresh lama terpakai ulang; keluarga sesi dicabut")
	ErrExpired  = errors.New("Sesi kedaluwarsa; silakan login kembali")
	ErrNotFound = errors.New("Sesi tidak ditemukan")
	ErrCurrent  = errors.New("Sesi yang sedang dipakai tidak dapat dicabut dari daftar sesi")
)

// Refresh token dirotasi pada setiap pemakaian dan reuse token lama mencabut
// seluruh keluarga token (AUTH-09). is_current dihitung dari session id pada
// access token, bukan flag di database (PRD §9.1).
type Service struct {
	DB  *sql.DB
	Log *slog.Logger
}

// Menyediakan pengelola sesi dengan basis data dan pencatat peristiwa.
func New(db *sql.DB, log *slog.Logger) *Service {
	return &Service{DB: db, Log: log}
}

type CreateParams struct {
	UserID      string
	UserAgent   string
	IPMasked    string
	IPHash      string
	IdleTTL     time.Duration
	AbsoluteTTL time.Duration
}

type Created struct {
	SessionID    string
	RefreshToken string
	CSRFToken    string
}

// Membuat keluarga token sesi baru dalam transaksi pemanggil.
func (s *Service) CreateTx(ctx context.Context, tx *sql.Tx, p CreateParams) (*Created, error) {
	refresh, err := crypto.NewToken()
	if err != nil {
		return nil, err
	}
	csrf, err := crypto.NewToken()
	if err != nil {
		return nil, err
	}
	id, err := crypto.NewUUID()
	if err != nil {
		return nil, err
	}
	family, err := crypto.NewUUID()
	if err != nil {
		return nil, err
	}
	now := time.Now()
	absolute := now.Add(p.AbsoluteTTL)
	expires := now.Add(p.IdleTTL)
	if expires.After(absolute) {
		expires = absolute
	}
	_, err = tx.ExecContext(ctx, `
		INSERT INTO login_sessions
			(id, user_id, refresh_token_hash, token_family_id, csrf_token_hash,
			 user_agent_summary, platform, ip_masked, ip_hash,
			 expires_at, absolute_expires_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
		id, p.UserID, crypto.HashToken(refresh), family, crypto.HashToken(csrf),
		label(p.UserAgent), platform(p.UserAgent), p.IPMasked, p.IPHash,
		expires, absolute)
	if err != nil {
		return nil, err
	}
	s.event(ctx, "sessions", "session_created", "success")
	return &Created{SessionID: id, RefreshToken: refresh, CSRFToken: csrf}, nil
}

type Rotation struct {
	SessionID       string
	UserID          string
	Role            string
	Username        string
	NewRefreshToken string
	CSRFTokenHash   string
}

// Memutar refresh token secara atomik dan mencabut keluarga saat terdeteksi reuse.
func (s *Service) Rotate(ctx context.Context, presented, csrfToken string, idleTTL time.Duration) (*Rotation, error) {
	presentedHash := crypto.HashToken(presented)
	var rotation *Rotation
	var revokeFamilyID string

	err := withTx(ctx, s.DB, func(tx *sql.Tx) error {
		var (
			id, userID, family, csrfHash string
			revokedAt                    sql.NullTime
			expiresAt, absAt             time.Time
		)
		err := tx.QueryRowContext(ctx, `
			SELECT s.id, s.user_id, s.token_family_id, s.csrf_token_hash,
			       s.expires_at, s.absolute_expires_at, s.revoked_at
			FROM login_sessions s
			WHERE s.refresh_token_hash = $1
			LIMIT 1
			FOR UPDATE`, presentedHash).
			Scan(&id, &userID, &family, &csrfHash, &expiresAt, &absAt, &revokedAt)
		switch {
		case err == nil:
			if csrfToken == "" || crypto.HashToken(csrfToken) != csrfHash {
				s.eventTx(ctx, tx, "sessions", "refresh_csrf_mismatch", "blocked")
				return ErrInvalid
			}
			now := time.Now()
			if revokedAt.Valid {
				revokeFamilyID = family
				return ErrRevoked
			}
			if now.After(expiresAt) || now.After(absAt) {
				_, _ = tx.ExecContext(ctx, `
					UPDATE login_sessions SET revoked_at=now(), revoke_reason='expired'
					WHERE id=$1 AND revoked_at IS NULL`, id)
				return ErrExpired
			}
			return s.rotateTx(ctx, tx, rotateArgs{
				id: id, userID: userID, family: family,
				oldHash: presentedHash, idleTTL: idleTTL,
			}, &rotation)
		case errors.Is(err, sql.ErrNoRows):
			err2 := tx.QueryRowContext(ctx, `
				SELECT s.id, s.user_id, s.token_family_id
				FROM login_sessions s
				WHERE s.previous_refresh_token_hash = $1
				LIMIT 1`, presentedHash).Scan(&id, &userID, &family)
			if err2 == nil {
				revokeFamilyID = family
				s.eventTx(ctx, tx, "sessions", "refresh_reuse_detected", "blocked")
				return ErrReuse
			}
			return ErrInvalid
		default:
			return err
		}
	})

	if revokeFamilyID != "" {
		s.revokeFamily(ctx, s.DB, revokeFamilyID)
		if err == ErrReuse {
			s.event(ctx, "sessions", "refresh_reuse_detected", "blocked")
		}
	}
	if err != nil {
		return nil, err
	}
	return rotation, nil
}

type rotateArgs struct {
	id, userID, family, oldHash string
	idleTTL                     time.Duration
}

// Memvalidasi token dalam transaksi lalu menyiapkan token pengganti.
func (s *Service) rotateTx(ctx context.Context, tx *sql.Tx, a rotateArgs, out **Rotation) error {
	newRefresh, err := crypto.NewToken()
	if err != nil {
		return err
	}
	var role, username, csrfHash string
	err = tx.QueryRowContext(ctx, `
		SELECT u.role, u.username, s.csrf_token_hash
		FROM users u JOIN login_sessions s ON s.user_id = u.id
		WHERE u.id = $1 AND s.id = $2`, a.userID, a.id).
		Scan(&role, &username, &csrfHash)
	if err != nil {
		return err
	}
	_, err = tx.ExecContext(ctx, `
		UPDATE login_sessions
		SET refresh_token_hash = $2,
		    previous_refresh_token_hash = $3,
		    last_seen_at = now(),
		    expires_at = LEAST(now() + make_interval(secs => $4::int), absolute_expires_at)
		WHERE id = $1 AND revoked_at IS NULL`,
		a.id, crypto.HashToken(newRefresh), a.oldHash, int64(a.idleTTL.Seconds()))
	if err != nil {
		return err
	}
	s.eventTx(ctx, tx, "sessions", "refresh_rotated", "success")
	*out = &Rotation{
		SessionID:       a.id,
		UserID:          a.userID,
		Role:            role,
		Username:        username,
		NewRefreshToken: newRefresh,
		CSRFTokenHash:   csrfHash,
	}
	return nil
}

// Mencabut seluruh sesi yang berbagi keluarga refresh token.
func (s *Service) revokeFamily(ctx context.Context, tx db.DBTX, family string) {
	_, _ = tx.ExecContext(ctx, `
		UPDATE login_sessions
		SET revoked_at = COALESCE(revoked_at, now()),
		    revoke_reason = COALESCE(revoke_reason, 'reuse_detected')
		WHERE token_family_id = $1 AND revoked_at IS NULL`, family)
}

type View struct {
	ID        string    `json:"id"`
	Label     string    `json:"label"`
	Platform  string    `json:"platform"`
	IPMasked  string    `json:"ip_masked"`
	CreatedAt time.Time `json:"created_at"`
	LastSeen  time.Time `json:"last_seen_at"`
	IsCurrent bool      `json:"is_current"`
}

// Menyajikan sesi pengguna dan menandai sesi yang sedang digunakan.
func (s *Service) List(ctx context.Context, userID, currentSessionID string) ([]View, error) {
	rows, err := s.DB.QueryContext(ctx, `
		SELECT id, user_agent_summary, platform, ip_masked, created_at, last_seen_at
		FROM login_sessions
		WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > now()
		ORDER BY last_seen_at DESC
		LIMIT 100`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []View{}
	for rows.Next() {
		var v View
		var label, platform, ip sql.NullString
		if err := rows.Scan(&v.ID, &label, &platform, &ip, &v.CreatedAt, &v.LastSeen); err != nil {
			return nil, err
		}
		v.Label, v.Platform, v.IPMasked = nullStr(label), nullStr(platform), nullStr(ip)
		v.IsCurrent = v.ID == currentSessionID
		out = append(out, v)
	}
	return out, rows.Err()
}

// RevokeOther mencabut sesi target milik user; sesi aktif ditolak (SESS-02).
func (s *Service) RevokeOther(ctx context.Context, userID, targetID, currentSessionID string) error {
	if targetID == currentSessionID {
		return ErrCurrent
	}
	res, err := s.DB.ExecContext(ctx, `
		UPDATE login_sessions
		SET revoked_at = now(), revoke_reason = 'revoked_by_user'
		WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL`, targetID, userID)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	s.event(ctx, "sessions", "session_revoked", "success")
	return nil
}

// RevokeCurrent dipakai untuk logout (AUTH-10).
func (s *Service) RevokeCurrent(ctx context.Context, sessionID, userID string) error {
	_, err := s.DB.ExecContext(ctx, `
		UPDATE login_sessions
		SET revoked_at = now(), revoke_reason = 'logout'
		WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL`, sessionID, userID)
	if err != nil {
		return err
	}
	s.event(ctx, "sessions", "session_logged_out", "success")
	return nil
}

type AccessInfo struct {
	UserID   string
	Username string
	Role     string
}

// Access memeriksa sesi masih aktif untuk access token pendek; memberi
// pemeriksaan revocation tambahan melebihi expiry JWT (PRD §5.6).
func (s *Service) Access(ctx context.Context, sessionID string) (*AccessInfo, error) {
	var a AccessInfo
	err := s.DB.QueryRowContext(ctx, `
		SELECT u.id, u.username, u.role
		FROM login_sessions s
		JOIN users u ON u.id = s.user_id
		WHERE s.id = $1
		  AND s.revoked_at IS NULL
		  AND s.expires_at > now()
		  AND s.absolute_expires_at > now()
		  AND u.status = 'active'`, sessionID).
		Scan(&a.UserID, &a.Username, &a.Role)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrInvalid
	}
	if err != nil {
		return nil, err
	}
	return &a, nil
}

// Menghapus data sesi yang melewati batas penyimpanan.
func (s *Service) CleanupExpired(ctx context.Context) error {
	_, err := s.DB.ExecContext(ctx, `
		DELETE FROM login_sessions
		WHERE revoked_at IS NOT NULL
		   AND revoked_at < now() - interval '7 days'`)
	return err
}

// Mencatat peristiwa sesi di luar transaksi bisnis.
func (s *Service) event(ctx context.Context, flow, event, outcome string) {
	_, _ = s.DB.ExecContext(ctx,
		`INSERT INTO auth_events (flow, event, outcome) VALUES ($1,$2,$3)`,
		flow, event, outcome)
}

// Menulis peristiwa sesi menggunakan transaksi yang sedang berlangsung.
func (s *Service) eventTx(ctx context.Context, tx *sql.Tx, flow, event, outcome string) {
	_, _ = tx.ExecContext(ctx,
		`INSERT INTO auth_events (flow, event, outcome) VALUES ($1,$2,$3)`,
		flow, event, outcome)
}

// Mengubah nilai nullable hasil query menjadi teks untuk keluaran API.
func nullStr(ns sql.NullString) string {
	if ns.Valid && ns.String != "" {
		return ns.String
	}
	return "tidak diketahui"
}

// Menjalankan operasi dengan commit saat berhasil dan rollback saat gagal.
func withTx(ctx context.Context, d *sql.DB, fn func(tx *sql.Tx) error) (err error) {
	tx, err := d.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() {
		if p := recover(); p != nil {
			_ = tx.Rollback()
			panic(p)
		}
	}()
	if err := fn(tx); err != nil {
		_ = tx.Rollback()
		return err
	}
	return tx.Commit()
}

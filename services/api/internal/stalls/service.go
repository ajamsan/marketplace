package stalls

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"

	"kantinkampus/api/internal/audit"
	"kantinkampus/api/internal/platform/crypto"
	"kantinkampus/api/internal/platform/db"
)

var ErrNotFound = errors.New("Stan tidak ditemukan")

// Transisi status stan: pending_review → (active | inactive), dan sebaliknya
// untuk admin. Seller tidak pernah mengubah status stan sendiri (D11/D12).
var allowedTransitions = map[string]map[string]bool{
	"approve":    {"pending_review": true},
	"reject":     {"pending_review": true},
	"deactivate": {"active": true},
	"activate":   {"inactive": true},
}

type Service struct {
	DB    *sql.DB
	Audit *audit.Repo
}

func NewService(db *sql.DB, a *audit.Repo) *Service {
	return &Service{DB: db, Audit: a}
}

type Stall struct {
	ID            string     `json:"id"`
	Name          string     `json:"name"`
	Description   string     `json:"description"`
	LocationLabel string     `json:"location_label"`
	Status        string     `json:"status"`
	CreatedAt     time.Time  `json:"created_at"`
}

// Create: seller membuat stan baru berstatus pending_review.
func (s *Service) Create(ctx context.Context, sellerID, name, description, location, requestID string) (*Stall, error) {
	fields := map[string]string{}
	name = strings.TrimSpace(name)
	if l := len(name); l < 3 || l > 80 {
		fields["name"] = "Nama stan 3-80 karakter"
	}
	description = strings.TrimSpace(description)
	if len(description) > 500 {
		fields["description"] = "Deskripsi maksimal 500 karakter"
	}
	location = strings.TrimSpace(location)
	if len(location) > 120 {
		fields["location_label"] = "Lokasi maksimal 120 karakter"
	}
	if len(fields) > 0 {
		return nil, &InvalidError{Fields: fields}
	}

	id, err := crypto.NewUUID()
	if err != nil {
		return nil, err
	}
	var desc, loc any
	if description != "" {
		desc = description
	}
	if location != "" {
		loc = location
	}
	err = db.WithTx(ctx, s.DB, func(tx *sql.Tx) error {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO stalls (id, name, description, location_label, status, created_by)
			VALUES ($1,$2,$3,$4,'pending_review',$5)`,
			id, name, desc, loc, sellerID); err != nil {
			return err
		}
		_, err := tx.ExecContext(ctx, `
			INSERT INTO seller_stalls (seller_id, stall_id, role) VALUES ($1,$2,'owner')`,
			sellerID, id)
		return err
	})
	if err != nil {
		return nil, err
	}
	_ = s.Audit.Insert(ctx, s.DB, audit.Entry{
		ActorUserID: sellerID, Action: "stall_create", ResourceType: "stall",
		ResourceID: id, Outcome: "pending_review", RequestID: requestID,
	})
	return s.byID(ctx, id)
}

// ListActive untuk katalog publik: hanya stan aktif.
func (s *Service) ListActive(ctx context.Context) ([]Stall, error) {
	rows, err := s.DB.QueryContext(ctx, `
		SELECT id, name, COALESCE(description,''), COALESCE(location_label,''), status, created_at
		FROM stalls WHERE status = 'active' ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanStalls(rows)
}

func (s *Service) GetActive(ctx context.Context, id string) (*Stall, error) {
	var st Stall
	err := s.DB.QueryRowContext(ctx, `
		SELECT id, name, COALESCE(description,''), COALESCE(location_label,''), status, created_at
		FROM stalls WHERE id = $1 AND status = 'active'`, id).
		Scan(&st.ID, &st.Name, &st.Description, &st.LocationLabel, &st.Status, &st.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &st, nil
}

// ListBySeller: stan yang dikelola seller, semua status.
func (s *Service) ListBySeller(ctx context.Context, sellerID string) ([]Stall, error) {
	rows, err := s.DB.QueryContext(ctx, `
		SELECT st.id, st.name, COALESCE(st.description,''), COALESCE(st.location_label,''), st.status, st.created_at
		FROM stalls st
		JOIN seller_stalls ss ON ss.stall_id = st.id
		WHERE ss.seller_id = $1
		ORDER BY st.created_at DESC`, sellerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanStalls(rows)
}

type UpdateInput struct {
	Name          *string
	Description   *string
	LocationLabel *string
}

// UpdateBySeller hanya untuk stan milik seller; stan milik orang lain → 404.
func (s *Service) UpdateBySeller(ctx context.Context, sellerID, stallID string, in UpdateInput, requestID string) (*Stall, error) {
	fields := map[string]string{}
	var name, desc, loc any
	if in.Name != nil {
		n := strings.TrimSpace(*in.Name)
		if l := len(n); l < 3 || l > 80 {
			fields["name"] = "Nama stan 3-80 karakter"
		} else {
			name = n
		}
	}
	if in.Description != nil {
		d := strings.TrimSpace(*in.Description)
		if len(d) > 500 {
			fields["description"] = "Deskripsi maksimal 500 karakter"
		} else if d == "" {
			desc = nil
		} else {
			desc = d
		}
	}
	if in.LocationLabel != nil {
		l := strings.TrimSpace(*in.LocationLabel)
		if len(l) > 120 {
			fields["location_label"] = "Lokasi maksimal 120 karakter"
		} else if l == "" {
			loc = nil
		} else {
			loc = l
		}
	}
	if len(fields) > 0 {
		return nil, &InvalidError{Fields: fields}
	}

	res, err := s.DB.ExecContext(ctx, `
		UPDATE stalls st
		SET name = COALESCE($3, st.name),
		    description = CASE WHEN $4::boolean THEN $5 ELSE st.description END,
		    location_label = CASE WHEN $6::boolean THEN $7 ELSE st.location_label END,
		    updated_at = now()
		WHERE st.id = $1
		  AND EXISTS (SELECT 1 FROM seller_stalls ss WHERE ss.stall_id = st.id AND ss.seller_id = $2)`,
		stallID, sellerID,
		name, in.Description != nil, desc, in.LocationLabel != nil, loc)
	if err != nil {
		return nil, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return nil, ErrNotFound
	}
	_ = s.Audit.Insert(ctx, s.DB, audit.Entry{
		ActorUserID: sellerID, Action: "stall_update", ResourceType: "stall",
		ResourceID: stallID, Outcome: "success", RequestID: requestID,
	})
	return s.byID(ctx, stallID)
}

func (s *Service) byID(ctx context.Context, id string) (*Stall, error) {
	var st Stall
	err := s.DB.QueryRowContext(ctx, `
		SELECT id, name, COALESCE(description,''), COALESCE(location_label,''), status, created_at
		FROM stalls WHERE id = $1`, id).
		Scan(&st.ID, &st.Name, &st.Description, &st.LocationLabel, &st.Status, &st.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &st, nil
}

// --- admin ---

type AdminView struct {
	Stall
	OwnerUsername string `json:"owner_username"`
}

func (s *Service) AdminList(ctx context.Context, statusFilter string) ([]AdminView, error) {
	q := `
		SELECT st.id, st.name, COALESCE(st.description,''), COALESCE(st.location_label,''),
		       st.status, st.created_at, COALESCE(u.username,'?')
		FROM stalls st
		LEFT JOIN seller_stalls ss ON ss.stall_id = st.id AND ss.role = 'owner'
		LEFT JOIN users u ON u.id = ss.seller_id`
	args := []any{}
	if statusFilter != "" {
		q += ` WHERE st.status = $1`
		args = append(args, statusFilter)
	}
	q += ` ORDER BY st.created_at DESC LIMIT 200`
	rows, err := s.DB.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []AdminView{}
	for rows.Next() {
		var v AdminView
		if err := rows.Scan(&v.ID, &v.Name, &v.Description, &v.LocationLabel,
			&v.Status, &v.CreatedAt, &v.OwnerUsername); err != nil {
			return nil, err
		}
		out = append(out, v)
	}
	return out, rows.Err()
}

// AdminTransition: approve/reject/deactivate/activate dengan pemeriksaan
// status sumber; perubahan tercatat di audit (D12).
func (s *Service) AdminTransition(ctx context.Context, adminID, stallID, action, requestID string) (*Stall, error) {
	allowedFrom, ok := allowedTransitions[action]
	if !ok {
		return nil, &InvalidError{Fields: map[string]string{"action": "Aksi tidak dikenal"}}
	}
	var newStatus string
	switch action {
	case "approve", "activate":
		newStatus = "active"
	default:
		newStatus = "inactive"
	}
	var current string
	err := db.WithTx(ctx, s.DB, func(tx *sql.Tx) error {
		if err := tx.QueryRowContext(ctx, `
			SELECT status FROM stalls WHERE id = $1 FOR UPDATE`, stallID).Scan(&current); err != nil {
			return err
		}
		if !allowedFrom[current] {
			return ErrInvalidTransition
		}
		_, err := tx.ExecContext(ctx, `
			UPDATE stalls SET status = $2, updated_at = now() WHERE id = $1`,
			stallID, newStatus)
		return err
	})
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	_ = s.Audit.Insert(ctx, s.DB, audit.Entry{
		ActorUserID: adminID, Action: "stall_" + action, ResourceType: "stall",
		ResourceID: stallID, Outcome: "success", RequestID: requestID,
		Metadata: map[string]string{"from": current, "to": newStatus},
	})
	return s.byID(ctx, stallID)
}

// InvalidError validasi domain.
type InvalidError struct {
	Fields map[string]string
}

func (e *InvalidError) Error() string { return "Data tidak valid" }

var ErrInvalidTransition = errors.New("Status stan tidak dapat diubah ke tujuan tersebut")

func scanStalls(rows *sql.Rows) ([]Stall, error) {
	out := []Stall{}
	for rows.Next() {
		var st Stall
		if err := rows.Scan(&st.ID, &st.Name, &st.Description, &st.LocationLabel, &st.Status, &st.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, st)
	}
	return out, rows.Err()
}

package audit

import (
	"context"
	"encoding/json"

	"kantinkampus/api/internal/platform/db"
)

// Entry mencatat tindakan sensitif (SESS-04): actor, objek, hasil, request id.
// Metadata hanya allowlist — tanpa token, OTP, password, atau email lengkap.
type Entry struct {
	ActorUserID   string
	Action        string
	ResourceType  string
	ResourceID    string
	Outcome       string
	RequestID     string
	Metadata      map[string]string
}

// Repo menulis audit_logs; menerima *sql.DB maupun *sql.Tx agar bisa
// konsisten dengan transaksi domain.
type Repo struct{}

// Menyediakan repositori untuk mencatat tindakan yang memerlukan audit.
func NewRepo() *Repo { return &Repo{} }

// Menulis peristiwa audit melalui DB atau transaksi domain yang sama.
func (r *Repo) Insert(ctx context.Context, q db.DBTX, e Entry) error {
	var meta []byte
	if len(e.Metadata) == 0 {
		meta = []byte("{}")
	} else {
		var err error
		meta, err = json.Marshal(e.Metadata)
		if err != nil {
			meta = []byte("{}")
		}
	}
	var actor any
	if e.ActorUserID != "" {
		actor = e.ActorUserID
	}
	var resID any
	if e.ResourceID != "" {
		resID = e.ResourceID
	}
	_, err := q.ExecContext(ctx, `
		INSERT INTO audit_logs (actor_user_id, action, resource_type, resource_id, outcome, request_id, metadata_redacted)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		actor, e.Action, e.ResourceType, resID, e.Outcome, e.RequestID, meta)
	return err
}

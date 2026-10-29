package outbox

import (
	"context"
	"database/sql"
	"encoding/json"
	"log/slog"
	"time"

	"kantinkampus/api/internal/platform/crypto"
	"kantinkampus/api/internal/platform/db"
	"kantinkampus/api/internal/platform/mailer"
)

// Repo menyimpan permintaan kirim OTP email dalam transaksi yang sama dengan
// tantangan OTP (transactional outbox, PRD §9.1). Kode OTP disimpan
// TERENKRIPSI AES-GCM berumur pendek dan hanya dikirim selama tantangan masih
// aktif — tidak pernah plaintext di tabel/log (AUTH-05).
type Repo struct {
	otpKey []byte
}

func NewRepo(otpKey []byte) *Repo { return &Repo{otpKey: otpKey} }

func (r *Repo) Enqueue(ctx context.Context, q db.DBTX, purpose, recipient, challengeID, code string) error {
	enc, err := crypto.EncryptSecret(r.otpKey, code)
	if err != nil {
		return err
	}
	payload, _ := json.Marshal(map[string]string{
		"challenge_id": challengeID,
		"code_enc":     enc,
	})
	_, err = q.ExecContext(ctx, `
		INSERT INTO email_outbox (purpose, recipient, template_key, payload_redacted)
		VALUES ($1, $2, $3, $4)`,
		purpose, recipient, "otp_"+purpose, payload)
	return err
}

// Worker mengirim email dengan retry/backoff; kegagalan provider tidak pernah
// mengaktifkan akun atau menandai pembayaran sukses (PRD §11).
type Worker struct {
	DB          *sql.DB
	Mailer      mailer.Mailer
	Log         *slog.Logger
	OTPKey      []byte
	Interval    time.Duration
	MaxAttempts int
}

func NewWorker(database *sql.DB, m mailer.Mailer, otpKey []byte, log *slog.Logger) *Worker {
	return &Worker{DB: database, Mailer: m, OTPKey: otpKey, Log: log, Interval: 5 * time.Second, MaxAttempts: 5}
}

type pendingMail struct {
	ID          string
	Purpose     string
	Recipient   string
	ChallengeID string
	CodeEnc     string
}

func (w *Worker) Run(ctx context.Context) {
	t := time.NewTicker(w.Interval)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			if err := w.processBatch(ctx); err != nil {
				if w.Log != nil {
					w.Log.Error("outbox: gagal memproses batch", "error", err)
				}
			}
		}
	}
}

func (w *Worker) processBatch(ctx context.Context) error {
	return db.WithTx(ctx, w.DB, func(tx *sql.Tx) error {
		rows, err := tx.QueryContext(ctx, `
			SELECT id, purpose, recipient, payload_redacted
			FROM email_outbox
			WHERE status = 'pending' AND next_attempt_at <= now()
			ORDER BY created_at
			LIMIT 10
			FOR UPDATE SKIP LOCKED`)
		if err != nil {
			return err
		}
		var batch []pendingMail
		for rows.Next() {
			var m pendingMail
			var payload []byte
			if err := rows.Scan(&m.ID, &m.Purpose, &m.Recipient, &payload); err != nil {
				rows.Close()
				return err
			}
			var p struct {
				ChallengeID string `json:"challenge_id"`
				CodeEnc     string `json:"code_enc"`
			}
			if err := json.Unmarshal(payload, &p); err != nil {
				rows.Close()
				return err
			}
			m.ChallengeID, m.CodeEnc = p.ChallengeID, p.CodeEnc
			batch = append(batch, m)
		}
		rows.Close()
		for _, m := range batch {
			w.sendOne(ctx, tx, m)
		}
		return nil
	})
}

func (w *Worker) sendOne(ctx context.Context, tx *sql.Tx, m pendingMail) {
	// Tantangan sudah dikonsumsi/kedaluwarsa/digantikan: pesan tidak relevan lagi.
	var active bool
	err := tx.QueryRowContext(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM otp_challenges
			WHERE id = $1 AND consumed_at IS NULL AND superseded_at IS NULL
			  AND expires_at > now()
		)`, m.ChallengeID).Scan(&active)
	if err == nil && !active {
		_, _ = tx.ExecContext(ctx, `DELETE FROM email_outbox WHERE id = $1`, m.ID)
		return
	}

	code, err := crypto.DecryptSecret(w.OTPKey, m.CodeEnc)
	if err != nil {
		_, _ = tx.ExecContext(ctx, `DELETE FROM email_outbox WHERE id = $1`, m.ID)
		return
	}

	msgID, err := w.Mailer.SendOTP(ctx, m.Recipient, code, m.Purpose)
	if err == nil {
		_, _ = tx.ExecContext(ctx, `
			UPDATE email_outbox
			SET status='sent', sent_at=now(), provider_message_id=$2, attempt_count=attempt_count+1
			WHERE id=$1`, m.ID, msgID)
		return
	}

	if w.Log != nil {
		w.Log.Error("outbox: gagal kirim email", "purpose", m.Purpose, "error", err)
	}
	var attempt int
	if err := tx.QueryRowContext(ctx, `
		UPDATE email_outbox SET attempt_count = attempt_count + 1
		WHERE id=$1 RETURNING attempt_count`, m.ID).Scan(&attempt); err != nil {
		return
	}
	if attempt >= w.MaxAttempts {
		_, _ = tx.ExecContext(ctx, `UPDATE email_outbox SET status='failed', next_attempt_at=now() WHERE id=$1`, m.ID)
		return
	}
	backoff := 30 * time.Second * (1 << (attempt - 1))
	if backoff > 10*time.Minute {
		backoff = 10 * time.Minute
	}
	_, _ = tx.ExecContext(ctx, `
		UPDATE email_outbox SET status='pending', next_attempt_at=$2 WHERE id=$1`, m.ID, time.Now().Add(backoff))
}

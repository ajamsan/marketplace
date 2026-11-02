package auth

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

// Repo memusatkan SQL auth: pending registration, tantangan OTP, throttle,
// event, dan pencarian user. Semua counter pakai update atomik agar request
// paralel tidak bisa melewati ambang (PRD §6.2).
type Repo struct {
	DB *sql.DB
}

// Menyediakan repositori yang menjalankan query autentikasi pada basis data.
func NewRepo(db *sql.DB) *Repo { return &Repo{DB: db} }

// Throttle.

// Memeriksa apakah kunci percobaan masih aktif dan kapan masa berlakunya berakhir.
func (r *Repo) CheckLocked(ctx context.Context, flow, scopeType, scopeKeyHash string) (time.Time, bool, error) {
	var lockedUntil sql.NullTime
	err := r.DB.QueryRowContext(ctx, `
		SELECT locked_until FROM auth_throttles
		WHERE flow=$1 AND scope_type=$2 AND scope_key_hash=$3`,
		flow, scopeType, scopeKeyHash).Scan(&lockedUntil)
	if errors.Is(err, sql.ErrNoRows) {
		return time.Time{}, false, nil
	}
	if err != nil {
		return time.Time{}, false, err
	}
	if lockedUntil.Valid && lockedUntil.Time.After(time.Now()) {
		return lockedUntil.Time, true, nil
	}
	return time.Time{}, false, nil
}

// Menaikkan penghitung kegagalan untuk ruang lingkup autentikasi tertentu.
func (r *Repo) RecordFailure(ctx context.Context, flow, scopeType, scopeKeyHash string) (int, error) {
	var count int
	err := r.DB.QueryRowContext(ctx, `
		INSERT INTO auth_throttles (scope_type, scope_key_hash, flow, failure_count)
		VALUES ($1, $2, $3, 1)
		ON CONFLICT (flow, scope_type, scope_key_hash) DO UPDATE
			SET failure_count = auth_throttles.failure_count + 1, updated_at = now()
		RETURNING failure_count`,
		scopeType, scopeKeyHash, flow).Scan(&count)
	return count, err
}

// Menyimpan batas akhir penguncian setelah ambang kegagalan tercapai.
func (r *Repo) ApplyLock(ctx context.Context, flow, scopeType, scopeKeyHash string, until time.Time) error {
	_, err := r.DB.ExecContext(ctx, `
		INSERT INTO auth_throttles (scope_type, scope_key_hash, flow, locked_until, wave_number)
		VALUES ($1, $2, $3, $4, 1)
		ON CONFLICT (flow, scope_type, scope_key_hash) DO UPDATE
			SET locked_until = GREATEST(COALESCE(auth_throttles.locked_until, now()), $4),
			    wave_number = auth_throttles.wave_number + 1,
			    updated_at = now()`,
		scopeType, scopeKeyHash, flow, until)
	return err
}

// ClearFailures menghapus counter saat sukses; lock aktif TIDAK disentuh
// (PRD §6.2: keberhasilan tidak boleh membersihkan lock aktif).
// Menghapus penghitung kegagalan pada ruang lingkup yang berhasil diverifikasi.
func (r *Repo) ClearFailures(ctx context.Context, flow, scopeType, scopeKeyHash string) error {
	_, err := r.DB.ExecContext(ctx, `
		UPDATE auth_throttles
		SET failure_count = 0, wave_number = 0, updated_at = now()
		WHERE flow=$1 AND scope_type=$2 AND scope_key_hash=$3`,
		flow, scopeType, scopeKeyHash)
	return err
}

// Events (tanpa rahasia; email/IP hanya hash).

// Menulis peristiwa autentikasi tanpa menyimpan alamat email atau IP mentah.
func (r *Repo) Event(ctx context.Context, flow, event, outcome, emailHash, ipHash, requestID string) {
	var eh, ih, rid any
	if emailHash != "" {
		eh = emailHash
	}
	if ipHash != "" {
		ih = ipHash
	}
	if requestID != "" {
		rid = requestID
	}
	_, _ = r.DB.ExecContext(ctx, `
		INSERT INTO auth_events (flow, event, outcome, email_hash, ip_hash, request_id)
		VALUES ($1,$2,$3,$4,$5,$6)`, flow, event, outcome, eh, ih, rid)
}

// Users.

type User struct {
	ID           string
	Username     string
	PasswordHash string
	Role         string
	Status       string
}

// Mencari pengguna berdasarkan alamat email yang telah dinormalisasi.
func (r *Repo) UserByEmail(ctx context.Context, email string) (*User, error) {
	var u User
	err := r.DB.QueryRowContext(ctx, `
		SELECT id, username, password_hash, role, status
		FROM users WHERE email_normalized = $1`, email).
		Scan(&u.ID, &u.Username, &u.PasswordHash, &u.Role, &u.Status)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}

// Memuat identitas pengguna berdasarkan ID untuk proses autentikasi.
func (r *Repo) UserByID(ctx context.Context, id string) (*User, error) {
	var u User
	err := r.DB.QueryRowContext(ctx, `
		SELECT id, username, role, status FROM users WHERE id = $1`, id).
		Scan(&u.ID, &u.Username, &u.Role, &u.Status)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}

// Memeriksa keberadaan email tanpa mengambil atau mengungkap data akun.
func (r *Repo) UserEmailExists(ctx context.Context, email string) (bool, error) {
	var exists bool
	err := r.DB.QueryRowContext(ctx,
		`SELECT EXISTS (SELECT 1 FROM users WHERE email_normalized=$1)`, email).Scan(&exists)
	return exists, err
}

// Memeriksa ketersediaan nama pengguna sebelum pendaftaran disimpan.
func (r *Repo) UsernameExists(ctx context.Context, username string) (bool, error) {
	var exists bool
	err := r.DB.QueryRowContext(ctx,
		`SELECT EXISTS (SELECT 1 FROM users WHERE username=$1)`, username).Scan(&exists)
	return exists, err
}

// Pending registrations.

// Menghapus pendaftaran tertunda lama dalam transaksi pendaftaran baru.
func (r *Repo) PurgePendingTx(ctx context.Context, tx *sql.Tx, email string) error {
	_, err := tx.ExecContext(ctx, `
		DELETE FROM pending_registrations
		WHERE email_normalized = $1 AND verified_at IS NULL`, email)
	return err
}

// Menyimpan data akun yang menunggu verifikasi email dalam transaksi.
func (r *Repo) InsertPendingTx(ctx context.Context, tx *sql.Tx, id, email, username, passwordHash, role, groupID string, expires time.Time) error {
	_, err := tx.ExecContext(ctx, `
		INSERT INTO pending_registrations
			(id, email_normalized, username, password_hash, role, attempt_group_id, expires_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7)`,
		id, email, username, passwordHash, role, groupID, expires)
	return err
}

// Memuat kredensial sementara untuk menyelesaikan aktivasi akun.
func (r *Repo) PendingByIDTx(ctx context.Context, tx *sql.Tx, id string) (username, passwordHash, role string, ok bool, err error) {
	err = tx.QueryRowContext(ctx, `
		SELECT username, password_hash, role
		FROM pending_registrations
		WHERE id = $1 AND verified_at IS NULL AND expires_at > now()`, id).
		Scan(&username, &passwordHash, &role)
	if errors.Is(err, sql.ErrNoRows) {
		return "", "", "", false, nil
	}
	if err != nil {
		return "", "", "", false, err
	}
	return username, passwordHash, role, true, nil
}

// Menandai pendaftaran tertunda sebagai terverifikasi di dalam transaksi.
func (r *Repo) MarkPendingVerifiedTx(ctx context.Context, tx *sql.Tx, id string) error {
	_, err := tx.ExecContext(ctx,
		`UPDATE pending_registrations SET verified_at = now() WHERE id = $1`, id)
	return err
}

// Challenges.

type Challenge struct {
	ID                   string
	UserID               string
	PendingRegistrationID string
	Email                string
	Purpose              string
	OTPHash              string
	PreAuthTokenHash     string
	AttemptCount         int
	RoundNumber          int
	ExpiresAt            time.Time
	LastSentAt           time.Time
}

// Mengambil tantangan OTP aktif untuk email dan alur yang diminta.
func (r *Repo) ActiveChallenge(ctx context.Context, email, purpose string) (*Challenge, error) {
	var c Challenge
	var userID, pendingID, preAuth sql.NullString
	err := r.DB.QueryRowContext(ctx, `
		SELECT id, user_id, pending_registration_id, email_normalized, purpose, otp_hash,
		       pre_auth_token_hash, attempt_count, round_number, expires_at, last_sent_at
		FROM otp_challenges
		WHERE email_normalized = $1 AND purpose = $2
		  AND consumed_at IS NULL AND superseded_at IS NULL
		ORDER BY created_at DESC
		LIMIT 1`, email, purpose).
		Scan(&c.ID, &userID, &pendingID, &c.Email, &c.Purpose, &c.OTPHash,
			&preAuth, &c.AttemptCount, &c.RoundNumber, &c.ExpiresAt, &c.LastSentAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	c.UserID, c.PendingRegistrationID, c.PreAuthTokenHash = nullStr(userID), nullStr(pendingID), nullStr(preAuth)
	return &c, nil
}

// Mengambil tantangan login yang terkait dengan hash token praauthentikasi.
func (r *Repo) ActiveChallengeByPreAuth(ctx context.Context, preAuthHash string) (*Challenge, error) {
	var c Challenge
	var userID, pendingID sql.NullString
	err := r.DB.QueryRowContext(ctx, `
		SELECT id, user_id, pending_registration_id, email_normalized, purpose, otp_hash,
		       pre_auth_token_hash, attempt_count, round_number, expires_at, last_sent_at
		FROM otp_challenges
		WHERE pre_auth_token_hash = $1
		  AND consumed_at IS NULL AND superseded_at IS NULL
		LIMIT 1`, preAuthHash).
		Scan(&c.ID, &userID, &pendingID, &c.Email, &c.Purpose, &c.OTPHash,
			&c.PreAuthTokenHash, &c.AttemptCount, &c.RoundNumber, &c.ExpiresAt, &c.LastSentAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	c.UserID, c.PendingRegistrationID = nullStr(userID), nullStr(pendingID)
	return &c, nil
}

// Menentukan ronde OTP tertinggi yang masih berada dalam jendela waktu.
func (r *Repo) MaxRoundRecent(ctx context.Context, email, purpose string, window time.Duration) (int, error) {
	var round int
	err := r.DB.QueryRowContext(ctx, `
		SELECT COALESCE(MAX(round_number), 0)
		FROM otp_challenges
		WHERE email_normalized = $1 AND purpose = $2
		  AND created_at > now() - make_interval(secs => $3)`,
		email, purpose, int64(window.Seconds())).Scan(&round)
	return round, err
}

// Menonaktifkan tantangan lama agar hanya kode terbaru yang dapat digunakan.
func (r *Repo) SupersedeChallengesTx(ctx context.Context, tx *sql.Tx, email, purpose string) error {
	_, err := tx.ExecContext(ctx, `
		UPDATE otp_challenges
		SET superseded_at = now()
		WHERE email_normalized = $1 AND purpose = $2
		  AND consumed_at IS NULL AND superseded_at IS NULL`, email, purpose)
	return err
}

type InsertChallenge struct {
	ID           string
	UserID       string
	PendingID    string
	Email        string
	Purpose      string
	OTPHash      string
	PreAuthHash  string
	RoundNumber  int
	IPHash       string
	ExpiresAt    time.Time
}

// Menyimpan tantangan OTP baru bersama masa berlaku dan bukti yang dibutuhkan.
func (r *Repo) InsertChallengeTx(ctx context.Context, tx *sql.Tx, c InsertChallenge) error {
	var userID, pendingID, preAuth any
	if c.UserID != "" {
		userID = c.UserID
	}
	if c.PendingID != "" {
		pendingID = c.PendingID
	}
	if c.PreAuthHash != "" {
		preAuth = c.PreAuthHash
	}
	_, err := tx.ExecContext(ctx, `
		INSERT INTO otp_challenges
			(id, user_id, pending_registration_id, email_normalized, purpose, otp_hash,
			 pre_auth_token_hash, round_number, request_ip_hash, expires_at, last_sent_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now())`,
		c.ID, userID, pendingID, c.Email, c.Purpose, c.OTPHash,
		preAuth, c.RoundNumber, nullAny(c.IPHash), c.ExpiresAt)
	return err
}

// IncAttempt menambah percobaan salah secara atomik dan mengembalikan hitungan
// baru; ok=false bila tantangan sudah tidak aktif.
// Menaikkan jumlah percobaan OTP secara atomik dan melaporkan tantangan aktif.
func (r *Repo) IncAttempt(ctx context.Context, challengeID string) (attempt int, ok bool, err error) {
	err = r.DB.QueryRowContext(ctx, `
		UPDATE otp_challenges
		SET attempt_count = attempt_count + 1
		WHERE id = $1 AND consumed_at IS NULL AND superseded_at IS NULL
		RETURNING attempt_count`, challengeID).Scan(&attempt)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, false, nil
	}
	if err != nil {
		return 0, false, err
	}
	return attempt, true, nil
}

// ConsumeTx menandai tantangan terpakai sekali (single-use, AUTH-04).
// Mengonsumsi tantangan satu kali agar kode tidak dapat digunakan kembali.
func (r *Repo) ConsumeTx(ctx context.Context, tx *sql.Tx, challengeID string) (bool, error) {
	res, err := tx.ExecContext(ctx, `
		UPDATE otp_challenges
		SET consumed_at = now()
		WHERE id = $1 AND consumed_at IS NULL AND superseded_at IS NULL`, challengeID)
	if err != nil {
		return false, err
	}
	n, _ := res.RowsAffected()
	return n > 0, nil
}

// CreateUserTx membuat akun HANYA setelah OTP valid (PRD §5.1).
// Membuat akun aktif di dalam transaksi verifikasi pendaftaran.
func (r *Repo) CreateUserTx(ctx context.Context, tx *sql.Tx, id, username, email, passwordHash, role string) error {
	_, err := tx.ExecContext(ctx, `
		INSERT INTO users (id, username, email_normalized, password_hash, role, status, email_verified_at)
		VALUES ($1,$2,$3,$4,$5,'active', now())`,
		id, username, email, passwordHash, role)
	return err
}

// Menghapus catatan autentikasi kedaluwarsa sesuai masa retensi audit.
func (r *Repo) CleanupExpired(ctx context.Context, retentionDays int) error {
	if _, err := r.DB.ExecContext(ctx,
		`DELETE FROM pending_registrations WHERE expires_at < now() - interval '2 days'`); err != nil {
		return err
	}
	if _, err := r.DB.ExecContext(ctx,
		`DELETE FROM otp_challenges WHERE expires_at < now() - interval '2 days'`); err != nil {
		return err
	}
	if _, err := r.DB.ExecContext(ctx,
		`DELETE FROM auth_throttles WHERE COALESCE(locked_until, updated_at) < now() - make_interval(days => $1)`,
		retentionDays); err != nil {
		return err
	}
	if _, err := r.DB.ExecContext(ctx,
		`DELETE FROM auth_events WHERE created_at < now() - make_interval(days => $1)`,
		retentionDays); err != nil {
		return err
	}
	_, err := r.DB.ExecContext(ctx,
		`DELETE FROM email_outbox WHERE status='sent' AND sent_at < now() - interval '7 days'`)
	return err
}

// Mengubah nilai nullable dari SQL menjadi teks tanpa nilai null.
func nullStr(ns sql.NullString) string {
	if ns.Valid && ns.String != "" {
		return ns.String
	}
	return ""
}

// Menyiapkan parameter SQL nullable dari teks yang mungkin kosong.
func nullAny(s string) any {
	if s == "" {
		return nil
	}
	return s
}

package auth

import (
	"context"
	"database/sql"
	"errors"
	"log/slog"
	"time"

	"kantinkampus/api/internal/outbox"
	"kantinkampus/api/internal/platform/config"
	"kantinkampus/api/internal/platform/crypto"
	"kantinkampus/api/internal/platform/db"
	"kantinkampus/api/internal/platform/jwt"
	"kantinkampus/api/internal/platform/validate"
	"kantinkampus/api/internal/sessions"
)

// Kebijakan lockout PRD §6.2 (tabel 6.2). Counter persisten server-side;
// resend/challenge baru/refresh halaman tidak menghapus lock aktif.
const (
	passwordFailBlock    = 5  // tiap 5 salah memicu gelombang lock
	passwordWave1Lock    = 3 * time.Minute
	passwordWave2Lock    = 15 * time.Minute
	otpAttemptsPerRound  = 5
	otpRegisterRound2Lock = 5 * time.Minute  // akhir ronde 2 register
	otpRound3Lock        = 15 * time.Minute  // akhir ronde 3
	otpLoginRound2Lock   = 15 * time.Minute  // akhir ronde 2 login
	roundWindow          = 24 * time.Hour    // ronde dihitung dalam jendela ini
	pendingRegistrationTTL = 30 * time.Minute
)

type Service struct {
	Cfg      *config.Config
	DB       *sql.DB
	Repo     *Repo
	Sessions *sessions.Service
	Outbox   *outbox.Repo
	Log      *slog.Logger
}

func NewService(cfg *config.Config, d *sql.DB, sess *sessions.Service, ob *outbox.Repo, log *slog.Logger) *Service {
	return &Service{Cfg: cfg, DB: d, Repo: NewRepo(d), Sessions: sess, Outbox: ob, Log: log}
}

type RegisterInput struct {
	Username string
	Email    string
	Password string
	Role     string
}

// Register memulai pendaftaran: pending_registration + tantangan OTP + outbox
// dalam SATU transaksi. Email yang sudah terdaftar tetap mengembalikan sukses
// generik tanpa mengirim email (anti-enumerasi, AUTH-06).
func (s *Service) Register(ctx context.Context, ip string, in RegisterInput, requestID string) error {
	fields := map[string]string{}
	username, err := validate.NormalizeUsername(in.Username)
	if err != nil {
		fields["username"] = err.Error()
	}
	email, err := validate.NormalizeEmail(in.Email)
	if err != nil {
		fields["email"] = err.Error()
	}
	if err := validate.ValidatePassword(in.Password); err != nil {
		fields["password"] = err.Error()
	}
	if err := validate.ValidateRole(in.Role); err != nil {
		fields["role"] = err.Error()
	}
	if len(fields) > 0 {
		return &ValidationError{Fields: fields}
	}

	emailHash := crypto.HashEmailKey(s.Cfg.OTPHashKey, email)
	ipHash := crypto.HashIPKey(s.Cfg.OTPHashKey, ip)
	emailIPHash := crypto.HashEmailIPKey(s.Cfg.OTPHashKey, email, ip)

	if err := s.checkLocks(ctx, "otp_register", emailHash, emailIPHash); err != nil {
		return err
	}

	exists, err := s.Repo.UserEmailExists(ctx, email)
	if err != nil {
		return err
	}
	if exists {
		s.Repo.Event(ctx, "register", "register_start", "suppressed_email_taken", emailHash, ipHash, requestID)
		return nil
	}
	taken, err := s.Repo.UsernameExists(ctx, username)
	if err != nil {
		return err
	}
	if taken {
		return &ValidationError{Fields: map[string]string{"username": "Username sudah dipakai"}}
	}

	round, err := s.Repo.MaxRoundRecent(ctx, email, "register", roundWindow)
	if err != nil {
		return err
	}
	if round >= s.Cfg.OTPMaxRounds {
		return ErrEscalation
	}

	passwordHash, err := crypto.HashPassword(in.Password)
	if err != nil {
		return err
	}
	code, err := crypto.GenerateOTP()
	if err != nil {
		return err
	}
	now := time.Now()

	return db.WithTx(ctx, s.DB, func(tx *sql.Tx) error {
		pendingID, err := crypto.NewUUID()
		if err != nil {
			return err
		}
		groupID, err := crypto.NewUUID()
		if err != nil {
			return err
		}
		challengeID, err := crypto.NewUUID()
		if err != nil {
			return err
		}
		if err := s.Repo.PurgePendingTx(ctx, tx, email); err != nil {
			return err
		}
		if err := s.Repo.InsertPendingTx(ctx, tx, pendingID, email, username, passwordHash, in.Role, groupID, now.Add(pendingRegistrationTTL)); err != nil {
			return err
		}
		if err := s.Repo.SupersedeChallengesTx(ctx, tx, email, "register"); err != nil {
			return err
		}
		if err := s.Repo.InsertChallengeTx(ctx, tx, InsertChallenge{
			ID: challengeID, PendingID: pendingID, Email: email, Purpose: "register",
			OTPHash: crypto.HashOTP(s.Cfg.OTPHashKey, code),
			RoundNumber: round + 1, IPHash: ipHash,
			ExpiresAt: now.Add(s.Cfg.OTPTTL),
		}); err != nil {
			return err
		}
		if err := s.Outbox.Enqueue(ctx, tx, "register", email, challengeID, code); err != nil {
			return err
		}
		s.Repo.Event(ctx, "register", "register_start", "otp_queued", emailHash, ipHash, requestID)
		return nil
	})
}

// VerifyRegistration memverifikasi OTP lalu membuat akun secara atomik.
func (s *Service) VerifyRegistration(ctx context.Context, ip, emailRaw, otp, requestID string) error {
	email, err := validate.NormalizeEmail(emailRaw)
	if err != nil {
		return &ValidationError{Fields: map[string]string{"email": err.Error()}}
	}
	if err := validate.ValidateOTP(otp); err != nil {
		return ErrOTPInvalid
	}

	emailHash := crypto.HashEmailKey(s.Cfg.OTPHashKey, email)
	ipHash := crypto.HashIPKey(s.Cfg.OTPHashKey, ip)
	emailIPHash := crypto.HashEmailIPKey(s.Cfg.OTPHashKey, email, ip)

	if err := s.checkLocks(ctx, "otp_register", emailHash, emailIPHash); err != nil {
		return err
	}

	ch, err := s.Repo.ActiveChallenge(ctx, email, "register")
	if err != nil {
		return err
	}
	if ch == nil || time.Now().After(ch.ExpiresAt) {
		return ErrOTPInvalid
	}
	if ch.AttemptCount >= otpAttemptsPerRound {
		return &ThrottleError{RetryAfter: s.Cfg.OTPResendCooldown}
	}
	if !crypto.VerifyOTP(s.Cfg.OTPHashKey, ch.OTPHash, otp) {
		return s.recordOTPFailure(ctx, "otp_register", email, ip, ch, emailHash, ipHash, emailIPHash, requestID)
	}

	err = db.WithTx(ctx, s.DB, func(tx *sql.Tx) error {
		consumed, err := s.Repo.ConsumeTx(ctx, tx, ch.ID)
		if err != nil || !consumed {
			return ErrOTPInvalid
		}
		username, passwordHash, role, ok, err := s.Repo.PendingByIDTx(ctx, tx, ch.PendingRegistrationID)
		if err != nil {
			return err
		}
		if !ok {
			return ErrOTPInvalid
		}
		userID, err := crypto.NewUUID()
		if err != nil {
			return err
		}
		if err := s.Repo.CreateUserTx(ctx, tx, userID, username, email, passwordHash, role); err != nil {
			// unik email/username berubah di tengah jalan → minta ulang.
			return ErrRegisterConflict
		}
		if err := s.Repo.MarkPendingVerifiedTx(ctx, tx, ch.PendingRegistrationID); err != nil {
			return err
		}
		s.Repo.Event(ctx, "register", "register_verified", "success", emailHash, ipHash, requestID)
		return nil
	})
	if err != nil {
		return err
	}
	_ = s.Repo.ClearFailures(ctx, "otp_register", "email", emailHash)
	_ = s.Repo.ClearFailures(ctx, "otp_register", "email_ip", emailIPHash)
	return nil
}

// ResendOTP membuat ronde baru; cooldown & lock tidak di-reset (AUTH-04, §6.2).
func (s *Service) ResendOTP(ctx context.Context, ip, emailRaw, purpose, requestID string) error {
	email, err := validate.NormalizeEmail(emailRaw)
	if err != nil {
		return &ValidationError{Fields: map[string]string{"email": err.Error()}}
	}
	if purpose != "register" && purpose != "login" {
		return &ValidationError{Fields: map[string]string{"purpose": "Purpose tidak valid"}}
	}
	flow := "otp_" + purpose

	emailHash := crypto.HashEmailKey(s.Cfg.OTPHashKey, email)
	ipHash := crypto.HashIPKey(s.Cfg.OTPHashKey, ip)
	emailIPHash := crypto.HashEmailIPKey(s.Cfg.OTPHashKey, email, ip)

	if err := s.checkLocks(ctx, flow, emailHash, emailIPHash); err != nil {
		return err
	}

	ch, err := s.Repo.ActiveChallenge(ctx, email, purpose)
	if err != nil {
		return err
	}
	// Tidak ada alur aktif → respons generik tanpa mengirim (anti-enumerasi).
	if ch == nil {
		return nil
	}
	wait := s.Cfg.OTPResendCooldown - time.Since(ch.LastSentAt)
	if wait > 0 {
		return &ThrottleError{RetryAfter: wait}
	}
	if ch.RoundNumber >= s.Cfg.OTPMaxRounds {
		return ErrEscalation
	}

	code, err := crypto.GenerateOTP()
	if err != nil {
		return err
	}
	now := time.Now()
	challengeID, err := crypto.NewUUID()
	if err != nil {
		return err
	}
	return db.WithTx(ctx, s.DB, func(tx *sql.Tx) error {
		if err := s.Repo.SupersedeChallengesTx(ctx, tx, email, purpose); err != nil {
			return err
		}
		if err := s.Repo.InsertChallengeTx(ctx, tx, InsertChallenge{
			ID: challengeID, UserID: ch.UserID, PendingID: ch.PendingRegistrationID,
			Email: email, Purpose: purpose,
			OTPHash:     crypto.HashOTP(s.Cfg.OTPHashKey, code),
			PreAuthHash: ch.PreAuthTokenHash,
			RoundNumber: ch.RoundNumber + 1, IPHash: ipHash,
			ExpiresAt: now.Add(s.Cfg.OTPTTL),
		}); err != nil {
			return err
		}
		if err := s.Outbox.Enqueue(ctx, tx, purpose, email, challengeID, code); err != nil {
			return err
		}
		s.Repo.Event(ctx, flow, "otp_resent", "queued", emailHash, ipHash, requestID)
		return nil
	})
}

type LoginInput struct {
	Email    string
	Password string
}

// Login: password benar tanpa OTP tidak menghasilkan sesi (AUTH-03); respon
// publik generik untuk email salah vs password salah (AUTH-06).
func (s *Service) Login(ctx context.Context, ip, emailRaw, password, requestID string) (string, error) {
	email, err := validate.NormalizeEmail(emailRaw)
	if err != nil {
		return "", &ValidationError{Fields: map[string]string{"email": err.Error()}}
	}
	emailHash := crypto.HashEmailKey(s.Cfg.OTPHashKey, email)
	ipHash := crypto.HashIPKey(s.Cfg.OTPHashKey, ip)
	emailIPHash := crypto.HashEmailIPKey(s.Cfg.OTPHashKey, email, ip)

	if err := s.checkLocks(ctx, "password", emailHash, emailIPHash); err != nil {
		return "", err
	}

	user, err := s.Repo.UserByEmail(ctx, email)
	if err != nil {
		return "", err
	}
	if user == nil {
		
		crypto.DummyVerify(password)
		s.Repo.Event(ctx, "password", "login_password", "fail_unknown_email", emailHash, ipHash, requestID)
		return "", ErrInvalidCredentials
	}
	if !crypto.VerifyPassword(user.PasswordHash, password) {
		if terr := s.recordPasswordFailure(ctx, emailHash, ipHash, emailIPHash); terr != nil {
			s.Repo.Event(ctx, "password", "login_password", "locked", emailHash, ipHash, requestID)
			return "", terr
		}
		s.Repo.Event(ctx, "password", "login_password", "fail", emailHash, ipHash, requestID)
		return "", ErrInvalidCredentials
	}
	if user.Status != "active" {
		s.Repo.Event(ctx, "password", "login_password", "blocked_status", emailHash, ipHash, requestID)
		return "", ErrInvalidCredentials
	}
	_ = s.Repo.ClearFailures(ctx, "password", "email", emailHash)
	_ = s.Repo.ClearFailures(ctx, "password", "email_ip", emailIPHash)

	// Lockout alur OTP login tetap berlaku.
	if err := s.checkLocks(ctx, "otp_login", emailHash, emailIPHash); err != nil {
		return "", err
	}
	round, err := s.Repo.MaxRoundRecent(ctx, email, "login", roundWindow)
	if err != nil {
		return "", err
	}
	if round >= s.Cfg.OTPMaxRounds {
		return "", ErrEscalation
	}

	preAuth, err := crypto.NewToken()
	if err != nil {
		return "", err
	}
	code, err := crypto.GenerateOTP()
	if err != nil {
		return "", err
	}
	now := time.Now()
	challengeID, err := crypto.NewUUID()
	if err != nil {
		return "", err
	}
	err = db.WithTx(ctx, s.DB, func(tx *sql.Tx) error {
		if err := s.Repo.SupersedeChallengesTx(ctx, tx, email, "login"); err != nil {
			return err
		}
		if err := s.Repo.InsertChallengeTx(ctx, tx, InsertChallenge{
			ID: challengeID, UserID: user.ID, Email: email, Purpose: "login",
			OTPHash:     crypto.HashOTP(s.Cfg.OTPHashKey, code),
			PreAuthHash: crypto.HashToken(preAuth),
			RoundNumber: round + 1, IPHash: ipHash,
			ExpiresAt: now.Add(s.Cfg.OTPTTL),
		}); err != nil {
			return err
		}
		return s.Outbox.Enqueue(ctx, tx, "login", email, challengeID, code)
	})
	if err != nil {
		return "", err
	}
	s.Repo.Event(ctx, "otp_login", "login_preauth", "otp_queued", emailHash, ipHash, requestID)
	return preAuth, nil
}

type LoginSuccess struct {
	AccessToken string
	ExpiresIn   int64
	RefreshToken string
	CSRFToken   string
	User        UserInfo
}

type UserInfo struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Role     string `json:"role"`
}

// VerifyLogin menuntaskan login: konsumsi tantangan pre-auth + buat sesi baru.
func (s *Service) VerifyLogin(ctx context.Context, ip, ipMasked, ua, preAuth, otp, requestID string) (*LoginSuccess, error) {
	if err := validate.ValidateOTP(otp); err != nil {
		return nil, ErrOTPInvalid
	}
	ch, err := s.Repo.ActiveChallengeByPreAuth(ctx, crypto.HashToken(preAuth))
	if err != nil {
		return nil, err
	}
	if ch == nil || time.Now().After(ch.ExpiresAt) {
		return nil, ErrPreAuthInvalid
	}

	emailHash := crypto.HashEmailKey(s.Cfg.OTPHashKey, ch.Email)
	ipHash := crypto.HashIPKey(s.Cfg.OTPHashKey, ip)
	emailIPHash := crypto.HashEmailIPKey(s.Cfg.OTPHashKey, ch.Email, ip)

	if err := s.checkLocks(ctx, "otp_login", emailHash, emailIPHash); err != nil {
		return nil, err
	}
	if ch.AttemptCount >= otpAttemptsPerRound {
		return nil, &ThrottleError{RetryAfter: s.Cfg.OTPResendCooldown}
	}
	if !crypto.VerifyOTP(s.Cfg.OTPHashKey, ch.OTPHash, otp) {
		return nil, s.recordOTPFailure(ctx, "otp_login", ch.Email, ip, ch, emailHash, ipHash, emailIPHash, requestID)
	}

	var out *LoginSuccess
	err = db.WithTx(ctx, s.DB, func(tx *sql.Tx) error {
		consumed, err := s.Repo.ConsumeTx(ctx, tx, ch.ID)
		if err != nil || !consumed {
			return ErrOTPInvalid
		}
		created, err := s.Sessions.CreateTx(ctx, tx, sessions.CreateParams{
			UserID:      ch.UserID,
			UserAgent:   ua,
			IPMasked:    ipMasked,
			IPHash:      ipHash,
			IdleTTL:     s.Cfg.RefreshIdleTTL,
			AbsoluteTTL: s.Cfg.RefreshAbsoluteTTL,
		})
		if err != nil {
			return err
		}
		user, err := s.Repo.UserByID(ctx, ch.UserID)
		if err != nil || user == nil {
			return errInvalidUser()
		}
		access, expiresIn, err := s.SignAccess(user.ID, created.SessionID, user.Role, time.Now())
		if err != nil {
			return err
		}
		s.Repo.Event(ctx, "otp_login", "login_verified", "success", emailHash, ipHash, requestID)
		out = &LoginSuccess{
			AccessToken:  access,
			ExpiresIn:    expiresIn,
			RefreshToken: created.RefreshToken,
			CSRFToken:    created.CSRFToken,
			User:         UserInfo{ID: user.ID, Username: user.Username, Role: user.Role},
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	_ = s.Repo.ClearFailures(ctx, "otp_login", "email", emailHash)
	_ = s.Repo.ClearFailures(ctx, "otp_login", "email_ip", emailIPHash)
	return out, nil
}

// SignAccess menerbitkan access token JWT pendek dengan session id (AUTH-08).
func (s *Service) SignAccess(userID, sessionID, role string, now time.Time) (string, int64, error) {
	claims := jwt.Claims{
		Iss: s.Cfg.JWTIssuer, Aud: s.Cfg.JWTAudience,
		Sub: userID, Sid: sessionID, Role: role,
		Iat: now.Unix(), Nbf: now.Unix(), Exp: now.Add(s.Cfg.AccessTokenTTL).Unix(),
	}
	tok, err := jwt.Sign(s.Cfg.JWTSigningKey, claims)
	return tok, int64(s.Cfg.AccessTokenTTL.Seconds()), err
}

// --- kebijakan throttle (PRD §6.2) ---

func (s *Service) checkLocks(ctx context.Context, flow, emailHash, emailIPHash string) error {
	for _, sc := range []struct{ scope, key string }{
		{"email", emailHash},
		{"email_ip", emailIPHash},
	} {
		until, locked, err := s.Repo.CheckLocked(ctx, flow, sc.scope, sc.key)
		if err != nil {
			return err
		}
		if locked {
			return &ThrottleError{RetryAfter: time.Until(until)}
		}
	}
	return nil
}

func (s *Service) recordPasswordFailure(ctx context.Context, emailHash, ipHash, emailIPHash string) error {
	count, err := s.Repo.RecordFailure(ctx, "password", "email", emailHash)
	if err != nil {
		return err
	}
	if count%passwordFailBlock == 0 {
		wave := count / passwordFailBlock
		if wave == 1 {
			if err := s.Repo.ApplyLock(ctx, "password", "email", emailHash, time.Now().Add(passwordWave1Lock)); err != nil {
				return err
			}
			return &ThrottleError{RetryAfter: passwordWave1Lock}
		}
		if err := s.Repo.ApplyLock(ctx, "password", "email", emailHash, time.Now().Add(passwordWave2Lock)); err != nil {
			return err
		}
		if err := s.Repo.ApplyLock(ctx, "password", "email_ip", emailIPHash, time.Now().Add(passwordWave2Lock)); err != nil {
			return err
		}
		return &ThrottleError{RetryAfter: passwordWave2Lock}
	}
	return nil
}

func (s *Service) recordOTPFailure(ctx context.Context, flow, email, ip string, ch *Challenge, emailHash, ipHash, emailIPHash, requestID string) error {
	attempt, ok, err := s.Repo.IncAttempt(ctx, ch.ID)
	if err != nil {
		return err
	}
	if !ok {
		return ErrOTPInvalid
	}
	s.Repo.Event(ctx, flow, "otp_verify", "fail", emailHash, ipHash, requestID)

	// Akhir ronde (5 salah pada tantangan ini) → lock lintas ronde.
	if attempt == otpAttemptsPerRound {
		var lock time.Duration
		switch {
		case flow == "otp_register" && ch.RoundNumber == 2:
			lock = otpRegisterRound2Lock
		case flow == "otp_register" && ch.RoundNumber >= 3:
			lock = otpRound3Lock
		case flow == "otp_login" && ch.RoundNumber >= 2:
			lock = otpLoginRound2Lock
		}
		if lock > 0 {
			if err := s.Repo.ApplyLock(ctx, flow, "email_ip", emailIPHash, time.Now().Add(lock)); err != nil {
				return err
			}
			return &ThrottleError{RetryAfter: lock}
		}
	}
	return ErrOTPInvalid
}

func errInvalidUser() error { return errors.New("user tidak ditemukan untuk sesi baru") }

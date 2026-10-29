package auth

import (
	"errors"
	"time"
)

// Respons publik generik: jangan membocorkan ada/tidaknya akun (AUTH-06, §12.3).
var (
	ErrInvalidCredentials = errors.New("Email atau password salah")
	ErrOTPInvalid         = errors.New("Kode OTP salah atau sudah kedaluwarsa")
	ErrPreAuthInvalid     = errors.New("Verifikasi login kedaluwarsa; silakan login ulang")
	ErrEscalation         = errors.New("Terlalu banyak percobaan. Hubungi dukungan untuk melanjutkan")
	ErrRegisterConflict   = errors.New("Pendaftaran tidak dapat diselesaikan; silakan ulangi")
)

// ValidationError membawa pesan per-field untuk envelope VALIDATION_ERROR.
type ValidationError struct {
	Fields map[string]string
}

func (e *ValidationError) Error() string { return "Data yang dimasukkan tidak valid" }

// ThrottleError menyatakan lockout aktif; RetryAfter untuk header Retry-After.
// Waktu tunggu tidak membocorkan counter email pihak lain (PRD §6.2).
type ThrottleError struct {
	RetryAfter time.Duration
}

func (e *ThrottleError) Error() string { return "Terlalu banyak percobaan; coba lagi nanti" }

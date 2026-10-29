package validate

import (
	"errors"
	"fmt"
	"regexp"
	"strings"
)

// Validasi server adalah otoritatif; frontend hanya membantu pengalaman (PRD §11).

var (
	emailRe   = regexp.MustCompile(`^[^@\s]+@[^@\s]+\.[^@\s]+$`)
	usernameRe = regexp.MustCompile(`^[a-z0-9][a-z0-9_.]{1,28}[a-z0-9]$`)
	otpRe     = regexp.MustCompile(`^[0-9]{6}$`)
)

const (
	MaxEmailLen    = 254
	MaxUsernameLen = 30
	MinUsernameLen = 3
	MinPasswordLen = 10
	MaxPasswordLen = 128
	MaxQuantity    = 99
	MaxPriceMinor  = 10_000_000_000 // Rp 100.000.000,00 dalam sen
	MaxOrderItems  = 50
)

// NormalizeEmail: trim + lowercase konsisten sebelum jadi kunci apapun (PRD §6.2).
func NormalizeEmail(s string) (string, error) {
	e := strings.ToLower(strings.TrimSpace(s))
	if len(e) > MaxEmailLen || !emailRe.MatchString(e) || len(strings.SplitN(e, "@", 2)[0]) == 0 {
		return "", errors.New("Format email tidak valid")
	}
	return e, nil
}

// NormalizeUsername: lowercase; huruf/angka/underscore/titik; diawali & diakhiri alfanumerik.
func NormalizeUsername(s string) (string, error) {
	u := strings.ToLower(strings.TrimSpace(s))
	if len(u) < MinUsernameLen || len(u) > MaxUsernameLen || !usernameRe.MatchString(u) ||
		strings.Contains(u, "..") || strings.Contains(u, "__") {
		return "", errors.New("Username 3-30 karakter; hanya huruf kecil, angka, titik, underscore")
	}
	return u, nil
}

// ValidatePassword: panjang 10-128; menerima apapun dari password manager
// tanpa aturan komposisi yang memicu password mudah ditebak (PRD §11).
func ValidatePassword(s string) error {
	if len(s) < MinPasswordLen || len(s) > MaxPasswordLen {
		return fmt.Errorf("Password %d-%d karakter", MinPasswordLen, MaxPasswordLen)
	}
	return nil
}

func ValidateOTP(s string) error {
	if !otpRe.MatchString(s) {
		return errors.New("Kode OTP harus 6 digit")
	}
	return nil
}

func ValidateRole(s string) error {
	if s != "buyer" && s != "seller" {
		return errors.New("Peran harus buyer atau seller")
	}
	return nil
}

func ValidateQuantity(q int) error {
	if q < 1 || q > MaxQuantity {
		return errors.New("Kuantitas harus 1-99")
	}
	return nil
}

func ValidatePriceMinor(p int64) error {
	if p < 0 || p > MaxPriceMinor {
		return errors.New("Harga tidak valid")
	}
	return nil
}

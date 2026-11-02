package mailer

import (
	"context"
	"log/slog"
)

// DevMailer hanya untuk APP_ENV != production: kode OTP dicetak ke log server
// agar alur bisa diuji tanpa akun Mailjet. Jangan pernah aktif di production.
type DevMailer struct {
	Log *slog.Logger
}

// Mencatat OTP ke log lokal agar alur verifikasi dapat diuji tanpa provider email.
func (m *DevMailer) SendOTP(_ context.Context, to, code, purpose string) (string, error) {
	m.Log.Warn("DEV MODE: kode OTP dicetak ke log",
		"purpose", purpose, "recipient", to, "otp", code)
	return "dev-console", nil
}

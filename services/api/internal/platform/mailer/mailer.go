package mailer

import "context"

// Mailer mengirim email OTP server-side; kredensial provider tidak pernah
// sampai ke browser (PRD §13).
type Mailer interface {
	// Mengirim kode verifikasi server-side dan mengembalikan ID pesan provider.
	SendOTP(ctx context.Context, to, code, purpose string) (messageID string, err error)
}

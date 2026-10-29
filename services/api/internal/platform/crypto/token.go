package crypto

import (
	"crypto/rand"
	"encoding/base64"
	"math/big"
)

// NewToken menghasilkan token acak 32-byte base64url (refresh/CSRF/pre-auth).
func NewToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

// NewUUID menghasilkan UUIDv4 acak (bukan urutan yang mudah ditebak).
func NewUUID() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return formatUUID(b), nil
}

func formatUUID(b []byte) string {
	const hexDigits = "0123456789abcdef"
	var sb []byte
	for i, by := range b {
		if i == 4 || i == 6 || i == 8 || i == 10 {
			sb = append(sb, '-')
		}
		sb = append(sb, hexDigits[by>>4], hexDigits[by&0x0f])
	}
	return string(sb)
}

// publicCodeAlphabet base32 tanpa karakter ambigu (ORD-08).
const publicCodeAlphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"

// NewPublicCode menghasilkan kode order pendek 6 karakter untuk disebutkan
// di kasir. Kode ini BUKAN token akses: otorisasi tetap dicek per user.
func NewPublicCode() (string, error) {
	out := make([]byte, 6)
	for i := range out {
		n, err := rand.Int(rand.Reader, byteLen)
		if err != nil {
			return "", err
		}
		out[i] = publicCodeAlphabet[n.Int64()]
	}
	return string(out), nil
}

var byteLen = big.NewInt(int64(len(publicCodeAlphabet)))

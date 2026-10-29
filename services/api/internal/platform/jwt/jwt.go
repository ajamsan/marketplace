package jwt

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"errors"
	"strings"
	"time"
)

// HS256 dibuat internal (keputusan D6): header/claims di-marshal langsung,
// signature HMAC-SHA256 dengan perbandingan constant-time. Algoritma SELALU
// dipinjam dari daftar allowlist (AUTH-08, §12.1) — klaim alg klien diabaikan
// dan nilai selain HS256 ditolak.
type Claims struct {
	Iss  string `json:"iss"`
	Aud  string `json:"aud"`
	Sub  string `json:"sub"`
	Sid  string `json:"sid"`
	Role string `json:"role"`
	Iat  int64  `json:"iat"`
	Nbf  int64  `json:"nbf"`
	Exp  int64  `json:"exp"`
}

type header struct {
	Alg string `json:"alg"`
	Typ string `json:"typ"`
}

var (
	ErrMalformed = errors.New("token tidak valid")
	ErrBadAlg    = errors.New("algoritma token tidak diizinkan")
	ErrBadSig    = errors.New("signature token tidak cocok")
	ErrExpired   = errors.New("token kedaluwarsa")
	ErrNotYet    = errors.New("token belum berlaku")
	ErrBadIss    = errors.New("issuer token tidak cocok")
	ErrBadAud    = errors.New("audience token tidak cocok")
)

func b64(b []byte) string { return base64.RawURLEncoding.EncodeToString(b) }

// Sign menerbitkan access token berumur pendek.
func Sign(key []byte, c Claims) (string, error) {
	if c.Nbf == 0 {
		c.Nbf = c.Iat
	}
	hb, err := json.Marshal(header{Alg: "HS256", Typ: "JWT"})
	if err != nil {
		return "", err
	}
	cb, err := json.Marshal(c)
	if err != nil {
		return "", err
	}
	signing := b64(hb) + "." + b64(cb)
	mac := hmac.New(sha256.New, key)
	mac.Write([]byte(signing))
	return signing + "." + b64(mac.Sum(nil)), nil
}

// Verify memvalidasi struktur, algoritma, signature, dan klaim waktu/iss/aud.
func Verify(key []byte, token, issuer, audience string, now time.Time) (*Claims, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return nil, ErrMalformed
	}
	hb, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return nil, ErrMalformed
	}
	var h header
	if err := json.Unmarshal(hb, &h); err != nil {
		return nil, ErrMalformed
	}
	if h.Alg != "HS256" {
		return nil, ErrBadAlg
	}
	mac := hmac.New(sha256.New, key)
	mac.Write([]byte(parts[0] + "." + parts[1]))
	sig, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil || len(sig) != sha256.Size {
		return nil, ErrMalformed
	}
	if subtle.ConstantTimeCompare(mac.Sum(nil), sig) != 1 {
		return nil, ErrBadSig
	}
	cb, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, ErrMalformed
	}
	var c Claims
	if err := json.Unmarshal(cb, &c); err != nil {
		return nil, ErrMalformed
	}
	const leeway = 30 * time.Second
	if now.After(time.Unix(c.Exp, 0).Add(leeway)) {
		return nil, ErrExpired
	}
	if now.Add(leeway).Before(time.Unix(c.Nbf, 0)) {
		return nil, ErrNotYet
	}
	if c.Iss != issuer {
		return nil, ErrBadIss
	}
	if c.Aud != audience {
		return nil, ErrBadAud
	}
	if c.Sub == "" || c.Sid == "" {
		return nil, ErrMalformed
	}
	return &c, nil
}

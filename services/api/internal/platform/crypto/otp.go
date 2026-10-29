package crypto

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"math/big"
)

// GenerateOTP menghasilkan kode OTP 6 digit dari CSPRNG.
func GenerateOTP() (string, error) {
	max := big.NewInt(900000)
	n, err := rand.Int(rand.Reader, max)
	if err != nil {
		return "", err
	}
	return n.Add(n, big.NewInt(100000)).String(), nil
}

// VerifyOTP membandingkan kode dengan hash tersimpan secara constant-time.
// Prefix "otp:" memisahkan domain dari pemakaian HMAC key lain.
func VerifyOTP(key []byte, storedHex, code string) bool {
	stored, err := hex.DecodeString(storedHex)
	if err != nil || len(stored) != sha256.Size {
		return false
	}
	mac := hmac.New(sha256.New, key)
	mac.Write([]byte("otp:" + code))
	return hmac.Equal(mac.Sum(nil), stored)
}

// HashOTP menghitung HMAC-SHA256 dari kode (AUTH-05): OTP tidak pernah
// disimpan sebagai teks biasa.
func HashOTP(key []byte, code string) string {
	mac := hmac.New(sha256.New, key)
	mac.Write([]byte("otp:" + code))
	return hex.EncodeToString(mac.Sum(nil))
}

func hmacHex(key []byte, parts ...string) string {
	mac := hmac.New(sha256.New, key)
	for _, p := range parts {
		mac.Write([]byte(p))
	}
	return hex.EncodeToString(mac.Sum(nil))
}

// HashEmailKey untuk kunci throttle email ternormalisasi.
func HashEmailKey(key []byte, email string) string {
	return hmacHex(key, "email:", email)
}

// HashIPKey untuk kunci throttle IP.
func HashIPKey(key []byte, ip string) string {
	return hmacHex(key, "ip:", ip)
}

// HashEmailIPKey untuk kunci throttle gabungan email+IP.
func HashEmailIPKey(key []byte, email, ip string) string {
	return hmacHex(key, "email_ip:", email, "|", ip)
}

// HashToken meng-hash token entropi tinggi (refresh, CSRF, pre-auth) dengan
// SHA-256; token asli hanya dikirim ke klien sekali.
func HashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
)

// Enkripsi berumur pendek untuk kode OTP di email_outbox (PRD §9.1 memperbolehkan
// penyimpanan terenkripsi untuk pengiriman ulang). Key diturunkan dari OTP_HASH_KEY
// dengan domain separation; nonce acak per pesan (AES-256-GCM).
var ErrDecrypt = errors.New("dekripsi payload email gagal")

func mailKey(key []byte) []byte {
	derived := sha256.Sum256(append(append([]byte{}, key...), []byte("outbox-mail")...))
	return derived[:]
}

func EncryptSecret(key []byte, plaintext string) (string, error) {
	block, err := aes.NewCipher(mailKey(key))
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return "", err
	}
	sealed := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.RawURLEncoding.EncodeToString(sealed), nil
}

func DecryptSecret(key []byte, encoded string) (string, error) {
	data, err := base64.RawURLEncoding.DecodeString(encoded)
	if err != nil {
		return "", ErrDecrypt
	}
	block, err := aes.NewCipher(mailKey(key))
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	if len(data) < gcm.NonceSize() {
		return "", ErrDecrypt
	}
	plain, err := gcm.Open(nil, data[:gcm.NonceSize()], data[gcm.NonceSize():], nil)
	if err != nil {
		return "", ErrDecrypt
	}
	return string(plain), nil
}

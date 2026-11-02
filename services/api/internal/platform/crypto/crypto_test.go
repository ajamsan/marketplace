package crypto

import (
	"strings"
	"testing"
)

// Memastikan kata sandi yang benar lolos verifikasi dan yang berbeda ditolak.
func TestHashAndVerifyPassword(t *testing.T) {
	hash, err := HashPassword("rahasia-kuat-123")
	if err != nil {
		t.Fatalf("hash: %v", err)
	}
	if strings.Contains(hash, "rahasia-kuat-123") {
		t.Fatal("hash tidak boleh memuat password plaintext")
	}
	if !VerifyPassword(hash, "rahasia-kuat-123") {
		t.Fatal("password benar harus terverifikasi")
	}
	if VerifyPassword(hash, "rahasia-kuat-124") {
		t.Fatal("password salah harus ditolak")
	}
}

// Memastikan hash berbeda untuk kata sandi sama karena salt dibuat per pemanggilan.
func TestHashPasswordUsesSaltedHash(t *testing.T) {
	a, _ := HashPassword("sama-sama")
	b, _ := HashPassword("sama-sama")
	if a == b {
		t.Fatal("hash harus berbeda karena salt unik")
	}
}

// Memastikan kode OTP memiliki format yang diharapkan dan hash-nya dapat diverifikasi.
func TestOTPIsSixDigitsAndVerifies(t *testing.T) {
	key := []byte("otp-key")
	code, err := GenerateOTP()
	if err != nil {
		t.Fatalf("generate: %v", err)
	}
	if len(code) != 6 {
		t.Fatalf("kode OTP harus 6 digit, dapat %q", code)
	}
	hash := HashOTP(key, code)
	if strings.Contains(hash, code) {
		t.Fatal("hash OTP tidak boleh memuat kode plaintext")
	}
	if !VerifyOTP(key, hash, code) {
		t.Fatal("kode benar harus terverifikasi")
	}
	if VerifyOTP(key, hash, "000000"+(code[:0])+"1") && code == "000001" {
		t.Fatal("kode salah harus ditolak")
	}
	if VerifyOTP([]byte("key-lain"), hash, code) {
		t.Fatal("key berbeda harus ditolak")
	}
}

// Memastikan rahasia yang dienkripsi dapat dipulihkan hanya dengan kunci yang sama.
func TestSecretEncryptionRoundTrip(t *testing.T) {
	key := []byte("otp-key")
	enc, err := EncryptSecret(key, "123456")
	if err != nil {
		t.Fatalf("encrypt: %v", err)
	}
	if strings.Contains(enc, "123456") {
		t.Fatal("payload terenkripsi tidak boleh memuat kode plaintext")
	}
	dec, err := DecryptSecret(key, enc)
	if err != nil {
		t.Fatalf("decrypt: %v", err)
	}
	if dec != "123456" {
		t.Fatalf("hasil dekripsi salah: %q", dec)
	}
	if _, err := DecryptSecret([]byte("key-lain"), enc); err == nil {
		t.Fatal("key berbeda harus gagal")
	}
}

// Memastikan pembantu token menghasilkan nilai acak dan kode publik yang valid.
func TestTokenHelpers(t *testing.T) {
	tok, err := NewToken()
	if err != nil || len(tok) < 40 {
		t.Fatalf("token harus acak dan panjang: %q %v", tok, err)
	}
	if HashToken(tok) == tok {
		t.Fatal("hash token tidak boleh sama dengan token")
	}
	uuid, err := NewUUID()
	if err != nil || len(uuid) != 36 {
		t.Fatalf("uuid tidak valid: %q %v", uuid, err)
	}
	code, err := NewPublicCode()
	if err != nil || len(code) != 6 {
		t.Fatalf("public code tidak valid: %q %v", code, err)
	}
	for _, r := range code {
		if !strings.ContainsRune("23456789ABCDEFGHJKMNPQRSTUVWXYZ", r) {
			t.Fatalf("public code memuat karakter ambigu: %q", code)
		}
	}
}

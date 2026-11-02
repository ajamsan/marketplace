package jwt

import (
	"errors"
	"testing"
	"time"
)

var testKey = []byte("unit-test-signing-key-1234567890")

// Memastikan token yang diterbitkan dapat diverifikasi dengan klaim aslinya.
func TestSignAndVerify(t *testing.T) {
	now := time.Now()
	claims := Claims{
		Iss: "kantin-kampus-api", Aud: "kantin-kampus-web",
		Sub: "user-1", Sid: "session-1", Role: "buyer",
		Iat: now.Unix(), Nbf: now.Unix(), Exp: now.Add(10 * time.Minute).Unix(),
	}
	tok, err := Sign(testKey, claims)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}
	got, err := Verify(testKey, tok, "kantin-kampus-api", "kantin-kampus-web", now)
	if err != nil {
		t.Fatalf("verify: %v", err)
	}
	if got.Sub != "user-1" || got.Sid != "session-1" || got.Role != "buyer" {
		t.Fatalf("claims tidak sesuai: %+v", got)
	}
}

// Memastikan perubahan payload membatalkan signature token.
func TestVerifyRejectsTamperedPayload(t *testing.T) {
	now := time.Now()
	tok, err := Sign(testKey, Claims{
		Iss: "iss", Aud: "aud", Sub: "u", Sid: "s", Role: "buyer",
		Iat: now.Unix(), Nbf: now.Unix(), Exp: now.Add(time.Minute).Unix(),
	})
	if err != nil {
		t.Fatalf("sign: %v", err)
	}
	tampered := tok[:len(tok)-2] + "xy"
	if _, err := Verify(testKey, tampered, "iss", "aud", now); err == nil {
		t.Fatal("token yang dimodifikasi harus ditolak")
	}
}

// Memastikan verifier menolak token yang meminta algoritma tanpa signature.
func TestVerifyRejectsAlgNone(t *testing.T) {
	now := time.Now()
	// header {"alg":"none","typ":"JWT"} tanpa signature
	header := "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0"
	payload := "eyJpc3MiOiJpc3MiLCJhdWQiOiJhdWQiLCJzdWIiOiJ1Iiwic2lkIjoicyIsInJvbGUiOiJidWllciIsImlhdCI6MSwibmJmIjoxLCJleHAiOjk5OTk5OTk5OTl9"
	if _, err := Verify(testKey, header+"."+payload+".", "iss", "aud", now); err == nil {
		t.Fatal("alg none harus ditolak")
	}
}

// Memastikan token tidak lolos verifikasi dengan kunci yang berbeda.
func TestVerifyRejectsWrongKey(t *testing.T) {
	now := time.Now()
	tok, _ := Sign(testKey, Claims{Iss: "iss", Aud: "aud", Sub: "u", Sid: "s",
		Iat: now.Unix(), Nbf: now.Unix(), Exp: now.Add(time.Minute).Unix()})
	if _, err := Verify([]byte("other-key-other-key-other-key1234"), tok, "iss", "aud", now); err == nil {
		t.Fatal("key berbeda harus ditolak")
	}
}

// Memastikan klaim waktu kedaluwarsa membatasi penggunaan token.
func TestVerifyRejectsExpired(t *testing.T) {
	now := time.Now()
	tok, _ := Sign(testKey, Claims{Iss: "iss", Aud: "aud", Sub: "u", Sid: "s",
		Iat: now.Add(-2 * time.Hour).Unix(), Nbf: now.Add(-2 * time.Hour).Unix(),
		Exp: now.Add(-time.Hour).Unix()})
	_, err := Verify(testKey, tok, "iss", "aud", now)
	if !errors.Is(err, ErrExpired) {
		t.Fatalf("harus ErrExpired, dapat %v", err)
	}
}

// Memastikan identitas penerbit dan penerima token harus cocok dengan konfigurasi.
func TestVerifyRejectsWrongIssuerAndAudience(t *testing.T) {
	now := time.Now()
	tok, _ := Sign(testKey, Claims{Iss: "iss", Aud: "aud", Sub: "u", Sid: "s",
		Iat: now.Unix(), Nbf: now.Unix(), Exp: now.Add(time.Minute).Unix()})
	if _, err := Verify(testKey, tok, "other", "aud", now); !errors.Is(err, ErrBadIss) {
		t.Fatalf("issuer salah harus ditolak, dapat %v", err)
	}
	if _, err := Verify(testKey, tok, "iss", "other", now); !errors.Is(err, ErrBadAud) {
		t.Fatalf("audience salah harus ditolak, dapat %v", err)
	}
}

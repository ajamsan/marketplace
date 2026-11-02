package validate

import "testing"

// Memastikan email dinormalisasi dan input yang tidak sesuai ditolak.
func TestNormalizeEmail(t *testing.T) {
	got, err := NormalizeEmail("  User@Example.COM ")
	if err != nil || got != "user@example.com" {
		t.Fatalf("normalisasi email salah: %q %v", got, err)
	}
	for _, bad := range []string{"", "tanpa-at", "a@b", "a@@b.com", "a b@c.com"} {
		if _, err := NormalizeEmail(bad); err == nil {
			t.Fatalf("email %q harus ditolak", bad)
		}
	}
}

// Memastikan nama pengguna dibersihkan dan aturan karakternya ditegakkan.
func TestNormalizeUsername(t *testing.T) {
	got, err := NormalizeUsername("Azzam San")
	if err != nil || got != "Azzam San" {
		t.Fatalf("normalisasi username salah: %q %v", got, err)
	}
	for _, bad := range []string{"ab", "azzam123", "a.b", "a_b", "123", "  ", "Azzam  San"} {
		if _, err := NormalizeUsername(bad); err == nil {
			t.Fatalf("username %q harus ditolak", bad)
		}
	}
}

// Memastikan kata sandi yang terlalu pendek tidak lolos kebijakan.
func TestValidatePassword(t *testing.T) {
	if err := ValidatePassword("rahasia-kuat-123"); err != nil {
		t.Fatalf("password valid ditolak: %v", err)
	}
	if err := ValidatePassword("pendek"); err == nil {
		t.Fatal("password pendek harus ditolak")
	}
	long := make([]byte, 200)
	for i := range long {
		long[i] = 'a'
	}
	if err := ValidatePassword(string(long)); err == nil {
		t.Fatal("password terlalu panjang harus ditolak")
	}
}

// Memastikan batas OTP, jumlah item, dan harga diterapkan pada nilai batas.
func TestValidateOTPQuantityPrice(t *testing.T) {
	if err := ValidateOTP("123456"); err != nil {
		t.Fatalf("OTP valid ditolak: %v", err)
	}
	if err := ValidateOTP("12345"); err == nil {
		t.Fatal("OTP 5 digit harus ditolak")
	}
	if err := ValidateQuantity(0); err == nil {
		t.Fatal("kuantitas 0 harus ditolak")
	}
	if err := ValidateQuantity(100); err == nil {
		t.Fatal("kuantitas > 99 harus ditolak")
	}
	if err := ValidatePriceMinor(-1); err == nil {
		t.Fatal("harga negatif harus ditolak")
	}
	if err := ValidatePriceMinor(1_500_000); err != nil {
		t.Fatalf("harga valid ditolak: %v", err)
	}
}

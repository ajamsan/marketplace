package integration

import (
	"bytes"
	"encoding/json"
	"net/http"
	"sync"
	"testing"
)

// doWithoutFatal melakukan request tanpa memanggil t.Fatal di dalam goroutine.
// Mengirim permintaan uji yang mengembalikan hasil tanpa menghentikan skenario.
func (e *env) doWithoutFatal(method, path string, body any, token string) (int, error) {
	var reader *bytes.Reader
	if body != nil {
		raw, _ := json.Marshal(body)
		reader = bytes.NewReader(raw)
	} else {
		reader = bytes.NewReader(nil)
	}
	req, err := http.NewRequest(method, e.ts.URL+path, reader)
	if err != nil {
		return 0, err
	}
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	resp, err := e.client.Do(req)
	if err != nil {
		return 0, err
	}
	defer func() { _ = resp.Body.Close() }()
	return resp.StatusCode, nil
}

// TestConcurrentOTPAttemptsCannotBypassLimit memastikan percobaan paralel tidak
// melewati ambang 5 percobaan per ronde (PRD §6.2).
// Memastikan permintaan paralel tidak melewati batas percobaan OTP.
func TestConcurrentOTPAttemptsCannotBypassLimit(t *testing.T) {
	e := newEnv(t)
	reg := e.do(t, http.MethodPost, "/api/v1/auth/register", map[string]string{
		"username": "abuse.tester", "email": "abuse@example.com",
		"password": "password-kuat-123", "role": "buyer",
	}, "", nil)
	if reg.status != http.StatusOK {
		t.Fatalf("register: %d %s", reg.status, reg.raw)
	}

	const attempts = 12
	var wg sync.WaitGroup
	statuses := make([]int, attempts)
	errs := make([]error, attempts)
	for i := 0; i < attempts; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			statuses[idx], errs[idx] = e.doWithoutFatal(http.MethodPost, "/api/v1/auth/register/verify",
				map[string]string{"email": "abuse@example.com", "otp": "000000"}, "")
		}(i)
	}
	wg.Wait()

	for i, err := range errs {
		if err != nil {
			t.Fatalf("request %d gagal: %v", i, err)
		}
		if statuses[i] == http.StatusOK {
			t.Fatalf("percobaan paralel dengan OTP salah tidak boleh berhasil")
		}
	}

	// Setelah ambang terlampaui, tantangan harus terkunci.
	blocked := e.do(t, http.MethodPost, "/api/v1/auth/register/verify",
		map[string]string{"email": "abuse@example.com", "otp": "000000"}, "", nil)
	if blocked.status != http.StatusTooManyRequests {
		t.Fatalf("harus 429 setelah ambang terlampaui, dapat %d", blocked.status)
	}
}

// TestResendDoesNotClearLockout memastikan resend tidak menghapus lock aktif.
// Memastikan pengiriman ulang kode tidak menghapus masa penguncian aktif.
func TestResendDoesNotClearLockout(t *testing.T) {
	e := newEnv(t)
	reg := e.do(t, http.MethodPost, "/api/v1/auth/register", map[string]string{
		"username": "resend.tester", "email": "resend@example.com",
		"password": "password-kuat-123", "role": "buyer",
	}, "", nil)
	if reg.status != http.StatusOK {
		t.Fatalf("register: %d %s", reg.status, reg.raw)
	}

	for i := 0; i < 5; i++ {
		resp := e.do(t, http.MethodPost, "/api/v1/auth/register/verify",
			map[string]string{"email": "resend@example.com", "otp": "111111"}, "", nil)
		if resp.status != http.StatusBadRequest {
			t.Fatalf("percobaan %d harus 400, dapat %d", i+1, resp.status)
		}
	}

	resend := e.do(t, http.MethodPost, "/api/v1/auth/otp/resend",
		map[string]string{"email": "resend@example.com", "purpose": "register"}, "", nil)
	if resend.status != http.StatusTooManyRequests {
		t.Fatalf("resend saat lock aktif harus 429, dapat %d", resend.status)
	}

	verify := e.do(t, http.MethodPost, "/api/v1/auth/register/verify",
		map[string]string{"email": "resend@example.com", "otp": "111111"}, "", nil)
	if verify.status != http.StatusTooManyRequests {
		t.Fatalf("verifikasi saat lock aktif harus 429, dapat %d", verify.status)
	}
}

// TestPasswordFailuresAreCountedAcrossRequests memastikan request login baru
// tidak mereset counter password yang sedang berjalan.
// Memastikan kegagalan kata sandi dihitung lintas permintaan terpisah.
func TestPasswordFailuresAreCountedAcrossRequests(t *testing.T) {
	e := newEnv(t)
	e.seedUser(t, "buyer.pw", "pw@example.com", "password-kuat-123", "buyer")

	for i := 0; i < 4; i++ {
		resp := e.do(t, http.MethodPost, "/api/v1/auth/login",
			map[string]string{"email": "pw@example.com", "password": "password-salah-999"}, "", nil)
		if resp.status != http.StatusUnauthorized {
			t.Fatalf("percobaan %d harus 401, dapat %d", i+1, resp.status)
		}
	}

	// Percobaan kelima memicu lock 3 menit (gelombang 1).
	locked := e.do(t, http.MethodPost, "/api/v1/auth/login",
		map[string]string{"email": "pw@example.com", "password": "password-salah-999"}, "", nil)
	if locked.status != http.StatusTooManyRequests {
		t.Fatalf("percobaan kelima harus 429, dapat %d", locked.status)
	}

	// Password benar selama lock aktif tetap ditolak.
	correct := e.do(t, http.MethodPost, "/api/v1/auth/login",
		map[string]string{"email": "pw@example.com", "password": "password-kuat-123"}, "", nil)
	if correct.status != http.StatusTooManyRequests {
		t.Fatalf("login saat lock aktif harus 429, dapat %d", correct.status)
	}
}

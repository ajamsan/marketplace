package integration

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"testing"

	"kantinkampus/api/internal/platform/crypto"
)

type rawResponse struct {
	status  int
	body    map[string]any
	cookies map[string]*http.Cookie
}

// Mengirim permintaan mentah agar cookie refresh dan header CSRF dapat diuji langsung.
func (e *env) rawRequest(t *testing.T, method, path string, body any, token, csrf, refresh string) rawResponse {
	t.Helper()
	var reader io.Reader
	if body != nil {
		raw, _ := json.Marshal(body)
		reader = bytes.NewReader(raw)
	}
	req, err := http.NewRequest(method, e.ts.URL+path, reader)
	if err != nil {
		t.Fatalf("request: %v", err)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	if csrf != "" {
		req.Header.Set("X-CSRF-Token", csrf)
		req.AddCookie(&http.Cookie{Name: "kk_csrf", Value: csrf})
	}
	if refresh != "" {
		req.AddCookie(&http.Cookie{Name: "kk_rt", Value: refresh})
	}
	resp, err := e.client.Do(req)
	if err != nil {
		t.Fatalf("do: %v", err)
	}
	defer func() { _ = resp.Body.Close() }()
	raw, _ := io.ReadAll(resp.Body)
	out := rawResponse{status: resp.StatusCode, cookies: map[string]*http.Cookie{}}
	_ = json.Unmarshal(raw, &out.body)
	for _, cookie := range resp.Cookies() {
		out.cookies[cookie.Name] = cookie
	}
	return out
}

// loginWithCookies melakukan login penuh dan mengembalikan access token serta
// cookie refresh/CSRF yang perlu diuji.
// Menyelesaikan login dan mengambil token serta cookie yang diperlukan pengujian.
func (e *env) loginWithCookies(t *testing.T, email, password string) (accessToken, refresh, csrf string) {
	t.Helper()
	mark := e.mailer.count()
	login := e.rawRequest(t, http.MethodPost, "/api/v1/auth/login",
		map[string]string{"email": email, "password": password}, "", "", "")
	if login.status != http.StatusOK {
		t.Fatalf("login: %d %v", login.status, login.body)
	}
	preAuth, _ := login.body["data"].(map[string]any)["pre_auth_token"].(string)
	code := e.awaitOTP(t, mark)

	verify := e.rawRequest(t, http.MethodPost, "/api/v1/auth/login/verify",
		map[string]string{"pre_auth_token": preAuth, "otp": code}, "", "", "")
	if verify.status != http.StatusOK {
		t.Fatalf("verify login: %d %v", verify.status, verify.body)
	}
	accessToken, _ = verify.body["data"].(map[string]any)["access_token"].(string)
	if rt := verify.cookies["kk_rt"]; rt != nil {
		refresh = rt.Value
	}
	if cs := verify.cookies["kk_csrf"]; cs != nil {
		csrf = cs.Value
	}
	if accessToken == "" || refresh == "" || csrf == "" {
		t.Fatal("login harus mengembalikan access token dan cookie kk_rt/kk_csrf")
	}
	return accessToken, refresh, csrf
}

// TestRefreshRotationAndReuseDetection memverifikasi rotasi refresh token dan
// pencabutan keluarga token saat token lama dipakai ulang (AUTH-09).
// Memastikan rotasi refresh token mendeteksi pemakaian ulang dan mencabut keluarganya.
func TestRefreshRotationAndReuseDetection(t *testing.T) {
	e := newEnv(t)
	e.seedUser(t, "buyer.rot", "rot@example.com", "password-kuat-123", "buyer")

	access, refresh, csrf := e.loginWithCookies(t, "rot@example.com", "password-kuat-123")

	rotated := e.rawRequest(t, http.MethodPost, "/api/v1/auth/refresh", nil, "", csrf, refresh)
	if rotated.status != http.StatusOK {
		t.Fatalf("refresh harus 200, dapat %d %v", rotated.status, rotated.body)
	}
	newAccess, _ := rotated.body["data"].(map[string]any)["access_token"].(string)
	if newAccess == "" {
		t.Fatal("refresh harus mengembalikan access token baru")
	}
	newRefresh := ""
	if rt := rotated.cookies["kk_rt"]; rt != nil {
		newRefresh = rt.Value
	}
	if newRefresh == "" || newRefresh == refresh {
		t.Fatal("refresh token harus dirotasi")
	}

	// Token lama dipakai ulang → keluarga token dicabut.
	reuse := e.rawRequest(t, http.MethodPost, "/api/v1/auth/refresh", nil, "", csrf, refresh)
	if reuse.status != http.StatusUnauthorized {
		t.Fatalf("reuse harus 401, dapat %d %v", reuse.status, reuse.body)
	}

	// Token baru juga mati karena seluruh keluarga dicabut.
	afterReuse := e.rawRequest(t, http.MethodPost, "/api/v1/auth/refresh", nil, "", csrf, newRefresh)
	if afterReuse.status != http.StatusUnauthorized {
		t.Fatalf("setelah reuse keluarga harus dicabut, dapat %d", afterReuse.status)
	}

	// Refresh tanpa header CSRF ditolak.
	noCSRF := e.rawRequest(t, http.MethodPost, "/api/v1/auth/refresh", nil, "", "", newRefresh)
	if noCSRF.status != http.StatusUnauthorized {
		t.Fatalf("refresh tanpa CSRF harus 401, dapat %d", noCSRF.status)
	}

	_ = access
}

// TestLogoutRevokesSession memastikan logout mencabut sesi saat ini.
// Memastikan logout mencabut sesi server dan membersihkan cookie klien.
func TestLogoutRevokesSession(t *testing.T) {
	e := newEnv(t)
	e.seedUser(t, "buyer.out", "out@example.com", "password-kuat-123", "buyer")

	access, refresh, csrf := e.loginWithCookies(t, "out@example.com", "password-kuat-123")

	logout := e.rawRequest(t, http.MethodPost, "/api/v1/auth/logout", nil, access, "", "")
	if logout.status != http.StatusOK {
		t.Fatalf("logout harus 200, dapat %d %v", logout.status, logout.body)
	}

	refreshAfterLogout := e.rawRequest(t, http.MethodPost, "/api/v1/auth/refresh", nil, "", csrf, refresh)
	if refreshAfterLogout.status != http.StatusUnauthorized {
		t.Fatalf("sesi setelah logout harus ditolak, dapat %d", refreshAfterLogout.status)
	}
}

// TestSellerProductsList memastikan seller hanya melihat produk stan yang dikelolanya.
// Memastikan penjual hanya melihat produk dari stan yang dikelolanya.
func TestSellerProductsList(t *testing.T) {
	e := newEnv(t)
	sellerA := e.seedUser(t, "seller.lista", "selleraa@example.com", "password-kuat-123", "seller")
	sellerB := e.seedUser(t, "seller.listb", "sellerbb@example.com", "password-kuat-123", "seller")

	stallA, _ := crypto.NewUUID()
	stallB, _ := crypto.NewUUID()
	if _, err := e.db.Exec(`INSERT INTO stalls (id, name, status, created_by) VALUES ($1,'Stan List A','active',$2)`,
		stallA, sellerA); err != nil {
		t.Fatal(err)
	}
	if _, err := e.db.Exec(`INSERT INTO stalls (id, name, status, created_by) VALUES ($1,'Stan List B','active',$2)`,
		stallB, sellerB); err != nil {
		t.Fatal(err)
	}
	if _, err := e.db.Exec(`INSERT INTO seller_stalls (seller_id, stall_id, role) VALUES ($1,$2,'owner')`,
		sellerA, stallA); err != nil {
		t.Fatal(err)
	}
	if _, err := e.db.Exec(`INSERT INTO seller_stalls (seller_id, stall_id, role) VALUES ($1,$2,'owner')`,
		sellerB, stallB); err != nil {
		t.Fatal(err)
	}
	productA, _ := crypto.NewUUID()
	if _, err := e.db.Exec(`INSERT INTO products (id, stall_id, name, price_minor, availability_status, created_by)
		VALUES ($1,$2,'Produk A',100000,'available',$3)`, productA, stallA, sellerA); err != nil {
		t.Fatal(err)
	}

	token := e.loginThroughOTP(t, "selleraa@example.com", "password-kuat-123")
	list := e.do(t, http.MethodGet, "/api/v1/seller/products", nil, token, nil)
	if list.status != http.StatusOK {
		t.Fatalf("daftar produk seller harus 200, dapat %d %s", list.status, list.raw)
	}
	products, _ := list.body["data"].(map[string]any)["products"].([]any)
	if len(products) != 1 {
		t.Fatalf("seller harus melihat 1 produk, dapat %d", len(products))
	}
	seen, _ := products[0].(map[string]any)["id"].(string)
	if seen != productA {
		t.Fatalf("produk yang terlihat harus milik seller sendiri")
	}
}

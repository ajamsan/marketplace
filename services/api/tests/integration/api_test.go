package integration

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"testing"
	"time"

	"kantinkampus/api/internal/audit"
	"kantinkampus/api/internal/auth"
	"kantinkampus/api/internal/cart"
	"kantinkampus/api/internal/catalog"
	httpapi "kantinkampus/api/internal/http"
	"kantinkampus/api/internal/orders"
	"kantinkampus/api/internal/outbox"
	"kantinkampus/api/internal/payments"
	"kantinkampus/api/internal/platform/config"
	"kantinkampus/api/internal/platform/crypto"
	"kantinkampus/api/internal/platform/db"
	"kantinkampus/api/internal/platform/httpx"
	"kantinkampus/api/internal/platform/mailer"
	"kantinkampus/api/internal/platform/storage"
	"kantinkampus/api/internal/sessions"
	"kantinkampus/api/internal/stalls"
	"kantinkampus/api/internal/users"
)

// testMailer menangkap kode OTP agar test dapat menyimulasikan verifikasi.
type testMailer struct {
	mu    sync.Mutex
	codes []string
}

func (m *testMailer) SendOTP(_ context.Context, _ string, code string, _ string) (string, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.codes = append(m.codes, code)
	return "test-message-id", nil
}

func (m *testMailer) last() string {
	m.mu.Lock()
	defer m.mu.Unlock()
	if len(m.codes) == 0 {
		return ""
	}
	return m.codes[len(m.codes)-1]
}

func (m *testMailer) count() int {
	m.mu.Lock()
	defer m.mu.Unlock()
	return len(m.codes)
}

func (m *testMailer) at(i int) string {
	m.mu.Lock()
	defer m.mu.Unlock()
	if i < 0 || i >= len(m.codes) {
		return ""
	}
	return m.codes[i]
}

var _ mailer.Mailer = (*testMailer)(nil)

type env struct {
	db     *sql.DB
	mailer *testMailer
	ts     *httptest.Server
	client *http.Client
	cfg    *config.Config
}

func newEnv(t *testing.T) *env {
	t.Helper()
	dsn := os.Getenv("KANTIN_TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("KANTIN_TEST_DATABASE_URL belum diset; integration test dilewati")
	}
	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("config: %v", err)
	}
	cfg.JWTSigningKey = []byte("integration-test-signing-key")
	cfg.OTPHashKey = []byte("integration-test-otp-key")
	cfg.AccessTokenTTL = 10 * time.Minute
	cfg.RefreshIdleTTL = time.Hour
	cfg.RefreshAbsoluteTTL = 24 * time.Hour
	cfg.OTPTTL = 5 * time.Minute
	cfg.OTPResendCooldown = time.Second
	cfg.OTPMaxRounds = 3
	cfg.MaxUploadBytes = 1 << 20

	database, err := db.Open(context.Background(), dsn)
	if err != nil {
		t.Fatalf("db: %v", err)
	}
	applyMigrations(t, database)
	truncate(t, database)

	tm := &testMailer{}
	testLog := slog.New(slog.NewTextHandler(io.Discard, nil))
	auditRepo := audit.NewRepo()
	outboxRepo := outbox.NewRepo(cfg.OTPHashKey)
	sessSvc := sessions.New(database, testLog)
	authSvc := auth.NewService(cfg, database, sessSvc, outboxRepo, testLog)
	usersSvc := users.NewService(cfg, database, storage.Disabled{}, auditRepo)
	stallsSvc := stalls.NewService(database, auditRepo)
	catalogSvc := catalog.NewService(cfg, database, storage.Disabled{}, auditRepo)
	cartSvc := cart.NewService(cfg, database, storage.Disabled{})
	ordersSvc := orders.NewService(cfg, database, auditRepo)
	paymentsSvc := payments.NewService(database, ordersSvc, auditRepo)

	srv := &httpapi.Server{
		Cfg: cfg, Log: testLog, DB: database, Auth: authSvc, Sessions: sessSvc, Users: usersSvc,
		Stalls: stallsSvc, Catalog: catalogSvc, Cart: cartSvc, Orders: ordersSvc,
		Payments: paymentsSvc, Limiter: httpx.NewLimiter(1000, 1000),
	}
	ts := httptest.NewServer(srv.Routes())
	workerCtx, cancelWorker := context.WithCancel(context.Background())
	worker := outbox.NewWorker(database, tm, cfg.OTPHashKey, testLog)
	worker.Interval = 25 * time.Millisecond
	go worker.Run(workerCtx)
	t.Cleanup(func() {
		cancelWorker()
		ts.Close()
		_ = database.Close()
	})
	return &env{db: database, mailer: tm, ts: ts, client: ts.Client(), cfg: cfg}
}

// awaitOTP menunggu kode OTP berikutnya yang dikirim worker outbox.
func (e *env) awaitOTP(t *testing.T, prev int) string {
	t.Helper()
	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		if e.mailer.count() > prev {
			return e.mailer.at(prev)
		}
		time.Sleep(20 * time.Millisecond)
	}
	t.Fatal("kode OTP tidak terkirim dalam 5 detik")
	return ""
}

func applyMigrations(t *testing.T, database *sql.DB) {
	t.Helper()
	var exists bool
	if err := database.QueryRow(`SELECT to_regclass('public.users') IS NOT NULL`).Scan(&exists); err != nil {
		t.Fatalf("cek skema: %v", err)
	}
	if exists {
		return
	}
	dir := filepath.Join("..", "..", "migrations")
	files, err := filepath.Glob(filepath.Join(dir, "*.up.sql"))
	if err != nil || len(files) == 0 {
		t.Fatalf("migrasi tidak ditemukan di %s: %v", dir, err)
	}
	sort.Strings(files)
	for _, f := range files {
		raw, err := os.ReadFile(f)
		if err != nil {
			t.Fatalf("baca %s: %v", f, err)
		}
		if _, err := database.Exec(string(raw)); err != nil {
			t.Fatalf("jalankan migrasi %s: %v", filepath.Base(f), err)
		}
	}
}

func truncate(t *testing.T, database *sql.DB) {
	t.Helper()
	_, err := database.Exec(`TRUNCATE users, pending_registrations, otp_challenges, auth_throttles,
		auth_events, login_sessions, stalls, seller_stalls, products, carts, cart_items,
		orders, order_items, order_stall_fulfillments, payments, payment_events,
		audit_logs, email_outbox RESTART IDENTITY CASCADE`)
	if err != nil {
		t.Fatalf("truncate: %v", err)
	}
}

type apiResponse struct {
	status int
	body   map[string]any
	raw    []byte
}

func (e *env) do(t *testing.T, method, path string, body any, token string, headers map[string]string) apiResponse {
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
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	resp, err := e.client.Do(req)
	if err != nil {
		t.Fatalf("do: %v", err)
	}
	defer func() { _ = resp.Body.Close() }()
	raw, _ := io.ReadAll(resp.Body)
	out := apiResponse{status: resp.StatusCode, raw: raw}
	_ = json.Unmarshal(raw, &out.body)
	return out
}

// seedUser membuat user terverifikasi langsung di DB agar test bisa login.
func (e *env) seedUser(t *testing.T, username, email, password, role string) string {
	t.Helper()
	hash, err := crypto.HashPassword(password)
	if err != nil {
		t.Fatalf("hash: %v", err)
	}
	id, err := crypto.NewUUID()
	if err != nil {
		t.Fatalf("uuid: %v", err)
	}
	_, err = e.db.Exec(`INSERT INTO users (id, username, email_normalized, password_hash, role, status, email_verified_at)
		VALUES ($1,$2,$3,$4,$5,'active', now())`, id, username, email, hash, role)
	if err != nil {
		t.Fatalf("seed user: %v", err)
	}
	return id
}

// loginThroughOTP melakukan login penuh (password + OTP) dan mengembalikan access token.
func (e *env) loginThroughOTP(t *testing.T, email, password string) string {
	t.Helper()
	mark := e.mailer.count()
	resp := e.do(t, http.MethodPost, "/api/v1/auth/login",
		map[string]string{"email": email, "password": password}, "", nil)
	if resp.status != http.StatusOK {
		t.Fatalf("login gagal: %d %s", resp.status, resp.raw)
	}
	preAuth, _ := resp.body["data"].(map[string]any)["pre_auth_token"].(string)
	code := e.awaitOTP(t, mark)
	if code == "" {
		t.Fatal("kode OTP tidak terkirim")
	}
	verify := e.do(t, http.MethodPost, "/api/v1/auth/login/verify",
		map[string]string{"pre_auth_token": preAuth, "otp": code}, "", nil)
	if verify.status != http.StatusOK {
		t.Fatalf("verifikasi login gagal: %d %s", verify.status, verify.raw)
	}
	token, _ := verify.body["data"].(map[string]any)["access_token"].(string)
	if token == "" {
		t.Fatal("access token kosong")
	}
	return token
}

func TestRegisterVerifyAndLoginFlow(t *testing.T) {
	e := newEnv(t)

	reg := e.do(t, http.MethodPost, "/api/v1/auth/register", map[string]string{
		"username": "buyer.baru", "email": "baru@example.com",
		"password": "password-kuat-123", "role": "buyer",
	}, "", nil)
	if reg.status != http.StatusOK {
		t.Fatalf("register: %d %s", reg.status, reg.raw)
	}
	code := e.awaitOTP(t, 0)
	if code == "" {
		t.Fatal("OTP registrasi tidak terkirim")
	}

	// Verifikasi OTP salah harus ditolak.
	bad := e.do(t, http.MethodPost, "/api/v1/auth/register/verify",
		map[string]string{"email": "baru@example.com", "otp": "000000"}, "", nil)
	if bad.status != http.StatusBadRequest {
		t.Fatalf("OTP salah harus 400, dapat %d", bad.status)
	}

	ok := e.do(t, http.MethodPost, "/api/v1/auth/register/verify",
		map[string]string{"email": "baru@example.com", "otp": code}, "", nil)
	if ok.status != http.StatusOK {
		t.Fatalf("verifikasi: %d %s", ok.status, ok.raw)
	}

	// Akun bisa login dengan password + OTP.
	token := e.loginThroughOTP(t, "baru@example.com", "password-kuat-123")
	me := e.do(t, http.MethodGet, "/api/v1/me", nil, token, nil)
	if me.status != http.StatusOK {
		t.Fatalf("me: %d %s", me.status, me.raw)
	}

	// Sesi terdaftar.
	sessionsResp := e.do(t, http.MethodGet, "/api/v1/auth/sessions", nil, token, nil)
	if sessionsResp.status != http.StatusOK {
		t.Fatalf("sessions: %d %s", sessionsResp.status, sessionsResp.raw)
	}
	list, _ := sessionsResp.body["data"].(map[string]any)["sessions"].([]any)
	if len(list) != 1 {
		t.Fatalf("harus ada 1 sesi, dapat %d", len(list))
	}
}

func TestRegisterAntiEnumeration(t *testing.T) {
	e := newEnv(t)
	e.seedUser(t, "sudah.ada", "ada@example.com", "password-kuat-123", "buyer")

	first := e.do(t, http.MethodPost, "/api/v1/auth/register", map[string]string{
		"username": "baru.lain", "email": "ada@example.com",
		"password": "password-kuat-123", "role": "buyer",
	}, "", nil)
	second := e.do(t, http.MethodPost, "/api/v1/auth/register", map[string]string{
		"username": "baru.lain2", "email": "baru2@example.com",
		"password": "password-kuat-123", "role": "buyer",
	}, "", nil)
	if first.status != second.status {
		t.Fatalf("status respons harus sama untuk email terdaftar vs baru: %d vs %d", first.status, second.status)
	}
	msgFirst, _ := first.body["data"].(map[string]any)["status"].(string)
	msgSecond, _ := second.body["data"].(map[string]any)["status"].(string)
	if msgFirst != msgSecond {
		t.Fatalf("respons harus generik sama: %q vs %q", msgFirst, msgSecond)
	}
}

func TestOTPAttemptLimitBlocksChallenge(t *testing.T) {
	e := newEnv(t)
	reg := e.do(t, http.MethodPost, "/api/v1/auth/register", map[string]string{
		"username": "limit.tester", "email": "limit@example.com",
		"password": "password-kuat-123", "role": "buyer",
	}, "", nil)
	if reg.status != http.StatusOK {
		t.Fatalf("register: %d", reg.status)
	}
	// Enam percobaan salah pada ronde pertama: challenge diblokir setelah lima.
	for i := 0; i < 5; i++ {
		resp := e.do(t, http.MethodPost, "/api/v1/auth/register/verify",
			map[string]string{"email": "limit@example.com", "otp": "999999"}, "", nil)
		if resp.status != http.StatusBadRequest {
			t.Fatalf("percobaan %d harus 400, dapat %d", i+1, resp.status)
		}
	}
	blocked := e.do(t, http.MethodPost, "/api/v1/auth/register/verify",
		map[string]string{"email": "limit@example.com", "otp": "999999"}, "", nil)
	if blocked.status != http.StatusTooManyRequests {
		t.Fatalf("setelah 5 salah harus 429, dapat %d", blocked.status)
	}
}

func TestOrderIdempotencyAndSellerIsolation(t *testing.T) {
	e := newEnv(t)
	buyerID := e.seedUser(t, "buyer.idem", "buyer@example.com", "password-kuat-123", "buyer")
	sellerA := e.seedUser(t, "seller.a", "sellera@example.com", "password-kuat-123", "seller")
	sellerB := e.seedUser(t, "seller.b", "sellerb@example.com", "password-kuat-123", "seller")
	_ = sellerB

	stallID, err := crypto.NewUUID()
	if err != nil {
		t.Fatal(err)
	}
	if _, err := e.db.Exec(`INSERT INTO stalls (id, name, status, created_by) VALUES ($1,'Stan A','active',$2)`,
		stallID, sellerA); err != nil {
		t.Fatal(err)
	}
	if _, err := e.db.Exec(`INSERT INTO seller_stalls (seller_id, stall_id, role) VALUES ($1,$2,'owner')`,
		sellerA, stallID); err != nil {
		t.Fatal(err)
	}
	productID, err := crypto.NewUUID()
	if err != nil {
		t.Fatal(err)
	}
	if _, err := e.db.Exec(`INSERT INTO products (id, stall_id, name, price_minor, availability_status, created_by)
		VALUES ($1,$2,'Nasi Goreng',1800000,'available',$3)`, productID, stallID, sellerA); err != nil {
		t.Fatal(err)
	}

	buyerToken := e.loginThroughOTP(t, "buyer@example.com", "password-kuat-123")

	// Buyer membuat order dengan Idempotency-Key.
	orderBody := map[string]any{
		"payment_method": "cash",
		"items":          []map[string]any{{"product_id": productID, "quantity": 2}},
	}
	first := e.do(t, http.MethodPost, "/api/v1/orders", orderBody, buyerToken,
		map[string]string{"Idempotency-Key": "key-uji-1"})
	if first.status != http.StatusCreated {
		t.Fatalf("create order: %d %s", first.status, first.raw)
	}
	firstID, _ := first.body["data"].(map[string]any)["id"].(string)

	replay := e.do(t, http.MethodPost, "/api/v1/orders", orderBody, buyerToken,
		map[string]string{"Idempotency-Key": "key-uji-1"})
	if replay.status != http.StatusCreated {
		t.Fatalf("replay harus mengembalikan order yang sama: %d %s", replay.status, replay.raw)
	}
	replayID, _ := replay.body["data"].(map[string]any)["id"].(string)
	if firstID != replayID {
		t.Fatalf("idempotency gagal: %s != %s", firstID, replayID)
	}

	// Key sama dengan payload berbeda → konflik.
	conflict := e.do(t, http.MethodPost, "/api/v1/orders", map[string]any{
		"payment_method": "cash",
		"items":          []map[string]any{{"product_id": productID, "quantity": 5}},
	}, buyerToken, map[string]string{"Idempotency-Key": "key-uji-1"})
	if conflict.status != http.StatusConflict {
		t.Fatalf("payload berbeda harus 409, dapat %d", conflict.status)
	}

	// Tanpa Idempotency-Key → 400.
	noKey := e.do(t, http.MethodPost, "/api/v1/orders", orderBody, buyerToken, nil)
	if noKey.status != http.StatusBadRequest {
		t.Fatalf("tanpa idempotency key harus 400, dapat %d", noKey.status)
	}

	// Buyer tidak boleh memanggil endpoint seller.
	forbidden := e.do(t, http.MethodGet, "/api/v1/seller/orders", nil, buyerToken, nil)
	if forbidden.status != http.StatusForbidden {
		t.Fatalf("buyer ke endpoint seller harus 403, dapat %d", forbidden.status)
	}

	// Seller lain tidak boleh melihat order ini.
	sellerBToken := e.loginThroughOTP(t, "sellerb@example.com", "password-kuat-123")
	notVisible := e.do(t, http.MethodGet, "/api/v1/seller/orders/"+firstID, nil, sellerBToken, nil)
	if notVisible.status != http.StatusNotFound {
		t.Fatalf("seller lain harus 404, dapat %d", notVisible.status)
	}

	// Seller pemilik melihat order dan dapat menandai tunai lunas (idempotent).
	sellerAToken := e.loginThroughOTP(t, "sellera@example.com", "password-kuat-123")
	visible := e.do(t, http.MethodGet, "/api/v1/seller/orders/"+firstID, nil, sellerAToken, nil)
	if visible.status != http.StatusOK {
		t.Fatalf("seller pemilik harus 200, dapat %d %s", visible.status, visible.raw)
	}
	paymentsList, _ := visible.body["data"].(map[string]any)["payments"].([]any)
	if len(paymentsList) != 1 {
		t.Fatalf("harus ada 1 pembayaran, dapat %d", len(paymentsList))
	}
	paymentID, _ := paymentsList[0].(map[string]any)["id"].(string)

	confirm := e.do(t, http.MethodPost, "/api/v1/seller/payments/"+paymentID+"/confirm-cash",
		map[string]any{}, sellerAToken, nil)
	if confirm.status != http.StatusOK {
		t.Fatalf("konfirmasi tunai: %d %s", confirm.status, confirm.raw)
	}
	confirm2 := e.do(t, http.MethodPost, "/api/v1/seller/payments/"+paymentID+"/confirm-cash",
		map[string]any{}, sellerAToken, nil)
	if confirm2.status != http.StatusOK {
		t.Fatalf("konfirmasi ulang harus idempotent: %d %s", confirm2.status, confirm2.raw)
	}
	orderStatus, _ := confirm2.body["data"].(map[string]any)["order_status"].(string)
	if orderStatus != "confirmed" {
		t.Fatalf("order harus confirmed setelah lunas, dapat %q", orderStatus)
	}

	// Buyer melihat status order terbaru.
	buyerView := e.do(t, http.MethodGet, "/api/v1/orders/"+firstID, nil, buyerToken, nil)
	if buyerView.status != http.StatusOK {
		t.Fatalf("buyer melihat order: %d", buyerView.status)
	}
	status, _ := buyerView.body["data"].(map[string]any)["status"].(string)
	if status != "confirmed" {
		t.Fatalf("status order buyer harus confirmed, dapat %q", status)
	}
	_ = buyerID
}

func TestQRISPlaceholderRejectedAndPriceSnapshotKept(t *testing.T) {
	e := newEnv(t)
	e.seedUser(t, "buyer.qris", "qris@example.com", "password-kuat-123", "buyer")
	sellerID := e.seedUser(t, "seller.q", "sellerq@example.com", "password-kuat-123", "seller")

	stallID, _ := crypto.NewUUID()
	productID, _ := crypto.NewUUID()
	if _, err := e.db.Exec(`INSERT INTO stalls (id, name, status, created_by) VALUES ($1,'Stan Q','active',$2)`,
		stallID, sellerID); err != nil {
		t.Fatal(err)
	}
	if _, err := e.db.Exec(`INSERT INTO seller_stalls (seller_id, stall_id, role) VALUES ($1,$2,'owner')`,
		sellerID, stallID); err != nil {
		t.Fatal(err)
	}
	if _, err := e.db.Exec(`INSERT INTO products (id, stall_id, name, price_minor, availability_status, created_by)
		VALUES ($1,$2,'Es Jeruk',800000,'available',$3)`, productID, stallID, sellerID); err != nil {
		t.Fatal(err)
	}

	token := e.loginThroughOTP(t, "qris@example.com", "password-kuat-123")

	// QRIS placeholder ditolak tanpa integrasi (ORD-06).
	qris := e.do(t, http.MethodPost, "/api/v1/orders", map[string]any{
		"payment_method": "qris_placeholder",
		"items":          []map[string]any{{"product_id": productID, "quantity": 1}},
	}, token, map[string]string{"Idempotency-Key": "qris-1"})
	if qris.status != http.StatusServiceUnavailable {
		t.Fatalf("QRIS harus 503, dapat %d", qris.status)
	}

	// Harga snapshot tetap setelah harga katalog berubah (CAT-07).
	created := e.do(t, http.MethodPost, "/api/v1/orders", map[string]any{
		"payment_method": "cash",
		"items":          []map[string]any{{"product_id": productID, "quantity": 2}},
	}, token, map[string]string{"Idempotency-Key": "cash-1"})
	if created.status != http.StatusCreated {
		t.Fatalf("create: %d %s", created.status, created.raw)
	}
	if _, err := e.db.Exec(`UPDATE products SET price_minor = 990000 WHERE id = $1`, productID); err != nil {
		t.Fatal(err)
	}
	detail := e.do(t, http.MethodGet, "/api/v1/orders/"+created.body["data"].(map[string]any)["id"].(string),
		nil, token, nil)
	items, _ := detail.body["data"].(map[string]any)["items"].([]any)
	if len(items) != 1 {
		t.Fatalf("harus 1 item, dapat %d", len(items))
	}
	price := int64(items[0].(map[string]any)["unit_price_minor"].(float64))
	if price != 800000 {
		t.Fatalf("harga snapshot harus tetap 800000, dapat %d", price)
	}
}

func TestSessionRevokeKeepsCurrentSession(t *testing.T) {
	e := newEnv(t)
	e.seedUser(t, "buyer.revoke", "revoke@example.com", "password-kuat-123", "buyer")
	token := e.loginThroughOTP(t, "revoke@example.com", "password-kuat-123")

	list := e.do(t, http.MethodGet, "/api/v1/auth/sessions", nil, token, nil)
	sessionsList, _ := list.body["data"].(map[string]any)["sessions"].([]any)
	if len(sessionsList) != 1 {
		t.Fatalf("harus 1 sesi, dapat %d", len(sessionsList))
	}
	sessionID, _ := sessionsList[0].(map[string]any)["id"].(string)

	// Sesi aktif tidak boleh dicabut dari daftar sesi.
	active := e.do(t, http.MethodDelete, "/api/v1/auth/sessions/"+sessionID, nil, token, nil)
	if active.status != http.StatusConflict {
		t.Fatalf("mencabut sesi aktif harus 409, dapat %d", active.status)
	}
}

func TestUnauthenticatedAndRoleGuards(t *testing.T) {
	e := newEnv(t)
	anon := e.do(t, http.MethodGet, "/api/v1/cart", nil, "", nil)
	if anon.status != http.StatusUnauthorized {
		t.Fatalf("tanpa token harus 401, dapat %d", anon.status)
	}
	bad := e.do(t, http.MethodGet, "/api/v1/cart", nil, "token-palsu", nil)
	if bad.status != http.StatusUnauthorized {
		t.Fatalf("token palsu harus 401, dapat %d", bad.status)
	}
	e.seedUser(t, "seller.role", "sellerrole@example.com", "password-kuat-123", "seller")
	sellerToken := e.loginThroughOTP(t, "sellerrole@example.com", "password-kuat-123")
	cart := e.do(t, http.MethodGet, "/api/v1/cart", nil, sellerToken, nil)
	if cart.status != http.StatusForbidden {
		t.Fatalf("seller tidak boleh memakai endpoint buyer, dapat %d", cart.status)
	}
	admin := e.do(t, http.MethodGet, "/api/v1/admin/stalls", nil, sellerToken, nil)
	if admin.status != http.StatusForbidden {
		t.Fatalf("seller tidak boleh mengakses endpoint admin, dapat %d", admin.status)
	}
}

func TestProductNotAvailableCannotBeOrdered(t *testing.T) {
	e := newEnv(t)
	e.seedUser(t, "buyer.na", "na@example.com", "password-kuat-123", "buyer")
	sellerID := e.seedUser(t, "seller.na", "sellerna@example.com", "password-kuat-123", "seller")
	stallID, _ := crypto.NewUUID()
	productID, _ := crypto.NewUUID()
	if _, err := e.db.Exec(`INSERT INTO stalls (id, name, status, created_by) VALUES ($1,'Stan NA','active',$2)`,
		stallID, sellerID); err != nil {
		t.Fatal(err)
	}
	if _, err := e.db.Exec(`INSERT INTO seller_stalls (seller_id, stall_id, role) VALUES ($1,$2,'owner')`,
		sellerID, stallID); err != nil {
		t.Fatal(err)
	}
	if _, err := e.db.Exec(`INSERT INTO products (id, stall_id, name, price_minor, availability_status, created_by)
		VALUES ($1,$2,'Habis',100000,'unavailable',$3)`, productID, stallID, sellerID); err != nil {
		t.Fatal(err)
	}
	token := e.loginThroughOTP(t, "na@example.com", "password-kuat-123")

	preview := e.do(t, http.MethodPost, "/api/v1/orders/preview", map[string]any{
		"items": []map[string]any{{"product_id": productID, "quantity": 1}},
	}, token, nil)
	if preview.status != http.StatusUnprocessableEntity {
		t.Fatalf("produk tidak tersedia harus 422, dapat %d", preview.status)
	}
	cartSet := e.do(t, http.MethodPut, "/api/v1/cart/items/"+productID,
		map[string]any{"quantity": 1}, token, nil)
	if cartSet.status != http.StatusUnprocessableEntity {
		t.Fatalf("produk tidak tersedia tidak boleh masuk keranjang, dapat %d", cartSet.status)
	}
}

var _ = strings.TrimSpace

package integration

import (
	"net/http"
	"testing"

	"kantinkampus/api/internal/platform/crypto"
)

// TestNegativeAuthorizationMatrix memverifikasi matriks negatif PRD §2.4:
// buyer tidak boleh memakai endpoint seller/admin, seller tidak boleh
// mengakses stan seller lain, dan seller bukan admin tidak boleh menyetujui stan.
// Memastikan peran tidak dapat membaca atau mengubah resource di luar izinnya.
func TestNegativeAuthorizationMatrix(t *testing.T) {
	e := newEnv(t)
	e.seedUser(t, "buyer.neg", "buyerneg@example.com", "password-kuat-123", "buyer")
	e.seedUser(t, "seller.neg", "sellerneg@example.com", "password-kuat-123", "seller")
	otherSellerID := e.seedUser(t, "seller.lain", "sellerlain@example.com", "password-kuat-123", "seller")
	adminID := e.seedUser(t, "admin.neg", "adminneg@example.com", "password-kuat-123", "admin")

	stallID, _ := crypto.NewUUID()
	if _, err := e.db.Exec(`INSERT INTO stalls (id, name, status, created_by) VALUES ($1,'Stan Negative','active',$2)`,
		stallID, otherSellerID); err != nil {
		t.Fatal(err)
	}
	pendingStallID, _ := crypto.NewUUID()
	if _, err := e.db.Exec(`INSERT INTO stalls (id, name, status, created_by) VALUES ($1,'Stan Menunggu','pending_review',$2)`,
		pendingStallID, otherSellerID); err != nil {
		t.Fatal(err)
	}
	if _, err := e.db.Exec(`INSERT INTO seller_stalls (seller_id, stall_id, role) VALUES ($1,$2,'owner')`,
		otherSellerID, stallID); err != nil {
		t.Fatal(err)
	}
	productID, _ := crypto.NewUUID()
	if _, err := e.db.Exec(`INSERT INTO products (id, stall_id, name, price_minor, availability_status, created_by)
		VALUES ($1,$2,'Es Teh',500000,'available',$3)`, productID, stallID, otherSellerID); err != nil {
		t.Fatal(err)
	}

	buyerToken := e.loginThroughOTP(t, "buyerneg@example.com", "password-kuat-123")
	sellerToken := e.loginThroughOTP(t, "sellerneg@example.com", "password-kuat-123")
	adminToken := e.loginThroughOTP(t, "adminneg@example.com", "password-kuat-123")

	cases := []struct {
		name   string
		method string
		path   string
		body   any
		token  string
		want   int
	}{
		{"buyer membuat produk", http.MethodPost, "/api/v1/seller/stalls/" + stallID + "/products",
			map[string]any{"name": "Barang Palsu", "price_minor": 1000, "availability_status": "available"}, buyerToken, http.StatusForbidden},
		{"buyer melihat antrean seller", http.MethodGet, "/api/v1/seller/orders", nil, buyerToken, http.StatusForbidden},
		{"buyer mengonfirmasi tunai", http.MethodPost, "/api/v1/seller/payments/abc/confirm-cash",
			map[string]any{}, buyerToken, http.StatusForbidden},
		{"buyer mengubah pemenuhan", http.MethodPost, "/api/v1/seller/fulfillments/abc/status",
			map[string]any{"status": "in_preparation"}, buyerToken, http.StatusForbidden},
		{"buyer membuka daftar stan admin", http.MethodGet, "/api/v1/admin/stalls", nil, buyerToken, http.StatusForbidden},
		{"seller membuka daftar stan admin", http.MethodGet, "/api/v1/admin/stalls", nil, sellerToken, http.StatusForbidden},
		{"seller menyetujui stan", http.MethodPost, "/api/v1/admin/stalls/" + stallID + "/approve",
			map[string]any{}, sellerToken, http.StatusForbidden},
		{"seller mengubah produk stan lain", http.MethodPatch, "/api/v1/seller/products/" + productID,
			map[string]any{"name": "Dibajak", "price_minor": 1, "availability_status": "available"}, sellerToken, http.StatusNotFound},
		{"seller mengarsipkan produk stan lain", http.MethodDelete, "/api/v1/seller/products/" + productID,
			nil, sellerToken, http.StatusNotFound},
		{"seller mengubah stan milik orang lain", http.MethodPatch, "/api/v1/seller/stalls/" + stallID,
			map[string]any{"name": "Stan Dibajak"}, sellerToken, http.StatusNotFound},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			resp := e.do(t, tc.method, tc.path, tc.body, tc.token, nil)
			if resp.status != tc.want {
				t.Fatalf("harus %d, dapat %d: %s", tc.want, resp.status, resp.raw)
			}
		})
	}

	// Admin boleh menyetujui stan yang menunggu review.
	approve := e.do(t, http.MethodPost, "/api/v1/admin/stalls/"+pendingStallID+"/approve", map[string]any{}, adminToken, nil)
	if approve.status != http.StatusOK {
		t.Fatalf("admin harus dapat menyetujui stan, dapat %d: %s", approve.status, approve.raw)
	}
	// Transisi ilegal ditolak.
	illegal := e.do(t, http.MethodPost, "/api/v1/admin/stalls/"+pendingStallID+"/approve", map[string]any{}, adminToken, nil)
	if illegal.status != http.StatusConflict {
		t.Fatalf("transisi ilegal harus 409, dapat %d", illegal.status)
	}
	_ = adminID
}

// TestBuyerCannotReadForeignOrder memastikan detail pesanan hanya terlihat oleh pemiliknya.
// Memastikan pembeli tidak dapat mengambil pesanan milik akun lain.
func TestBuyerCannotReadForeignOrder(t *testing.T) {
	e := newEnv(t)
	e.seedUser(t, "buyer.a", "buyera@example.com", "password-kuat-123", "buyer")
	e.seedUser(t, "buyer.b", "buyerb@example.com", "password-kuat-123", "buyer")
	sellerID := e.seedUser(t, "seller.ord", "sellerord@example.com", "password-kuat-123", "seller")

	stallID, _ := crypto.NewUUID()
	productID, _ := crypto.NewUUID()
	if _, err := e.db.Exec(`INSERT INTO stalls (id, name, status, created_by) VALUES ($1,'Stan Ord','active',$2)`,
		stallID, sellerID); err != nil {
		t.Fatal(err)
	}
	if _, err := e.db.Exec(`INSERT INTO seller_stalls (seller_id, stall_id, role) VALUES ($1,$2,'owner')`,
		sellerID, stallID); err != nil {
		t.Fatal(err)
	}
	if _, err := e.db.Exec(`INSERT INTO products (id, stall_id, name, price_minor, availability_status, created_by)
		VALUES ($1,$2,'Sate',900000,'available',$3)`, productID, stallID, sellerID); err != nil {
		t.Fatal(err)
	}

	tokenA := e.loginThroughOTP(t, "buyera@example.com", "password-kuat-123")
	tokenB := e.loginThroughOTP(t, "buyerb@example.com", "password-kuat-123")

	created := e.do(t, http.MethodPost, "/api/v1/orders", map[string]any{
		"payment_method": "cash",
		"items":          []map[string]any{{"product_id": productID, "quantity": 1}},
	}, tokenA, map[string]string{"Idempotency-Key": "negative-1"})
	if created.status != http.StatusCreated {
		t.Fatalf("create order: %d %s", created.status, created.raw)
	}
	orderID, _ := created.body["data"].(map[string]any)["id"].(string)

	forbidden := e.do(t, http.MethodGet, "/api/v1/orders/"+orderID, nil, tokenB, nil)
	if forbidden.status != http.StatusNotFound {
		t.Fatalf("pesanan orang lain harus 404, dapat %d", forbidden.status)
	}
}

package httpapi

import (
	"database/sql"
	"log/slog"
	"net/http"

	"kantinkampus/api/internal/auth"
	"kantinkampus/api/internal/cart"
	"kantinkampus/api/internal/catalog"
	"kantinkampus/api/internal/orders"
	"kantinkampus/api/internal/payments"
	"kantinkampus/api/internal/platform/config"
	"kantinkampus/api/internal/platform/httpx"
	"kantinkampus/api/internal/sessions"
	"kantinkampus/api/internal/stalls"
	"kantinkampus/api/internal/users"
)

// Server merangkai semua domain ke router net/http (keputusan D2: tanpa
// framework). Prefix API: /api/v1 (PRD §10).
type Server struct {
	Cfg      *config.Config
	Log      *slog.Logger
	DB       *sql.DB
	Auth     *auth.Service
	Sessions *sessions.Service
	Users    *users.Service
	Stalls   *stalls.Service
	Catalog  *catalog.Service
	Cart     *cart.Service
	Orders   *orders.Service
	Payments *payments.Service
	Limiter  *httpx.Limiter
}

// Mendaftarkan endpoint, kebijakan akses, dan middleware untuk API.
func (s *Server) Routes() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /healthz", s.handleHealth)

	// Autentikasi publik (rate limited).
	mux.HandleFunc("POST /api/v1/auth/register", s.rate("register", s.handleAuthRegister))
	mux.HandleFunc("POST /api/v1/auth/register/verify", s.rate("register_verify", s.handleAuthRegisterVerify))
	mux.HandleFunc("POST /api/v1/auth/otp/resend", s.rate("otp_resend", s.handleAuthResend))
	mux.HandleFunc("POST /api/v1/auth/login", s.rate("login", s.handleAuthLogin))
	mux.HandleFunc("POST /api/v1/auth/login/verify", s.rate("login_verify", s.handleAuthLoginVerify))
	mux.HandleFunc("POST /api/v1/auth/refresh", s.rate("refresh", s.handleAuthRefresh))

	// Autentikasi.
	mux.HandleFunc("POST /api/v1/auth/logout", s.authed(s.handleAuthLogout))
	mux.HandleFunc("GET /api/v1/auth/sessions", s.authed(s.handleSessionsList))
	mux.HandleFunc("DELETE /api/v1/auth/sessions/{id}", s.authed(s.handleSessionRevoke))

	// Profil & foto.
	mux.HandleFunc("GET /api/v1/me", s.authed(s.handleMe))
	mux.HandleFunc("PATCH /api/v1/me", s.authed(s.handleMeUpdate))
	mux.HandleFunc("POST /api/v1/me/profile-photo", s.authed(s.handleProfilePhotoUpload))
	mux.HandleFunc("DELETE /api/v1/me/profile-photo", s.authed(s.handleProfilePhotoDelete))

	// Katalog publik.
	mux.HandleFunc("GET /api/v1/stalls", s.handleStallsList)
	mux.HandleFunc("GET /api/v1/stalls/{id}", s.handleStallGet)
	mux.HandleFunc("GET /api/v1/products", s.handleProductsList)
	mux.HandleFunc("GET /api/v1/products/{id}", s.handleProductGet)

	// Buyer.
	mux.HandleFunc("GET /api/v1/cart", s.role("buyer", s.handleCartGet))
	mux.HandleFunc("PUT /api/v1/cart/items/{productId}", s.role("buyer", s.handleCartSet))
	mux.HandleFunc("DELETE /api/v1/cart/items/{productId}", s.role("buyer", s.handleCartDelete))
	mux.HandleFunc("POST /api/v1/orders/preview", s.role("buyer", s.handleOrderPreview))
	mux.HandleFunc("POST /api/v1/orders", s.role("buyer", s.handleOrderCreate))
	mux.HandleFunc("GET /api/v1/orders", s.role("buyer", s.handleOrdersList))
	mux.HandleFunc("GET /api/v1/orders/{id}", s.role("buyer", s.handleOrderGet))

	// Seller.
	mux.HandleFunc("POST /api/v1/seller/stalls", s.role("seller", s.handleSellerStallCreate))
	mux.HandleFunc("GET /api/v1/seller/stalls", s.role("seller", s.handleSellerStallsList))
	mux.HandleFunc("GET /api/v1/seller/products", s.role("seller", s.handleSellerProductsList))
	mux.HandleFunc("PATCH /api/v1/seller/stalls/{id}", s.role("seller", s.handleSellerStallUpdate))
	mux.HandleFunc("POST /api/v1/seller/stalls/{stallId}/products", s.role("seller", s.handleProductCreate))
	mux.HandleFunc("PATCH /api/v1/seller/products/{id}", s.role("seller", s.handleProductUpdate))
	mux.HandleFunc("DELETE /api/v1/seller/products/{id}", s.role("seller", s.handleProductArchive))
	mux.HandleFunc("POST /api/v1/seller/products/{id}/unarchive", s.role("seller", s.handleProductUnarchive))
	mux.HandleFunc("POST /api/v1/seller/products/{id}/image", s.role("seller", s.handleProductImage))
	mux.HandleFunc("GET /api/v1/seller/orders", s.role("seller", s.handleSellerOrdersList))
	mux.HandleFunc("GET /api/v1/seller/orders/{id}", s.role("seller", s.handleSellerOrderGet))
	mux.HandleFunc("POST /api/v1/seller/payments/{id}/confirm-cash", s.role("seller", s.handleConfirmCash))
	mux.HandleFunc("POST /api/v1/seller/fulfillments/{id}/status", s.role("seller", s.handleFulfillmentStatus))

	// Admin.
	mux.HandleFunc("GET /api/v1/admin/stalls", s.role("admin", s.handleAdminStallsList))
	mux.HandleFunc("GET /api/v1/admin/orders", s.role("admin", s.handleAdminOrdersList))
	mux.HandleFunc("POST /api/v1/admin/stalls/{id}/approve", s.role("admin", s.handleAdminTransition("approve")))
	mux.HandleFunc("POST /api/v1/admin/stalls/{id}/reject", s.role("admin", s.handleAdminTransition("reject")))
	mux.HandleFunc("POST /api/v1/admin/stalls/{id}/deactivate", s.role("admin", s.handleAdminTransition("deactivate")))
	mux.HandleFunc("POST /api/v1/admin/stalls/{id}/activate", s.role("admin", s.handleAdminTransition("activate")))

	return httpx.Chain(mux,
		httpx.RequestIDMiddleware,
		httpx.RecoverMiddleware(s.Log),
		httpx.AccessLogMiddleware(s.Log),
		httpx.SecureHeadersMiddleware,
		httpx.CORSMiddleware(s.Cfg.CORSAllowedOrigins),
		httpx.MaxBodyLimit(8<<20),
	)
}

// Menyediakan pemeriksaan ringan untuk memastikan server merespons.
func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	httpx.WriteData(w, r, http.StatusOK, map[string]string{"status": "ok"})
}

// rate menerapkan rate limit in-memory per IP+grup route: lapisan pertama
// anti-burst/abuse email (PRD §6.2); lockout presisi tetap di database.
func (s *Server) rate(group string, h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ip := httpx.ClientIP(r, s.Cfg.TrustedProxyCIDRs)
		if !s.Limiter.Allow(group + "|" + ip) {
			w.Header().Set("Retry-After", "10")
			httpx.WriteError(w, r, http.StatusTooManyRequests, "RATE_LIMITED",
				"Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.", nil)
			return
		}
		h(w, r)
	}
}

// Mengambil alamat klien dengan mempertimbangkan proxy yang dipercaya.
func (s *Server) requestIP(r *http.Request) string {
	return httpx.ClientIP(r, s.Cfg.TrustedProxyCIDRs)
}

// Mengambil identitas permintaan yang dipasang middleware.
func (s *Server) requestID(r *http.Request) string {
	return httpx.RequestID(r.Context())
}

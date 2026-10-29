package httpapi

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"time"

	"kantinkampus/api/internal/auth"
	"kantinkampus/api/internal/cart"
	"kantinkampus/api/internal/catalog"
	"kantinkampus/api/internal/orders"
	"kantinkampus/api/internal/payments"
	"kantinkampus/api/internal/platform/httpx"
	"kantinkampus/api/internal/platform/jwt"
	"kantinkampus/api/internal/sessions"
	"kantinkampus/api/internal/stalls"
	"kantinkampus/api/internal/users"
)

type authCtxKey struct{}

type authCtx struct {
	UserID    string
	Username  string
	Role      string
	SessionID string
}

func currentAuth(r *http.Request) authCtx {
	if v, ok := r.Context().Value(authCtxKey{}).(authCtx); ok {
		return v
	}
	return authCtx{}
}

// authenticate memverifikasi Bearer access token (JWT pendek) DAN memeriksa
// sesi masih aktif di database: revocation berlaku sebelum expiry token
// (PRD §5.6, pengecekan revocation tambahan).
func (s *Server) authenticate(w http.ResponseWriter, r *http.Request) (authCtx, bool) {
	header := r.Header.Get("Authorization")
	const prefix = "Bearer "
	if len(header) <= len(prefix) || header[:len(prefix)] != prefix {
		httpx.WriteError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED",
			"Sesi tidak valid atau kedaluwarsa; silakan login kembali.", nil)
		return authCtx{}, false
	}
	token := header[len(prefix):]
	claims, err := jwt.Verify(s.Cfg.JWTSigningKey, token, s.Cfg.JWTIssuer, s.Cfg.JWTAudience, time.Now())
	if err != nil {
		httpx.WriteError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED",
			"Sesi tidak valid atau kedaluwarsa; silakan login kembali.", nil)
		return authCtx{}, false
	}
	info, err := s.Sessions.Access(r.Context(), claims.Sid)
	if err != nil || info.UserID != claims.Sub {
		httpx.WriteError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED",
			"Sesi tidak valid atau kedaluwarsa; silakan login kembali.", nil)
		return authCtx{}, false
	}
	return authCtx{
		UserID:    info.UserID,
		Username:  info.Username,
		Role:      info.Role,
		SessionID: claims.Sid,
	}, true
}

func (s *Server) authed(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ac, ok := s.authenticate(w, r)
		if !ok {
			return
		}
		h(w, r.WithContext(context.WithValue(r.Context(), authCtxKey{}, ac)))
	}
}

// role: server wajib memeriksa izin setiap permintaan — menyembunyikan tombol
// di UI bukan kontrol akses (PRD §2.4).
func (s *Server) role(role string, h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ac, ok := s.authenticate(w, r)
		if !ok {
			return
		}
		if ac.Role != role {
			httpx.WriteError(w, r, http.StatusForbidden, "FORBIDDEN",
				"Anda tidak memiliki izin untuk aksi ini.", nil)
			return
		}
		h(w, r.WithContext(context.WithValue(r.Context(), authCtxKey{}, ac)))
	}
}

const (
	refreshCookieName = "kk_rt"
	csrfCookieName    = "kk_csrf"
)

func (s *Server) setRefreshCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     refreshCookieName,
		Value:    token,
		Path:     "/api/v1/auth",
		MaxAge:   int(s.Cfg.RefreshAbsoluteTTL.Seconds()),
		HttpOnly: true,
		Secure:   s.Cfg.IsProduction(),
		SameSite: http.SameSiteLaxMode,
	})
}

func (s *Server) setCSRFCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     csrfCookieName,
		Value:    token,
		Path:     "/",
		MaxAge:   int(s.Cfg.RefreshAbsoluteTTL.Seconds()),
		HttpOnly: false, // dibaca JS untuk header X-CSRF-Token (double-submit)
		Secure:   s.Cfg.IsProduction(),
		SameSite: http.SameSiteLaxMode,
	})
}

func (s *Server) clearAuthCookies(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{Name: refreshCookieName, Value: "", Path: "/api/v1/auth", MaxAge: -1})
	http.SetCookie(w, &http.Cookie{Name: csrfCookieName, Value: "", Path: "/", MaxAge: -1})
}

// csrfPair memvalidasi double-submit: header harus sama dengan cookie dan
// hash-nya diverifikasi sessions.Rotate terhadap hash sesi.
func csrfPair(r *http.Request) (string, bool) {
	header := r.Header.Get("X-CSRF-Token")
	cookie, err := r.Cookie(csrfCookieName)
	if header == "" || err != nil || cookie.Value == "" || header != cookie.Value {
		return "", false
	}
	return header, true
}

// --- error mapping domain → envelope (PRD §10.7) ---

func (s *Server) writeDomainError(w http.ResponseWriter, r *http.Request, err error) {
	fields := map[string]string{}
	var hasFields bool

	switch e := err.(type) {
	case *auth.ValidationError:
		fields, hasFields = e.Fields, true
	case *auth.ThrottleError:
		s.writeThrottle(w, r, e.RetryAfter)
		return
	case *users.InvalidError:
		fields, hasFields = e.Fields, true
	case *stalls.InvalidError:
		fields, hasFields = e.Fields, true
	case *catalog.InvalidError:
		fields, hasFields = e.Fields, true
	case *cart.InvalidError:
		fields, hasFields = e.Fields, true
	case *orders.InvalidError:
		fields, hasFields = e.Fields, true
	}
	if hasFields {
		httpx.WriteError(w, r, http.StatusUnprocessableEntity, "VALIDATION_ERROR",
			"Periksa kembali data yang dimasukkan.", fields)
		return
	}

	switch {
	case errors.Is(err, auth.ErrInvalidCredentials):
		httpx.WriteError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", err.Error(), nil)
	case errors.Is(err, auth.ErrOTPInvalid):
		httpx.WriteError(w, r, http.StatusBadRequest, "OTP_INVALID_OR_EXPIRED", err.Error(), nil)
	case errors.Is(err, auth.ErrPreAuthInvalid):
		httpx.WriteError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", err.Error(), nil)
	case errors.Is(err, auth.ErrEscalation):
		httpx.WriteError(w, r, http.StatusTooManyRequests, "RATE_LIMITED", err.Error(), nil)
	case errors.Is(err, auth.ErrRegisterConflict):
		httpx.WriteError(w, r, http.StatusConflict, "CONFLICT", err.Error(), nil)
	case errors.Is(err, sessions.ErrReuse), errors.Is(err, sessions.ErrRevoked), errors.Is(err, sessions.ErrExpired), errors.Is(err, sessions.ErrInvalid):
		httpx.WriteError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", err.Error(), nil)
	case errors.Is(err, sessions.ErrNotFound), errors.Is(err, sessions.ErrCurrent):
		httpx.WriteError(w, r, http.StatusConflict, "CONFLICT",
			"Sesi aktif tidak dapat dicabut dari daftar; gunakan logout.", nil)
	case errors.Is(err, users.ErrUsernameTaken):
		httpx.WriteError(w, r, http.StatusConflict, "CONFLICT", err.Error(), nil)
	case errors.Is(err, stalls.ErrAlreadyHasStall):
		httpx.WriteError(w, r, http.StatusConflict, "CONFLICT", err.Error(), nil)
	case errors.Is(err, users.ErrNotFound),
		errors.Is(err, stalls.ErrNotFound),
		errors.Is(err, catalog.ErrNotFound),
		errors.Is(err, orders.ErrNotFound),
		errors.Is(err, payments.ErrNotFound):
		httpx.WriteError(w, r, http.StatusNotFound, "NOT_FOUND", err.Error(), nil)
	case errors.Is(err, stalls.ErrInvalidTransition):
		httpx.WriteError(w, r, http.StatusConflict, "CONFLICT", err.Error(), nil)
	case errors.Is(err, orders.ErrIdempotencyConflict):
		httpx.WriteError(w, r, http.StatusConflict, "IDEMPOTENCY_CONFLICT", err.Error(), nil)
	case errors.Is(err, orders.ErrQRISUnavailable):
		httpx.WriteError(w, r, http.StatusServiceUnavailable, "RESOURCE_UNAVAILABLE", err.Error(), nil)
	case errors.Is(err, payments.ErrStateConflict), errors.Is(err, payments.ErrFulfillmentInvalid):
		httpx.WriteError(w, r, http.StatusConflict, "PAYMENT_STATE_CONFLICT", err.Error(), nil)
	default:
		if s.Log != nil {
			s.Log.Error("handler error", "request_id", s.requestID(r), "error", err)
		}
		httpx.WriteError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR",
			"Terjadi kesalahan pada server.", nil)
	}
}

func (s *Server) writeThrottle(w http.ResponseWriter, r *http.Request, retryAfter time.Duration) {
	if retryAfter < time.Second {
		retryAfter = time.Second
	}
	w.Header().Set("Retry-After", strconv.Itoa(int(retryAfter.Seconds())))
	httpx.WriteError(w, r, http.StatusTooManyRequests, "RATE_LIMITED",
		"Terlalu banyak percobaan. Coba lagi dalam beberapa saat.", nil)
}

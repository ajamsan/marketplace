package httpapi

import (
	"net/http"
	"time"

	"kantinkampus/api/internal/auth"
	"kantinkampus/api/internal/platform/httpx"
	"kantinkampus/api/internal/sessions"
)

const maxJSONBody = 1 << 20 // 1 MiB untuk payload JSON biasa

// Menerima pendaftaran akun dan memulai pengiriman kode verifikasi.
func (s *Server) handleAuthRegister(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := httpx.ReadJSON(w, r, &req, maxJSONBody); err != nil {
		httpx.WriteError(w, r, http.StatusBadRequest, "VALIDATION_ERROR",
			"Body permintaan tidak valid.", nil)
		return
	}
	if err := s.Auth.Register(r.Context(), s.requestIP(r), auth.RegisterInput(req), s.requestID(r)); err != nil {
		s.writeDomainError(w, r, err)
		return
	}
	// Respons generik untuk mencegah enumerasi akun (AUTH-06).
	httpx.WriteData(w, r, http.StatusOK, map[string]string{"status": "otp_sent"})
}

// Memverifikasi kode pendaftaran agar akun dapat diaktifkan.
func (s *Server) handleAuthRegisterVerify(w http.ResponseWriter, r *http.Request) {
	var req verifyRegisterRequest
	if err := httpx.ReadJSON(w, r, &req, maxJSONBody); err != nil {
		httpx.WriteError(w, r, http.StatusBadRequest, "VALIDATION_ERROR",
			"Body permintaan tidak valid.", nil)
		return
	}
	if err := s.Auth.VerifyRegistration(r.Context(), s.requestIP(r), req.Email, req.OTP, s.requestID(r)); err != nil {
		s.writeDomainError(w, r, err)
		return
	}
	httpx.WriteData(w, r, http.StatusOK, map[string]string{"status": "verified"})
}

// Meminta pengiriman ulang kode untuk proses autentikasi yang masih berjalan.
func (s *Server) handleAuthResend(w http.ResponseWriter, r *http.Request) {
	var req resendRequest
	if err := httpx.ReadJSON(w, r, &req, maxJSONBody); err != nil {
		httpx.WriteError(w, r, http.StatusBadRequest, "VALIDATION_ERROR",
			"Body permintaan tidak valid.", nil)
		return
	}
	if err := s.Auth.ResendOTP(r.Context(), s.requestIP(r), req.Email, req.Purpose, s.requestID(r)); err != nil {
		s.writeDomainError(w, r, err)
		return
	}
	httpx.WriteData(w, r, http.StatusOK, map[string]string{"status": "sent"})
}

// Memvalidasi kredensial awal dan mengembalikan token sementara untuk OTP.
func (s *Server) handleAuthLogin(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := httpx.ReadJSON(w, r, &req, maxJSONBody); err != nil {
		httpx.WriteError(w, r, http.StatusBadRequest, "VALIDATION_ERROR",
			"Body permintaan tidak valid.", nil)
		return
	}
	preAuth, err := s.Auth.Login(r.Context(), s.requestIP(r), req.Email, req.Password, s.requestID(r))
	if err != nil {
		s.writeDomainError(w, r, err)
		return
	}
	// Password benar tanpa OTP tidak menghasilkan sesi (AUTH-03).
	httpx.WriteData(w, r, http.StatusOK, map[string]any{
		"status":          "otp_required",
		"pre_auth_token":  preAuth,
	})
}

// Menyelesaikan login setelah OTP valid dan menerbitkan kredensial sesi.
func (s *Server) handleAuthLoginVerify(w http.ResponseWriter, r *http.Request) {
	var req loginVerifyRequest
	if err := httpx.ReadJSON(w, r, &req, maxJSONBody); err != nil {
		httpx.WriteError(w, r, http.StatusBadRequest, "VALIDATION_ERROR",
			"Body permintaan tidak valid.", nil)
		return
	}
	ip := s.requestIP(r)
	res, err := s.Auth.VerifyLogin(r.Context(), ip, httpx.MaskIP(ip), r.UserAgent(),
		req.PreAuthToken, req.OTP, s.requestID(r))
	if err != nil {
		s.writeDomainError(w, r, err)
		return
	}
	s.setRefreshCookie(w, res.RefreshToken)
	s.setCSRFCookie(w, res.CSRFToken)
	httpx.WriteData(w, r, http.StatusOK, map[string]any{
		"access_token": res.AccessToken,
		"token_type":   "Bearer",
		"expires_in":   res.ExpiresIn,
		"csrf_token":   res.CSRFToken,
		"user":         res.User,
	})
}

// Memutar refresh token dan menerbitkan access token baru untuk sesi aktif.
func (s *Server) handleAuthRefresh(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie(refreshCookieName)
	if err != nil || cookie.Value == "" {
		httpx.WriteError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED",
			"Sesi tidak valid; silakan login kembali.", nil)
		return
	}
	csrf, ok := csrfPair(r)
	if !ok {
		httpx.WriteError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED",
			"Token CSRF tidak valid.", nil)
		return
	}
	rotation, err := s.Sessions.Rotate(r.Context(), cookie.Value, csrf, s.Cfg.RefreshIdleTTL)
	if err != nil {
		// Refresh token dicuri/reuse → keluarga dicabut; hapus cookie klien.
		s.clearAuthCookies(w)
		s.writeDomainError(w, r, err)
		return
	}
	access, expiresIn, err := s.Auth.SignAccess(rotation.UserID, rotation.SessionID, rotation.Role, time.Now())
	if err != nil {
		s.writeDomainError(w, r, err)
		return
	}
	s.setRefreshCookie(w, rotation.NewRefreshToken)
	httpx.WriteData(w, r, http.StatusOK, map[string]any{
		"access_token": access,
		"token_type":   "Bearer",
		"expires_in":   expiresIn,
		"user": map[string]string{
			"id": rotation.UserID, "username": rotation.Username, "role": rotation.Role,
		},
	})
}

// Mencabut sesi saat ini dan menghapus cookie autentikasi dari klien.
func (s *Server) handleAuthLogout(w http.ResponseWriter, r *http.Request) {
	ac := currentAuth(r)
	_ = s.Sessions.RevokeCurrent(r.Context(), ac.SessionID, ac.UserID)
	s.clearAuthCookies(w)
	httpx.WriteData(w, r, http.StatusOK, map[string]string{"status": "logged_out"})
}

// Menampilkan sesi aktif lain yang terkait dengan pengguna saat ini.
func (s *Server) handleSessionsList(w http.ResponseWriter, r *http.Request) {
	ac := currentAuth(r)
	views, err := s.Sessions.List(r.Context(), ac.UserID, ac.SessionID)
	if err != nil {
		s.writeDomainError(w, r, err)
		return
	}
	httpx.WriteData(w, r, http.StatusOK, map[string]any{"sessions": views})
}

// Mencabut sesi lain yang dipilih tanpa mengakhiri sesi permintaan ini.
func (s *Server) handleSessionRevoke(w http.ResponseWriter, r *http.Request) {
	ac := currentAuth(r)
	targetID := r.PathValue("id")
	if err := s.Sessions.RevokeOther(r.Context(), ac.UserID, targetID, ac.SessionID); err != nil {
		if err == sessions.ErrNotFound {
			httpx.WriteError(w, r, http.StatusNotFound, "NOT_FOUND", err.Error(), nil)
			return
		}
		if err == sessions.ErrCurrent {
			httpx.WriteError(w, r, http.StatusConflict, "CONFLICT",
				"Sesi aktif tidak dapat dicabut dari daftar; gunakan logout.", nil)
			return
		}
		s.writeDomainError(w, r, err)
		return
	}
	httpx.WriteData(w, r, http.StatusOK, map[string]string{"status": "revoked"})
}

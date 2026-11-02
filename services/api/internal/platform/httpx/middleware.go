package httpx

import (
	"crypto/rand"
	"encoding/base64"
	"log/slog"
	"net/http"
	"time"
)

// Middleware membungkus http.Handler; pola standlib tanpa framework.
type Middleware func(http.Handler) http.Handler

// Chain menerapkan middleware dari luar ke dalam: Chain(h, m1, m2) -> m1(m2(h)).
// Menerapkan middleware berurutan sehingga pembungkus pertama berjalan paling luar.
func Chain(h http.Handler, mw ...Middleware) http.Handler {
	for i := len(mw) - 1; i >= 0; i-- {
		h = mw[i](h)
	}
	return h
}

// NewRequestID menghasilkan id korelasi acak.
// Menghasilkan ID acak untuk menghubungkan log dan respons satu permintaan.
func NewRequestID() string {
	b := make([]byte, 12)
	_, _ = rand.Read(b)
	return base64.RawURLEncoding.EncodeToString(b)
}

// RequestIDMiddleware memberi setiap request correlation id (SESS-04, §12.4).
// Memasang ID permintaan pada konteks dan header respons.
func RequestIDMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := r.Header.Get("X-Request-Id")
		if id == "" || len(id) > 64 {
			id = NewRequestID()
		}
		w.Header().Set("X-Request-Id", id)
		next.ServeHTTP(w, r.WithContext(WithRequestID(r.Context(), id)))
	})
}

// RecoverMiddleware mencegah crash proses dari panic handler; respons 500 generik.
// Mengubah panic handler menjadi respons aman sambil mencatat detail di server.
func RecoverMiddleware(log *slog.Logger) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if p := recover(); p != nil {
					if log != nil {
						log.Error("panic pada handler", "request_id", RequestID(r.Context()), "panic", p)
					}
					WriteError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Terjadi kesalahan pada server.", nil)
				}
			}()
			next.ServeHTTP(w, r)
		})
	}
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

// Merekam status pertama sambil meneruskannya ke ResponseWriter asli.
func (s *statusRecorder) WriteHeader(code int) {
	s.status = code
	s.ResponseWriter.WriteHeader(code)
}

// AccessLogMiddleware mencatat akses terstruktur tanpa body (PRD §12.4).
// Mencatat status dan durasi setiap permintaan tanpa membocorkan isi sensitif.
func AccessLogMiddleware(log *slog.Logger) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
			next.ServeHTTP(rec, r)
			if log != nil {
				log.Info("http",
					"method", r.Method,
					"path", r.URL.Path,
					"status", rec.status,
					"duration_ms", time.Since(start).Milliseconds(),
					"request_id", RequestID(r.Context()),
				)
			}
		})
	}
}

// SecureHeadersMiddleware menyetel header keamanan dasar untuk API.
// Menambahkan header keamanan pada seluruh respons HTTP.
func SecureHeadersMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Referrer-Policy", "no-referrer")
		h.Set("Cache-Control", "no-store")
		h.Set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
		next.ServeHTTP(w, r)
	})
}

// CORSMiddleware hanya mengizinkan origin terdaftar; kosong berarti same-origin (proxy).
// Membatasi akses lintas origin pada daftar domain yang dikonfigurasi.
func CORSMiddleware(allowed []string) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if len(allowed) > 0 {
				origin := r.Header.Get("Origin")
				for _, a := range allowed {
					if origin == a {
						h := w.Header()
						h.Set("Access-Control-Allow-Origin", origin)
						h.Set("Access-Control-Allow-Credentials", "true")
						h.Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
						h.Set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-CSRF-Token, Idempotency-Key, X-Requested-With")
						h.Set("Vary", "Origin")
						if r.Method == http.MethodOptions {
							w.WriteHeader(http.StatusNoContent)
							return
						}
						break
					}
				}
			}
			next.ServeHTTP(w, r)
		})
	}
}

// MaxBodyLimit menerapkan http.MaxBytesReader untuk seluruh request.
// Menolak badan permintaan yang melampaui batas ukuran aplikasi.
func MaxBodyLimit(n int64) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Body != nil {
				r.Body = http.MaxBytesReader(w, r.Body, n)
			}
			next.ServeHTTP(w, r)
		})
	}
}

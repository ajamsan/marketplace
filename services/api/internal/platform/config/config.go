package config

import (
	"fmt"
	"net"
	"os"
	"strconv"
	"strings"
	"time"
)

// Config memuat seluruh konfigurasi lingkungan (PRD §15).
// Kunci rahasia wajib diisi untuk production; untuk development diberi
// default dev-only yang dicatat sebagai TIDAK AMAN.
type Config struct {
	AppEnv    string
	HTTPAddr  string
	WebBaseURL string
	DatabaseURL string

	JWTSigningKey []byte
	JWTIssuer     string
	JWTAudience   string
	AccessTokenTTL time.Duration

	RefreshIdleTTL     time.Duration
	RefreshAbsoluteTTL time.Duration

	OTPTTL            time.Duration
	OTPResendCooldown time.Duration
	OTPMaxRounds      int
	OTPHashKey        []byte

	MailjetAPIKey  string
	MailjetSecretKey string
	MailFromEmail  string
	MailFromName   string

	SupabaseURL      string
	SupabaseServiceKey string
	SupabaseBucket    string
	SignedURLTTL      time.Duration

	TrustedProxyCIDRs []*net.IPNet
	CORSAllowedOrigins []string
	RateLimitRPS      float64
	RateLimitBurst    int

	MaxUploadBytes int64

	AllowQRISPlaceholder bool

	LogLevel           string
	AuditRetentionDays int
}

const devJWTKey = "dev-insecure-jwt-key-change-me"
const devOTPKey = "dev-insecure-otp-key-change-me"

func Load() (*Config, error) {
	cfg := &Config{
		AppEnv:     getEnv("APP_ENV", "development"),
		HTTPAddr:   getEnv("HTTP_ADDR", ":8080"),
		WebBaseURL: getEnv("WEB_BASE_URL", "http://localhost:3000"),
		DatabaseURL: getEnv("DATABASE_URL", "postgres://kantin:kantin@localhost:5432/kantin?sslmode=disable"),

		JWTIssuer:     getEnv("JWT_ISSUER", "kantin-kampus-api"),
		JWTAudience:   getEnv("JWT_AUDIENCE", "kantin-kampus-web"),
		AccessTokenTTL: getDuration("ACCESS_TOKEN_TTL", 10*time.Minute),

		RefreshIdleTTL:     getDuration("REFRESH_IDLE_TTL", 168*time.Hour),
		RefreshAbsoluteTTL: getDuration("REFRESH_ABSOLUTE_TTL", 720*time.Hour),

		OTPTTL:            getDuration("OTP_TTL", 5*time.Minute),
		OTPResendCooldown: getDuration("OTP_RESEND_COOLDOWN", 60*time.Second),
		OTPMaxRounds:      getInt("OTP_MAX_ROUNDS", 3),

		MailjetAPIKey:   os.Getenv("MAILJET_API_KEY"),
		MailjetSecretKey: os.Getenv("MAILJET_SECRET_KEY"),
		MailFromEmail:   os.Getenv("MAIL_FROM_EMAIL"),
		MailFromName:    os.Getenv("MAIL_FROM_NAME"),

		SupabaseURL:        strings.TrimRight(os.Getenv("SUPABASE_URL"), "/"),
		SupabaseServiceKey: os.Getenv("SUPABASE_SERVICE_ROLE_KEY"),
		SupabaseBucket:     getEnv("SUPABASE_STORAGE_BUCKET", "kantin-media"),
		SignedURLTTL:       getDuration("SIGNED_URL_TTL", 15*time.Minute),

		RateLimitRPS:   getFloat("RATE_LIMIT_RPS", 5),
		RateLimitBurst: getInt("RATE_LIMIT_BURST", 15),

		MaxUploadBytes: int64(getInt("MAX_UPLOAD_BYTES", 2<<20)),

		AllowQRISPlaceholder: getBool("ALLOW_QRIS_PLACEHOLDER", false),

		LogLevel:           getEnv("LOG_LEVEL", "info"),
		AuditRetentionDays: getInt("AUDIT_RETENTION_DAYS", 30),
	}

	jwtKey := os.Getenv("JWT_SIGNING_KEY")
	otpKey := os.Getenv("OTP_HASH_KEY")
	if cfg.AppEnv == "production" {
		if jwtKey == "" || otpKey == "" {
			return nil, fmt.Errorf("JWT_SIGNING_KEY dan OTP_HASH_KEY wajib diisi untuk production")
		}
	} else {
		if jwtKey == "" {
			jwtKey = devJWTKey
		}
		if otpKey == "" {
			otpKey = devOTPKey
		}
	}
	cfg.JWTSigningKey = []byte(jwtKey)
	cfg.OTPHashKey = []byte(otpKey)

	cidrs, err := parseCIDRs(os.Getenv("TRUSTED_PROXY_CIDRS"))
	if err != nil {
		return nil, fmt.Errorf("TRUSTED_PROXY_CIDRS tidak valid: %w", err)
	}
	cfg.TrustedProxyCIDRs = cidrs

	for _, o := range strings.Split(os.Getenv("CORS_ALLOWED_ORIGINS"), ",") {
		o = strings.TrimSpace(o)
		if o != "" {
			cfg.CORSAllowedOrigins = append(cfg.CORSAllowedOrigins, o)
		}
	}
	return cfg, nil
}

func (c *Config) IsProduction() bool { return c.AppEnv == "production" }
func (c *Config) IsDevelopment() bool { return c.AppEnv != "production" }

func getEnv(key, def string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return def
}

func getDuration(key string, def time.Duration) time.Duration {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return def
	}
	if d, err := time.ParseDuration(v); err == nil {
		return d
	}
	if n, err := strconv.Atoi(v); err == nil {
		return time.Duration(n) * time.Second
	}
	return def
}

func getInt(key string, def int) int {
	if n, err := strconv.Atoi(strings.TrimSpace(os.Getenv(key))); err == nil && n > 0 {
		return n
	}
	return def
}

func getFloat(key string, def float64) float64 {
	if f, err := strconv.ParseFloat(strings.TrimSpace(os.Getenv(key)), 64); err == nil && f > 0 {
		return f
	}
	return def
}

func getBool(key string, def bool) bool {
	switch strings.ToLower(strings.TrimSpace(os.Getenv(key))) {
	case "1", "true", "yes":
		return true
	case "0", "false", "no":
		return false
	}
	return def
}

func parseCIDRs(s string) ([]*net.IPNet, error) {
	var out []*net.IPNet
	for _, part := range strings.Split(s, ",") {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		if !strings.Contains(part, "/") {
			if strings.Contains(part, ":") {
				part += "/128"
			} else {
				part += "/32"
			}
		}
		_, n, err := net.ParseCIDR(part)
		if err != nil {
			return nil, err
		}
		out = append(out, n)
	}
	return out, nil
}

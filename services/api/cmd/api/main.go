package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
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
	"kantinkampus/api/internal/platform/db"
	"kantinkampus/api/internal/platform/httpx"
	"kantinkampus/api/internal/platform/logging"
	"kantinkampus/api/internal/platform/mailer"
	"kantinkampus/api/internal/platform/storage"
	"kantinkampus/api/internal/sessions"
	"kantinkampus/api/internal/stalls"
	"kantinkampus/api/internal/users"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	cfg, err := config.Load()
	if err != nil {
		slog.Default().Error("konfigurasi tidak valid", "error", err)
		os.Exit(1)
	}
	log := logging.New(cfg.LogLevel)
	log.Info("memulai API kantin kampus", "env", cfg.AppEnv, "addr", cfg.HTTPAddr)

	database, err := db.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Error("database tidak tersedia", "error", err)
		os.Exit(1)
	}
	defer func() { _ = database.Close() }()

	auditRepo := audit.NewRepo()
	outboxRepo := outbox.NewRepo(cfg.OTPHashKey)

	var mail mailer.Mailer
	if cfg.IsProduction() {
		if cfg.MailjetAPIKey == "" || cfg.MailjetSecretKey == "" || cfg.MailFromEmail == "" {
			log.Error("MAILJET_API_KEY, MAILJET_SECRET_KEY, dan MAIL_FROM_EMAIL wajib diisi untuk production")
			os.Exit(1)
		}
		mail = mailer.NewMailjet(cfg.MailjetAPIKey, cfg.MailjetSecretKey, cfg.MailFromEmail, cfg.MailFromName)
	} else {
		// DEV: OTP dicetak ke log server agar alur bisa diuji tanpa Mailjet.
		mail = &mailer.DevMailer{Log: log}
	}

	var st storage.Storage
	if cfg.SupabaseURL == "" || cfg.SupabaseServiceKey == "" {
		log.Warn("Supabase Storage belum dikonfigurasi; fitur foto dinonaktifkan")
		st = storage.Disabled{}
	} else {
		st = storage.NewSupabase(cfg.SupabaseURL, cfg.SupabaseServiceKey, cfg.SupabaseBucket)
	}

	sessSvc := sessions.New(database, log)
	authSvc := auth.NewService(cfg, database, sessSvc, outboxRepo, log)
	usersSvc := users.NewService(cfg, database, st, auditRepo)
	stallsSvc := stalls.NewService(database, auditRepo)
	catalogSvc := catalog.NewService(cfg, database, st, auditRepo)
	cartSvc := cart.NewService(cfg, database, st)
	ordersSvc := orders.NewService(cfg, database, auditRepo)
	paymentsSvc := payments.NewService(database, ordersSvc, auditRepo)

	worker := outbox.NewWorker(database, mail, cfg.OTPHashKey, log)
	go worker.Run(ctx)

	go func() {
		t := time.NewTicker(time.Hour)
		defer t.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-t.C:
				if err := authSvc.Repo.CleanupExpired(ctx, cfg.AuditRetentionDays); err != nil {
					log.Error("cleanup auth gagal", "error", err)
				}
				if err := sessSvc.CleanupExpired(ctx); err != nil {
					log.Error("cleanup sesi gagal", "error", err)
				}
			}
		}
	}()

	srv := &httpapi.Server{
		Cfg:      cfg,
		Log:      log,
		DB:       database,
		Auth:     authSvc,
		Sessions: sessSvc,
		Users:    usersSvc,
		Stalls:   stallsSvc,
		Catalog:  catalogSvc,
		Cart:     cartSvc,
		Orders:   ordersSvc,
		Payments: paymentsSvc,
		Limiter:  httpx.NewLimiter(cfg.RateLimitRPS, cfg.RateLimitBurst),
	}

	httpServer := &http.Server{
		Addr:              cfg.HTTPAddr,
		Handler:           srv.Routes(),
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       60 * time.Second,
		WriteTimeout:      60 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	go func() {
		if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Error("server berhenti", "error", err)
			stop()
		}
	}()

	<-ctx.Done()
	log.Info("mematikan server...")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		log.Error("shutdown gagal", "error", err)
	}
	log.Info("server berhenti")
}


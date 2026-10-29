package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"strings"

	"kantinkampus/api/internal/platform/config"
	"kantinkampus/api/internal/platform/crypto"
	"kantinkampus/api/internal/platform/db"
	"kantinkampus/api/internal/platform/logging"
)

// Seed membuat akun & data demo untuk lingkungan pengembangan.
// Menolak jalan di production: kredensial demo hanya untuk dev.
func main() {
	cfg, err := config.Load()
	if err != nil {
		slog.Default().Error("konfigurasi tidak valid", "error", err)
		os.Exit(1)
	}
	if cfg.IsProduction() {
		fmt.Println("cmd/seed tidak boleh dijalankan di production")
		os.Exit(1)
	}
	log := logging.New(cfg.LogLevel)
	ctx := context.Background()

	database, err := db.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Error("database tidak tersedia", "error", err)
		os.Exit(1)
	}
	defer func() { _ = database.Close() }()

	adminEmail := envOr("SEED_ADMIN_EMAIL", "admin@kantin.local")
	sellerEmail := envOr("SEED_SELLER_EMAIL", "seller@kantin.local")
	seller2Email := envOr("SEED_SELLER2_EMAIL", "seller2@kantin.local")
	buyerEmail := envOr("SEED_BUYER_EMAIL", "buyer@kantin.local")
	adminPass := envOr("SEED_ADMIN_PASSWORD", "kantin-dev-admin-123")
	sellerPass := envOr("SEED_SELLER_PASSWORD", "kantin-dev-seller-123")
	buyerPass := envOr("SEED_BUYER_PASSWORD", "kantin-dev-buyer-123")

	if _, err := ensureUser(ctx, database, "admin.kampus", adminEmail, adminPass, "admin"); err != nil {
		log.Error("gagal membuat admin", "error", err)
		os.Exit(1)
	}
	sellerID, err := ensureUser(ctx, database, "seller.sari", sellerEmail, sellerPass, "seller")
	if err != nil {
		log.Error("gagal membuat seller", "error", err)
		os.Exit(1)
	}
	seller2ID, err := ensureUser(ctx, database, "seller.andi", seller2Email, sellerPass, "seller")
	if err != nil {
		log.Error("gagal membuat seller kedua", "error", err)
		os.Exit(1)
	}
	if _, err := ensureUser(ctx, database, "buyer.rizky", buyerEmail, buyerPass, "buyer"); err != nil {
		log.Error("gagal membuat buyer", "error", err)
		os.Exit(1)
	}

	stall1, err := ensureStall(ctx, database, sellerID, "Warung Bu Sari", "Nasi goreng, mie goreng, dan minuman", "Gedung B, Lantai 1", "active")
	if err != nil {
		log.Error("gagal membuat stan", "error", err)
		os.Exit(1)
	}
	stall2, err := ensureStall(ctx, database, seller2ID, "Stan Kopi Tepi", "Kopi susu dan camilan", "Gedung A, Area Tengah", "pending_review")
	if err != nil {
		log.Error("gagal membuat stan kedua", "error", err)
		os.Exit(1)
	}

	products := []struct {
		stallID string
		ownerID string
		name    string
		desc    string
		price   int64
	}{
		{stall1, sellerID, "Nasi Goreng Spesial", "Nasi goreng ayam dengan telur dan acar", 1_800_000},
		{stall1, sellerID, "Mie Goreng", "Mie goreng dengan saus khas", 1_400_000},
		{stall1, sellerID, "Teh Manis", "Teh manis dingin", 400_000},
		{stall1, sellerID, "Ayam Bakar", "Ayam bakar dengan sambal matah", 2_200_000},
		{stall2, seller2ID, "Kopi Susu", "Kopi susu gula aren", 1_200_000},
	}
	for _, p := range products {
		if err := ensureProduct(ctx, database, p.stallID, p.ownerID, p.name, p.desc, p.price); err != nil {
			log.Error("gagal membuat produk", "product", p.name, "error", err)
			os.Exit(1)
		}
	}

	fmt.Println("Seed selesai.")
	fmt.Printf("Admin  : %s / %s\n", adminEmail, adminPass)
	fmt.Printf("Seller : %s / %s (stan %s aktif)\n", sellerEmail, sellerPass, stall1)
	fmt.Printf("Seller2: %s / %s (stan %s menunggu persetujuan admin)\n", seller2Email, sellerPass, stall2)
	fmt.Printf("Buyer  : %s / %s\n", buyerEmail, buyerPass)
	fmt.Println("Kredensial ini hanya untuk lingkungan pengembangan.")
}

func envOr(key, def string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return def
}

func ensureUser(ctx context.Context, database *sql.DB, username, email, password, role string) (string, error) {
	var id string
	err := database.QueryRowContext(ctx,
		`SELECT id FROM users WHERE email_normalized = $1`, strings.ToLower(email)).Scan(&id)
	if err == nil {
		return id, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return "", err
	}
	hash, err := crypto.HashPassword(password)
	if err != nil {
		return "", err
	}
	newID, err := crypto.NewUUID()
	if err != nil {
		return "", err
	}
	_, err = database.ExecContext(ctx, `
		INSERT INTO users (id, username, email_normalized, password_hash, role, status, email_verified_at)
		VALUES ($1,$2,$3,$4,$5,'active', now())`,
		newID, username, strings.ToLower(email), hash, role)
	if err != nil {
		return "", err
	}
	return newID, nil
}

func ensureStall(ctx context.Context, database *sql.DB, ownerID, name, description, location, status string) (string, error) {
	var id string
	err := database.QueryRowContext(ctx,
		`SELECT id FROM stalls WHERE name = $1 AND created_by = $2`, name, ownerID).Scan(&id)
	if err == nil {
		return id, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return "", err
	}
	newID, err := crypto.NewUUID()
	if err != nil {
		return "", err
	}
	_, err = database.ExecContext(ctx, `
		INSERT INTO stalls (id, name, description, location_label, status, created_by)
		VALUES ($1,$2,$3,$4,$5,$6)`,
		newID, name, description, location, status, ownerID)
	if err != nil {
		return "", err
	}
	if _, err := database.ExecContext(ctx, `
		INSERT INTO seller_stalls (seller_id, stall_id, role) VALUES ($1,$2,'owner')
		ON CONFLICT DO NOTHING`, ownerID, newID); err != nil {
		return "", err
	}
	return newID, nil
}

func ensureProduct(ctx context.Context, database *sql.DB, stallID, sellerID, name, description string, priceMinor int64) error {
	var id string
	err := database.QueryRowContext(ctx,
		`SELECT id FROM products WHERE stall_id = $1 AND name = $2`, stallID, name).Scan(&id)
	if err == nil {
		return nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return err
	}
	newID, err := crypto.NewUUID()
	if err != nil {
		return err
	}
	_, err = database.ExecContext(ctx, `
		INSERT INTO products (id, stall_id, name, description, price_minor, availability_status, created_by)
		VALUES ($1,$2,$3,$4,$5,'available',$6)`,
		newID, stallID, name, description, priceMinor, sellerID)
	return err
}

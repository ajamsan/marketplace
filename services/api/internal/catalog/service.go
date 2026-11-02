package catalog

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"kantinkampus/api/internal/audit"
	"kantinkampus/api/internal/platform/config"
	"kantinkampus/api/internal/platform/crypto"
	"kantinkampus/api/internal/platform/httpx"
	"kantinkampus/api/internal/platform/imaging"
	"kantinkampus/api/internal/platform/storage"
	"kantinkampus/api/internal/platform/validate"
)

var ErrNotFound = errors.New("Produk tidak ditemukan")

// InvalidError validasi domain.
type InvalidError struct {
	Fields map[string]string
}

// Menyediakan pesan aman untuk kesalahan validasi katalog.
func (e *InvalidError) Error() string { return "Data tidak valid" }

type Service struct {
	Cfg     *config.Config
	DB      *sql.DB
	Storage storage.Storage
	Audit   *audit.Repo
}

// Menyiapkan katalog dengan konfigurasi media dan pencatatan audit.
func NewService(cfg *config.Config, db *sql.DB, st storage.Storage, a *audit.Repo) *Service {
	return &Service{Cfg: cfg, DB: db, Storage: st, Audit: a}
}

type Product struct {
	ID                 string     `json:"id"`
	StallID            string     `json:"stall_id"`
	StallName          string     `json:"stall_name"`
	Name               string     `json:"name"`
	Description        string     `json:"description"`
	PriceMinor         int64      `json:"price_minor"`
	Currency           string     `json:"currency"`
	AvailabilityStatus string     `json:"availability_status"`
	ImageURL           *string    `json:"image_url"`
	CreatedAt          time.Time   `json:"created_at"`
	ArchivedAt         *time.Time `json:"archived_at,omitempty"`
}

type ProductInput struct {
	Name               string
	Description        *string
	PriceMinor         int64
	AvailabilityStatus string
}

// Mengumpulkan kesalahan masukan produk sebelum perubahan basis data dilakukan.
func (s *Service) validateInput(in ProductInput) map[string]string {
	fields := map[string]string{}
	name := strings.TrimSpace(in.Name)
	if l := len(name); l < 3 || l > 100 {
		fields["name"] = "Nama produk 3-100 karakter"
	}
	if in.PriceMinor < 0 || in.PriceMinor > validate.MaxPriceMinor {
		fields["price_minor"] = "Harga tidak valid"
	}
	if in.AvailabilityStatus != "available" && in.AvailabilityStatus != "unavailable" {
		fields["availability_status"] = "Status ketersediaan tidak valid"
	}
	return fields
}

// Create: hanya untuk stan milik seller; stan milik lain → 404 (anti-leak).
func (s *Service) Create(ctx context.Context, sellerID, stallID string, in ProductInput, requestID string) (*Product, error) {
	if fields := s.validateInput(in); len(fields) > 0 {
		return nil, &InvalidError{Fields: fields}
	}
	var managed bool
	if err := s.DB.QueryRowContext(ctx, `
		SELECT EXISTS (SELECT 1 FROM seller_stalls WHERE seller_id=$1 AND stall_id=$2)`,
		sellerID, stallID).Scan(&managed); err != nil {
		return nil, err
	}
	if !managed {
		return nil, ErrNotFound
	}
	id, err := crypto.NewUUID()
	if err != nil {
		return nil, err
	}
	var desc any
	if in.Description != nil && strings.TrimSpace(*in.Description) != "" {
		if len(*in.Description) > 500 {
			return nil, &InvalidError{Fields: map[string]string{"description": "Deskripsi maksimal 500 karakter"}}
		}
		desc = strings.TrimSpace(*in.Description)
	}
	_, err = s.DB.ExecContext(ctx, `
		INSERT INTO products (id, stall_id, name, description, price_minor, availability_status, created_by)
		VALUES ($1,$2,$3,$4,$5,$6,$7)`,
		id, stallID, strings.TrimSpace(in.Name), desc, in.PriceMinor, in.AvailabilityStatus, sellerID)
	if err != nil {
		return nil, err
	}
	_ = s.Audit.Insert(ctx, s.DB, audit.Entry{
		ActorUserID: sellerID, Action: "product_create", ResourceType: "product",
		ResourceID: id, Outcome: "success", RequestID: requestID,
	})
	return s.GetForSeller(ctx, sellerID, id)
}

// Update mengubah nama/deskripsi/harga/ketersediaan; harga integer minor units
// (CAT-05); snapshot order tidak terpengaruh (CAT-07).
func (s *Service) Update(ctx context.Context, sellerID, productID string, in ProductInput, requestID string) (*Product, error) {
	if fields := s.validateInput(in); len(fields) > 0 {
		return nil, &InvalidError{Fields: fields}
	}
	var desc any
	if in.Description != nil {
		d := strings.TrimSpace(*in.Description)
		if len(d) > 500 {
			return nil, &InvalidError{Fields: map[string]string{"description": "Deskripsi maksimal 500 karakter"}}
		}
		if d == "" {
			desc = nil
		} else {
			desc = d
		}
	}
	res, err := s.DB.ExecContext(ctx, `
		UPDATE products p
		SET name = $3,
		    description = CASE WHEN $4::boolean THEN $5 ELSE p.description END,
		    price_minor = $6,
		    availability_status = $7,
		    updated_at = now()
		WHERE p.id = $1 AND p.archived_at IS NULL
		  AND EXISTS (SELECT 1 FROM seller_stalls ss WHERE ss.stall_id = p.stall_id AND ss.seller_id = $2)`,
		productID, sellerID,
		strings.TrimSpace(in.Name), in.Description != nil, desc,
		in.PriceMinor, in.AvailabilityStatus)
	if err != nil {
		return nil, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return nil, ErrNotFound
	}
	_ = s.Audit.Insert(ctx, s.DB, audit.Entry{
		ActorUserID: sellerID, Action: "product_update", ResourceType: "product",
		ResourceID: productID, Outcome: "success", RequestID: requestID,
	})
	return s.GetForSeller(ctx, sellerID, productID)
}

// Archive menonaktifkan produk, bukan hard delete (PRD §10.4).
func (s *Service) Archive(ctx context.Context, sellerID, productID, requestID string) (*Product, error) {
	res, err := s.DB.ExecContext(ctx, `
		UPDATE products p
		SET archived_at = COALESCE(p.archived_at, now()),
		    availability_status = 'unavailable',
		    updated_at = now()
		WHERE p.id = $1
		  AND EXISTS (SELECT 1 FROM seller_stalls ss WHERE ss.stall_id = p.stall_id AND ss.seller_id = $2)`,
		productID, sellerID)
	if err != nil {
		return nil, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return nil, ErrNotFound
	}
	_ = s.Audit.Insert(ctx, s.DB, audit.Entry{
		ActorUserID: sellerID, Action: "product_archive", ResourceType: "product",
		ResourceID: productID, Outcome: "success", RequestID: requestID,
	})
	return s.GetForSeller(ctx, sellerID, productID)
}

// Unarchive mengaktifkan kembali produk yang sebelumnya diarsipkan.
func (s *Service) Unarchive(ctx context.Context, sellerID, productID, requestID string) (*Product, error) {
	res, err := s.DB.ExecContext(ctx, `
		UPDATE products p
		SET archived_at = NULL,
		    availability_status = 'available',
		    updated_at = now()
		WHERE p.id = $1
		  AND EXISTS (SELECT 1 FROM seller_stalls ss WHERE ss.stall_id = p.stall_id AND ss.seller_id = $2)`,
		productID, sellerID)
	if err != nil {
		return nil, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return nil, ErrNotFound
	}
	_ = s.Audit.Insert(ctx, s.DB, audit.Entry{
		ActorUserID: sellerID, Action: "product_unarchive", ResourceType: "product",
		ResourceID: productID, Outcome: "success", RequestID: requestID,
	})
	return s.GetForSeller(ctx, sellerID, productID)
}

// UploadImage mengganti foto produk melalui alur server aman (CAT-06):
// validasi konten, key objek acak, objek lama dihapus best-effort.
func (s *Service) UploadImage(ctx context.Context, sellerID, productID string, data []byte, requestID string) (*Product, error) {
	webpData, err := imaging.ToWebP(data, s.Cfg.MaxUploadBytes)
	if err != nil {
		return nil, err
	}
	var oldKey sql.NullString
	err = s.DB.QueryRowContext(ctx, `
		SELECT p.image_key FROM products p
		WHERE p.id = $1
		  AND EXISTS (SELECT 1 FROM seller_stalls ss WHERE ss.stall_id = p.stall_id AND ss.seller_id = $2)`,
		productID, sellerID).Scan(&oldKey)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	uid, err := crypto.NewUUID()
	if err != nil {
		return nil, err
	}
	key := "Products/" + uid + ".webp"
	if err := s.Storage.Upload(ctx, key, "image/webp", webpData); err != nil {
		return nil, err
	}
	if _, err := s.DB.ExecContext(ctx, `
		UPDATE products SET image_key = $2, updated_at = now() WHERE id = $1`,
		productID, key); err != nil {
		return nil, err
	}
	if oldKey.Valid && oldKey.String != "" {
		_ = s.Storage.Delete(ctx, oldKey.String)
	}
	_ = s.Audit.Insert(ctx, s.DB, audit.Entry{
		ActorUserID: sellerID, Action: "product_image_upload", ResourceType: "product",
		ResourceID: productID, Outcome: "success", RequestID: requestID,
	})
	return s.GetForSeller(ctx, sellerID, productID)
}

// Membuat URL bertanda tangan bila kunci gambar tersedia pada penyimpanan.
// Menghasilkan URL akses sementara untuk gambar yang kuncinya tersimpan.
func (s *Service) signImage(ctx context.Context, key sql.NullString) *string {
	return storage.BestEffortSignedURL(ctx, s.Storage, key, s.Cfg.SignedURLTTL)
}

const productCols = `p.id, p.stall_id, st.name, p.name, COALESCE(p.description,''), p.price_minor, p.currency, p.availability_status, p.image_key, p.created_at, p.archived_at`

// Membaca satu produk dan melengkapi URL gambar sebelum dikembalikan.
func (s *Service) scanProduct(ctx context.Context, scan func(dest ...any) error) (*Product, error) {
	var pr Product
	var imageKey sql.NullString
	if err := scan(&pr.ID, &pr.StallID, &pr.StallName, &pr.Name, &pr.Description, &pr.PriceMinor,
		&pr.Currency, &pr.AvailabilityStatus, &imageKey, &pr.CreatedAt, &pr.ArchivedAt); err != nil {
		return nil, err
	}
	pr.ImageURL = s.signImage(ctx, imageKey)
	return &pr, nil
}

// GetPublic: hanya produk non-arsip pada stan aktif (CAT-01/02).
// Mengambil produk yang layak ditampilkan pada katalog publik.
func (s *Service) GetPublic(ctx context.Context, id string) (*Product, error) {
	row := s.DB.QueryRowContext(ctx, `
		SELECT `+productCols+`
		FROM products p JOIN stalls st ON st.id = p.stall_id
		WHERE p.id = $1 AND p.archived_at IS NULL AND st.status = 'active'`, id)
	pr, err := s.scanProduct(ctx, row.Scan)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return pr, nil
}

// ListPublic dengan filter stan, pencarian nama, dan cursor pagination
// (CAT-03); LIKE di-escape agar input tidak menjadi wildcard.
func (s *Service) ListPublic(ctx context.Context, stallID, q string, cursor httpx.Cursor, limit int) ([]Product, string, error) {
	where := "p.archived_at IS NULL AND st.status = 'active'"
	args := []any{}
	if stallID != "" {
		args = append(args, stallID)
		where += fmt.Sprintf(" AND p.stall_id = $%d", len(args))
	}
	if q != "" {
		args = append(args, escapeLike(strings.TrimSpace(q)))
		where += fmt.Sprintf(" AND lower(p.name) LIKE '%%' || lower($%d) || '%%' ESCAPE '\\'", len(args))
	}
	if cursor.ID != "" {
		args = append(args, cursor.Timestamp, cursor.ID)
		where += fmt.Sprintf(" AND (p.created_at, p.id) < ($%d, $%d)", len(args)-1, len(args))
	}
	args = append(args, limit+1)
	query := `
		SELECT ` + productCols + `
		FROM products p JOIN stalls st ON st.id = p.stall_id
		WHERE ` + where + `
		ORDER BY p.created_at DESC, p.id DESC
		LIMIT $` + fmt.Sprint(len(args))
	rows, err := s.DB.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, "", err
	}
	defer rows.Close()
	out := []Product{}
	for rows.Next() {
		pr, err := s.scanProduct(ctx, rows.Scan)
		if err != nil {
			return nil, "", err
		}
		out = append(out, *pr)
	}
	if err := rows.Err(); err != nil {
		return nil, "", err
	}
	next := ""
	if len(out) > limit {
		last := out[limit-1]
		next = httpx.EncodeCursor(httpx.Cursor{Timestamp: last.CreatedAt, ID: last.ID})
		out = out[:limit]
	}
	return out, next, nil
}

// GetForSeller: produk milik seller termasuk yang diarsip.
// Mengambil detail produk yang dikelola oleh penjual yang meminta.
func (s *Service) GetForSeller(ctx context.Context, sellerID, productID string) (*Product, error) {
	row := s.DB.QueryRowContext(ctx, `
		SELECT `+productCols+`
		FROM products p JOIN stalls st ON st.id = p.stall_id
		WHERE p.id = $1
		  AND EXISTS (SELECT 1 FROM seller_stalls ss WHERE ss.stall_id = p.stall_id AND ss.seller_id = $2)`,
		productID, sellerID)
	pr, err := s.scanProduct(ctx, row.Scan)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return pr, nil
}

// ListForSeller: semua produk pada stan yang dikelola seller (semua status),
// termasuk yang diarsipkan; stallID opsional untuk memfilter satu stan.
// Menyajikan produk milik penjual dan menambahkan URL gambar yang tersedia.
func (s *Service) ListForSeller(ctx context.Context, sellerID, stallID string) ([]Product, error) {
	query := `
		SELECT ` + productCols + `
		FROM products p JOIN stalls st ON st.id = p.stall_id
		WHERE EXISTS (SELECT 1 FROM seller_stalls ss WHERE ss.stall_id = p.stall_id AND ss.seller_id = $1)`
	args := []any{sellerID}
	if stallID != "" {
		query += ` AND p.stall_id = $2`
		args = append(args, stallID)
	}
	query += ` ORDER BY p.archived_at NULLS FIRST, p.created_at DESC`
	rows, err := s.DB.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Product{}
	for rows.Next() {
		pr, err := s.scanProduct(ctx, rows.Scan)
		if err != nil {
			return nil, err
		}
		out = append(out, *pr)
	}
	return out, rows.Err()
}

// Mengamankan karakter khusus LIKE agar pencarian diperlakukan sebagai teks.
// Mengutip wildcard LIKE agar masukan pencarian dicocokkan sebagai teks biasa.
func escapeLike(s string) string {
	r := strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`)
	return r.Replace(s)
}

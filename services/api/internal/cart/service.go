package cart

import (
	"context"
	"database/sql"

	"kantinkampus/api/internal/platform/config"
	"kantinkampus/api/internal/platform/db"
	"kantinkampus/api/internal/platform/storage"
	"kantinkampus/api/internal/platform/validate"
)

// Keranjang hanya kenyamanan; harga selalu dibaca ulang dari server saat
// order dibuat (PRD §9.1). Produk nonaktif tidak bisa masuk keranjang (CAT-02).

type Service struct {
	Cfg     *config.Config
	DB      *sql.DB
	Storage storage.Storage
}

func NewService(cfg *config.Config, d *sql.DB, st storage.Storage) *Service {
	return &Service{Cfg: cfg, DB: d, Storage: st}
}

// InvalidError validasi domain.
type InvalidError struct {
	Fields map[string]string
}

func (e *InvalidError) Error() string { return "Data tidak valid" }

type Item struct {
	ProductID           string  `json:"product_id"`
	Name                string  `json:"name"`
	StallID             string  `json:"stall_id"`
	StallName           string  `json:"stall_name"`
	UnitPriceMinor      int64   `json:"unit_price_minor"`
	Quantity            int     `json:"quantity"`
	LineTotalMinor      int64   `json:"line_total_minor"`
	AvailabilityStatus  string  `json:"availability_status"`
	ImageURL            *string `json:"image_url"`
}

type Cart struct {
	Items        []Item `json:"items"`
	SubtotalMinor int64  `json:"subtotal_minor"`
	Currency     string `json:"currency"`
}

func (s *Service) Get(ctx context.Context, buyerID string) (*Cart, error) {
	rows, err := s.DB.QueryContext(ctx, `
		SELECT ci.product_id, p.name, p.stall_id, st.name,
		       p.price_minor, ci.quantity, p.availability_status, p.image_key
		FROM cart_items ci
		JOIN carts c ON c.id = ci.cart_id
		JOIN products p ON p.id = ci.product_id
		JOIN stalls st ON st.id = p.stall_id
		WHERE c.buyer_id = $1
		ORDER BY ci.created_at`, buyerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	cart := &Cart{Items: []Item{}, Currency: "IDR"}
	for rows.Next() {
		var it Item
		var imageKey sql.NullString
		if err := rows.Scan(&it.ProductID, &it.Name, &it.StallID, &it.StallName,
			&it.UnitPriceMinor, &it.Quantity, &it.AvailabilityStatus, &imageKey); err != nil {
			return nil, err
		}
		it.LineTotalMinor = it.UnitPriceMinor * int64(it.Quantity)
		it.ImageURL = storage.BestEffortSignedURL(ctx, s.Storage, imageKey, s.Cfg.SignedURLTTL)
		cart.SubtotalMinor += it.LineTotalMinor
		cart.Items = append(cart.Items, it)
	}
	return cart, rows.Err()
}

// SetQuantity: upsert kuantitas; validasi produk aktif & tersedia (CART-03).
func (s *Service) SetQuantity(ctx context.Context, buyerID, productID string, quantity int) (*Cart, error) {
	if err := validate.ValidateQuantity(quantity); err != nil {
		return nil, &InvalidError{Fields: map[string]string{"quantity": err.Error()}}
	}
	if quantity == 0 {
		return s.RemoveItem(ctx, buyerID, productID)
	}

	var ok bool
	err := s.DB.QueryRowContext(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM products p
			JOIN stalls st ON st.id = p.stall_id
			WHERE p.id = $1 AND p.archived_at IS NULL
			  AND p.availability_status = 'available'
			  AND st.status = 'active')`, productID).Scan(&ok)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, &InvalidError{Fields: map[string]string{"product_id": "Produk tidak tersedia"}}
	}

	err = db.WithTx(ctx, s.DB, func(tx *sql.Tx) error {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO carts (buyer_id) VALUES ($1)
			ON CONFLICT (buyer_id) DO NOTHING`, buyerID); err != nil {
			return err
		}
		var cartID string
		if err := tx.QueryRowContext(ctx,
			`SELECT id FROM carts WHERE buyer_id = $1`, buyerID).Scan(&cartID); err != nil {
			return err
		}
		_, err := tx.ExecContext(ctx, `
			INSERT INTO cart_items (cart_id, product_id, quantity)
			VALUES ($1, $2, $3)
			ON CONFLICT (cart_id, product_id)
			DO UPDATE SET quantity = $3, updated_at = now()`,
			cartID, productID, quantity)
		return err
	})
	if err != nil {
		return nil, err
	}
	return s.Get(ctx, buyerID)
}

func (s *Service) RemoveItem(ctx context.Context, buyerID, productID string) (*Cart, error) {
	_, err := s.DB.ExecContext(ctx, `
		DELETE FROM cart_items ci
		USING carts c
		WHERE ci.cart_id = c.id AND c.buyer_id = $1 AND ci.product_id = $2`,
		buyerID, productID)
	if err != nil {
		return nil, err
	}
	return s.Get(ctx, buyerID)
}

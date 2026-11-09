package orders

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"sort"
	"time"

	"github.com/jackc/pgx/v5/pgconn"

	"kantinkampus/api/internal/audit"
	"kantinkampus/api/internal/platform/config"
	"kantinkampus/api/internal/platform/crypto"
	"kantinkampus/api/internal/platform/db"
	"kantinkampus/api/internal/platform/httpx"
	"kantinkampus/api/internal/platform/validate"
)

var (
	ErrNotFound            = errors.New("Pesanan tidak ditemukan")
	ErrIdempotencyConflict = errors.New("Idempotency key sudah dipakai dengan data berbeda")
	ErrQRISUnavailable     = errors.New("Pembayaran QRIS belum tersedia")
)

// InvalidError validasi domain.
type InvalidError struct {
	Fields map[string]string
}

// Menyediakan pesan aman untuk kesalahan validasi pesanan.
func (e *InvalidError) Error() string { return "Data tidak valid" }

type Service struct {
	Cfg   *config.Config
	DB    *sql.DB
	Audit *audit.Repo
}

// Menyiapkan layanan pesanan dengan konfigurasi dan repositori audit.
func NewService(cfg *config.Config, d *sql.DB, a *audit.Repo) *Service {
	return &Service{Cfg: cfg, DB: d, Audit: a}
}

type ItemIn struct {
	ProductID string
	Quantity  int
}

type ItemLine struct {
	ProductID      string `json:"product_id"`
	Name           string `json:"name"`
	StallID        string `json:"stall_id"`
	StallName      string `json:"stall_name"`
	UnitPriceMinor int64  `json:"unit_price_minor"`
	Quantity       int    `json:"quantity"`
	LineTotalMinor int64  `json:"line_total_minor"`
}

type StallSummary struct {
	StallID       string `json:"stall_id"`
	StallName     string `json:"stall_name"`
	SubtotalMinor int64  `json:"subtotal_minor"`
}

type PaymentLine struct {
	ID          string     `json:"id"`
	StallID     string     `json:"stall_id"`
	StallName   string     `json:"stall_name"`
	Method      string     `json:"method"`
	Status      string     `json:"status"`
	AmountMinor int64      `json:"amount_minor"`
	Currency    string     `json:"currency"`
	PaidAt      *time.Time `json:"paid_at"`
}

type FulfillmentLine struct {
	ID             string     `json:"id"`
	StallID        string     `json:"stall_id"`
	StallName      string     `json:"stall_name"`
	Status         string     `json:"status"`
	InPreparationAt *time.Time `json:"in_preparation_at"`
	ReadyForPickupAt *time.Time `json:"ready_for_pickup_at"`
	CompletedAt    *time.Time `json:"completed_at"`
}

type Detail struct {
	ID           string            `json:"id"`
	PublicCode   string            `json:"public_code"`
	Status       string            `json:"status"`
	QueueNumber  int               `json:"queue_number"`
	BuyerUsername string            `json:"buyer_username"`
	Currency     string            `json:"currency"`
	SubtotalMinor int64            `json:"subtotal_minor"`
	TotalMinor   int64             `json:"total_minor"`
	CreatedAt    time.Time         `json:"created_at"`
	Items        []ItemLine        `json:"items"`
	Payments     []PaymentLine     `json:"payments"`
	Fulfillments []FulfillmentLine `json:"fulfillments"`
}

type loadedProduct struct {
	id, name, stallID, stallName, availability string
	priceMinor int64
	archived   bool
	stallActive bool
}

// loadAndValidate membaca produk terkini DARI SERVER dan memvalidasi;
// harga keranjang klien tidak pernah dipercaya (CART-03, §10.6).
// lock=true memakai FOR UPDATE di dalam transaksi order.
func loadAndValidate(ctx context.Context, q db.DBTX, items []ItemIn, lock bool) ([]ItemLine, []StallSummary, int64, error) {
	fields := map[string]string{}
	if len(items) == 0 {
		fields["items"] = "Keranjang kosong"
	}
	if len(items) > validate.MaxOrderItems {
		fields["items"] = "Maksimal 50 item per pesanan"
	}
	seen := map[string]bool{}
	for _, it := range items {
		if seen[it.ProductID] {
			fields["items"] = "Ada produk yang tercantum ganda"
			break
		}
		seen[it.ProductID] = true
	}
	if len(fields) > 0 {
		return nil, nil, 0, &InvalidError{Fields: fields}
	}

	placeholders := ""
	args := make([]any, 0, len(items))
	for i, it := range items {
		if i > 0 {
			placeholders += ","
		}
		placeholders += fmt.Sprintf("$%d", i+1)
		args = append(args, it.ProductID)
	}
	query := `
		SELECT p.id, p.name, p.stall_id, st.name, p.price_minor,
		       p.availability_status, (p.archived_at IS NOT NULL) AS archived,
		       (st.status = 'active') AS stall_active
		FROM products p JOIN stalls st ON st.id = p.stall_id
		WHERE p.id IN (` + placeholders + `)`
	if lock {
		query += ` FOR UPDATE OF p`
	}
	rows, err := q.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, nil, 0, err
	}
	byID := map[string]loadedProduct{}
	for rows.Next() {
		var lp loadedProduct
		if err := rows.Scan(&lp.id, &lp.name, &lp.stallID, &lp.stallName, &lp.priceMinor,
			&lp.availability, &lp.archived, &lp.stallActive); err != nil {
			rows.Close()
			return nil, nil, 0, err
		}
		byID[lp.id] = lp
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, nil, 0, err
	}

	var lines []ItemLine
	stallOrder := []string{}
	stallNames := map[string]string{}
	stallSums := map[string]int64{}
	subtotal := int64(0)
	for _, it := range items {
		if err := validate.ValidateQuantity(it.Quantity); err != nil {
			return nil, nil, 0, &InvalidError{Fields: map[string]string{"quantity": err.Error()}}
		}
		lp, ok := byID[it.ProductID]
		if !ok || lp.archived || !lp.stallActive || lp.availability != "available" {
			return nil, nil, 0, &InvalidError{Fields: map[string]string{"items": "Ada produk yang tidak tersedia; perbarui keranjang Anda"}}
		}
		lineTotal := lp.priceMinor * int64(it.Quantity)
		lines = append(lines, ItemLine{
			ProductID: lp.id, Name: lp.name, StallID: lp.stallID, StallName: lp.stallName,
			UnitPriceMinor: lp.priceMinor, Quantity: it.Quantity, LineTotalMinor: lineTotal,
		})
		subtotal += lineTotal
		if _, seen := stallSums[lp.stallID]; !seen {
			stallOrder = append(stallOrder, lp.stallID)
			stallNames[lp.stallID] = lp.stallName
		}
		stallSums[lp.stallID] += lineTotal
	}
	summaries := make([]StallSummary, 0, len(stallOrder))
	for _, sid := range stallOrder {
		summaries = append(summaries, StallSummary{StallID: sid, StallName: stallNames[sid], SubtotalMinor: stallSums[sid]})
	}
	return lines, summaries, subtotal, nil
}

// hashRequest membuat canonical hash payload untuk idempotency (CART-04).
func hashRequest(method string, items []ItemIn) string {
	sorted := make([]ItemIn, len(items))
	copy(sorted, items)
	sort.Slice(sorted, func(i, j int) bool { return sorted[i].ProductID < sorted[j].ProductID })
	input := method
	for _, it := range sorted {
		input += "|" + it.ProductID + ":" + fmt.Sprint(it.Quantity)
	}
	sum := sha256.Sum256([]byte(input))
	return hex.EncodeToString(sum[:])
}

type Preview struct {
	Items         []ItemLine     `json:"items"`
	Stalls        []StallSummary `json:"stalls"`
	SubtotalMinor int64           `json:"subtotal_minor"`
	TotalMinor    int64           `json:"total_minor"`
	Currency      string          `json:"currency"`
}

// Menghitung total dan ringkasan stan dari produk yang tersedia saat ini.
func (s *Service) Preview(ctx context.Context, items []ItemIn) (*Preview, error) {
	lines, summaries, subtotal, err := loadAndValidate(ctx, s.DB, items, false)
	if err != nil {
		return nil, err
	}
	return &Preview{
		Items: lines, Stalls: summaries,
		SubtotalMinor: subtotal, TotalMinor: subtotal, Currency: "IDR",
	}, nil
}

// Create: order + snapshot item + fulfillment & payment per stan dalam SATU
// transaksi; idempotency-key mencegah order ganda saat retry (CART-04, ORD).
func (s *Service) Create(ctx context.Context, buyerID, method string, items []ItemIn, idemKey, requestID string) (*Detail, error) {
	if method != "cash" && method != "qris_placeholder" {
		return nil, &InvalidError{Fields: map[string]string{"payment_method": "Metode pembayaran tidak dikenal"}}
	}
	if method == "qris_placeholder" && !s.Cfg.AllowQRISPlaceholder {
		// QRIS placeholder ditolak tanpa klaim transaksi apa pun (ORD-06).
		return nil, ErrQRISUnavailable
	}
	reqHash := hashRequest(method, items)

	if idemKey != "" {
		var existingID, existingHash string
		err := s.DB.QueryRowContext(ctx, `
			SELECT id, request_hash FROM orders
			WHERE buyer_id = $1 AND idempotency_key = $2`, buyerID, idemKey).
			Scan(&existingID, &existingHash)
		if err == nil {
			if existingHash != reqHash {
				return nil, ErrIdempotencyConflict
			}
			return s.GetForBuyer(ctx, buyerID, existingID)
		}
		if !errors.Is(err, sql.ErrNoRows) {
			return nil, err
		}
	}

	var orderID string
	err := db.WithTx(ctx, s.DB, func(tx *sql.Tx) error {
		lines, summaries, subtotal, err := loadAndValidate(ctx, tx, items, true)
		if err != nil {
			return err
		}
		orderID, err = crypto.NewUUID()
		if err != nil {
			return err
		}
		var publicCode string
		for i := 0; i < 5; i++ { // kode pendek; retry bila tabrakan (ORD-08)
			publicCode, err = crypto.NewPublicCode()
			if err != nil {
				return err
			}
			_, err = tx.ExecContext(ctx, `
				INSERT INTO orders (id, public_code, buyer_id, status, currency, subtotal_minor, total_minor, idempotency_key, request_hash)
				VALUES ($1,$2,$3,'awaiting_payment','IDR',$4,$4,$5,$6)`,
				orderID, publicCode, buyerID, subtotal, nilable(idemKey), reqHash)
			if err == nil {
				break
			}
			var pe *pgconn.PgError
			if errors.As(err, &pe) && pe.Code == "23505" && pe.ConstraintName == "orders_public_code_key" {
				continue
			}
			return err
		}
		if err != nil {
			return err
		}
		for _, ln := range lines {
			if _, err := tx.ExecContext(ctx, `
				INSERT INTO order_items (order_id, product_id, stall_id, product_name_snapshot, unit_price_minor, quantity, line_total_minor)
				VALUES ($1,$2,$3,$4,$5,$6,$7)`,
				orderID, ln.ProductID, ln.StallID, ln.Name, ln.UnitPriceMinor, ln.Quantity, ln.LineTotalMinor); err != nil {
				return err
			}
		}
		paymentStatus := "cash_due"
		if method == "qris_placeholder" {
			paymentStatus = "awaiting_external_confirmation"
		}
		for _, sum := range summaries {
			if _, err := tx.ExecContext(ctx, `
				INSERT INTO order_stall_fulfillments (order_id, stall_id, fulfillment_status)
				VALUES ($1,$2,'pending')`, orderID, sum.StallID); err != nil {
				return err
			}
			if _, err := tx.ExecContext(ctx, `
				INSERT INTO payments (order_id, stall_id, method, status, amount_minor)
				VALUES ($1,$2,$3,$4,$5)`,
				orderID, sum.StallID, method, paymentStatus, sum.SubtotalMinor); err != nil {
				return err
			}
		}
		// Bersihkan keranjang buyer setelah order dibuat (CART-06).
		_, _ = tx.ExecContext(ctx, `
			DELETE FROM cart_items WHERE cart_id = (SELECT id FROM carts WHERE buyer_id = $1)`,
			buyerID)
		_ = s.Audit.Insert(ctx, tx, audit.Entry{
			ActorUserID: buyerID, Action: "order_create", ResourceType: "order",
			ResourceID: orderID, Outcome: "success", RequestID: requestID,
			Metadata: map[string]string{"method": method, "stalls": fmt.Sprint(len(summaries))},
		})
		return nil
	})
	if err != nil {
		return nil, err
	}
	return s.GetForBuyer(ctx, buyerID, orderID)
}

type Summary struct {
	ID          string    `json:"id"`
	PublicCode  string    `json:"public_code"`
	Status      string    `json:"status"`
	TotalMinor  int64     `json:"total_minor"`
	Currency    string    `json:"currency"`
	CreatedAt   time.Time `json:"created_at"`
	PaymentsTotal int     `json:"payments_total"`
	PaymentsPaid  int     `json:"payments_paid"`
}

// Mengambil pesanan pembeli dalam halaman yang mengikuti cursor.
func (s *Service) ListForBuyer(ctx context.Context, buyerID string, cursor httpx.Cursor, limit int) ([]Summary, string, error) {
	query := `
		SELECT o.id, o.public_code, o.status, o.total_minor, o.currency, o.created_at,
		       (SELECT count(*) FROM payments p WHERE p.order_id = o.id),
		       (SELECT count(*) FROM payments p WHERE p.order_id = o.id AND p.status = 'cash_paid')
		FROM orders o
		WHERE o.buyer_id = $1`
	args := []any{buyerID}
	if cursor.ID != "" {
		args = append(args, cursor.Timestamp, cursor.ID)
		query += fmt.Sprintf(" AND (o.created_at, o.id) < ($%d, $%d)", len(args)-1, len(args))
	}
	args = append(args, limit+1)
	query += fmt.Sprintf(" ORDER BY o.created_at DESC, o.id DESC LIMIT $%d", len(args))
	rows, err := s.DB.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, "", err
	}
	defer rows.Close()
	out := []Summary{}
	for rows.Next() {
		var sm Summary
		var total, paid int
		if err := rows.Scan(&sm.ID, &sm.PublicCode, &sm.Status, &sm.TotalMinor, &sm.Currency,
			&sm.CreatedAt, &total, &paid); err != nil {
			return nil, "", err
		}
		sm.PaymentsTotal, sm.PaymentsPaid = total, paid
		out = append(out, sm)
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

// GetForBuyer: hanya pemilik; order orang lain → 404 (acceptance no 6).
// Mengambil rincian pesanan hanya jika pesanan dimiliki pembeli yang meminta.
func (s *Service) GetForBuyer(ctx context.Context, buyerID, orderID string) (*Detail, error) {
	d := &Detail{Items: []ItemLine{}, Payments: []PaymentLine{}, Fulfillments: []FulfillmentLine{}}
	err := s.DB.QueryRowContext(ctx, `
		SELECT o.id, o.public_code, o.status, u.username, o.currency,
		       o.subtotal_minor, o.total_minor, o.created_at
		FROM orders o JOIN users u ON u.id = o.buyer_id
		WHERE o.id = $1 AND o.buyer_id = $2`, orderID, buyerID).
		Scan(&d.ID, &d.PublicCode, &d.Status, &d.BuyerUsername, &d.Currency,
			&d.SubtotalMinor, &d.TotalMinor, &d.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if err := s.fillDetail(ctx, d, ""); err != nil {
		return nil, err
	}
	stallID := ""
	if len(d.Items) > 0 {
		stallID = d.Items[0].StallID
	}
	d.QueueNumber = s.queueNumber(ctx, d.ID, stallID, d.CreatedAt, d.Payments)
	return d, nil
}

// fillDetail mengisi item/pembayaran/pemenuhan; stallFilter kosong = semua,
// otherwise hanya untuk stan tsb (untuk slice seller).
// Melengkapi detail pesanan dengan item dan status pembayaran per stan.
func (s *Service) fillDetail(ctx context.Context, d *Detail, stallFilter string) error {
	itemQuery := `
		SELECT oi.product_id, oi.product_name_snapshot, oi.stall_id, st.name,
		       oi.unit_price_minor, oi.quantity, oi.line_total_minor
		FROM order_items oi JOIN stalls st ON st.id = oi.stall_id
		WHERE oi.order_id = $1`
	payQuery := `
		SELECT p.id, p.stall_id, st.name, p.method, p.status, p.amount_minor, p.currency, p.paid_at
		FROM payments p JOIN stalls st ON st.id = p.stall_id
		WHERE p.order_id = $1`
	fulQuery := `
		SELECT f.id, f.stall_id, st.name, f.fulfillment_status,
		       f.in_preparation_at, f.ready_for_pickup_at, f.completed_at
		FROM order_stall_fulfillments f JOIN stalls st ON st.id = f.stall_id
		WHERE f.order_id = $1`
	if stallFilter != "" {
		itemQuery += " AND oi.stall_id = $2"
		payQuery += " AND p.stall_id = $2"
		fulQuery += " AND f.stall_id = $2"
	}
	fill := func(query string, scan func(*sql.Rows) error) error {
		var args []any
		args = append(args, d.ID)
		if stallFilter != "" {
			args = append(args, stallFilter)
		}
		rows, err := s.DB.QueryContext(ctx, query, args...)
		if err != nil {
			return err
		}
		defer rows.Close()
		for rows.Next() {
			if err := scan(rows); err != nil {
				return err
			}
		}
		return rows.Err()
	}
	if err := fill(itemQuery, func(rows *sql.Rows) error {
		var it ItemLine
		if err := rows.Scan(&it.ProductID, &it.Name, &it.StallID, &it.StallName,
			&it.UnitPriceMinor, &it.Quantity, &it.LineTotalMinor); err != nil {
			return err
		}
		d.Items = append(d.Items, it)
		return nil
	}); err != nil {
		return err
	}
	if err := fill(payQuery, func(rows *sql.Rows) error {
		var p PaymentLine
		var paidAt sql.NullTime
		if err := rows.Scan(&p.ID, &p.StallID, &p.StallName, &p.Method, &p.Status, &p.AmountMinor, &p.Currency, &paidAt); err != nil {
			return err
		}
		p.PaidAt = timePtr(paidAt)
		d.Payments = append(d.Payments, p)
		return nil
	}); err != nil {
		return err
	}
	return fill(fulQuery, func(rows *sql.Rows) error {
		var f FulfillmentLine
		var inPrep, ready, completed sql.NullTime
		if err := rows.Scan(&f.ID, &f.StallID, &f.StallName, &f.Status, &inPrep, &ready, &completed); err != nil {
			return err
		}
		f.InPreparationAt = timePtr(inPrep)
		f.ReadyForPickupAt = timePtr(ready)
		f.CompletedAt = timePtr(completed)
		d.Fulfillments = append(d.Fulfillments, f)
		return nil
	})
}

// Mengubah waktu nullable SQL menjadi pointer waktu untuk JSON (null bila belum terjadi).
func timePtr(nt sql.NullTime) *time.Time {
	if !nt.Valid {
		return nil
	}
	t := nt.Time
	return &t
}

type SellerOrder struct {
	Detail
	StallTotalMinor int64 `json:"stall_total_minor"`
}

// ListForSeller: hanya order yang memuat item stan yang dikelola seller
// (ORD-02), ditampilkan sebagai slice per stan (PRD 5.4.3).
// Mengambil antrean pesanan penjual dengan batas halaman yang ditentukan.
func (s *Service) ListForSeller(ctx context.Context, sellerID string, cursor httpx.Cursor, limit int) ([]SellerOrder, string, error) {
	query := `
		SELECT DISTINCT o.id, o.public_code, o.status, u.username, o.currency,
		       o.subtotal_minor, o.total_minor, o.created_at
		FROM orders o
		JOIN users u ON u.id = o.buyer_id
		JOIN order_items oi ON oi.order_id = o.id
		WHERE oi.stall_id IN (SELECT stall_id FROM seller_stalls WHERE seller_id = $1)`
	args := []any{sellerID}
	if cursor.ID != "" {
		args = append(args, cursor.Timestamp, cursor.ID)
		query += fmt.Sprintf(" AND (o.created_at, o.id) < ($%d, $%d)", len(args)-1, len(args))
	}
	args = append(args, limit+1)
	query += fmt.Sprintf(" ORDER BY o.created_at DESC, o.id DESC LIMIT $%d", len(args))
	rows, err := s.DB.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, "", err
	}
	defer rows.Close()
	out := []SellerOrder{}
	for rows.Next() {
		var so SellerOrder
		so.Items, so.Payments, so.Fulfillments = []ItemLine{}, []PaymentLine{}, []FulfillmentLine{}
		if err := rows.Scan(&so.ID, &so.PublicCode, &so.Status, &so.BuyerUsername, &so.Currency,
			&so.SubtotalMinor, &so.TotalMinor, &so.CreatedAt); err != nil {
			return nil, "", err
		}
		out = append(out, so)
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
	for i := range out {
		if err := s.fillSellerSlice(ctx, sellerID, &out[i]); err != nil {
			return nil, "", err
		}
		stallID := ""
		if len(out[i].Items) > 0 {
			stallID = out[i].Items[0].StallID
		} else if len(out[i].Payments) > 0 {
			stallID = out[i].Payments[0].StallID
		}
		out[i].QueueNumber = s.queueNumber(ctx, out[i].ID, stallID, out[i].CreatedAt, out[i].Payments)
	}
	return out, next, nil
}

// ListAllForAdmin mengembalikan pesanan lintas seluruh stan untuk laporan
// antrian admin, terbaru dulu. Nomor antrian mengikuti aturan harian yang sama
// dengan detail pembeli (reset pukul 00.00 WIB).
func (s *Service) ListAllForAdmin(ctx context.Context, cursor httpx.Cursor, limit int) ([]Detail, string, error) {
	query := `
		SELECT o.id, o.public_code, o.status, u.username, o.currency,
		       o.subtotal_minor, o.total_minor, o.created_at
		FROM orders o
		JOIN users u ON u.id = o.buyer_id`
	args := []any{}
	if cursor.ID != "" {
		args = append(args, cursor.Timestamp, cursor.ID)
		query += fmt.Sprintf(" WHERE (o.created_at, o.id) < ($%d, $%d)", len(args)-1, len(args))
	}
	args = append(args, limit+1)
	query += fmt.Sprintf(" ORDER BY o.created_at DESC, o.id DESC LIMIT $%d", len(args))
	rows, err := s.DB.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, "", err
	}
	out := []Detail{}
	for rows.Next() {
		var d Detail
		d.Items, d.Payments, d.Fulfillments = []ItemLine{}, []PaymentLine{}, []FulfillmentLine{}
		if err := rows.Scan(&d.ID, &d.PublicCode, &d.Status, &d.BuyerUsername, &d.Currency,
			&d.SubtotalMinor, &d.TotalMinor, &d.CreatedAt); err != nil {
			rows.Close()
			return nil, "", err
		}
		out = append(out, d)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, "", err
	}
	next := ""
	if len(out) > limit {
		last := out[limit-1]
		next = httpx.EncodeCursor(httpx.Cursor{Timestamp: last.CreatedAt, ID: last.ID})
		out = out[:limit]
	}
	for i := range out {
		if err := s.fillDetail(ctx, &out[i], ""); err != nil {
			return nil, "", err
		}
		stallID := ""
		if len(out[i].Payments) > 0 {
			stallID = out[i].Payments[0].StallID
		} else if len(out[i].Items) > 0 {
			stallID = out[i].Items[0].StallID
		}
		out[i].QueueNumber = s.queueNumber(ctx, out[i].ID, stallID, out[i].CreatedAt, out[i].Payments)
	}
	return out, next, nil
}

// fillSellerSlice mengisi item/pembayaran/pemenuhan hanya untuk stan milik
// seller ini pada order tersebut.
// Melengkapi pesanan penjual dengan bagian item dan status yang ia kelola.
func (s *Service) fillSellerSlice(ctx context.Context, sellerID string, so *SellerOrder) error {
	rows, err := s.DB.QueryContext(ctx, `
		SELECT oi.product_id, oi.product_name_snapshot, oi.stall_id, st.name,
		       oi.unit_price_minor, oi.quantity, oi.line_total_minor
		FROM order_items oi
		JOIN stalls st ON st.id = oi.stall_id
		WHERE oi.order_id = $1
		  AND oi.stall_id IN (SELECT stall_id FROM seller_stalls WHERE seller_id = $2)`,
		so.ID, sellerID)
	if err != nil {
		return err
	}
	so.StallTotalMinor = 0
	for rows.Next() {
		var it ItemLine
		if err := rows.Scan(&it.ProductID, &it.Name, &it.StallID, &it.StallName,
			&it.UnitPriceMinor, &it.Quantity, &it.LineTotalMinor); err != nil {
			rows.Close()
			return err
		}
		so.Items = append(so.Items, it)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return err
	}

	prows, err := s.DB.QueryContext(ctx, `
		SELECT p.id, p.stall_id, st.name, p.method, p.status, p.amount_minor, p.currency, p.paid_at
		FROM payments p
		JOIN stalls st ON st.id = p.stall_id
		WHERE p.order_id = $1
		  AND p.stall_id IN (SELECT stall_id FROM seller_stalls WHERE seller_id = $2)`,
		so.ID, sellerID)
	if err != nil {
		return err
	}
	for prows.Next() {
		var p PaymentLine
		var paidAt sql.NullTime
		if err := prows.Scan(&p.ID, &p.StallID, &p.StallName, &p.Method, &p.Status, &p.AmountMinor, &p.Currency, &paidAt); err != nil {
			prows.Close()
			return err
		}
		p.PaidAt = timePtr(paidAt)
		so.Payments = append(so.Payments, p)
		so.StallTotalMinor += p.AmountMinor
	}
	prows.Close()
	if err := prows.Err(); err != nil {
		return err
	}

	frows, err := s.DB.QueryContext(ctx, `
		SELECT f.id, f.stall_id, st.name, f.fulfillment_status,
		       f.in_preparation_at, f.ready_for_pickup_at, f.completed_at
		FROM order_stall_fulfillments f
		JOIN stalls st ON st.id = f.stall_id
		WHERE f.order_id = $1
		  AND f.stall_id IN (SELECT stall_id FROM seller_stalls WHERE seller_id = $2)`,
		so.ID, sellerID)
	if err != nil {
		return err
	}
	for frows.Next() {
		var f FulfillmentLine
		var inPrep, ready, completed sql.NullTime
		if err := frows.Scan(&f.ID, &f.StallID, &f.StallName, &f.Status, &inPrep, &ready, &completed); err != nil {
			frows.Close()
			return err
		}
		f.InPreparationAt = timePtr(inPrep)
		f.ReadyForPickupAt = timePtr(ready)
		f.CompletedAt = timePtr(completed)
		so.Fulfillments = append(so.Fulfillments, f)
	}
	return frows.Err()
}

// GetForSeller: slice seller untuk satu order; order tanpa item miliknya → 404.
// Mengambil detail pesanan hanya jika penjual terkait memiliki item di dalamnya.
func (s *Service) GetForSeller(ctx context.Context, sellerID, orderID string) (*SellerOrder, error) {
	so := &SellerOrder{Detail: Detail{Items: []ItemLine{}, Payments: []PaymentLine{}, Fulfillments: []FulfillmentLine{}}}
	err := s.DB.QueryRowContext(ctx, `
		SELECT o.id, o.public_code, o.status, u.username, o.currency,
		       o.subtotal_minor, o.total_minor, o.created_at
		FROM orders o
		JOIN users u ON u.id = o.buyer_id
		WHERE o.id = $1
		  AND EXISTS (
			SELECT 1 FROM order_items oi
			WHERE oi.order_id = o.id
			  AND oi.stall_id IN (SELECT stall_id FROM seller_stalls WHERE seller_id = $2))`,
		orderID, sellerID).
		Scan(&so.ID, &so.PublicCode, &so.Status, &so.BuyerUsername, &so.Currency,
			&so.SubtotalMinor, &so.TotalMinor, &so.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if err := s.fillSellerSlice(ctx, sellerID, so); err != nil {
		return nil, err
	}
	return so, nil
}

// RecalculateStatusTx menurunkan status order agregat setelah perubahan
// pembayaran/pemenuhan; dipanggil dalam transaksi yang sama (PRD §8).
func (s *Service) RecalculateStatusTx(ctx context.Context, tx *sql.Tx, orderID string) (string, error) {
	rows, err := tx.QueryContext(ctx,
		`SELECT status FROM payments WHERE order_id = $1`, orderID)
	if err != nil {
		return "", err
	}
	var payStatuses []string
	for rows.Next() {
		var st string
		if err := rows.Scan(&st); err != nil {
			rows.Close()
			return "", err
		}
		payStatuses = append(payStatuses, st)
	}
	rows.Close()

	rows, err = tx.QueryContext(ctx,
		`SELECT fulfillment_status FROM order_stall_fulfillments WHERE order_id = $1`, orderID)
	if err != nil {
		return "", err
	}
	var fulStatuses []string
	for rows.Next() {
		var st string
		if err := rows.Scan(&st); err != nil {
			rows.Close()
			return "", err
		}
		fulStatuses = append(fulStatuses, st)
	}
	rows.Close()

	derived := DeriveOrderStatus(payStatuses, fulStatuses)
	_, err = tx.ExecContext(ctx, `
		UPDATE orders SET status = $2, updated_at = now()
		WHERE id = $1 AND status IS DISTINCT FROM $2`, orderID, derived)
	return derived, err
}

// queueNumber mengembalikan nomor antrian order ini di antara order yang sudah
// dibayar (cash_paid) untuk stan yang sama PADA HARI YANG SAMA (Asia/Jakarta),
// berdasarkan waktu pembuatan. Antrian di-restart dari #1 setiap pukul 00.00 WIB.
// Mengembalikan 0 jika belum dibayar.
func (s *Service) queueNumber(ctx context.Context, orderID, stallID string, createdAt time.Time, payments []PaymentLine) int {
	for _, p := range payments {
		if p.Status != "cash_paid" {
			return 0
		}
	}
	if len(payments) == 0 || stallID == "" {
		return 0
	}
	jakarta, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		jakarta = time.FixedZone("WIB", 7*60*60)
	}
	dayStart := time.Date(createdAt.In(jakarta).Year(), createdAt.In(jakarta).Month(), createdAt.In(jakarta).Day(), 0, 0, 0, 0, jakarta)
	var n int
	err = s.DB.QueryRowContext(ctx, `
		SELECT count(DISTINCT o.id) + 1
		FROM orders o
		WHERE o.created_at < $1
		  AND o.created_at >= $3
		  AND EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.stall_id = $2)
		  AND EXISTS (SELECT 1 FROM payments p WHERE p.order_id = o.id AND p.stall_id = $2 AND p.status = 'cash_paid')`,
		createdAt, stallID, dayStart).Scan(&n)
	if err != nil {
		return 0
	}
	return n
}

// Mengubah teks kosong menjadi nilai null untuk parameter query opsional.
func nilable(s string) any {
	if s == "" {
		return nil
	}
	return s
}

package payments

import (
	"context"
	"database/sql"
	"errors"

	"kantinkampus/api/internal/audit"
	"kantinkampus/api/internal/orders"
	"kantinkampus/api/internal/platform/db"
)

var (
	ErrNotFound      = errors.New("Pembayaran tidak ditemukan")
	ErrStateConflict = errors.New("Status pembayaran tidak dapat diubah")
	ErrFulfillmentInvalid = errors.New("Status pemenuhan tidak valid untuk transisi ini")
)

type Service struct {
	DB      *sql.DB
	Orders  *orders.Service
	Audit   *audit.Repo
}

func NewService(d *sql.DB, o *orders.Service, a *audit.Repo) *Service {
	return &Service{DB: d, Orders: o, Audit: a}
}

type PaymentView struct {
	ID          string `json:"id"`
	OrderID     string `json:"order_id"`
	StallID     string `json:"stall_id"`
	StallName   string `json:"stall_name"`
	Method      string `json:"method"`
	Status      string `json:"status"`
	AmountMinor int64  `json:"amount_minor"`
	Currency    string `json:"currency"`
}

type ConfirmCashResult struct {
	Payment     PaymentView `json:"payment"`
	OrderID     string      `json:"order_id"`
	OrderStatus string      `json:"order_status"`
}

// ConfirmCash menandai tunai lunas SETELAH uang diterima; hanya seller stan
// terkait; idempotent; perubahan status ilegal ditolak (ORD-03/04/05).
// Status dijaga dengan UPDATE bersyarat (optimistic concurrency).
func (s *Service) ConfirmCash(ctx context.Context, sellerID, paymentID, requestID string) (*ConfirmCashResult, error) {
	var result *ConfirmCashResult
	err := db.WithTx(ctx, s.DB, func(tx *sql.Tx) error {
		var (
			orderID, stallID, method, status string
			amount                           int64
			stallName, currency              string
		)
		err := tx.QueryRowContext(ctx, `
			SELECT p.order_id, p.stall_id, st.name, p.method, p.status, p.amount_minor, p.currency
			FROM payments p
			JOIN stalls st ON st.id = p.stall_id
			WHERE p.id = $1
			  AND EXISTS (SELECT 1 FROM seller_stalls ss
			              WHERE ss.stall_id = p.stall_id AND ss.seller_id = $2)
			FOR UPDATE OF p`, paymentID, sellerID).
			Scan(&orderID, &stallID, &stallName, &method, &status, &amount, &currency)
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}
		if err != nil {
			return err
		}

		view := PaymentView{
			ID: paymentID, OrderID: orderID, StallID: stallID, StallName: stallName,
			Method: method, Status: status, AmountMinor: amount, Currency: currency,
		}
		result = &ConfirmCashResult{Payment: view, OrderID: orderID}

		switch {
		case method != "cash":
			return ErrStateConflict
		case status == "cash_paid":
			// Idempotent: konfirmasi ulang mengembalikan status terkini (ORD-05).
		case status == "cash_due":
			res, err := tx.ExecContext(ctx, `
				UPDATE payments
				SET status = 'cash_paid', paid_at = now(), confirmed_by = $2, updated_at = now()
				WHERE id = $1 AND status = 'cash_due'`,
				paymentID, sellerID)
			if err != nil {
				return err
			}
			if n, _ := res.RowsAffected(); n == 0 {
				return ErrStateConflict
			}
			if _, err := tx.ExecContext(ctx, `
				INSERT INTO payment_events (payment_id, from_status, to_status, actor_user_id, request_id)
				VALUES ($1, 'cash_due', 'cash_paid', $2, $3)`,
				paymentID, sellerID, requestID); err != nil {
				return err
			}
			_ = s.Audit.Insert(ctx, tx, audit.Entry{
				ActorUserID: sellerID, Action: "payment_confirm_cash", ResourceType: "payment",
				ResourceID: paymentID, Outcome: "success", RequestID: requestID,
				Metadata: map[string]string{"order_id": orderID, "stall_id": stallID},
			})
			result.Payment.Status = "cash_paid"
		default:
			return ErrStateConflict
		}

		orderStatus, err := s.Orders.RecalculateStatusTx(ctx, tx, orderID)
		if err != nil {
			return err
		}
		result.OrderStatus = orderStatus
		return nil
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

type FulfillmentResult struct {
	FulfillmentID string `json:"fulfillment_id"`
	Status        string `json:"status"`
	OrderID       string `json:"order_id"`
	OrderStatus   string `json:"order_status"`
}

// Rantai status pemenuhan yang diizinkan (ORD-07): status bebas dari klien
// ditolak; hanya transisi maju berikutnya yang diterima.
var nextFulfillmentStatus = map[string]string{
	"pending":         "in_preparation",
	"in_preparation":  "ready_for_pickup",
	"ready_for_pickup": "completed",
}

func (s *Service) UpdateFulfillment(ctx context.Context, sellerID, fulfillmentID, newStatus, requestID string) (*FulfillmentResult, error) {
	var result *FulfillmentResult
	err := db.WithTx(ctx, s.DB, func(tx *sql.Tx) error {
		var orderID, current string
		err := tx.QueryRowContext(ctx, `
			SELECT f.order_id, f.fulfillment_status
			FROM order_stall_fulfillments f
			WHERE f.id = $1
			  AND EXISTS (SELECT 1 FROM seller_stalls ss
			              WHERE ss.stall_id = f.stall_id AND ss.seller_id = $2)
			FOR UPDATE OF f`, fulfillmentID, sellerID).
			Scan(&orderID, &current)
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}
		if err != nil {
			return err
		}

		if newStatus == current {
			// Idempotent: status sama tidak mengubah apa pun.
		} else {
			if nextFulfillmentStatus[current] != newStatus {
				return ErrFulfillmentInvalid
			}
			res, err := tx.ExecContext(ctx, `
				UPDATE order_stall_fulfillments
				SET fulfillment_status = $2, updated_by = $3, updated_at = now()
				WHERE id = $1 AND fulfillment_status = $4`,
				fulfillmentID, newStatus, sellerID, current)
			if err != nil {
				return err
			}
			if n, _ := res.RowsAffected(); n == 0 {
				return ErrFulfillmentInvalid
			}
			_ = s.Audit.Insert(ctx, tx, audit.Entry{
				ActorUserID: sellerID, Action: "fulfillment_update", ResourceType: "fulfillment",
				ResourceID: fulfillmentID, Outcome: "success", RequestID: requestID,
				Metadata: map[string]string{"from": current, "to": newStatus},
			})
		}

		orderStatus, err := s.Orders.RecalculateStatusTx(ctx, tx, orderID)
		if err != nil {
			return err
		}
		result = &FulfillmentResult{
			FulfillmentID: fulfillmentID, Status: newStatus,
			OrderID: orderID, OrderStatus: orderStatus,
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

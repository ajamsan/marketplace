package orders

// DeriveOrderStatus menghitung status order agregat dari status pembayaran dan
// pemenuhan per stan (PRD §8). Pemisahan tiga status: order (fungsi ini),
// pembayaran (payments), dan pemenuhan per stan (fulfillments).
//
// QRIS placeholder TIDAK PERNAH menghasilkan status paid otomatis (ORD-06):
// payment 'awaiting_external_confirmation' dianggap belum lunas.
// Menurunkan status pesanan gabungan dari kondisi pembayaran dan pemenuhannya.
func DeriveOrderStatus(paymentStatuses, fulfillmentStatuses []string) string {
	for _, p := range paymentStatuses {
		if p != "cash_paid" {
			return "awaiting_payment"
		}
	}
	if len(paymentStatuses) == 0 {
		return "awaiting_payment"
	}
	allCompleted := true
	allReady := true
	anyPrep := false
	for _, f := range fulfillmentStatuses {
		switch f {
		case "completed":
			allReady = false
		case "in_preparation":
			allCompleted = false
			allReady = false
			anyPrep = true
		case "ready_for_pickup":
			allCompleted = false
		default: // pending / cancelled
			allCompleted = false
			allReady = false
		}
	}
	switch {
	case allCompleted:
		return "completed"
	case allReady:
		return "ready_for_pickup"
	case anyPrep:
		return "in_preparation"
	default:
		return "confirmed"
	}
}

package orders

import "testing"

func TestDeriveOrderStatus(t *testing.T) {
	cases := []struct {
		name        string
		payments    []string
		fulfillment []string
		want        string
	}{
		{"belum ada pembayaran", []string{"cash_due"}, []string{"pending"}, "awaiting_payment"},
		{"qris tidak pernah paid", []string{"awaiting_external_confirmation"}, []string{"pending"}, "awaiting_payment"},
		{"lunas tapi belum dimulai", []string{"cash_paid"}, []string{"pending"}, "confirmed"},
		{"sedang disiapkan", []string{"cash_paid"}, []string{"in_preparation"}, "in_preparation"},
		{"siap diambil", []string{"cash_paid"}, []string{"ready_for_pickup"}, "ready_for_pickup"},
		{"selesai", []string{"cash_paid"}, []string{"completed"}, "completed"},
		{"multi stan satu lunas", []string{"cash_paid", "cash_due"}, []string{"pending", "pending"}, "awaiting_payment"},
		{"multi stan semua lunas", []string{"cash_paid", "cash_paid"}, []string{"completed", "completed"}, "completed"},
		{"tanpa payment", nil, []string{"pending"}, "awaiting_payment"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := DeriveOrderStatus(tc.payments, tc.fulfillment); got != tc.want {
				t.Fatalf("harus %s, dapat %s", tc.want, got)
			}
		})
	}
}

package httpapi

import "kantinkampus/api/internal/orders"

// Request DTO dengan validasi authoritatif di service domain (PRD §11).

type registerRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

type verifyRegisterRequest struct {
	Email string `json:"email"`
	OTP   string `json:"otp"`
}

type resendRequest struct {
	Email   string `json:"email"`
	Purpose string `json:"purpose"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type loginVerifyRequest struct {
	PreAuthToken string `json:"pre_auth_token"`
	OTP          string `json:"otp"`
}

type meUpdateRequest struct {
	Username    *string           `json:"username"`
	Preferences map[string]string `json:"preferences"`
}

type stallRequest struct {
	Name          string  `json:"name"`
	Description   *string `json:"description"`
	LocationLabel *string `json:"location_label"`
}

type productRequest struct {
	Name               string  `json:"name"`
	Description        *string `json:"description"`
	PriceMinor         int64   `json:"price_minor"`
	AvailabilityStatus string  `json:"availability_status"`
}

type cartSetRequest struct {
	Quantity int `json:"quantity"`
}

type orderItemReq struct {
	ProductID string `json:"product_id"`
	Quantity  int    `json:"quantity"`
}

type orderPreviewRequest struct {
	Items []orderItemReq `json:"items"`
}

type orderCreateRequest struct {
	PaymentMethod string         `json:"payment_method"`
	Items         []orderItemReq `json:"items"`
}

type fulfillmentRequest struct {
	Status string `json:"status"`
}

func toOrderItems(in []orderItemReq) []orders.ItemIn {
	out := make([]orders.ItemIn, 0, len(in))
	for _, it := range in {
		out = append(out, orders.ItemIn{ProductID: it.ProductID, Quantity: it.Quantity})
	}
	return out
}

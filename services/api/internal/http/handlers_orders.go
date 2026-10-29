package httpapi

import (
	"net/http"

	"kantinkampus/api/internal/platform/httpx"
)

// --- keranjang buyer ---

func (s *Server) handleCartGet(w http.ResponseWriter, r *http.Request) {
	ac := currentAuth(r)
	c, err := s.Cart.Get(r.Context(), ac.UserID)
	if err != nil {
		s.writeDomainError(w, r, err)
		return
	}
	httpx.WriteData(w, r, http.StatusOK, c)
}

func (s *Server) handleCartSet(w http.ResponseWriter, r *http.Request) {
	ac := currentAuth(r)
	var req cartSetRequest
	if err := httpx.ReadJSON(w, r, &req, maxJSONBody); err != nil {
		httpx.WriteError(w, r, http.StatusBadRequest, "VALIDATION_ERROR",
			"Body permintaan tidak valid.", nil)
		return
	}
	c, err := s.Cart.SetQuantity(r.Context(), ac.UserID, r.PathValue("productId"), req.Quantity)
	if err != nil {
		s.writeDomainError(w, r, err)
		return
	}
	httpx.WriteData(w, r, http.StatusOK, c)
}

func (s *Server) handleCartDelete(w http.ResponseWriter, r *http.Request) {
	ac := currentAuth(r)
	c, err := s.Cart.RemoveItem(r.Context(), ac.UserID, r.PathValue("productId"))
	if err != nil {
		s.writeDomainError(w, r, err)
		return
	}
	httpx.WriteData(w, r, http.StatusOK, c)
}

// --- order buyer ---

func (s *Server) handleOrderPreview(w http.ResponseWriter, r *http.Request) {
	var req orderPreviewRequest
	if err := httpx.ReadJSON(w, r, &req, maxJSONBody); err != nil {
		httpx.WriteError(w, r, http.StatusBadRequest, "VALIDATION_ERROR",
			"Body permintaan tidak valid.", nil)
		return
	}
	p, err := s.Orders.Preview(r.Context(), toOrderItems(req.Items))
	if err != nil {
		s.writeDomainError(w, r, err)
		return
	}
	httpx.WriteData(w, r, http.StatusOK, p)
}

func (s *Server) handleOrderCreate(w http.ResponseWriter, r *http.Request) {
	ac := currentAuth(r)
	var req orderCreateRequest
	if err := httpx.ReadJSON(w, r, &req, maxJSONBody); err != nil {
		httpx.WriteError(w, r, http.StatusBadRequest, "VALIDATION_ERROR",
			"Body permintaan tidak valid.", nil)
		return
	}
	// Idempotency-Key wajib untuk mencegah order ganda saat retry (CART-04).
	idemKey := r.Header.Get("Idempotency-Key")
	if idemKey == "" {
		httpx.WriteError(w, r, http.StatusBadRequest, "VALIDATION_ERROR",
			"Header Idempotency-Key wajib diisi.", map[string]string{"idempotency_key": "Wajib diisi"})
		return
	}
	if len(idemKey) > 128 {
		httpx.WriteError(w, r, http.StatusBadRequest, "VALIDATION_ERROR",
			"Idempotency-Key terlalu panjang.", map[string]string{"idempotency_key": "Maksimal 128 karakter"})
		return
	}
	d, err := s.Orders.Create(r.Context(), ac.UserID, req.PaymentMethod, toOrderItems(req.Items), idemKey, s.requestID(r))
	if err != nil {
		s.writeDomainError(w, r, err)
		return
	}
	httpx.WriteData(w, r, http.StatusCreated, d)
}

func (s *Server) handleOrdersList(w http.ResponseWriter, r *http.Request) {
	ac := currentAuth(r)
	q := r.URL.Query()
	cursor, err := httpx.DecodeCursor(q.Get("cursor"))
	if err != nil {
		httpx.WriteError(w, r, http.StatusBadRequest, "VALIDATION_ERROR",
			"Parameter cursor tidak valid.", nil)
		return
	}
	limit := httpx.ClampLimit(parseIntDefault(q.Get("limit"), 0), 20, 50)
	list, next, err := s.Orders.ListForBuyer(r.Context(), ac.UserID, cursor, limit)
	if err != nil {
		s.writeDomainError(w, r, err)
		return
	}
	httpx.WriteData(w, r, http.StatusOK, map[string]any{
		"orders": list, "next_cursor": next,
	})
}

func (s *Server) handleOrderGet(w http.ResponseWriter, r *http.Request) {
	ac := currentAuth(r)
	d, err := s.Orders.GetForBuyer(r.Context(), ac.UserID, r.PathValue("id"))
	if err != nil {
		s.writeDomainError(w, r, err)
		return
	}
	httpx.WriteData(w, r, http.StatusOK, d)
}

// --- antrian seller ---

func (s *Server) handleSellerOrdersList(w http.ResponseWriter, r *http.Request) {
	ac := currentAuth(r)
	q := r.URL.Query()
	cursor, err := httpx.DecodeCursor(q.Get("cursor"))
	if err != nil {
		httpx.WriteError(w, r, http.StatusBadRequest, "VALIDATION_ERROR",
			"Parameter cursor tidak valid.", nil)
		return
	}
	limit := httpx.ClampLimit(parseIntDefault(q.Get("limit"), 0), 20, 50)
	list, next, err := s.Orders.ListForSeller(r.Context(), ac.UserID, cursor, limit)
	if err != nil {
		s.writeDomainError(w, r, err)
		return
	}
	httpx.WriteData(w, r, http.StatusOK, map[string]any{
		"orders": list, "next_cursor": next,
	})
}

func (s *Server) handleSellerOrderGet(w http.ResponseWriter, r *http.Request) {
	ac := currentAuth(r)
	so, err := s.Orders.GetForSeller(r.Context(), ac.UserID, r.PathValue("id"))
	if err != nil {
		s.writeDomainError(w, r, err)
		return
	}
	httpx.WriteData(w, r, http.StatusOK, so)
}

func (s *Server) handleConfirmCash(w http.ResponseWriter, r *http.Request) {
	ac := currentAuth(r)
	res, err := s.Payments.ConfirmCash(r.Context(), ac.UserID, r.PathValue("id"), s.requestID(r))
	if err != nil {
		s.writeDomainError(w, r, err)
		return
	}
	httpx.WriteData(w, r, http.StatusOK, res)
}

func (s *Server) handleFulfillmentStatus(w http.ResponseWriter, r *http.Request) {
	ac := currentAuth(r)
	var req fulfillmentRequest
	if err := httpx.ReadJSON(w, r, &req, maxJSONBody); err != nil {
		httpx.WriteError(w, r, http.StatusBadRequest, "VALIDATION_ERROR",
			"Body permintaan tidak valid.", nil)
		return
	}
	res, err := s.Payments.UpdateFulfillment(r.Context(), ac.UserID, r.PathValue("id"), req.Status, s.requestID(r))
	if err != nil {
		s.writeDomainError(w, r, err)
		return
	}
	httpx.WriteData(w, r, http.StatusOK, res)
}

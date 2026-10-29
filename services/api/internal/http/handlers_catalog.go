package httpapi

import (
	"errors"
	"net/http"

	"kantinkampus/api/internal/catalog"
	"kantinkampus/api/internal/platform/httpx"
	"kantinkampus/api/internal/platform/imaging"
	"kantinkampus/api/internal/platform/storage"
	"kantinkampus/api/internal/stalls"
)

// --- katalog publik ---

func (s *Server) handleStallsList(w http.ResponseWriter, r *http.Request) {
	list, err := s.Stalls.ListActive(r.Context())
	if err != nil {
		s.writeDomainError(w, r, err)
		return
	}
	httpx.WriteData(w, r, http.StatusOK, map[string]any{"stalls": list})
}

func (s *Server) handleStallGet(w http.ResponseWriter, r *http.Request) {
	st, err := s.Stalls.GetActive(r.Context(), r.PathValue("id"))
	if err != nil {
		s.writeDomainError(w, r, err)
		return
	}
	httpx.WriteData(w, r, http.StatusOK, st)
}

func (s *Server) handleProductsList(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	cursor, err := httpx.DecodeCursor(q.Get("cursor"))
	if err != nil {
		httpx.WriteError(w, r, http.StatusBadRequest, "VALIDATION_ERROR",
			"Parameter cursor tidak valid.", nil)
		return
	}
	limit := httpx.ClampLimit(parseIntDefault(q.Get("limit"), 0), 20, 50)
	items, next, err := s.Catalog.ListPublic(r.Context(), q.Get("stall_id"), q.Get("q"), cursor, limit)
	if err != nil {
		s.writeDomainError(w, r, err)
		return
	}
	httpx.WriteData(w, r, http.StatusOK, map[string]any{
		"items": items, "next_cursor": next,
	})
}

func (s *Server) handleProductGet(w http.ResponseWriter, r *http.Request) {
	p, err := s.Catalog.GetPublic(r.Context(), r.PathValue("id"))
	if err != nil {
		s.writeDomainError(w, r, err)
		return
	}
	httpx.WriteData(w, r, http.StatusOK, p)
}

// --- stan seller ---

func (s *Server) handleSellerStallCreate(w http.ResponseWriter, r *http.Request) {
	ac := currentAuth(r)
	var req stallRequest
	if err := httpx.ReadJSON(w, r, &req, maxJSONBody); err != nil {
		httpx.WriteError(w, r, http.StatusBadRequest, "VALIDATION_ERROR",
			"Body permintaan tidak valid.", nil)
		return
	}
	st, err := s.Stalls.Create(r.Context(), ac.UserID, req.Name, deref(req.Description), deref(req.LocationLabel), s.requestID(r))
	if err != nil {
		s.writeDomainError(w, r, err)
		return
	}
	httpx.WriteData(w, r, http.StatusCreated, st)
}

func (s *Server) handleSellerStallsList(w http.ResponseWriter, r *http.Request) {
	ac := currentAuth(r)
	list, err := s.Stalls.ListBySeller(r.Context(), ac.UserID)
	if err != nil {
		s.writeDomainError(w, r, err)
		return
	}
	httpx.WriteData(w, r, http.StatusOK, map[string]any{"stalls": list})
}

func (s *Server) handleSellerStallUpdate(w http.ResponseWriter, r *http.Request) {
	ac := currentAuth(r)
	var req stallRequest
	if err := httpx.ReadJSON(w, r, &req, maxJSONBody); err != nil {
		httpx.WriteError(w, r, http.StatusBadRequest, "VALIDATION_ERROR",
			"Body permintaan tidak valid.", nil)
		return
	}
	st, err := s.Stalls.UpdateBySeller(r.Context(), ac.UserID, r.PathValue("id"), stalls.UpdateInput{
		Name:          &req.Name,
		Description:   req.Description,
		LocationLabel: req.LocationLabel,
	}, s.requestID(r))
	if err != nil {
		s.writeDomainError(w, r, err)
		return
	}
	httpx.WriteData(w, r, http.StatusOK, st)
}

// --- produk seller ---

func (s *Server) productInput(req productRequest) catalog.ProductInput {
	return catalog.ProductInput{
		Name:               req.Name,
		Description:        req.Description,
		PriceMinor:         req.PriceMinor,
		AvailabilityStatus: req.AvailabilityStatus,
	}
}

func (s *Server) handleSellerProductsList(w http.ResponseWriter, r *http.Request) {
	ac := currentAuth(r)
	list, err := s.Catalog.ListForSeller(r.Context(), ac.UserID, r.URL.Query().Get("stall_id"))
	if err != nil {
		s.writeDomainError(w, r, err)
		return
	}
	httpx.WriteData(w, r, http.StatusOK, map[string]any{"products": list})
}

func (s *Server) handleProductCreate(w http.ResponseWriter, r *http.Request) {
	ac := currentAuth(r)
	var req productRequest
	if err := httpx.ReadJSON(w, r, &req, maxJSONBody); err != nil {
		httpx.WriteError(w, r, http.StatusBadRequest, "VALIDATION_ERROR",
			"Body permintaan tidak valid.", nil)
		return
	}
	p, err := s.Catalog.Create(r.Context(), ac.UserID, r.PathValue("stallId"), s.productInput(req), s.requestID(r))
	if err != nil {
		s.writeDomainError(w, r, err)
		return
	}
	httpx.WriteData(w, r, http.StatusCreated, p)
}

func (s *Server) handleProductUpdate(w http.ResponseWriter, r *http.Request) {
	ac := currentAuth(r)
	var req productRequest
	if err := httpx.ReadJSON(w, r, &req, maxJSONBody); err != nil {
		httpx.WriteError(w, r, http.StatusBadRequest, "VALIDATION_ERROR",
			"Body permintaan tidak valid.", nil)
		return
	}
	p, err := s.Catalog.Update(r.Context(), ac.UserID, r.PathValue("id"), s.productInput(req), s.requestID(r))
	if err != nil {
		s.writeDomainError(w, r, err)
		return
	}
	httpx.WriteData(w, r, http.StatusOK, p)
}

func (s *Server) handleProductArchive(w http.ResponseWriter, r *http.Request) {
	ac := currentAuth(r)
	p, err := s.Catalog.Archive(r.Context(), ac.UserID, r.PathValue("id"), s.requestID(r))
	if err != nil {
		s.writeDomainError(w, r, err)
		return
	}
	httpx.WriteData(w, r, http.StatusOK, p)
}

func (s *Server) handleProductImage(w http.ResponseWriter, r *http.Request) {
	ac := currentAuth(r)
	data, ok := s.readUploadFile(w, r)
	if !ok {
		return
	}
	p, err := s.Catalog.UploadImage(r.Context(), ac.UserID, r.PathValue("id"), data, s.requestID(r))
	if err != nil {
		if errors.Is(err, storage.ErrDisabled) {
			httpx.WriteError(w, r, http.StatusServiceUnavailable, "RESOURCE_UNAVAILABLE",
				"Penyimpanan foto belum dikonfigurasi pada server ini.", nil)
			return
		}
		if errors.Is(err, imaging.ErrTooLarge) || errors.Is(err, imaging.ErrType) || errors.Is(err, imaging.ErrDims) {
			httpx.WriteError(w, r, http.StatusUnprocessableEntity, "VALIDATION_ERROR", err.Error(), nil)
			return
		}
		s.writeDomainError(w, r, err)
		return
	}
	httpx.WriteData(w, r, http.StatusOK, p)
}

// --- admin ---

func (s *Server) handleAdminStallsList(w http.ResponseWriter, r *http.Request) {
	switch r.URL.Query().Get("status") {
	case "", "pending_review", "active", "inactive":
	default:
		httpx.WriteError(w, r, http.StatusBadRequest, "VALIDATION_ERROR",
			"Parameter status tidak valid.", nil)
		return
	}
	list, err := s.Stalls.AdminList(r.Context(), r.URL.Query().Get("status"))
	if err != nil {
		s.writeDomainError(w, r, err)
		return
	}
	httpx.WriteData(w, r, http.StatusOK, map[string]any{"stalls": list})
}

func (s *Server) handleAdminTransition(action string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ac := currentAuth(r)
		st, err := s.Stalls.AdminTransition(r.Context(), ac.UserID, r.PathValue("id"), action, s.requestID(r))
		if err != nil {
			s.writeDomainError(w, r, err)
			return
		}
		httpx.WriteData(w, r, http.StatusOK, st)
	}
}

func deref(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func parseIntDefault(s string, def int) int {
	if s == "" {
		return def
	}
	n := 0
	for _, c := range s {
		if c < '0' || c > '9' {
			return def
		}
		n = n*10 + int(c-'0')
		if n > 1_000_000 {
			return def
		}
	}
	return n
}

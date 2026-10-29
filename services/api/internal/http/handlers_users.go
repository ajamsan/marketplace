package httpapi

import (
	"errors"
	"io"
	"net/http"

	"kantinkampus/api/internal/platform/httpx"
	"kantinkampus/api/internal/platform/storage"
	"kantinkampus/api/internal/platform/imaging"
	"kantinkampus/api/internal/users"
)

func (s *Server) handleMe(w http.ResponseWriter, r *http.Request) {
	ac := currentAuth(r)
	p, err := s.Users.Me(r.Context(), ac.UserID)
	if err != nil {
		s.writeDomainError(w, r, err)
		return
	}
	httpx.WriteData(w, r, http.StatusOK, p)
}

func (s *Server) handleMeUpdate(w http.ResponseWriter, r *http.Request) {
	ac := currentAuth(r)
	var req meUpdateRequest
	if err := httpx.ReadJSON(w, r, &req, maxJSONBody); err != nil {
		httpx.WriteError(w, r, http.StatusBadRequest, "VALIDATION_ERROR",
			"Body permintaan tidak valid.", nil)
		return
	}
	p, err := s.Users.Update(r.Context(), ac.UserID, users.UpdateInput{
		Username:    req.Username,
		Preferences: req.Preferences,
	}, s.requestID(r))
	if err != nil {
		s.writeDomainError(w, r, err)
		return
	}
	httpx.WriteData(w, r, http.StatusOK, p)
}

const multipartMaxMemory = 3 << 20 // 3 MiB in-memory buffer

// readUploadFile membaca field "file" dari multipart dengan batas ukuran.
func (s *Server) readUploadFile(w http.ResponseWriter, r *http.Request) ([]byte, bool) {
	if err := r.ParseMultipartForm(multipartMaxMemory); err != nil {
		httpx.WriteError(w, r, http.StatusBadRequest, "VALIDATION_ERROR",
			"File tidak valid atau terlalu besar.", nil)
		return nil, false
	}
	file, _, err := r.FormFile("file")
	if err != nil {
		httpx.WriteError(w, r, http.StatusBadRequest, "VALIDATION_ERROR",
			"Field 'file' wajib diisi.", nil)
		return nil, false
	}
	defer func() { _ = file.Close() }()
	data, err := io.ReadAll(io.LimitReader(file, s.Cfg.MaxUploadBytes+1))
	if err != nil {
		httpx.WriteError(w, r, http.StatusBadRequest, "VALIDATION_ERROR",
			"File tidak dapat dibaca.", nil)
		return nil, false
	}
	if int64(len(data)) > s.Cfg.MaxUploadBytes {
		httpx.WriteError(w, r, http.StatusRequestEntityTooLarge, "VALIDATION_ERROR",
			"Ukuran file melebihi batas.", nil)
		return nil, false
	}
	return data, true
}

func (s *Server) handleProfilePhotoUpload(w http.ResponseWriter, r *http.Request) {
	ac := currentAuth(r)
	data, ok := s.readUploadFile(w, r)
	if !ok {
		return
	}
	p, err := s.Users.UploadPhoto(r.Context(), ac.UserID, data, s.requestID(r))
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

func (s *Server) handleProfilePhotoDelete(w http.ResponseWriter, r *http.Request) {
	ac := currentAuth(r)
	p, err := s.Users.DeletePhoto(r.Context(), ac.UserID, s.requestID(r))
	if err != nil {
		s.writeDomainError(w, r, err)
		return
	}
	httpx.WriteData(w, r, http.StatusOK, p)
}

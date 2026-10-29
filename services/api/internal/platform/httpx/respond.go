package httpx

import (
	"context"
	"encoding/json"
	"net/http"
)

type ctxKeyRequestID struct{}

// WithRequestID menyimpan request id ke context respons aktif.
func WithRequestID(ctx context.Context, id string) context.Context {
	return context.WithValue(ctx, ctxKeyRequestID{}, id)
}

// RequestID mengambil request id dari context; kosong bila tidak ada.
func RequestID(ctx context.Context) string {
	if v, ok := ctx.Value(ctxKeyRequestID{}).(string); ok {
		return v
	}
	return ""
}

type meta struct {
	RequestID string `json:"request_id"`
}

type successEnvelope struct {
	Data any  `json:"data"`
	Meta meta `json:"meta"`
}

type ErrorBody struct {
	Code    string            `json:"code"`
	Message string            `json:"message"`
	Fields  map[string]string `json:"fields,omitempty"`
}

type errorEnvelope struct {
	Error ErrorBody `json:"error"`
	Meta  meta      `json:"meta"`
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// WriteData menulis envelope sukses standar (PRD §10.1).
func WriteData(w http.ResponseWriter, r *http.Request, status int, data any) {
	writeJSON(w, status, successEnvelope{Data: data, Meta: meta{RequestID: RequestID(r.Context())}})
}

// WriteError menulis envelope error standar dengan kode error PRD §10.7.
func WriteError(w http.ResponseWriter, r *http.Request, status int, code, message string, fields map[string]string) {
	writeJSON(w, status, errorEnvelope{
		Error: ErrorBody{Code: code, Message: message, Fields: fields},
		Meta:  meta{RequestID: RequestID(r.Context())},
	})
}

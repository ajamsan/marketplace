package httpx

import (
	"encoding/json"
	"net/http"
	"strings"
)

// ReadJSON membatasi ukuran body dan mewajibkan Content-Type JSON (PRD §10).
func ReadJSON(w http.ResponseWriter, r *http.Request, dst any, maxBytes int64) error {
	if ct := r.Header.Get("Content-Type"); ct != "" && !strings.HasPrefix(ct, "application/json") {
		return errContentType
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxBytes)
	dec := json.NewDecoder(r.Body)
	if err := dec.Decode(dst); err != nil {
		return errMalformedBody
	}
	return nil
}

type httpError struct{ msg string }

func (e httpError) Error() string { return e.msg }

var (
	errContentType   = httpError{"Content-Type harus application/json"}
	errMalformedBody = httpError{"Body tidak valid"}
)

// IsContentTypeError melaporkan error Content-Type JSON untuk di-mapping handler.
func IsContentTypeError(err error) bool { return err == errContentType }

// IsBodyError melaporkan body JSON yang tidak bisa dibaca.
func IsBodyError(err error) bool { return err == errMalformedBody }

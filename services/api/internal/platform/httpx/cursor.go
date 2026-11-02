package httpx

import (
	"encoding/base64"
	"fmt"
	"strings"
	"time"
)

// Cursor pagination opaque (PRD §11): berisi (created_at, id) yang di-encode
// base64url. Klien tidak boleh mengira strukturnya.
type Cursor struct {
	Timestamp time.Time
	ID        string
}

// Mengodekan posisi dan ID agar cursor dapat dikirim tanpa mengekspos strukturnya.
func EncodeCursor(c Cursor) string {
	s := fmt.Sprintf("%d|%s", c.Timestamp.UnixMicro(), c.ID)
	return base64.RawURLEncoding.EncodeToString([]byte(s))
}

// Memvalidasi dan mengurai cursor buram yang dikirim dari klien.
func DecodeCursor(s string) (Cursor, error) {
	var c Cursor
	if s == "" {
		return c, nil
	}
	raw, err := base64.RawURLEncoding.DecodeString(s)
	if err != nil {
		return c, fmt.Errorf("cursor tidak valid")
	}
	parts := strings.SplitN(string(raw), "|", 2)
	if len(parts) != 2 {
		return c, fmt.Errorf("cursor tidak valid")
	}
	var micros int64
	if _, err := fmt.Sscanf(parts[0], "%d", &micros); err != nil {
		return c, fmt.Errorf("cursor tidak valid")
	}
	if parts[1] == "" {
		return c, fmt.Errorf("cursor tidak valid")
	}
	c.Timestamp = time.UnixMicro(micros).UTC()
	c.ID = parts[1]
	return c, nil
}

// ClampLimit membatasi ukuran halaman.
func ClampLimit(n, def, max int) int {
	if n <= 0 {
		return def
	}
	if n > max {
		return max
	}
	return n
}

package storage

import (
	"context"
	"database/sql"
	"time"
)

// BestEffortSignedURL menyelesaikan URL foto bila key ada dan storage aktif;
// kegagalan signing tidak gagalkan respons utama (foto opsional).
func BestEffortSignedURL(ctx context.Context, st Storage, key sql.NullString, ttl time.Duration) *string {
	if st == nil || !key.Valid || key.String == "" {
		return nil
	}
	url, err := st.SignedURL(ctx, key.String, ttl)
	if err != nil {
		return nil
	}
	return &url
}

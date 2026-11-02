package storage

import (
	"context"
	"errors"
	"time"
)

// Storage menyimpan foto profil/produk. Service role key HANYA dipakai
// backend (PROF-03). Object key selalu acak, bukan nama file pengguna.
type Storage interface {
	Upload(ctx context.Context, key, contentType string, data []byte) error
	Delete(ctx context.Context, key string) error
	SignedURL(ctx context.Context, key string, ttl time.Duration) (string, error)
}

// ErrDisabled saat Supabase belum dikonfigurasi (dev tanpa storage).
var ErrDisabled = errors.New("penyimpanan foto belum dikonfigurasi")

// Disabled mengembalikan error untuk semua operasi.
type Disabled struct{}

// Menolak unggahan secara eksplisit saat penyimpanan belum dikonfigurasi.
func (Disabled) Upload(context.Context, string, string, []byte) error { return ErrDisabled }

// Menolak penghapusan saat backend penyimpanan tidak tersedia.
func (Disabled) Delete(context.Context, string) error                 { return ErrDisabled }

// Menolak pembuatan URL saat backend penyimpanan tidak tersedia.
func (Disabled) SignedURL(context.Context, string, time.Duration) (string, error) {
	return "", ErrDisabled
}

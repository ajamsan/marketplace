package storage

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// Supabase REST (server-side, service role). Tidak ada SDK: cukup tiga endpoint
// storage API yang dipakai (upload, delete, sign).
type Supabase struct {
	baseURL string
	apiKey  string
	bucket  string
	client  *http.Client
}

// Menyiapkan klien REST Supabase untuk bucket yang dikonfigurasi server.
func NewSupabase(baseURL, apiKey, bucket string) *Supabase {
	return &Supabase{
		baseURL: strings.TrimRight(baseURL, "/"),
		apiKey:  apiKey,
		bucket:  bucket,
		client:  &http.Client{Timeout: 20 * time.Second},
	}
}

// Mengirim permintaan terautentikasi dan memetakan respons REST penyimpanan.
func (s *Supabase) do(ctx context.Context, method, path, contentType string, body []byte, out any) error {
	var rdr io.Reader
	if body != nil {
		rdr = bytes.NewReader(body)
	}
	req, err := http.NewRequestWithContext(ctx, method, s.baseURL+path, rdr)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("supabase: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode >= 300 {
		b, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return fmt.Errorf("supabase: status %d: %s", resp.StatusCode, string(b))
	}
	if out != nil {
		return json.NewDecoder(resp.Body).Decode(out)
	}
	return nil
}

// Mengunggah objek menggunakan kunci acak yang ditentukan layanan.
func (s *Supabase) Upload(ctx context.Context, key, contentType string, data []byte) error {
	path := fmt.Sprintf("/storage/v1/object/%s/%s", s.bucket, key)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.baseURL+path, bytes.NewReader(data))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("Content-Type", contentType)
	req.Header.Set("x-upsert", "true")
	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("supabase: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode >= 300 {
		b, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return fmt.Errorf("supabase upload: status %d: %s", resp.StatusCode, string(b))
	}
	return nil
}

// Menghapus objek dari bucket setelah referensinya dilepas oleh domain.
func (s *Supabase) Delete(ctx context.Context, key string) error {
	return s.do(ctx, http.MethodDelete,
		fmt.Sprintf("/storage/v1/object/%s/%s", s.bucket, key), "", nil, nil)
}

type signResponse struct {
	SignedURL string `json:"signedURL"`
}

// Meminta URL bertanda tangan yang berlaku terbatas untuk objek privat.
func (s *Supabase) SignedURL(ctx context.Context, key string, ttl time.Duration) (string, error) {
	body, _ := json.Marshal(map[string]int64{"expiresIn": int64(ttl.Seconds())})
	var out signResponse
	// objek privat disajikan via URL bertanda tangan berumur pendek (PROF-04).
	if err := s.do(ctx, http.MethodPost,
		fmt.Sprintf("/storage/v1/object/sign/%s/%s", s.bucket, key),
		"application/json", body, &out); err != nil {
		return "", err
	}
	if out.SignedURL == "" {
		return "", fmt.Errorf("supabase: signedURL kosong")
	}
	return s.baseURL + "/storage/v1" + out.SignedURL, nil
}

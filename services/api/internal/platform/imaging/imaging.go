package imaging

import (
	"bytes"
	"errors"
	"image"
	_ "image/jpeg"
	_ "image/png"
)

// Validasi upload berdasarkan konten file (PROF-02, §11): magic bytes, ukuran,
// dan dimensi. SVG/HTML aktif ditolak; hanya PNG/JPEG raster.
var (
	ErrTooLarge  = errors.New("Ukuran file melebihi batas")
	ErrType      = errors.New("Hanya file PNG atau JPG yang didukung")
	ErrDims      = errors.New("Dimensi gambar harus 32-4000 piksel")
)

const (
	MinDimension = 32
	MaxDimension = 4000
)

var (
	pngMagic  = []byte{0x89, 'P', 'N', 'G'}
	jpegMagic = []byte{0xFF, 0xD8, 0xFF}
)

// ValidateImage memeriksa data mentah dan mengembalikan ekstensi normalisasi.
func ValidateImage(data []byte, maxBytes int64) (string, error) {
	if int64(len(data)) > maxBytes {
		return "", ErrTooLarge
	}
	var ext string
	switch {
	case bytes.HasPrefix(data, pngMagic):
		ext = "png"
	case bytes.HasPrefix(data, jpegMagic):
		ext = "jpg"
	default:
		return "", ErrType
	}
	cfg, _, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil {
		return "", ErrType
	}
	if cfg.Width < MinDimension || cfg.Height < MinDimension ||
		cfg.Width > MaxDimension || cfg.Height > MaxDimension {
		return "", ErrDims
	}
	return ext, nil
}

// ContentType mengembalikan MIME untuk ekstensi hasil validasi.
func ContentType(ext string) string {
	if ext == "png" {
		return "image/png"
	}
	return "image/jpeg"
}

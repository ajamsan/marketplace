package imaging

import (
	"bytes"
	"errors"
	"image"
	_ "image/jpeg"
	_ "image/png"

	"github.com/HugoSmits86/nativewebp"
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
	if ext == "webp" {
		return "image/webp"
	}
	return "image/jpeg"
}

// ToWebP memvalidasi konten gambar (ukuran, tipe, dimensi) lalu mengonversi
// ke format WebP. Mengembalikan bytes WebP siap simpan. (PROF-02, CAT-06)
func ToWebP(data []byte, maxBytes int64) ([]byte, error) {
	if _, err := ValidateImage(data, maxBytes); err != nil {
		return nil, err
	}
	img, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, ErrType
	}
	var buf bytes.Buffer
	if err := nativewebp.Encode(&buf, img, &nativewebp.Options{
		CompressionLevel: nativewebp.DefaultCompression,
	}); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

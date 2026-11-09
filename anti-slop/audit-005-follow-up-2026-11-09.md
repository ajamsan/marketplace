# Audit 005: Tindak Lanjut Perbaikan (9 November 2026)

Checkpoint keselamatan: commit `9fc943b` ("Checkpoint keselamatan sebelum perbaikan audit-005").
Semua perbaikan berada di commit berikutnya di atas checkpoint ini.

Rollback: `git reset --hard 9fc943b` mengembalikan seluruh pohon sumber ke kondisi sebelum perbaikan
(termasuk berkas audit-005). Untuk membatalkan hanya migrasi DB (kolom waktu pemenuhan):
`migrate -path services/api/migrations -database $env:DATABASE_URL down 1` (atau `1` ke `0`).

## Status per temuan

| # | Temuan | Status | Bukti |
|---|--------|--------|-------|
| 10 | Riwayat antrian admin gagal dimuat | Kode selesai; **menunggu restart backend Terminal 1** | Route diverifikasi di instance :8081 (401 untuk anonim, butuh admin); pesan error kini eksplisit; migrasi DB 10 terpasang |
| 11 | Timeline status pesanan salah waktu | Selesai | Migrasi 0010 (`in_preparation_at`, `ready_for_pickup_at`, `completed_at`, `payments.paid_at` ditampilkan); backend mengisi waktu transisi aktual; `order-timeline.tsx` ditulis ulang (tidak ada lagi `Date.parse` UUID); nilai kosong tampil jujur ("Belum") |
| 12 | Lazy loading foto detail utama | Selesai | `ProductPhoto` punya prop `eager`; halaman detail produk memakai eager + `fetchpriority="high"` |
| 13 | Tautan akun di header landing ke `/catalog` untuk semua peran | Selesai | `landing-header.tsx`: tautan akun mengikuti peran (`homePathForRole`), label menjelaskan tujuan; menu seluler idem |
| 14 | "Buka Keranjang" di bottom bar < 44px | Selesai | `cart-bar.tsx`: `min-h-11`, `inline-flex items-center` |
| 15 | Konten Seller/Admin melebar penuh | Selesai | `max-w` pada halaman stan (4xl), produk (6xl/2xl/2xl), orders (5xl), admin (6xl); Harga + Status ketersediaan jadi dua kolom di form produk |
| 16 | Status pemenuhan tampil dua kali | Selesai | Baris duplikat dihapus dari `order-queue.tsx`; FulfillmentControls satu-satunya sumber status |
| 17 | Kartu produk terakhir sendirian di grid 3 kolom | Diputuskan pemilik produk: grid flow kiri ke kanan seperti biasa (tidak di-center), di showcase dan katalog. | `showcase-section.tsx`, `catalog/page.tsx` |
| 18 | Blok cakupan pilot berat sebelah | Selesai | Catatan pilot jadi banner penuh; panel "Sudah berjalan" dan "Belum ada" berdampingan dua kolom seimbang di `scope-section.tsx` |
| 19 | Catatan Admin menempel di bagian Buyer | Selesai | Catatan kini blok kutipan di dalam artikel Admin pada `roles-section.tsx` |

## Hasil verifikasi
- `tsc --noEmit` LULUS (exit 0), `vitest run` 14/14 LULUS.
- `go build ./...` LULUS, `go vet` bersih.
- Migrasi DB: `migrate up` sukses (version 10).
- Halaman publik dimuat ulang tanpa console error baru: /, /about, /role, /scope (hanya 401 auth-refresh pra-ada).
- Route `/peran` → `/role` dan `/cakupan` → `/scope` (9 November 2026, permintaan naming folder/file berbahasa Inggris dari pemilik proyek).
- Sesi browser anonim saat audit lanjutan: halaman ber-autentikasi diverifikasi lewat kode + kompilasi, bukan klik nyata.

## Menunggu tindakan pemilik proyek
1. Restart backend (`go run ./cmd/api` di Terminal 1), lalu pastikan `GET /api/v1/admin/orders` menjawab 401 tanpa token dan 200 dengan sesi admin. Transisi status pemenuhan berikutnya akan mengisi `in_preparation_at`, `ready_for_pickup_at`, `completed_at`.
2. Cek kembali beranda, /catalog, /settings, /seller/*, /admin di Review pane (desktop + ponsel) untuk menyesuaikan komposisi baru secara visual.

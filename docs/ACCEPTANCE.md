# Kriteria Penerimaan

Status repository ini: **belum ada acceptance criteria yang dijalankan terhadap produk**. Tidak ada klaim kelulusan. PRD §18 menyatakan bahwa tidak ada klaim keberhasilan implementasi sebelum kriteria dijalankan pada produk nyata, dan hasil, tanggal, versi, serta isu tersisa harus dicatat.

Isi kolom `Status` hanya setelah pengujian benar-benar dijalankan; tambahkan bukti (tanggal, versi/commit, environment, hasil) pada kolom `Catatan`.

## 1. Acceptance criteria inti (PRD §18.1)

| No | Kriteria | Cara verifikasi | Status | Catatan |
|---|---|---|---|---|
| 1 | Buyer mendaftar dengan username/email/password/role, menerima OTP, dan tidak bisa masuk sebelum OTP valid | Jalankan `POST /api/v1/auth/register` lalu `POST /api/v1/auth/register/verify`; cek OTP dari log dev; coba memakai endpoint terproteksi sebelum verifikasi | Belum dijalankan | Butuh data uji |
| 2 | OTP salah lima kali mengikuti ronde dan lockout yang ditentukan; resend, challenge baru, concurrency, dan refresh halaman tidak menghapus lock aktif | Uji 5 submit OTP salah berurutan, resend di tengah ronde, dan beberapa request paralel; periksa `otp_challenges.attempt_count`, `auth_throttles.failure_count`, dan `locked_until` | Belum dijalankan | butuh skrip uji konkurensi |
| 3 | Login membutuhkan password dan OTP; respons publik tidak membedakan email tidak terdaftar dengan kredensial salah | Bandingkan body dan status respons `POST /api/v1/auth/login` untuk email asing dan password salah; ukur juga perbedaan waktu | Belum dijalankan | |
| 4 | Password dan OTP tidak tersimpan plaintext; pemeriksaan database dan log tidak menemukan rahasia | Inspect baris `users.password_hash`, `otp_challenges.otp_hash`, `email_outbox.payload_redacted`; grep log API untuk nilai OTP/password | Belum dijalankan | |
| 5 | JWT tidak berlaku setelah expiry; refresh token berotasi; replay token lama mencabut keluarga sesi sesuai kebijakan | Tunggu melewati `ACCESS_TOKEN_TTL`; pakai refresh token lama dua kali; periksa `login_sessions.refresh_token_hash`, `previous_refresh_token_hash`, dan `revoked_at` untuk seluruh `token_family_id` | Belum dijalankan | |
| 6 | Buyer tidak dapat mengubah produk, melihat order orang lain, menandai pembayaran lunas, atau memanggil aksi seller lewat API | Panggil endpoint seller dan endpoint order milik user lain dengan token buyer; verifikasi `403`/`404` | Belum dijalankan | |
| 7 | Seller stan A tidak dapat membaca/mengubah produk atau pesanan stan B | Login sebagai seller lain lalu panggil `GET/PATCH /api/v1/seller/...` untuk stan milik seller A | Belum dijalankan | |
| 8 | Harga checkout ditentukan server dan snapshot order tetap sama setelah harga katalog berubah | Buat order, ubah `products.price_minor`, lalu bandingkan `order_items.unit_price_minor` dengan order | Belum dijalankan | |
| 9 | Retry order dengan idempotency key yang sama tidak membuat order ganda; key sama dengan payload berbeda ditolak | Kirim `POST /api/v1/orders` dua kali dengan `Idempotency-Key` sama dan payload sama, lalu sekali lagi dengan payload berbeda | Belum dijalankan | |
| 10 | Seller dapat menandai tunai lunas sekali secara idempotent; aktor dan waktunya terekam; buyer melihat status yang benar | Konfirmasi `POST /api/v1/seller/payments/{id}/confirm-cash` dua kali; periksa `payments.confirmed_by`, `paid_at`, `payment_events`, dan status order pada sisi buyer | Belum dijalankan | |
| 11 | QRIS tidak menghasilkan QR, tidak mengaku sudah dibayar, dan tidak menghasilkan bukti/settlement palsu | Buat order dengan `payment_method=qris_placeholder` pada konfigurasi default (`ALLOW_QRIS_PLACEHOLDER=false`) dan periksa respons `503 RESOURCE_UNAVAILABLE`; nyalakan flag secara lokal untuk memeriksa tidak adanya QR maupun status `paid` | Belum dijalankan | |
| 12 | Pengguna mencabut satu sesi lain, sesi pemohon tetap aktif, dan refresh pada sesi yang dicabut gagal | `GET /api/v1/auth/sessions`, `DELETE /api/v1/auth/sessions/{id}`, lalu coba refresh dengan token sesi yang dicabut | Belum dijalankan | |
| 13 | Lokasi/IP disajikan sebagai perkiraan/tersamar dan IP publik tidak tampil pada buyer | Periksa `login_sessions.ip_masked` dan respons daftar sesi; pastikan `ip_hash`/IP mentah tidak dikirim ke klien | Belum dijalankan | |
| 14 | Upload invalid/terlalu besar ditolak dan file yang diganti/dihapus mengikuti kebijakan storage | Kirim file non-PNG/JPEG, file melebihi `MAX_UPLOAD_BYTES`, dan gambar di luar rentang dimensi; ganti lalu hapus foto profil dan cek objek lama di Supabase | Belum dijalankan | butuh bucket Supabase aktif |
| 15 | Tampilan dapat digunakan dengan keyboard, pada viewport ponsel dan desktop, serta pada semua tema/aksen yang didukung | Uji manual keyboard, viewport ponsel/desktop, dan kombinasi terang/gelap dengan lima aksen | Belum dijalankan | |
| 16 | Route guard mengarahkan pengguna ke halaman login atau halaman sesuai role; halaman publik tetap dapat diakses tanpa sesi | Akses route buyer/seller/admin tanpa sesi dan dengan role lain; pastikan pengalihan dan aksesibilitas halaman publik | Belum dijalankan | |
| 17 | DevTools tetap berfungsi; akses data/API diuji dan dilindungi server-side | Buka DevTools saat memakai aplikasi; pastikan endpoint terproteksi tetap menolak akses langsung tanpa token/role yang sah | Belum dijalankan | |

## 2. Keputusan pra-produksi yang masih terbuka (PRD §4 dan §20)

| Topik | Keputusan yang dibutuhkan | Pemilik | Status |
|---|---|---|---|
| Retensi data & penghapusan akun | Masa simpan data pesanan, log audit, dan data profil; metode penghapusan/pseudonimisasi akun tanpa cascade ke data transaksi; siapa yang berhak mengakses `audit_logs` | Pemilik proyek/kampus (PRD §23) - nama pemilik harus ditetapkan | Belum diputuskan |
| Reset password | Alur reset password, verifikasi identitas, dan dampaknya terhadap sesi aktif; apakah perubahan email ikut disediakan | Pemilik proyek/kampus (PRD §23) | Belum diputuskan |
| Hosting, domain, HTTPS, dan backup produksi | Target hosting, managed PostgreSQL, domain web/API, sertifikat HTTPS, reverse proxy, jadwal backup, uji restore, dan pemulihan insiden | Pemilik proyek/kampus (PRD §23) | Belum diputuskan |
| Governance approval seller | Apakah seller wajib disetujui admin sebelum dapat berjualan, siapa pemantau dan pemilik keputusan, serta alur penolakan | Pemilik proyek/kampus (PRD §23) | Belum diputuskan |
| Kebijakan pembatalan | Apakah buyer dapat membatalkan, sampai status apa, siapa menangani pesanan tidak diambil, dan koreksi setelah tunai diterima | Pemilik proyek/kampus (PRD §23) | Belum diputuskan |
| Kebijakan QRIS & jam operasional | Instruksi QRIS placeholder, masa berlaku pesanan, jam operasional dan jam tutup, serta materi kasir | Pemilik proyek/kampus (PRD §23) | Belum diputuskan |
| False-positive lockout pada NAT kampus | Ambang gabungan email+IP, mekanisme pemulihan tanpa reset bebas, monitoring, dan jalur dukungan | Pemilik proyek/kampus (PRD §23) | Belum diputuskan |
| Kontak dukungan | Jalur dukungan pengguna (misal saat email gagal terkirim atau akun terkunci) dan SLA | Pemilik proyek/kampus (PRD §23) | Belum diputuskan |
| Konfirmasi zona waktu & currency | Zona waktu kampus dan mata uang final (saat ini default `Asia/Jakarta` dan `IDR`, D20) | Pemilik proyek/kampus (PRD §23) | Belum diputuskan |

Catatan: PRD §23 menyatakan seluruh nilai di atas harus diisi sendiri oleh pemilik proyek; tidak ada nilai yang diasumsikan di repository ini.

## 3. Kriteria rilis pilot (PRD §18.3) sebagai pengingat

- Semua acceptance criteria P0 lulus dan bukti hasil tersimpan.
- Tidak ada bug kritis/tinggi terbuka pada auth, akses lintas role, harga/order, dan pembayaran.
- Kebijakan privasi, retensi, approval seller, operasional kasir, dan prosedur dukungan disetujui pemilik kampus.
- Domain, HTTPS, secret management, backup, monitoring, dan pemulihan insiden tersedia.
- Uji keamanan independen/review sesuai risiko dilakukan; tanpa itu nyatakan sebagai pilot terbatas dengan keterbatasan yang jelas.

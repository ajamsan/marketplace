# Keamanan

Status dokumen: threat model dan kontrol yang **sudah ada di kode** repository ini. Dokumen ini bukan hasil review keamanan independen dan tidak menyatakan kelulusan uji (§18.1 PRD: tidak ada klaim keberhasilan sebelum kriteria dijalankan).

Rujukan PRD: §6.1 (kebutuhan auth), §6.2 (lockout), §9.1 (model data), §10 (kontrak API), §11 (validasi), §12 (keamanan dan penyalahgunaan), §15 (konfigurasi dan rahasia).

## 1. Threat model ringkas

| Aset | Ancaman utama | Kontrol yang ada di kode | PRD |
|---|---|---|---|
| Kredensial pengguna | Curian password, cracking offline | Argon2id dengan salt unik, format PHC, parameter `m=64 MiB, t=3, p=2` | §12.1, AUTH-07 |
| Email dan identitas | Enumerasi akun, penyalahgunaan reset | Respons generik, equalisasi timing login, Challenges OTP single-use | §6.2, AUTH-06 |
| Kode OTP | Tebakan, penyalahgunaan email, Konstanta bocor | 6 digit CSPRNG, HMAC-SHA256 ber-key, expiry, cooldown, percobaan terbatas, tidak pernah di log | AUTH-04, AUTH-05 |
| Access token JWT | Pemalsuan, algoritma downgrade | HS256 allowlist, validasi `iss/aud/sub/sid/exp/nbf`, perbandingan constant-time | AUTH-08, §12.1 |
| Refresh token | Pencurian, replay | Hash SHA-256, rotasi tiap pakai, deteksi reuse, pencabutan keluarga token | AUTH-09 |
| Sesi | Akses setelah pencabutan | Pencabutan dicek pada setiap request terproteksi | §5.6, SESS-02 |
| Mutation berbasis cookie | CSRF | Double-submit cookie + header, diverifikasi terhadap hash sesi | §12.1 |
| Data antar-role | Buyer accessing seller/admin, seller A accessing B | Pemeriksaan role dan `seller_stalls` pada setiap handler; sumber daya milik orang lain menghasilkan 404 | §2.4, ORD-02 |
| Harga dan total pesanan | Manipulasi dari klien | Harga, kuantitas, dan total selalu dihitung ulang server; snapshot disimpan | CART-03, ORD-07 |
| File foto | Upload berbahaya, akses lintas akun | Validasi magic bytes, ukuran, dimensi, object key acak, signed URL, service role key backend-only | §6.7, PROF-02/03 |
| Database | SQL injection | Seluruh query memakai parameter (`$1`, `$2`, ...) | §11, §12.1 |
| Rahasia | Bocor lewat Git, log, bundle browser | Kunci hanya dari env, default dev tidak aman, `.env` diabaikan Git, CI secret scan | §12.1, §15, §17 |
| Jejak audit | Tindakan sensitif tanpa bukti | `audit_logs`, `auth_events`, `payment_events` dengan `request_id` | SESS-04, §12.4 |

## 2. Enumerasi akun

- `POST /auth/register`: bila email sudah terdaftar, server tetap mengembalikan sukses generik, tidak mengirim email, dan mencatat event `suppressed_email_taken` pada `auth_events` (`internal/auth/service.go`).
- `POST /auth/login`: email tidak terdaftar dan password salah menghasilkan error yang sama (`ErrInvalidCredentials` → `401 UNAUTHENTICATED`). Untuk email tidak terdaftar, server tetap menjalankan `crypto.DummyVerify` agar waktu respons setara.
- `POST /auth/otp/resend`: bila tidak ada tantangan aktif, server mengembalikan sukses generik tanpa mengirim apa pun.
- Detail internal (kategori sebab, hash email/IP) hanya masuk ke `auth_events` dan log server, tidak ke respons.

## 3. Brute force dan lockout

### Kebijakan yang diminta (PRD §6.2)

| Alur | Kebijakan |
|---|---|
| OTP registrasi | 5 OTP salah memblokir ronde berikutnya; ronde kedua 5 salah: email + IP 5 menit; ronde ketiga 5 salah: email + IP 15 menit |
| Password login | 5 salah: email 3 menit; gelombang berikutnya 5 salah: email + IP 15 menit |
| OTP login | 5 OTP salah memblokir ronde pertama; ronde kedua 5 salah: email + IP 15 menit |

### Bagaimana diterapkan di kode

- Counter persisten di tabel `auth_throttles` dengan UNIQUE `(flow, scope_type, scope_key_hash)`; kunci email, IP, dan email+IP disimpan sebagai HMAC dengan `OTP_HASH_KEY`, bukan nilai mentah.
- Increment counter bersifat atomik: `INSERT ... ON CONFLICT DO UPDATE SET failure_count = auth_throttles.failure_count + 1 RETURNING failure_count`. Percobaan OTP menambah `otp_challenges.attempt_count` lewat `UPDATE ... RETURNING`, sehingga request paralel tidak melewati ambang.
- `locked_until` dipasang dengan `GREATEST(COALESCE(locked_until, now()), until)` dan `wave_number` dinaikkan, sehingga lock aktif tidak bisa ditimpa lock yang lebih pendek.
- Password (`internal/auth/service.go`): setiap kelipatan 5 kegagalan memicu gelombang; gelombang 1 mengunci scope `email` 3 menit; gelombang 2 dan seterusnya mengunci `email` dan `email_ip` 15 menit.
- OTP: padaattempt ke-5 dalam satu ronde, tantangan terkunci; untuk registrasi ronde 2 kunci `email_ip` 5 menit, ronde 3 atau lebih 15 menit; untuk login ronde 2 atau lebih 15 menit. Setelah 5 kegagalan pada ronde 1, submit berikutnya ditolak dengan `429 RATE_LIMITED` dan `Retry-After` sebesar cooldown resend.
- Ronde dihitung per email dan purpose dalam jendela 24 jam (`otp_challenges.round_number`). Setelah `OTP_MAX_ROUNDS` (default 3) tercapai, alur berhenti dengan error eskalasi `429 RATE_LIMITED` dan tidak ada reset otomatis.
- Resend membuat tantangan baru (`superseded_at` pada tantangan lama) tetapi **tidak** menghapus counter atau lock di `auth_throttles`; cooldown resend memakai `OTP_RESEND_COOLDOWN` (default 60 detik) dihitung dari `last_sent_at`.
- Keberhasilan autentikasi memanggil `ClearFailures` yang hanya mengosongkan `failure_count` dan `wave_number`; `locked_until` yang aktif tidak disentuh.
- Lapisan tambahan: token bucket in-memory per IP dan grup route (`RATE_LIMIT_RPS` default 5, `RATE_LIMIT_BURST` default 15) untuk membatasi burst dan penyalahgunaan endpoint email. Counter ini hilang saat proses restart dan bukan pengganti lockout database.

Batasan yang masih terbuka: penguncian berbasis IP dapat menimbulkan false positive pada jaringan NAT kampus; PRD §6.2 mensyaratkan ambang gabungan, observabilitas, dan jalur pemulihan yang belum ditetapkan kebijakan finalnya.

## 4. Penanganan token

- Password: `crypto.HashPassword` memakai Argon2id (`golang.org/x/crypto/argon2`) dengan salt acak 16 byte dan kunci 32 byte, disimpan sebagai string PHC `$argon2id$v=19$m=...,t=...,p=...$salt$hash`. Perbandingan memakai `subtle.ConstantTimeCompare`.
- OTP: 6 digit dari `crypto/rand`; disimpan sebagai HMAC-SHA256 dengan domain prefix `otp:` menggunakan `OTP_HASH_KEY`; verifikasi memakai `hmac.Equal`. Expiry `OTP_TTL` (default 5 menit), single-use (`consumed_at`), superseded saat resend, dan jumlah percobaan terbatas.
- Access token: JWT HS256 dibuat internal (`internal/platform/jwt`). Header `alg` selalu diambil dari daftar allowlist (hanya `HS256`); klaim klien `alg` diabaikan. Klaim: `iss`, `aud`, `sub`, `sid`, `role`, `iat`, `nbf`, `exp`. Validasi: signature HMAC-SHA256 dengan `subtle.ConstantTimeCompare`, `exp` dengan toleransi 30 detik, `nbf`, `iss`, `aud`, serta `sub`/`sid` wajib terisi. Umur default `ACCESS_TOKEN_TTL` 10 menit.
- Refresh token: 32 byte acak (`crypto/rand`, base64url), disimpan sebagai SHA-256 hash (`login_sessions.refresh_token_hash`). Rotasi terjadi pada setiap `POST /auth/refresh`; hash token lama disimpan di `previous_refresh_token_hash`. Bila token lama dipakai ulang, seluruh sesi dengan `token_family_id` sama dicabut (`revoke_reason='reuse_detected'`).
- Pencabutan sesi dicek pada setiap request terproteksi: `sessions.Access` mensyaratkan `revoked_at IS NULL`, `expires_at > now()`, `absolute_expires_at > now()`, dan `users.status='active'`. Jadi pencabutan berlaku segera, bukan hanya setelah access token kedaluwarsa.
- Penyimpanan sisi klien: refresh token memakai cookie `HttpOnly` (`kk_rt`, path `/api/v1/auth`, `SameSite=Lax`, `Secure` saat `APP_ENV=production`); access token disimpan di memori aplikasi, bukan `localStorage` (`apps/web/src/lib/api/token-store.ts`).

## 5. CSRF (double-submit)

- Server menerbitkan cookie `kk_csrf` (dibaca JavaScript) bersama token sesi; hash token disimpan di `login_sessions.csrf_token_hash`.
- Setiap request mutasi dari web mengirim header `X-CSRF-Token`; server membandingkan header dengan cookie, dan pada refresh membandingkan hash dengan hash sesi **sebelum** rotasi sehingga request tanpa CSRF tidak menghabiskan refresh token.
- Cookie `SameSite=Lax` dan `Secure` di produksi menjadi lapisan tambahan; refresh memakai `credentials: "include"`.

## 6. CORS dan proxy tepercaya

- CORS memakai allowlist `CORS_ALLOWED_ORIGINS` (dipisah koma). Jika daftar kosong, tidak ada header CORS; pada dev, rewrite Next.js (`apps/web/next.config.ts`) membuat `/api/v1/*` tetap first-party sehingga cookie tetap first-party.
- Header yang diizinkan: `Authorization, Content-Type, X-CSRF-Token, Idempotency-Key, X-Requested-With`; allow credentials hanya untuk origin yang terdaftar.
- `X-Forwarded-For` hanya dibaca bila alamat koneksi berada di dalam `TRUSTED_PROXY_CIDRS`. Tanpa konfigurasi proxy tepercaya, IP diambil dari `RemoteAddr`.

## 7. Validasi upload

- `internal/platform/imaging`: hanya PNG dan JPEG (magic bytes `\x89PNG` dan `\xFF\xD8\xFF`); SVG/HTML ditolak.
- Batas ukuran: `MAX_UPLOAD_BYTES` (default 2 MiB) dan batas body request 8 MiB (`http.MaxBytesReader`).
- Dimensi: 32-4000 piksel per sisi.
- Object key acak, tidak memakai nama file pengguna: `profiles/<uuid>.<ext>` dan `products/<uuid>.<ext>`.
- Penyimpanan memakai Supabase Storage REST dengan service role key yang hanya ada di backend; objek privat disajikan lewat signed URL berumur `SIGNED_URL_TTL` (default 15 menit).
- Jika `SUPABASE_URL` atau `SUPABASE_SERVICE_ROLE_KEY` kosong, storage dinonaktifkan (`storage.Disabled`) dan endpoint foto membalas `503 RESOURCE_UNAVAILABLE`.
- Malware scanning belum tersedia dan belum menjadi kebijakan.

## 8. SQL, header, dan limit request

- Seluruh query memakai placeholder parameter; tidak ada penggabungan string untuk nilai input. Nama tabel dan kolom statis.
- Header keamanan pada API: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Cache-Control: no-store`, `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`.
- Batas ukuran body 8 MiB untuk semua request; pagination memakai cursor dengan batas maksimum.
- Error produksi tidak memuat stack trace, SQL, atau alamat internal; respons memakai envelope `data/error` + `meta.request_id`.

## 9. Audit logging dan redaksi

- `audit_logs`: aktor, action, resource, outcome, `request_id`, dan `metadata_redacted` JSONB dengan allowlist. Penulisannya `audit.Repo.Insert` menerima `*sql.DB` atau `*sql.Tx` supaya konsisten dengan transaksi domain.
- `auth_events`: kategori event auth dengan email/IP berupa hash.
- `payment_events`: append-only, mencatat `from_status`, `to_status`, aktor, `reason_code`, dan `request_id`.
- `email_outbox.payload_redacted` berisi `challenge_id` dan kode OTP yang dienkripsi AES-256-GCM (kunci diturunkan dari `OTP_HASH_KEY` dengan domain separation); kode OTP tidak pernah ditulis plaintext ke tabel atau log produksi.
- One-satunya pengecualian yang disengaja: `DevMailer` mencetak OTP ke log server pada `APP_ENV` selain `production` agar alur lokal dapat diuji.
- Log akses memakai `slog` JSON tanpa body request; setiap request punya `request_id` yang dikembalikan pada header `X-Request-Id` dan respons.

## 10. Manajemen dan rotasi rahasia

| Rahasia | Sumber | Catatan |
|---|---|---|
| `JWT_SIGNING_KEY` | Env | Wajib diisi bila `APP_ENV=production`; tanpa itu API berhenti saat start. Default dev `dev-insecure-jwt-key-change-me` hanya untuk lokal |
| `OTP_HASH_KEY` | Env | Wajib di produksi; dipakai sebagai HMAC OTP dan kunci enkripsi outbox (derivasi domain terpisah) |
| `MAILJET_API_KEY`, `MAILJET_SECRET_KEY` | Env | Wajib di produksi; dipakai hanya di backend |
| `SUPABASE_SERVICE_ROLE_KEY` | Env | Backend-only; tidak boleh masuk bundle Next.js |
| `DATABASE_URL`, kredensial PostgreSQL | Env | Nilai lokal di `.env` yang diabaikan Git |

- `.env.example` hanya berisi nama variabel dan nilai kosong; `.env` diabaikan Git (`.gitignore`).
- Prinsip rotasi: kunci dapat diganti lewat env tanpa mengubah source code. Dampak rotasi `JWT_SIGNING_KEY` adalah access token lama tidak lagi valid; rotasi `OTP_HASH_KEY` membatalkan OTP yang outstanding, memengaruhi `email_outbox` yang belum terkirim, dan mengubah kunci counter throttle sehingga counter lama tidak lagi terbaca. Prosedur rotasi untuk produksi belum didokumentasikan dan harus ditetapkan pemilik operasional.
- Parameter TTL, cooldown, dan ukuran upload semuanya lewat env sehingga dapat disetel tanpa deploy.

## 11. Batasan yang diketahui dan status "belum siap produksi"

- Belum ada UI/administrasi akun admin: akun admin hanya dibuat oleh `cmd/seed`; endpoint admin yang ada hanya untuk persetujuan stan.
- Belum ada alur reset password maupun perubahan email (di luar cakupan PRD §3.2).
- QRIS hanya placeholder: tanpa QR, tanpa payment gateway, tanpa settlement atau bukti transaksi; `qris_placeholder` ditolak secara default (`ALLOW_QRIS_PLACEHOLDER=false`).
- Email OTP memakai isi sederhana (teks dan satu blok HTML) tanpa mesin template.
- PostgreSQL lokal di Docker Desktop + WSL adalah target dev; tidak ada HA, tidak ada backup produksi, tidak ada secret manager.
- Rate limiter lapis pertama bersifat in-memory per proses dan hilang saat restart.
- Kunci default dev tidak aman; produksi menolak start bila `JWT_SIGNING_KEY`/`OTP_HASH_KEY` kosong.
- HTTPS tidak di terminates di dalam aplikasi; cookie `Secure` hanya aktif ketika `APP_ENV=production`, sehingga reverse proxy dan sertifikat harus disediakan di luar repo.
- `audit_logs` belum memiliki pembersihan otomatis (lihat `docs/DATA_MODEL.md` §5).
- Belum ada review keamanan independen, pengujian beban/abuse, dan uji restore backup.
- Klasifikasi akses terhadap `audit_logs` (siapa yang boleh membaca) belum ditetapkan (PRD §6.8 SESS-05).

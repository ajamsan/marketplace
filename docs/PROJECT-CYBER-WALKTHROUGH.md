# Project Cyber — Deep Project Explanation & Source Code Walkthrough

**Proyek:** Website Kantin Kampus ("Project Cyber")
**Repository:** `C:\Users\HP\Documents\marketplace`
**Tanggal audit:** 30 Oktober 2026
**Metode:** Audit read-only terhadap seluruh source code aktual, migration, test, konfigurasi, dan dokumentasi repository. Tidak ada file source yang diubah. Beberapa materi referensi pustaka (React Query, Zod, Vitest) diambil dari dokumentasi resmi di internet (tanstack.com, zod.dev, vitest.dev).

> **Peringatan kejujuran hasil:** Status "ada di kode" berarti implementasi ditemukan di source code, **bukan** berarti sudah dijalankan dan lulus uji. Menurut `docs/ACCEPTANCE.md` (baris 3): *"belum ada acceptance criteria yang dijalankan terhadap produk. Tidak ada klaim kelulusan."* Semua skenario runtime pada dokumen ini adalah **simulasi berdasarkan kode**, bukan bukti pengujian. Hal yang tidak bisa dibuktikan dari source code ditandai **BELUM DIVERIFIKASI**.

> **Catatan drift dokumentasi:** File `generate_pdf.py` di root repository berisi klaim yang **TIDAK SESUAI** dengan source code aktual (misalnya menyebut `bcrypt.CompareHashAndPassword`, cookie `kk_refresh`, dan kolom `users.name/phone` — padahal kode aktual memakai **Argon2id**, cookie **`kk_rt`**, dan skema users tanpa kolom tersebut). Dokumen ini mengikuti source code aktual, dan perbedaannya dirinci di Bagian 14.

---

## DAFTAR ISI

1. [Bagian 1 — Gambaran Besar Project Cyber](#bagian-1)
2. [Bagian 2 — Struktur Folder dan Source Code](#bagian-2)
3. [Bagian 3 — Arsitektur dan Hubungan Antarkomponen](#bagian-3)
4. [Bagian 4 — Penjelasan Backend Go Secara Mendalam](#bagian-4)
5. [Bagian 5 — Penjelasan Logika Source Code (Bedah Kondisi)](#bagian-5)
6. [Bagian 6 — Flowchart Setiap Fitur](#bagian-6)
7. [Bagian 7 — Penjelasan Database PostgreSQL](#bagian-7)
8. [Bagian 8 — Authentication dan Authorization](#bagian-8)
9. [Bagian 9 — Penjelasan Frontend Next.js + Zustand, React Query, Zod](#bagian-9)
10. [Bagian 10 — Penjelasan Mobile](#bagian-10)
11. [Bagian 11 — Integrasi Layanan Eksternal](#bagian-11)
12. [Bagian 12 — Simulasi Skenario Nyata](#bagian-12)
13. [Bagian 13 — Testing dan Quality Gate](#bagian-13)
14. [Bagian 14 — Kekurangan, Bug, dan Pekerjaan Tertunda](#bagian-14)
15. [Bagian 15 — Kesimpulan dan Materi Belajar](#bagian-15)

---

<a name="bagian-1"></a>
# BAGIAN 1 — GAMBARAN BESAR PROJECT CYBER

## 1.1 Apa yang dibuat?

**Project Cyber** (nama produk: **Kantin Kampus**) adalah aplikasi **marketplace kantin kampus** — sebuah sistem pemesanan makanan antar-muka web yang menghubungkan tiga jenis pengguna:

1. **Buyer** (mahasiswa/warga kampus) — menjelajah katalog produk dari stan, menyusun keranjang, checkout, lalu **membayar tunai langsung di kasir stan**. Tidak ada payment gateway.
2. **Seller** (pengelola stan) — mengajukan stan (perlu persetujuan admin), mengelola produk (CRUD + foto), melihat antrean pesanan, menandai pembayaran tunai diterima, dan memproses status pemenuhan pesanan (`pending → in_preparation → ready_for_pickup → completed`).
3. **Admin** — memoderasi pendaftaran stan: setujui (`approve`), tolak (`reject`), nonaktifkan (`deactivate`), aktifkan (`activate`). Admin **hanya** dibuat lewat seed; tidak ada UI manajemen akun admin.

Identitas diverifikasi lewat **OTP email**: registrasi memerlukan OTP, dan **login memerlukan password + OTP dua langkah** (password benar saja tidak membuat sesi).

Bukti utama: `README.md` (baris 1–5): *"Marketplace sederhana untuk kantin kampus: mahasiswa dan warga kampus (buyer) mencari produk dari stan, menyusun keranjang, membuat pesanan, lalu membayar langsung kepada kasir... Verifikasi identitas memakai OTP email."*

## 1.2 Jenis aplikasi

| Aplikasi | Ada? | Bukti |
|---|---|---|
| Web frontend (Next.js) | YA | `apps/web/` lengkap dengan App Router |
| Backend REST API (Go) | YA | `services/api/`, prefix `/api/v1` |
| Aplikasi mobile (React Native/Flutter/dll) | **TIDAK DITEMUKAN** | Tidak ada folder/library mobile di repo (tidak ada `react-native`, `expo`, `flutter` di `apps/web/package.json` maupun folder lain) |
| Aplikasi desktop | TIDAK DITEMUKAN | — |

## 1.3 Fitur utama yang benar-benar ada di kode

| Fitur | Backend | Frontend | Status |
|---|---|---|---|
| Register + OTP email | `internal/auth/service.go` `Register()`, `VerifyRegistration()` | `features/auth/register-form.tsx`, `otp-form.tsx` | Ada di kode |
| Login 2 langkah (password → pre-auth token → OTP) | `auth.Login()`, `auth.VerifyLogin()` | `login-form.tsx`, `(auth)/verify/page.tsx` | Ada di kode |
| Resend OTP dengan cooldown 60 detik | `auth.ResendOTP()` | `otp-form.tsx` (countdown 60s) | Ada di kode |
| Refresh token rotation + deteksi reuse (revoke family) | `internal/sessions/service.go` `Rotate()` | `lib/api/client.ts` (silent refresh) | Ada di kode |
| Logout + revoke sesi per perangkat | `Sessions.RevokeCurrent()`, `RevokeOther()` | `settings/sessions-list.tsx`, `revoke-session-button.tsx` | Ada di kode |
| Profil + preferensi tema | `internal/users/service.go` `Me()`, `Update()` | `settings/profile-form.tsx`, `theme-section.tsx` | Ada di kode |
| Upload/hapus foto profil (WebP + Supabase) | `users.UploadPhoto()`, `DeletePhoto()` | `settings/photo-upload.tsx` | Ada di kode; butuh Supabase aktif |
| CRUD stan (1 stan per seller) | `internal/stalls/service.go` | `seller/stall/page.tsx`, `stall-form.tsx` | Ada di kode |
| Approval stan oleh admin (state machine) | `stalls.AdminTransition()` | `admin/page.tsx`, `pending-stalls.tsx` | Ada di kode |
| CRUD produk + arsip (soft delete) | `internal/catalog/service.go` | `seller/products/*`, `product-form.tsx` | Ada di kode |
| Upload foto produk | `catalog.UploadImage()` | `product-list.tsx`, `product-image-input.tsx` | Ada di kode; butuh Supabase aktif |
| Katalog publik + pencarian + cursor pagination | `catalog.ListPublic()` | `catalog/page.tsx` (`useInfiniteQuery`) | Ada di kode |
| Keranjang (1 keranjang per buyer, upsert item) | `internal/cart/service.go` | `cart/page.tsx`, `use-cart.ts` | Ada di kode |
| Preview order (kalkulasi harga server-side) | `orders.Preview()` | `checkout/page.tsx` | Ada di kode |
| Buat order idempotent + snapshot harga | `orders.Create()` + header `Idempotency-Key` | `checkout-summary.tsx` (`crypto.randomUUID()`) | Ada di kode |
| Konfirmasi tunai oleh seller (idempotent) | `payments.ConfirmCash()` | `cash-confirm-dialog.tsx` | Ada di kode |
| Status pemenuhan per stan (state machine) | `payments.UpdateFulfillment()` | `fulfillment-controls.tsx` | Ada di kode |
| Riwayat pesanan buyer & antrean seller | `orders.ListForBuyer()`, `ListForSeller()` | `orders/page.tsx`, `seller/orders/page.tsx` | Ada di kode |
| QRIS | Placeholder yang **ditolak default** (`ALLOW_QRIS_PLACEHOLDER=false` → HTTP 503) | Radio QRIS `disabled` di `checkout-summary.tsx` | Placeholder |
| Reset password / ganti email | **TIDAK DITEMUKAN** | **TIDAK DITEMUKAN** | Belum diimplementasikan (README baris 132) |
| Payment gateway settlement | **TIDAK DITEMUKAN** | — | Direncanakan sebagai placeholder |
| Rate limit + lockout + audit log | `httpx/ratelimit.go`, `auth_throttles`, `audit_logs` | — | Ada di kode |

## 1.4 Tabel teknologi aktual

| Komponen | Teknologi Aktual | Fungsi | Lokasi Source Code | Status |
|---|---|---|---|---|
| Backend | Go 1.23, `net/http` ServeMux (Go 1.22+ patterns), **tanpa framework web**, tanpa ORM | REST API `/api/v1`, business logic, auth, outbox | `services/api/` (modul `kantinkampus/api`, `go.mod`) | Ada di kode; lulus `go vet`+test di CI (status eksekusi CI terakhir **BELUM DIVERIFIKASI**) |
| Driver DB | `github.com/jackc/pgx/v5 v5.7.1` (mode `database/sql`) | Koneksi PostgreSQL + connection pool | `services/api/internal/platform/db/db.go` | Ada di kode |
| Frontend | Next.js **16.4.3** (pinned), React **19.3.0** (pinned), Tailwind CSS 4 | UI, routing, proxy API | `apps/web/` | Ada di kode |
| State management | **Zustand ^5.0.16** (auth store) + **@tanstack/react-query ^5.105.0** (server state) | State autentikasi & cache data server | `apps/web/src/features/auth/auth-store.ts`, `apps/web/src/components/providers.tsx` | Ada di kode |
| Validasi form | **Zod ^4.6.7** | Skema validasi form login/register/stan/produk | `login-form.tsx`, `register-form.tsx`, `stall-form.tsx`, `product-form.tsx` | Ada di kode |
| Unit test FE | **Vitest ^5.0.5** + Testing Library | Unit test API client & formatter | `apps/web/src/lib/api/client.test.ts`, `format.test.ts` | Ada di kode |
| E2E test | **Playwright ^1.64.1** (chromium, workers=1) | Uji end-to-end auth, checkout, foto, sesi | `apps/web/src/e2e/*.spec.ts` | Ada di kode; hasil eksekusi terakhir **BELUM DIVERIFIKASI** |
| Database | PostgreSQL 16 (Docker Desktop + WSL untuk local dev) | Penyimpanan relasional, 9 migrasi (0001–0009) | `infra/compose.yaml`, `services/api/migrations/` | Ada di kode |
| Storage | Supabase Storage (REST API murni, tanpa SDK, service-role key) | Foto profil & produk, signed URL 15 menit | `services/api/internal/platform/storage/supabase.go` | Ada di kode; **dinonaktifkan otomatis** jika env tidak diisi |
| Email | Mailjet API v3.1 (production) / DevMailer log (development) | Kirim OTP | `services/api/internal/platform/mailer/mailjet.go`, `devmailer.go` | Ada di kode |
| Authentication | JWT HS256 (hand-rolled, TTL 10 menit, di memori klien) + refresh token 32-byte di cookie HttpOnly `kk_rt` + CSRF double-submit `kk_csrf` | Sesi login, rotasi token | `platform/jwt/jwt.go`, `platform/crypto/*`, `internal/sessions/` | Ada di kode |
| CI | GitHub Actions (`vet`, migrasi up/down, `go test`, build, lint, typecheck, vitest, build, gitleaks, npm audit) | Quality gate otomatis | `.github/workflows/ci.yml` | Ada di kode |

## 1.5 Status milestone (menyalin kejujuran README)

Snapshot per 28 Oktober 2026 (README baris 113–127). Status "ada di kode" ≠ sudah diuji:

| Milestone | Hasil | Status |
|---|---|---|
| M0 Kontrak | OpenAPI + daftar endpoint | Dalam penyusunan (`contracts/openapi.yaml` ada di checkout ini, `docs/API.md` tidak ada) |
| M1 Fondasi | Repo, Docker/WSL PostgreSQL, migrasi, config, CI | Ada di kode |
| M2 Skema + platform | Skema DB, config/db/logging/HTTP/JWT/crypto | Ada di kode |
| M3 Auth | Registrasi OTP, login OTP, hashing, sesi, lockout, audit | Ada di kode; belum diverifikasi terhadap acceptance criteria |
| M4 Profil/tema | Profil, foto, tema terang/gelap, 5 aksen | Ada di kode; alur foto butuh Supabase |
| M5 Katalog + approval | Stan/produk, otorisasi seller, upload, approval admin | Backend ada; UI sedang diselesaikan |
| M6 Keranjang + order | Keranjang, preview, order idempotent, snapshot, riwayat | Backend ada; UI sedang diselesaikan |
| M7 Pembayaran tunai | Konfirmasi tunai, pemenuhan per stan, QRIS placeholder | Backend ada (QRIS ditolak default); UI seller sedang diselesaikan |
| M8 Hardening | Header keamanan, rate limit, lockout, audit, secret scan | Sebagian; review keamanan independen, backup, HTTPS, monitoring belum ada |

---

<a name="bagian-2"></a>
# BAGIAN 2 — STRUKTUR FOLDER DAN SOURCE CODE

## 2.1 Tree repository (aktual)

```text
.
├── .github/workflows/ci.yml          # CI 3 job: api (Go), web (Node), security (gitleaks + npm audit)
├── .kilo/                            # Konfigurasi agent Kilo
├── apps/
│   └── web/                          # FRONTEND Next.js 16
│       ├── package.json              # Dependencies (next 16.4.3, react 19.3.0, zustand, react-query, zod, ...)
│       ├── next.config.ts            # Rewrite /api/v1/* -> Go API (proxy first-party cookie)
│       ├── playwright.config.ts      # E2E: chromium, workers=1, baseURL localhost:3000
│       ├── vitest.config.mts         # Unit test: jsdom, include src/**/*.test.{ts,tsx}
│       ├── eslint.config.mjs         # Flat config eslint-config-next
│       └── src/
│           ├── app/                  # App Router
│           │   ├── layout.tsx        # Root: font Geist, script bootstrap tema, <Providers>
│           │   ├── page.tsx          # Router peran: anonymous -> /login, role -> home
│           │   ├── (auth)/           # Route group publik: login, register, verify
│           │   └── (app)/            # Route group terproteksi: catalog, cart, checkout, orders,
│           │                         #   products/[id], seller/*, admin, settings
│           ├── components/           # layout/ (app-shell, header, sidebar, mobile-nav, theme)
│           │                         # ui/ (button, card, dialog, form, feedback)
│           ├── features/             # Modul domain: auth, cart, catalog, orders, seller,
│           │                         #   admin, settings (masing-masing: api.ts + komponen)
│           ├── lib/
│           │   ├── api/client.ts     # API client terpusat: Bearer, CSRF, silent refresh 401
│           │   ├── api/token-store.ts# Access token DI MEMORI saja (bukan localStorage)
│           │   ├── api/types.ts      # Tipe DTO mirror kontrak Go
│           │   ├── theme/            # ThemeProvider custom (bukan next-themes), 5 aksen
│           │   ├── format.ts(+test)  # formatIDR, formatDateTime, label status
│           │   └── utils.ts          # cn() = twMerge(clsx())
│           └── e2e/                  # auth, cart-checkout-cash, photo-upload, sessions-revoke
│                                     #   + support/api.ts, support/otp.ts (baca OTP dari log API)
├── services/
│   └── api/                          # BACKEND Go
│       ├── go.mod                    # modul kantinkampus/api, go 1.23
│       ├── cmd/
│       │   ├── api/main.go           # Entry point: config, db, mailer, storage, service, worker, HTTP
│       │   └── seed/main.go          # Seed akun demo (ditolak di production)
│       ├── internal/
│       │   ├── http/                 # server.go (route), middleware.go, dto.go,
│       │   │                         #   handlers_auth.go, handlers_users.go, handlers_catalog.go,
│       │   │                         #   handlers_orders.go
│       │   ├── auth/                 # service.go, repository.go, errors.go (register/login/OTP/lockout)
│       │   ├── sessions/             # service.go (rotation), ua.go (label perangkat)
│       │   ├── users/                # service.go (profil, foto)
│       │   ├── stalls/               # service.go (stan + state machine approval)
│       │   ├── catalog/              # service.go (produk, pencarian, arsip)
│       │   ├── cart/                 # service.go (keranjang)
│       │   ├── orders/               # service.go, status.go (DeriveOrderStatus)
│       │   ├── payments/             # service.go (confirm-cash, fulfillment)
│       │   ├── audit/                # audit.go (insert audit_logs)
│       │   ├── outbox/               # outbox.go (antrian email OTP, worker)
│       │   └── platform/             # config, db, jwt, crypto (password/otp/token/secret),
│       │                             #   httpx (middleware/ratelimit/cursor/respond), mailer,
│       │                             #   storage (supabase), imaging, logging, validate
│       ├── migrations/               # 0001_users ... 0009_audit_outbox (up + down)
│       └── tests/integration/        # api_test, abuse_test, authz_negative_test, sessions_rotation_test
├── contracts/openapi.yaml            # Kontrak API (dalam penyusunan)
├── docs/                             # LOCAL_SETUP, DATA_MODEL, SECURITY, OPERATIONS, ACCEPTANCE
├── infra/compose.yaml                # PostgreSQL 16 + volume persisten
├── generate_pdf.py                   # (Bukti drift: klaim bcrypt/kk_refresh — TIDAK sesuai kode aktual)
├── Makefile                          # Orkestrasi lokal
├── PRD-Website-Kantin-Kampus.md      # Sumber kebutuhan produk
└── README.md, CONTRIBUTING.md, .env.example
```

## 2.2 Penjelasan per folder penting

### `services/api/internal/http/` — lapisan HTTP backend

- **Fungsi:** satu-satunya tempat yang menyentuh `http.Request`/`http.ResponseWriter`. Semua yang datang dari internet masuk lewat sini.
- **`server.go`** mendefinisikan struct `Server` yang menampung seluruh dependency (config, logger, limiter, dan 8 service domain) dan method `Routes()` yang mendaftarkan semua endpoint ke `http.ServeMux` (Go 1.22 pattern: `POST /api/v1/auth/login`).
- **`middleware.go`** memuat middleware otentikasi/otorisasi + helper cookie refresh/CSRF + pemetaan error domain → HTTP status (`writeDomainError`, baris 144–212).
- **`dto.go`** berisi struct request (DTO = *Data Transfer Object*, yaitu "cetak biru bentuk data yang dikirim klien"). **Tidak ada validation tag** — validasi otoritatif sengaja ditaruh di service domain (komentar file, PRD §11).
- **`handlers_*.go`** — handler per kelompok: auth, users, catalog (+stalls+admin), orders (+cart+payments).
- **Mengapa dipisah:** supaya aturan bisnis (di `internal/<domain>`) tidak tergantung pada HTTP — mudah diuji tanpa server.

### `services/api/internal/auth/` — domain autentikasi

- **Fungsi:** registrasi, verifikasi OTP, login 2 langkah, resend OTP, dan seluruh logika lockout/anti-brute-force.
- **`service.go`** berisi konstanta kebijakan (baris 21–31): `passwordFailBlock = 5`, lock gelombang 1 = 3 menit, gelombang ≥2 = 15 menit, `otpAttemptsPerRound = 5`, lock ronde OTP 5–15 menit, `pendingRegistrationTTL = 30 menit`.
- **`repository.go`** — semua SQL untuk `users`, `pending_registrations`, `otp_challenges`, `auth_throttles`, `auth_events`, `email_outbox`. Detail penting: `RecordFailure` atomik (`ON CONFLICT ... failure_count+1`), `IncAttempt` atomik dengan guard `consumed_at IS NULL AND superseded_at IS NULL` (serangan paralel tidak bisa melewati ambang), `ClearFailures` **tidak pernah** menghapus lock aktif.
- **`errors.go`** — sentinel errors (error "penanda" yang dibandingkan dengan `errors.Is`) + tipe `ValidationError{Fields}` dan `ThrottleError{RetryAfter}`.

### `services/api/internal/sessions/` — sesi refresh token

- **`service.go`**: pembuatan sesi (di dalam transaksi verifikasi login), **rotasi** refresh token dengan `SELECT ... FOR UPDATE` dan kolom `previous_refresh_token_hash` untuk mendeteksi pemakaian ulang token lama → mencabut seluruh `token_family_id`, pencabutan sesi, pemeriksaan kesehatan sesi per request (`Access`), dan pembersihan berkala.
- **`ua.go`**: parsing User-Agent untuk label perangkat ("Chrome · Windows"). Dikomentari sebagai perkiraan karena UA bisa dipalsukan.

### `services/api/internal/orders/` + `payments/` — inti transaksi

- **`orders/service.go`**: validasi item, kalkulasi harga **server-side**, hash idempotensi, pembuatan order + order_items (snapshot harga) + payments per stan + fulfillments per stan dalam **satu transaksi**.
- **`orders/status.go`**: fungsi murni `DeriveOrderStatus()` — mesin status order turunan dari gabungan status pembayaran & pemenuhan.
- **`payments/service.go`**: konfirmasi tunai (optimistic concurrency dengan `WHERE status='cash_due'`) dan transisi pemenuhan satu arah (`nextFulfillmentStatus` map, baris 134–138).

### `services/api/internal/platform/` — infrastruktur teknis

- **`config/config.go`**: membaca semua environment variable dengan default aman; menolak startup di production tanpa `JWT_SIGNING_KEY`/`OTP_HASH_KEY`.
- **`db/db.go`**: pool `MaxOpenConns(10)`, `MaxIdleConns(5)`, `ConnMaxLifetime(30m)`, ping ulang hingga 60 detik; interface `DBTX` menyatukan `*sql.DB` dan `*sql.Tx`; helper `WithTx` (rollback saat panic/error).
- **`jwt/jwt.go`**: JWT HS256 tulisan tangan — verifikasi alg eksplisit (menolak `alg` lain → mitigasi serangan `alg:none`), `subtle.ConstantTimeCompare`, leeway 30 detik.
- **`crypto/`**: `password.go` (Argon2id 64 MiB, t=3, p=2, + `DummyVerify` untuk menyamakan waktu respons login email tak dikenal), `otp.go` (OTP 6 digit CSPRNG, HMAC-SHA256), `token.go` (32-byte token, UUIDv4, public code 6 karakter), `secret.go` (AES-256-GCM untuk mengenkripsi OTP di outbox).
- **`httpx/`**: middleware generik (request id, recover panic, access log, secure headers, CORS, batas body 8 MiB), rate limiter token-bucket in-memory, kursor pagination opaque, client IP dengan trusted proxy.
- **`mailer/`**, **`storage/`**, **`imaging/`**, **`logging/`**, **`validate/`**, **`audit/`**, **`outbox/`**: masing-masing satu tanggung jawab kecil. `validate` berisi semua batas (email ≤254, username 3–30, password 10–128, quantity 1–99, harga maks Rp 100 juta dalam minor units, maks 50 item/order).

### `apps/web/src/lib/api/` — lapisan jaringan frontend

- **`client.ts`** (160 baris): pembungkus `fetch` dengan `credentials: "include"`, header `Authorization: Bearer` dari memori, header `X-CSRF-Token` dari cookie `kk_csrf` untuk metode non-GET, dan **satu kali silent refresh + retry** saat 401 (baris 129–135). Kelas `ApiError` membawa `status`, `code`, `fields`.
- **`token-store.ts`** (25 baris): singleton modul — access token **hanya di memori** (keputusan D8; hilang saat reload, dipulihkan via refresh cookie). Fungsi `onSessionLost` menghubungkan kegagalan refresh ke Zustand store.
- **`types.ts`** (216 baris): tipe mirror kontrak API (envelope `{data, meta}`, `Profile`, `Cart`, `OrderDetail`, dll).

### `apps/web/src/features/` — modul domain frontend

Pola yang konsisten: setiap folder fitur punya `api.ts` (peta endpoint → fungsi), komponen UI, dan hook React Query. Contoh `features/cart/`: `api.ts` (`getCart`, `setQuantity`, `removeItem`), `use-cart.ts` (query key `["cart"]` + mutation yang menulis cache), `cart-bar.tsx`, `quantity-stepper.tsx`.

### `apps/web/src/e2e/` — uji end-to-end

Empat spec Playwright. Cara memperoleh OTP diuji: **membaca log API** (`E2E_API_LOG`) karena `APP_ENV=development` membuat DevMailer mencetak kode OTP ke log (`support/otp.ts` baris 3–7).

---
<a name="bagian-3"></a>
# BAGIAN 3 â€” ARSITEKTUR DAN HUBUNGAN ANTARKOMPONEN

## 3.1 Diagram arsitektur keseluruhan

```mermaid
flowchart TD
    U[User / Browser] -->|HTTP :3000| FE[Next.js Web app\napps/web]
    FE -->|rewrite /api/v1/* -> :8080\nnext.config.ts baris 13| RT[Go ServeMux Router\ninternal/http/server.go Routes]
    RT --> MW[Middleware global httpx.Chain\nRequestID, Recover, AccessLog,\nSecureHeaders, CORS, MaxBody 8MiB]
    MW --> RL{Rate limiter\n5 rps / burst 15\nper group+IP}
    RL -- Ditolak --> E429[429 RATE_LIMITED\nRetry-After: 10]
    RL -- Lolos --> H[Handler\nhandlers_auth / users / catalog / orders]
    H --> AUTHZ{authenticate / role?\nmiddleware.go}
    AUTHZ -- 401/403 --> EX[Error response]
    AUTHZ -- Lolos --> SVC[Service domain\nauth, sessions, users, stalls,\ncatalog, cart, orders, payments]
    SVC --> REPO[Repository / SQL\npgx via database/sql]
    REPO --> PG[(PostgreSQL 16\nDocker + WSL :5432)]
    SVC --> OUTBOX[email_outbox table]
    OUTBOX --> WKR[outbox worker goroutine\ntiap 5 detik]
    WKR --> MJ[Mailjet API v3.1\natau DevMailer log]
    SVC --> ST[Supabase Storage REST\nfoto profil & produk]
    ST --> SU[(Supabase bucket\nkantin-media, signed URL 15m)]
```

## 3.2 Penjelasan setiap panah

| Panah | Apa yang dikirim | Apa yang diterima | Mengapa melewati komponen itu | Jika komponen gagal |
|---|---|---|---|---|
| Browser â†’ Next.js | HTML/JS/CSS + fetch JSON `credentials:"include"` | Halaman UI + JSON API | Next.js menyajikan UI dan mem-proxy API supaya cookie refresh tetap first-party (README baris 20) | Halaman error / jaringan gagal |
| Next.js â†’ Router Go | Request asli dengan path `/api/v1/...` | Response JSON envelope | `next.config.ts` baris 11â€“15: satu rewrite `source:"/api/v1/:path*"` | Proxy error â†’ fetch gagal di klien |
| Router â†’ Middleware | `*http.Request` | Request yang sudah diberi request-id, log, header keamanan | Semua request wajib melewati rantai global (server.go baris 97â€“104) | Recover middleware mengubah panic menjadi 500 |
| Middleware â†’ Rate limiter | Kunci `group|IP` | Boolean boleh/tidak | Mencegah brute force lapisan pertama | Ditolak â†’ 429 + `Retry-After: 10` |
| Handler â†’ authenticate | Header `Authorization: Bearer` | `authCtx{UserID, Username, Role, SessionID}` dari **database** | Verifikasi JWT saja tidak cukup â€” sesi harus masih hidup (`Sessions.Access`) | 401 UNAUTHENTICATED |
| Handler â†’ Service | Input domain yang sudah diparse | Hasil bisnis atau error sentinel | Semua aturan bisnis ada di service, bukan handler | Error dipetakan `writeDomainError` |
| Service â†’ Repository | Parameter query terikat (`$1,$2,...`) | Baris hasil / error pgx | Satu-satunya jalur ke SQL | Error DB â†’ 500 INTERNAL_ERROR dengan request_id |
| Service â†’ Outbox â†’ Worker â†’ Mailjet | OTP terenkripsi AES-256-GCM | Email terkirim / gagal | Pola *transactional outbox*: email masuk antrian di transaksi yang sama dengan data, worker mengirim asinkron | Retry eksponensial 30sÃ—2^n maks 5 percobaan â†’ status `failed` |
| Service â†’ Supabase | File WebP (upload) atau minta signed URL | 200 + path, atau URL bertanda tangan | Foto tidak disimpan di DB; hanya `image_key` | `storage.Disabled{}` â†’ 503 RESOURCE_UNAVAILABLE (fitur foto mati, aplikasi lain tetap jalan) |

## 3.3 Lapisan request di dalam backend (urutan vertikal)

```mermaid
flowchart TD
    A[http.Request] --> B[RequestIDMiddleware]
    B --> C[RecoverMiddleware]
    C --> D[AccessLogMiddleware]
    D --> E[SecureHeadersMiddleware]
    E --> F[CORSMiddleware]
    F --> G[MaxBodyLimit 8MiB]
    G --> H[s.rate group,ip]
    H --> I[s.authed / s.role opsional]
    I --> J[Handler: ReadJSON / ParseMultipart]
    J --> K[Service: validasi + bisnis + transaksi]
    K --> L[Repository: SQL terparameter]
    L --> M[(PostgreSQL)]
    K --> N[httpx.WriteData / WriteError\nenvelope data|error + meta.request_id]
```

---

<a name="bagian-4"></a>
# BAGIAN 4 â€” PENJELASAN BACKEND GO SECARA MENDALAM

## 4.A Application startup

**File:** `services/api/cmd/api/main.go` â€” fungsi `main()` (baris 32â€“143).

Urutan eksekusi dari program dijalankan sampai siap melayani request:

1. **`signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)`** (baris 33) â€” membuat *context* yang dibatalkan otomatis saat user menekan Ctrl+C atau sistem mengirim SIGTERM. Context = objek yang membawa sinyal pembatalan dan batas waktu ke seluruh rantai pemanggilan.
2. **`config.Load()`** (baris 36â€“40) â€” membaca semua environment variable (daftar lengkap di Â§11). Jika tidak valid (misal production tanpa `JWT_SIGNING_KEY`): log "konfigurasi tidak valid" + `os.Exit(1)`.
3. **`logging.New(cfg.LogLevel)`** (baris 41) â€” logger JSON `slog` ke stdout. Komentar kode: tidak boleh mencetak OTP/password/token.
4. **`db.Open(ctx, cfg.DatabaseURL)`** (baris 44â€“48) â€” `sql.Open("pgx", dsn)`, pool 10 koneksi terbuka / 5 idle / umur 30 menit, lalu ping dengan retry tiap 2 detik sampai deadline 60 detik. Gagal â†’ "database tidak tersedia" + exit(1). `defer database.Close()`.
5. **Repo & repositori layanan** (baris 51â€“81) â€” dibangun dependency injection manual: `audit.NewRepo`, `outbox.NewRepo(cfg.OTPHashKey)`, lalu pemilihan mailer & storage:
   - **Mailer:** jika `cfg.IsProduction()` â†’ wajib `MAILJET_API_KEY`, `MAILJET_SECRET_KEY`, `MAIL_FROM_EMAIL` terisi, jika tidak exit(1). Selain itu `&mailer.DevMailer{Log: log}` (OTP dicetak ke log).
   - **Storage:** jika `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` kosong â†’ log Warn "Supabase Storage belum dikonfigurasi; fitur foto dinonaktifkan" dan pakai `storage.Disabled{}` (upload foto â†’ 503, sisanya normal).
   - Lalu `sessions.New`, `auth.NewService`, `users.NewService`, `stalls.NewService`, `catalog.NewService`, `cart.NewService`, `orders.NewService`, `payments.NewService`.
6. **Outbox worker** (baris 83â€“84) â€” `go worker.Run(ctx)`: goroutine dengan ticker 5 detik mengambil batch 10 email pending (`FOR UPDATE SKIP LOCKED`), kirim via mailer, retry eksponensial maks 5 percobaan.
7. **Cleanup berkala** (baris 86â€“102) â€” goroutine tiap 1 jam: `authSvc.Repo.CleanupExpired` (pendings/challenges kedaluwarsa >2 hari, throttle & event >retensi 30 hari, outbox terkirim >7 hari) dan `sessSvc.CleanupExpired` (sesi revoked >7 hari).
8. **Rakit `httpapi.Server`** (baris 104â€“117) â€” semua service + `Limiter: httpx.NewLimiter(cfg.RateLimitRPS, cfg.RateLimitBurst)`.
9. **`http.Server`** (baris 119â€“126) â€” `Addr: cfg.HTTPAddr` (default `:8080`), `Handler: srv.Routes()`, timeout: ReadHeaderTimeout 10s, ReadTimeout 60s, WriteTimeout 60s, IdleTimeout 120s.
10. **Serve** dalam goroutine; error `ListenAndServe` selain `ErrServerClosed` â†’ log + `stop()`.
11. **Graceful shutdown** (baris 135â€“142) â€” menunggu `<-ctx.Done()` (Ctrl+C), log "mematikan server...", `httpServer.Shutdown` dengan tenggat **10 detik**; kegagalan dicatat "shutdown gagal"; terakhir "server berhenti".

> **Istilah â€” Graceful shutdown:** cara mematikan server dengan berhenti menerima request baru tetapi menyelesaikan request yang sedang berjalan, agar tidak ada transaksi setengah jadi. Tanpa ini, deploy/restart bisa memotong request klien secara paksa.

**`cmd/seed/main.go`** â€” seeder demo: menolak jalan di production (baris 26â€“29), membuat 4 akun (`admin@kantin.local`, `seller@kantin.local`, `seller2@kantin.local`, `buyer@kantin.local`, password bawaan dari env `SEED_*`), stan pertama `active`, stan kedua `pending_review`, produk dengan harga minor unit (contoh `1_800_000` = Rp 18.000). Kredensial dicetak ke stdout.

## 4.B Routing

**File:** `services/api/internal/http/server.go`. Pattern Go 1.22: method + path. Wrapper `s.rate(group,h)` menambah rate limit; `s.authed(h)` mewajibkan JWT + sesi hidup; `s.role(role,h)` = authed + cek role persis (tidak cocok â†’ 403).

### Tabel route lengkap (dari `Routes()`)

| Method | Endpoint | Fungsi | Handler | Auth | Role |
|---|---|---|---|---|---|
| GET | `/healthz` | Health check | `handleHealth` (server.go:107) | Publik | â€” |
| POST | `/api/v1/auth/register` | Mulai registrasi + kirim OTP | `handleAuthRegister` | Publik + rate | â€” |
| POST | `/api/v1/auth/register/verify` | Verifikasi OTP registrasi â†’ buat akun | `handleAuthRegisterVerify` | Publik + rate | â€” |
| POST | `/api/v1/auth/otp/resend` | Kirim ulang OTP | `handleAuthResend` | Publik + rate | â€” |
| POST | `/api/v1/auth/login` | Verifikasi password â†’ pre-auth token | `handleAuthLogin` | Publik + rate | â€” |
| POST | `/api/v1/auth/login/verify` | Verifikasi OTP login â†’ sesi | `handleAuthLoginVerify` | Publik + rate | â€” |
| POST | `/api/v1/auth/refresh` | Rotasi refresh token â†’ access token baru | `handleAuthRefresh` | Cookie + CSRF + rate | â€” |
| POST | `/api/v1/auth/logout` | Cabut sesi saat ini | `handleAuthLogout` | authed | â€” |
| GET | `/api/v1/auth/sessions` | Daftar sesi aktif | `handleSessionsList` | authed | â€” |
| DELETE | `/api/v1/auth/sessions/{id}` | Cabut sesi lain | `handleSessionRevoke` | authed | â€” |
| GET | `/api/v1/me` | Profil saya | `handleMe` | authed | â€” |
| PATCH | `/api/v1/me` | Ubah username/preferensi | `handleMeUpdate` | authed | â€” |
| POST | `/api/v1/me/profile-photo` | Upload foto profil | `handleProfilePhotoUpload` | authed | â€” |
| DELETE | `/api/v1/me/profile-photo` | Hapus foto profil | `handleProfilePhotoDelete` | authed | â€” |
| GET | `/api/v1/stalls` | Daftar stan aktif | `handleStallsList` | Publik | â€” |
| GET | `/api/v1/stalls/{id}` | Detail stan aktif | `handleStallGet` | Publik | â€” |
| GET | `/api/v1/products` | Katalog produk (+cari, cursor) | `handleProductsList` | Publik | â€” |
| GET | `/api/v1/products/{id}` | Detail produk publik | `handleProductGet` | Publik | â€” |
| GET | `/api/v1/cart` | Keranjang saya | `handleCartGet` | authed | buyer |
| PUT | `/api/v1/cart/items/{productId}` | Set/hapus kuantitas item | `handleCartSet` | authed | buyer |
| DELETE | `/api/v1/cart/items/{productId}` | Hapus item keranjang | `handleCartDelete` | authed | buyer |
| POST | `/api/v1/orders/preview` | Hitung ulang harga server | `handleOrderPreview` | authed | buyer |
| POST | `/api/v1/orders` | Buat order (idempotent) | `handleOrderCreate` | authed | buyer |
| GET | `/api/v1/orders` | Riwayat order saya | `handleOrdersList` | authed | buyer |
| GET | `/api/v1/orders/{id}` | Detail order saya | `handleOrderGet` | authed | buyer |
| POST | `/api/v1/seller/stalls` | Ajukan stan baru | `handleSellerStallCreate` | authed | seller |
| GET | `/api/v1/seller/stalls` | Stan milik saya | `handleSellerStallsList` | authed | seller |
| GET | `/api/v1/seller/products` | Produk stan saya | `handleSellerProductsList` | authed | seller |
| PATCH | `/api/v1/seller/stalls/{id}` | Ubah stan | `handleSellerStallUpdate` | authed | seller |
| POST | `/api/v1/seller/stalls/{stallId}/products` | Buat produk | `handleProductCreate` | authed | seller |
| PATCH | `/api/v1/seller/products/{id}` | Ubah produk | `handleProductUpdate` | authed | seller |
| DELETE | `/api/v1/seller/products/{id}` | Arsipkan produk | `handleProductArchive` | authed | seller |
| POST | `/api/v1/seller/products/{id}/image` | Upload foto produk | `handleProductImage` | authed | seller |
| GET | `/api/v1/seller/orders` | Antrean pesanan stan saya | `handleSellerOrdersList` | authed | seller |
| GET | `/api/v1/seller/orders/{id}` | Detail pesanan (slice stan saya) | `handleSellerOrderGet` | authed | seller |
| POST | `/api/v1/seller/payments/{id}/confirm-cash` | Tandai tunai diterima | `handleConfirmCash` | authed | seller |
| POST | `/api/v1/seller/fulfillments/{id}/status` | Majukan status pemenuhan | `handleFulfillmentStatus` | authed | seller |
| GET | `/api/v1/admin/stalls` | Daftar stan (filter status) | `handleAdminStallsList` | authed | admin |
| POST | `/api/v1/admin/stalls/{id}/approve` | Setujui stan | `handleAdminTransition("approve")` | authed | admin |
| POST | `/api/v1/admin/stalls/{id}/reject` | Tolak stan | `handleAdminTransition("reject")` | authed | admin |
| POST | `/api/v1/admin/stalls/{id}/deactivate` | Nonaktifkan stan | `handleAdminTransition("deactivate")` | authed | admin |
| POST | `/api/v1/admin/stalls/{id}/activate` | Aktifkan stan | `handleAdminTransition("activate")` | authed | admin |

Catatan penting: **tidak ada route manajemen user admin** â€” admin hanya memoderasi stan, dan role `admin` tidak bisa didapat lewat registrasi (`ValidateRole` hanya menerima `buyer`/`seller`, `validate.go:64â€“69`).

## 4.C Handler â€” contoh penting dibedah

### `handleAuthLoginVerify` (`handlers_auth.go:76â€“99`)

- **Input:** JSON `{pre_auth_token, otp}` via `httpx.ReadJSON` (maks 1 MiB; bukan JSON â†’ 400).
- **Pemanggilan service:** `s.Auth.VerifyLogin(ctx, ip, httpx.MaskIP(ip), r.UserAgent(), req.PreAuthToken, req.OTP, requestID)`.
- **Sukses:** menyetel dua cookie â€” `setRefreshCookie` (`kk_rt`, HttpOnly, Path=/api/v1/auth, SameSite=Lax, Secure di production) dan `setCSRFCookie` (`kk_csrf`, **tidak HttpOnly** agar JS bisa membacanya untuk header `X-CSRF-Token`) â€” lalu merespons 200 `{access_token, token_type:"Bearer", expires_in, csrf_token, user:{id,username,role}}`.
- **Gagal:** dipetakan oleh `writeDomainError` (`ErrPreAuthInvalid`â†’401, `ErrOTPInvalid`â†’400, `ThrottleError`â†’429, dll).

### `handleAuthRefresh` (`handlers_auth.go:101â€“135`)

1. Baca cookie `kk_rt`; kosong â†’ **401**.
2. `csrfPair(r)` gagal (header `X-CSRF-Token` â‰  nilai cookie `kk_csrf`) â†’ **401** "Token CSRF tidak valid."
3. `s.Sessions.Rotate(...)`; error apa pun â†’ **`clearAuthCookies(w)` dahulu** (token dicurigai dicuri/dipakai ulang â†’ cookie klien dibersihkan) lalu error dipetakan (reuse/revoked/expired â†’ 401).
4. `s.Auth.SignAccess(...)` menandatangani JWT baru; sukses â†’ set cookie refresh baru (rotasi) + 200.

### `handleOrderCreate` (`handlers_orders.go:64â€“90`)

1. Parse `{payment_method, items}`.
2. **`if idemKey == ""` â†’ 400** dengan `fields: {"idempotency_key":"Wajib diisi"}` (keputusan CART-04 â€” header `Idempotency-Key` wajib).
3. **`if len(idemKey) > 128` â†’ 400** "Maksimal 128 karakter".
4. `s.Orders.Create(...)` â†’ **201** detail order; error idempotensi konflik â†’ 409.

### `readUploadFile` (`handlers_users.go:46â€“71`) â€” dipakai foto profil & produk

1. `r.ParseMultipartForm(3<<20)` gagal â†’ 400 "File tidak valid atau terlalu besar."
2. `r.FormFile("file")` gagal â†’ 400 "Field 'file' wajib diisi."
3. `io.ReadAll(io.LimitReader(file, MaxUploadBytes+1))` gagal â†’ 400.
4. `if int64(len(data)) > s.Cfg.MaxUploadBytes` â†’ **413** "Ukuran file melebihi batas."
   (Handler upload kemudian: `storage.ErrDisabled`â†’503, `imaging.ErrTooLarge/ErrType/ErrDims`â†’422.)

## 4.D Service dan business logic (aturan yang benar-benar berjalan)

1. **Password benar tidak cukup untuk masuk** (`auth.Login` mengembalikan hanya `pre_auth_token`): mencegah pengambilalihan akun hanya dengan password (keputusan AUTH-03). OTP wajib sebagai faktor kedua.
2. **Anti-enumeration:** `Register` untuk email yang sudah terdaftar tetap merespons sukses `{"status":"otp_sent"}` tanpa mengirim email apa pun (`service.go:97â€“104` + audit `suppressed_email_taken`); `Login` untuk email tak dikenal tetap menjalankan `crypto.DummyVerify(password)` agar waktu respons identik.
3. **Lockout bergelombang:** tiap 5 password salah â†’ lock 3 menit (gelombang 1); gelombang berikutnya 15 menit pada scope `email` **dan** `email_ip` (NAT kampus ikut terdampak â€” dicatat sebagai keputusan terbuka di ACCEPTANCE Â§2).
4. **OTP 6 digit berumur 5 menit, maksimal 3 ronde / 24 jam, 5 percobaan per ronde**, cooldown resend 60 detik yang **tidak direset** oleh resend (AUTH-04).
5. **Harga selalu dihitung server** saat order dibuat; harga klien tidak pernah dipercaya (CART-03); order_items menyimpan **snapshot** `product_name_snapshot` + `unit_price_minor` (CAT-07) sehingga perubahan harga katalog tidak mengubah order lama.
6. **Idempotensi order:** kunci dari klien wajib; hash kanonik item **diurutkan per ProductID** (`hashRequest`, orders/service.go:198â€“208) sehingga urutan item berbeda tetap dianggap request sama; pemakaian key sama dengan payload berbeda â†’ 409 `IDEMPOTENCY_CONFLICT`.
7. **Konfirmasi tunai idempotent + optimistik:** `UPDATE ... WHERE id=$1 AND status='cash_due'` â€” 0 baris berarti ada yang menang balapan lain â†’ 409; status `cash_paid` dikonfirmasi ulang â†’ sukses tanpa efek (ORD-05). Setiap transisi tercatat di `payment_events` (ledger append-only).
8. **Status order bukan kolom yang diatur manual** â€” diturunkan oleh `DeriveOrderStatus` dari gabungan status semua payment & fulfillment order tersebut, diperbarui dalam transaksi yang sama (`RecalculateStatusTx`).
9. **Satu stan per seller** (`stalls.Create` menghitung `seller_stalls`, >0 â†’ 409 `ErrAlreadyHasStall`); stan baru selalu `pending_review`.
10. **Tidak ada stok kuantitas** â€” produk hanya punya `availability_status` (available/unavailable) + arsip; "stok habis" dimodelkan sebagai unavailable.

## 4.E Repository dan SQL

- **Query dibuat** sebagai string SQL statis dengan **parameter terikat** (`$1,$2,...`) â€” tidak ada string concatenation input user (mencegah SQL injection). Contoh pencarian produk meng-*escape* karakter LIKE secara eksplisit (`escapeLike`, catalog/service.go:353â€“356).
- **Hasil dibaca** dengan `rows.Scan(...)` ke struct; `sql.ErrNoRows` dipetakan ke error domain `ErrNotFound` (â†’404) atau `(nil, nil)` untuk pencarian opsional (`UserByEmail`).
- **Transaksi** via `db.WithTx` (`platform/db/db.go:45â€“61`): `BeginTx` â†’ jika panic â†’ rollback + re-panic; jika error fungsi â†’ rollback; kalau tidak â†’ `Commit`. Interface `DBTX` memungkinkan repository yang sama menerima `*sql.DB` (tanpa transaksi) atau `*sql.Tx` (di dalam transaksi).
- **Koneksi:** pool `database/sql` di atas pgx â€” 10 koneksi maksimum; setiap request HTTP memakai satu koneksi dari pool selama query berjalan.
- **Locking:** `SELECT ... FOR UPDATE` dipakai di titik kritis (rotasi sesi, status stan, item order, payment/fulfillment) agar transaksi bersamaan tidak saling menginjak; outbox memakai `FOR UPDATE SKIP LOCKED` agar banyak worker tidak memproses baris sama.

---

<a name="bagian-5"></a>
# BAGIAN 5 â€” PENJELASAN LOGIKA SOURCE CODE (BEDAH KONDISI)

Bagian ini membedah kondisi aktual di kode dengan format: **Kondisi / Jika TRUE / Jika FALSE / Jika error / Output / Alasan**.

## 5.1 Login langkah 1 â€” `auth.Login()` (`internal/auth/service.go:295â€“378`)

Potongan alur aktual:

```go
// service.go (ringkas, urutan aktual)
user := Repo.UserByEmail(email)                 // (nil, nil) jika tidak ada
if user == nil {
    crypto.DummyVerify(password)                // bakar waktu sama seperti verifikasi asli
    // event fail_unknown_email
    return "", ErrInvalidCredentials            // -> 401 "Email atau password salah"
}
if !crypto.VerifyPassword(user.PasswordHash, password) {
    err := recordPasswordFailure(...)           // counter atomik di auth_throttles
    if err != nil { return "", err }            // ThrottleError -> 429 saat lock aktif
    return "", ErrInvalidCredentials            // -> 401
}
if user.Status != "active" {
    // event blocked_status
    return "", ErrInvalidCredentials            // tetap 401, TIDAK mengungkap suspensi
}
// sukses: ClearFailures password, cek lock otp_login, cek MaxRoundRecent
preAuth := crypto.NewToken()                    // 32 byte
otp := crypto.GenerateOTP()                     // 6 digit
// TX: SupersedeChallengesTx -> InsertChallengeTx(PreAuthHash=HashToken(preAuth)) -> Outbox.Enqueue
return preAuth, nil
```

**Kondisi 1 â€” `user == nil` (email tidak terdaftar):**
- **Jika TRUE:** menjalankan `DummyVerify` (verifikasi Argon2id terhadap hash dummy â€” memakan waktu yang sama), mencatat event `fail_unknown_email`, mengembalikan `ErrInvalidCredentials`.
- **Jika FALSE:** lanjut verifikasi password.
- **Jika error:** error DB â†’ 500.
- **Output:** HTTP 401 dengan pesan generik "Email atau password salah".
- **Alasan:** anti *user enumeration* â€” penyerang tidak bisa membedakan email terdaftar vs tidak, baik dari isi respons maupun waktu respons (AUTH-06).

**Kondisi 2 â€” `!crypto.VerifyPassword(...)` (password salah):**
- **Jika TRUE:** `recordPasswordFailure` menambah `failure_count` secara atomik (`RecordFailure`, repository.go:39â€“49). **Jika count kelipatan 5**: gelombang 1 â†’ lock scope email 3 menit; gelombang â‰¥2 â†’ lock 15 menit pada scope email + email_ip; keduanya mengembalikan `ThrottleError` (HTTP 429 + `Retry-After`). Jika bukan kelipatan 5 â†’ hanya `ErrInvalidCredentials` (401).
- **Jika FALSE:** lanjut ke pemeriksaan status.
- **Alasan:** menghentikan brute force password secara bertahap tanpa mengungkap keberadaan akun.

**Kondisi 3 â€” `user.Status != "active"`:**
- **Jika TRUE:** event `blocked_status`, mengembalikan `ErrInvalidCredentials` yang **sama persis** dengan password salah.
- **Alasan:** akun suspended tidak boleh diketahui penyerang.

**Kondisi 4 â€” sukses password:** `ClearFailures` (mengembalikan `failure_count=0` tetapi **tidak** menyentuh `locked_until` â€” komentar repository.go:63â€“64), lalu cek lock `otp_login` dan `MaxRoundRecent >= OTPMaxRounds` â†’ `ErrEscalation` (429). Lanjut: buat `pre_auth_token` + OTP, simpan dalam satu transaksi, antrekan email. **Output:** 200 `{status:"otp_required", pre_auth_token}`.

## 5.2 Login langkah 2 â€” `auth.VerifyLogin()` (`service.go:395â€“462`)

**Kondisi 1 â€” `ValidateOTP` gagal (bukan 6 digit):** â†’ `ErrOTPInvalid` (400).
**Kondisi 2 â€” challenge tidak ditemukan untuk hash pre-auth ini, atau `now > ExpiresAt`:** â†’ `ErrPreAuthInvalid` (401) "Verifikasi login kedaluwarsa; silakan login ulang".
**Kondisi 3 â€” `ch.AttemptCount >= 5`:** â†’ `ThrottleError` (429).
**Kondisi 4 â€” `!VerifyOTP`:** `recordOTPFailure` â€” `IncAttempt` atomik (`UPDATE ... SET attempt_count = attempt_count+1 WHERE ... consumed_at IS NULL AND superseded_at IS NULL RETURNING attempt_count`). **Jika attempt == 5 (akhir ronde):** lock pada scope `email_ip` â€” register ronde 2 â†’ 5 menit; register ronde â‰¥3 â†’ 15 menit; login ronde â‰¥2 â†’ 15 menit â†’ 429. Selain itu â†’ `ErrOTPInvalid` (400).
**Kondisi 5 â€” OTP benar:** transaksi: `ConsumeTx` (sekali pakai; `RowsAffected==0` â†’ `ErrOTPInvalid`) â†’ `Sessions.CreateTx` (buat sesi + refresh token + CSRF) â†’ `UserByID` (nil â†’ error internal 500) â†’ `SignAccess` â†’ event `login_verified/success`. Setelahnya `ClearFailures otp_login`.
**Output sukses:** `LoginSuccess{AccessToken, ExpiresIn, RefreshToken, CSRFToken, User}` â†’ handler menyetel cookie dan mengembalikan 200.

## 5.3 Refresh token â€” `sessions.Rotate()` (`internal/sessions/service.go:98â€“165`)

Single transaksi dengan `SELECT ... WHERE refresh_token_hash=$1 LIMIT 1 FOR UPDATE`:

**Kondisi A â€” baris ditemukan:**
- `csrfToken == "" || HashToken(csrf) != csrfHash` â†’ event `refresh_csrf_mismatch/blocked`, **ErrInvalid** (401).
- `revokedAt.Valid` â†’ tandai revoke family â†’ **ErrRevoked** (401).
- `now > expiresAt || now > absoluteExpiresAt` â†’ revoke dengan alasan `'expired'` â†’ **ErrExpired** (401).
- Lolos semua â†’ `rotateTx`: token baru, `previous_refresh_token_hash = lama`, `expires_at = LEAST(now+idle, absolute)` â†’ sukses.

**Kondisi B â€” ErrNoRows pada hash refresh, tetapi ditemukan di `previous_refresh_token_hash`:**
- Artinya token yang disajikan adalah **token lama yang sudah dirotasi = indikasi pencurian/replay**. â†’ cabut **seluruh `token_family_id`** (semua sesi dalam keluarga, alasan `reuse_detected`), event `refresh_reuse_detected/blocked`, kembalikan **ErrReuse** (401). Handler juga memanggil `clearAuthCookies`.
- **Alasan:** ini inti *refresh token rotation* â€” satu token curian yang dipakai ulang menghentikan seluruh keluarga sesi.

**Kondisi C â€” tidak ditemukan sama sekali:** **ErrInvalid** (401).

## 5.4 Middleware otentikasi â€” `authenticate()` (`internal/http/middleware.go:41â€“68`)

**Kondisi 1 â€” header `Authorization` kosong/bukan `Bearer `:** â†’ 401 UNAUTHENTICATED "Sesi tidak valid atau kedaluwarsa; silakan login kembali."
**Kondisi 2 â€” `jwt.Verify` gagal** (format, signature, alg, exp/nbf dengan leeway 30 detik, iss, aud): â†’ 401.
**Kondisi 3 â€” `Sessions.Access(ctx, claims.Sid)` gagal atau `info.UserID != claims.Sub`:** â†’ 401. Query `Access` (sessions/service.go:292â€“311) mensyaratkan: `revoked_at IS NULL AND expires_at > now() AND absolute_expires_at > now() AND u.status='active'`.
- **Alasan:** JWT tidak bisa dicabut sendirinya; pemeriksaan DB membuat **revocation efektif sebelum expiry token**. Biayanya satu query per request terproteksi.
**Kondisi 4 â€” sukses:** `authCtx` diisi **dari database** (bukan dari klaim JWT kecuali `Sid`) â€” role yang dipakai otorisasi adalah role terkini di DB.

## 5.5 Keranjang â€” `cart.SetQuantity()` (`internal/cart/service.go:82â€“128`)

**Kondisi 1 â€” `ValidateQuantity(quantity)` gagal (di luar 1â€“99):** â†’ `InvalidError{quantity}` â†’ 422 dengan `fields`.
**Kondisi 2 â€” `quantity == 0`:** didelegasikan ke `RemoveItem` (menghapus item) â€” konvensi UI "set 0 = hapus".
**Kondisi 3 â€” produk tidak memenuhi gate `p.archived_at IS NULL AND availability_status='available' AND st.status='active'`:** â†’ `InvalidError{"product_id":"Produk tidak tersedia"}` â†’ 422 (CAT-03).
**Kondisi 4 â€” lolos:** transaksi: `INSERT INTO carts (buyer_id) ... ON CONFLICT DO NOTHING` (keranjang dibuat malas, satu per buyer â€” `buyer_id UNIQUE` di migration 0007) â†’ `INSERT INTO cart_items ... ON CONFLICT (cart_id, product_id) DO UPDATE SET quantity=$3` (**upsert**: item sama â†’ perbarui jumlah).
**Output:** kembali `s.Get(...)` â€” keranjang dihitung ulang dari DB (`LineTotalMinor = UnitPriceMinor*Quantity` dihitung di Go, bukan di SQL).

## 5.6 Pembuatan order â€” `orders.Create()` (`internal/orders/service.go:231â€“326`)

**Kondisi 1 â€” `method` bukan `"cash"`/`"qris_placeholder"`:** â†’ 422 pada `payment_method`.
**Kondisi 2 â€” `method=="qris_placeholder" && !Cfg.AllowQRISPlaceholder`:** â†’ `ErrQRISUnavailable` â†’ **503 RESOURCE_UNAVAILABLE**, tanpa menyentuh database (ORD-06). Default flag: `false`.
**Kondisi 3 â€” pre-check idempotensi di luar transaksi:** order dengan `(buyer_id, idempotency_key)` sudah ada: jika `request_hash` berbeda â†’ **409 IDEMPOTENCY_CONFLICT**; jika sama â†’ kembalikan order lama (replay aman).
**Kondisi 4 â€” `loadAndValidate(tx, items, lock=true)`:**
- `len(items)==0` â†’ "Keranjang kosong"; `len(items)>50` â†’ "Maksimal 50 item per pesanan"; produk ganda â†’ "Ada produk yang tercantum ganda" (semua 422).
- Query harga server dengan **`FOR UPDATE OF p`** saat membuat order (mengunci baris produk agar harga/ketersediaan konsisten selama transaksi).
- Item dengan produk arsip/nonaktif/stan tidak aktif â†’ "Ada produk yang tidak tersedia; perbarui keranjang Anda" (422).
**Kondisi 5 â€” collision `public_code`:** loop maks **5 percobaan** membuat kode 6 karakter; hanya retry bila error pg `23505` dengan constraint `orders_public_code_key`; error lain dibatalkan.
**Kondisi 6 â€” sukses:** INSERT order (`status='awaiting_payment'`), INSERT order_items dengan snapshot, INSERT `payments` per stan (`cash_due`, amount = subtotal stan), INSERT `order_stall_fulfillments` (`pending`), audit `order_create`. â†’ **201**.
**Alasan:** semua dalam **satu transaksi** â€” order tanpa pembayaran/pemenuhan mustahil ada.

## 5.7 Konfirmasi tunai â€” `payments.ConfirmCash()` (`internal/payments/service.go:49â€“123`)

**Kondisi 1 â€” seller bukan pemilik stan payment** (`EXISTS seller_stalls` gagal): â†’ `ErrNotFound` (**404**, bukan 403 â€” tidak membocorkan keberadaan payment orang lain).
**Kondisi 2 â€” `method != "cash"`:** â†’ `ErrStateConflict` (409).
**Kondisi 3 â€” `status == "cash_paid"`:** idempotent â€” kembalikan state saat ini tanpa mengubah apa pun (ORD-05).
**Kondisi 4 â€” `status == "cash_due"`:** `UPDATE payments SET status='cash_paid', paid_at=now(), confirmed_by=$2 WHERE id=$1 AND status='cash_due'`; **0 baris â†’ ErrStateConflict** (balapan ditangani optimistik). INSERT `payment_events` (dariâ†’ke, aktor, request_id), audit, lalu `RecalculateStatusTx` â†’ status order baru dikembalikan.
**Output:** `ConfirmCashResult{Payment, OrderID, OrderStatus}` â†’ 200.

## 5.8 Derivasi status order â€” `DeriveOrderStatus()` (`internal/orders/status.go:9â€“46`)

```go
for _, p := range paymentStatuses {
    if p != "cash_paid" { return "awaiting_payment" }   // satu saja belum lunas -> menunggu
}
if len(paymentStatuses) == 0 { return "awaiting_payment" }
// lalu per fulfillment:
// "completed"          -> allReady = false
// "in_preparation"     -> allCompleted=false, allReady=false, anyPrep=true
// "ready_for_pickup"   -> allCompleted=false
// default (pending/cancelled) -> allCompleted=false, allReady=false
switch {
case allCompleted: return "completed"
case allReady:     return "ready_for_pickup"
case anyPrep:      return "in_preparation"
default:           return "confirmed"
}
```

**Pemetaan hasil:** (1) ada payment â‰  `cash_paid` â†’ `awaiting_payment`; (2) semua lunas + semua fulfillment `completed` â†’ `completed`; (3) semua lunas + semua â‰¥ `ready_for_pickup` â†’ `ready_for_pickup`; (4) semua lunas + ada `in_preparation` â†’ `in_preparation`; (5) semua lunas + semua masih `pending` â†’ `confirmed`. Payment QRIS placeholder (`awaiting_external_confirmation`) **tidak pernah** dihitung lunas.

## 5.9 Transisi pemenuhan â€” `payments.UpdateFulfillment()` (baris 140â€“197)

```go
var nextFulfillmentStatus = map[string]string{
    "pending":         "in_preparation",
    "in_preparation":  "ready_for_pickup",
    "ready_for_pickup": "completed",
}
```

- `newStatus == current` â†’ no-op idempotent (sukses).
- `nextFulfillmentStatus[current] != newStatus` â†’ `ErrFulfillmentInvalid` (409). **Tidak ada jalur mundur**, `cancelled` buntu.
- UPDATE optimistik `WHERE id=$1 AND fulfillment_status=$4` (0 baris â†’ 409), audit `{from,to}`, recompute status order.

## 5.10 State machine stan â€” `stalls.AdminTransition()` (baris 267â€“305)

```go
var allowedTransitions = map[string]map[string]bool{
    "approve":    {"pending_review": true},
    "reject":     {"pending_review": true},
    "deactivate": {"active": true},
    "activate":   {"inactive": true},
}
```

**Kondisi:** aksi tidak dikenal â†’ `InvalidError` (422); stan tidak ada â†’ 404; `allowedFrom[current]` salah (misal `approve` pada stan `active`) â†’ **409 ErrInvalidTransition**; sukses â†’ UPDATE status + audit `stall_<action>` `{from,to}`. Seller **tidak pernah** bisa mengubah status stan sendiri.

## 5.11 Struktur kontrol lain yang ditemukan

- **`switch`**: `handleAdminStallsList` (filter status; nilai di luar daftar â†’ 400), `ConfirmCash` (branch status payment), `DeriveOrderStatus` (final).
- **`for`/`range`**: loop percobaan `public_code` (maks 5), loop payment/fulfillment di `DeriveOrderStatus`, loop batch outbox (LIMIT 10), loop items `loadAndValidate`.
- **`break`/`continue`**: tidak menonjol di kode domain (logika memakai early `return`).
- **`defer`**: `defer rows.Close()`, `defer tx.Rollback()` di helper transaksi (pola aman: rollback no-op setelah commit).
- **`goroutine`**: `go worker.Run(ctx)` (outbox), goroutine cleanup per jam, goroutine serve; `ListenAndServe` berjalan di goroutine terpisah dari wait shutdown.
- **`select`**: pada cleanup loop â€” `case <-ticker.C` vs `case <-ctx.Done()` (keluar bersih saat shutdown).
- **`panic`/`recover`**: `httpx.RecoverMiddleware` menangkap panic handler â†’ 500 INTERNAL_ERROR dengan request_id; `WithTx` melakukan rollback saat panic lalu re-panic.
- **Context cancellation**: `signal.NotifyContext` membatalkan ctx saat shutdown; worker dan ticker berhenti; klien HTTP eksternal (Mailjet/Supabase) memakai timeout tetap (10s/20s).

---

<a name="bagian-6"></a>
# BAGIAN 6 â€” FLOWCHART SETIAP FITUR

> Semua flowchart mengikuti kode aktual (bukan idealisasi). Status runtime = simulasi berdasarkan kode (Bagian 12).

## 6.1 Register + OTP

- **Tujuan:** membuat akun baru yang emailnya terverifikasi.
- **Aktor:** calon buyer/seller (anonim).
- **Input:** `username`, `email`, `password`, `role`.

```mermaid
flowchart TD
    A[Form register dikirim] --> B{Zod: username 3-30\nregex a-z0-9._, email, password 10-128, role?}
    B -- Tidak --> C[Tampilkan error per field\ntidak ada request API]
    B -- Ya --> D[POST /api/v1/auth/register]
    D --> E{Validasi service\n+ lock + rate limit?}
    E -- Lock/rate --> F[429 RATE_LIMITED]
    E -- Field salah --> G[422 + fields]
    E -- Lolos --> H{Email sudah terdaftar?}
    H -- Ya --> I[Return nil TANPA email\ntetap 200 otp_sent\nanti-enumeration]
    H -- Tidak --> J[Username dipakai?]
    J -- Ya --> K[422 username sudah dipakai]
    J -- Tidak --> L[TX: purge pending lama,\nsimpan pending 30 menit,\nchallenge OTP round+1,\nenqueue email terenkripsi]
    L --> M[200 status otp_sent]
    M --> N[Halaman /verify]
    N --> O[POST register/verify dengan OTP]
    O --> P{OTP benar & attempt < 5?}
    P -- Tidak --> Q[400 OTP_INVALID_OR_EXPIRED\natau 429 saat ronde terkunci]
    P -- Ya --> R[TX: consume challenge,\nINSERT users status active,\nmark pending verified]
    R --> S[Kartu sukses -> link ke /login]
```

## 6.2 Login dua langkah

- **Aktor:** pengguna terdaftar.
- **Input:** email+password, lalu OTP + pre_auth_token.

```mermaid
flowchart TD
    A[Form login] --> B{Zod valid?}
    B -- Tidak --> C[Error per field]
    B -- Ya --> D[POST /auth/login]
    D --> E{Email terdaftar?}
    E -- Tidak --> F[DummyVerify + 401 generik]
    E -- Ya --> G{Password benar?}
    G -- Tidak --> H{Kelipatan 5 gagal?}
    H -- Ya --> I[Lock 3 menit / 15 menit -> 429]
    H -- Tidak --> J[401 generik]
    G -- Ya --> K{Status aktif?}
    K -- Tidak --> L[401 generik blocked_status]
    K -- Ya --> M[Buat pre_auth_token + OTP,\nsupersede challenge lama]
    M --> N[200 otp_required + pre_auth_token]
    N --> O[Redirect /verify?mode=login&pre_auth_token=...]
    O --> P[POST /auth/login/verify]
    P --> Q{pre_auth valid? OTP benar? attempt<5?}
    Q -- Tidak --> R[401 ErrPreAuthInvalid / 400 OTP / 429]
    Q -- Ya --> S[TX: consume OTP, buat sesi,\nsign access token]
    S --> T[Set cookie kk_rt + kk_csrf,\n200 AuthTokens]
    T --> U[Zustand signIn -> redirect home per role]
```

## 6.3 Logout & pencabutan sesi

```mermaid
flowchart TD
    A[Tombol Keluar / Cabut sesi] --> B{Logout atau Revoke?}
    B -- Logout --> C[POST /auth/logout authed]
    C --> D[RevokeCurrent sesi ini\nalasan logout, error diabaikan]
    D --> E[clearAuthCookies MaxAge -1]
    E --> F[200 logged_out -> Zustand anonymous -> /login]
    B -- Revoke lain --> G[DELETE /auth/sessions/{id}]
    G --> H{Target = sesi saat ini?}
    H -- Ya --> I[409 CONFLICT gunakan logout]
    H -- Tidak --> J{Sesi milik user ini & aktif?}
    J -- Tidak --> K[404 NOT_FOUND]
    J -- Ya --> L[revoked_at=now, reason revoked_by_user]
    L --> M[200 revoked -> invalidate query sessions]
```

## 6.4 Refresh token

```mermaid
flowchart TD
    A[Request API mendapat 401] --> B[client.ts: refreshSession sekali]
    B --> C[POST /auth/refresh\ndengan cookie kk_rt + X-CSRF-Token]
    C --> D{Cookie ada? CSRF cocok?}
    D -- Tidak --> E[401 -> notifySessionLost]
    D -- Ya --> F{SELECT FOR UPDATE}
    F -- Token reuse lama --> G[Revoke seluruh family\n401 + clearAuthCookies]
    F -- Revoked/expired --> H[401 + clearAuthCookies]
    F -- Valid --> I[rotate: token baru,\nprevious= lama,\naccess token baru]
    I --> J[Retry request asli 1x\ndengan Bearer baru]
    J -- Masih 401 --> K[notifySessionLost -> markAnonymous -> /login]
```

## 6.5 Profil & foto

```mermaid
flowchart TD
    A[Halaman /settings] --> B[GET /me query me]
    B --> C[Form profil / upload foto / daftar sesi / tema]
    C --> D[PATCH /me username/preferences]
    D --> E{Username valid & unik?}
    E -- Tidak --> F[409/422 fields.username]
    E -- Ya --> G[200 + setQueryData me + setUser zustand]
    C --> H[POST /me/profile-photo FormData]
    H --> I{Tipe PNG/JPEG? Dimensi 32-4000? Ukuran <= 2MB?}
    I -- Tidak --> J[413 / 422 pesan Indonesia]
    I -- Ya --> K[imaging.ToWebP -> Supabase upload]
    K -- Supabase tidak dikonfigurasi --> L[503 RESOURCE_UNAVAILABLE]
    K -- Sukses --> M[UPDATE profile_image_key,\nobjek lama dihapus best-effort]
```

## 6.6 Role seller/admin & CRUD produk

```mermaid
flowchart TD
    A[Request endpoint seller/admin] --> B{JWT + sesi valid?}
    B -- Tidak --> C[401]
    B -- Ya --> D{Role persis sama?}
    D -- Tidak --> E[403 FORBIDDEN]
    D -- Ya --> F[Handler]
    F --> G{Seller: pemilik stan/produk?\nvia EXISTS seller_stalls}
    G -- Tidak --> H[404 anti-leak]
    G -- Ya --> I[Bisnis: nama 3-100,\nharga 0..Rp100jt,\navailability enum]
    I -- Salah --> J[422 fields]
    I -- OK --> K[INSERT/UPDATE/soft-archive + audit]
    K --> L[201/200]
    M[Admin approve/reject/activate/deactivate] --> N{Transisi di allowedTransitions?}
    N -- Tidak --> O[409 ErrInvalidTransition]
    N -- Ya --> P[UPDATE status + audit]
```

## 6.7 Checkout â†’ order â†’ pembayaran tunai

```mermaid
flowchart TD
    A[Halaman checkout\nuseQuery preview] --> B[POST /orders/preview]
    B --> C{Item valid, tersedia,\nstan aktif?}
    C -- Tidak --> D[422 fields ditampilkan]
    C -- Ya --> E[Tampilkan ringkasan harga server]
    E --> F[Tombol Konfirmasi\npaymentMethod = cash\nQRIS disabled]
    F --> G[Idempotency-Key = crypto.randomUUID\nsekali per kombinasi item]
    G --> H[POST /orders]
    H --> I{QRIS? flag off -> 503}
    H --> J{loadAndValidate\nFOR UPDATE OF products}
    J -- Gagal --> K[422]
    J -- OK --> L[TX: INSERT orders awaiting_payment,\norder_items snapshot,\npayments cash_due per stan,\nfulfillments pending]
    L --> M[201 detail order]
    M --> N[Buyer bayar tunai di kasir]
    N --> O[Seller: dialog konfirmasi +\ncheckbox uang diterima]
    O --> P[POST /seller/payments/{id}/confirm-cash]
    P --> Q{cash_due? milik stan sendiri?}
    Q -- Tidak --> R[409 / 404]
    Q -- Ya --> S[cash_paid + payment_events\n+ RecalculateStatusTx]
    S --> T[Order status naik:\nconfirmed -> in_preparation\n-> ready_for_pickup -> completed]
    T --> U[Buyer melihat status di /orders/:id]
```

## 6.8 Pengelolaan stok / ketersediaan

Tidak ada kolom stok kuantitas. Model aktual: `availability_status` + `archived_at` + status stan. Ketersediaan diperiksa **dua kali**: saat menambah ke keranjang (cart gate) dan **ulang saat order dibuat** di bawah `FOR UPDATE` (sumber kebenaran terakhir).

```mermaid
flowchart TD
    A[Seller menandai produk unavailable\natau mengarsipkan] --> B[Produk baru tidak bisa ditambah ke keranjang]
    B --> C[Item lama di keranjang tetap ada\nditandai tidak tersedia di UI]
    C --> D[Checkout diblokir UI:\ncanCheckout = items>0 && !hasUnavailable]
    D --> E[Bahkan jika lolos UI,\nserver menolak saat order:\n422 Ada produk yang tidak tersedia]
```

## 6.9 Riwayat transaksi

```mermaid
flowchart TD
    A[Buyer: GET /orders?cursor=...] --> B[Keyset pagination\ncreated_at,id DESC, default 20 maks 50]
    B --> C[Kartu: public_code, tanggal,\ntotal, badge status,\nX dari Y stan lunas]
    A2[Seller: GET /seller/orders] --> B2[Filter: hanya order yang\nmemuat item stan miliknya]
    B2 --> C2[Antrean bernomor untuk\norder aktif + kontrol tunai & pemenuhan]
```

---

<a name="bagian-7"></a>
# BAGIAN 7 â€” PENJELASAN DATABASE POSTGRESQL

## 7.1 Identitas database

- **Database yang dipakai:** **satu** PostgreSQL 16 (`infra/compose.yaml`, user `kantin`, DB `kantin` untuk dev dan `kantin_test` untuk CI/test). **Tidak ada pemisahan database Auth vs Marketplace** â€” semua tabel (auth + marketplace) berada dalam satu database dan satu set migrasi. Pertanyaan "bagaimana backend memilih koneksi antara Auth dan Marketplace?" **tidak berlaku**: hanya ada satu `DATABASE_URL` (`config.go`).
- **Migration:** `services/api/migrations/0001..0009` (up/down), dijalankan dengan `golang-migrate` v4.18.3 (README + CI).
- Skema = `public` (tidak ada schema kustom).

## 7.2 Ringkasan tabel per migrasi

### 0001 â€” `users`
| Kolom | Tipe | Ketentuan |
|---|---|---|
| id | uuid PK | `DEFAULT gen_random_uuid()` |
| username | text | NOT NULL **UNIQUE** |
| email_normalized | text | NOT NULL **UNIQUE** (tidak ada kolom email mentah) |
| password_hash | text | NOT NULL (Argon2id PHC) |
| role | text | NOT NULL CHECK IN ('buyer','seller','admin') |
| status | text | NOT NULL DEFAULT 'active' CHECK IN ('pending','active','suspended','deleted') |
| email_verified_at | timestamptz | nullable |
| profile_image_key | text | nullable (kunci objek, bukan URL) |
| preferences | jsonb | NOT NULL DEFAULT '{}' (theme_mode, accent) |
| created_at/updated_at | timestamptz | NOT NULL DEFAULT now() |

Index: `users_role_status_idx (role, status)`. **Tidak ada** kolom `name`/`phone`/`profile_photo_url` (klaim `generate_pdf.py` tentang kolom ini salah â€” drift dokumentasi).

### 0002 â€” `pending_registrations`
Data pendaftaran yang belum verifikasi: `id`, `email_normalized`, `username`, `password_hash`, `role CHECK IN ('buyer','seller')`, `attempt_group_id uuid`, `verified_at`, `expires_at` (TTL 30 menit). **Partial unique index** `(email_normalized) WHERE verified_at IS NULL` â€” hanya satu pendaftaran aktif per email. **Tanpa FK** (baris mandiri, dihapus saat dibuat user).

### 0003 â€” `otp_challenges`
`id`, `user_id â†’ users(id) ON DELETE CASCADE` (nullable), `pending_registration_id â†’ pending_registrations(id) ON DELETE CASCADE` (nullable), `email_normalized`, `purpose CHECK IN ('register','login')`, `otp_hash` (**HMAC, bukan plaintext**), `pre_auth_token_hash`, `attempt_count DEFAULT 0`, `round_number DEFAULT 1`, `request_ip_hash`, `expires_at`, `consumed_at`, `superseded_at`, `last_sent_at`. Index: `(email_normalized, purpose, created_at DESC)`; partial `(expires_at) WHERE consumed_at IS NULL`; partial `(pre_auth_token_hash) WHERE ... consumed_at IS NULL`.

### 0004 â€” `auth_throttles` + `auth_events`
- `auth_throttles`: `scope_type CHECK IN ('email','ip','email_ip','challenge')`, `scope_key_hash`, `flow CHECK IN ('password','otp_register','otp_login','otp_resend','register_start')`, `failure_count`, `wave_number`, `window_started_at`, `locked_until`; **UNIQUE (flow, scope_type, scope_key_hash)** â€” satu baris counter per kombinasi.
- `auth_events`: `flow`, `event`, `outcome`, `email_hash`, `ip_hash`, `request_id`; index `(created_at DESC)`.

### 0005 â€” `login_sessions`
`id`, `user_id â†’ users(id) NOT NULL ON DELETE CASCADE`, `refresh_token_hash`, `previous_refresh_token_hash`, `token_family_id`, `csrf_token_hash`, `user_agent_summary`, `platform`, `ip_masked`, `ip_hash`, `expires_at`, `absolute_expires_at`, `revoked_at`, `revoke_reason`. **Hanya hash token yang disimpan** (AUTH-09). Index: `(user_id, revoked_at, expires_at)`, `(refresh_token_hash)`, `(token_family_id)`.

### 0006 â€” `stalls`, `seller_stalls`, `products`
- `stalls`: `name`, `description`, `location_label`, `status DEFAULT 'pending_review' CHECK IN ('pending_review','active','inactive')`, `created_by â†’ users(id)` (tanpa cascade). Catatan: status `'rejected'` yang disebut `generate_pdf.py` **tidak ada** â€” penolakan mengubah status menjadi `inactive`.
- `seller_stalls`: PK **(seller_id, stall_id)**; `seller_id â†’ users CASCADE`, `stall_id â†’ stalls CASCADE`, `role DEFAULT 'owner' CHECK IN ('owner','staff')`.
- `products`: `stall_id â†’ stalls CASCADE`, `name`, `description`, `price_minor bigint CHECK >=0`, `currency DEFAULT 'IDR'`, `availability_status DEFAULT 'available' CHECK IN ('available','unavailable')`, `image_key`, `created_by â†’ users(id)`, `archived_at`. Partial index `(stall_id, availability_status) WHERE archived_at IS NULL`; `(lower(name)) WHERE archived_at IS NULL`.

### 0007 â€” `carts`, `cart_items`
- `carts`: `buyer_id uuid NOT NULL UNIQUE â†’ users(id) CASCADE` â€” **satu keranjang per buyer** dijamin DB.
- `cart_items`: `cart_id â†’ carts CASCADE`, `product_id â†’ products CASCADE`, `quantity CHECK >0`, **UNIQUE (cart_id, product_id)**, index `(cart_id)`.

### 0008 â€” `orders`, `order_items`, `order_stall_fulfillments`, `payments`, `payment_events`
- `orders`: `public_code text NOT NULL UNIQUE` (constraint `orders_public_code_key`), **`buyer_id uuid NOT NULL REFERENCES users(id)`** â€” FK nyata (tanpa ON DELETE = perilaku RESTRICT: user dengan order tidak bisa dihapus), `status CHECK IN ('awaiting_payment','confirmed','in_preparation','ready_for_pickup','completed','cancelled','expired','rejected')`, `currency`, `subtotal_minor CHECK >=0`, `total_minor CHECK >=0`, `idempotency_key`, `request_hash`, `cancelled_at`; **UNIQUE (buyer_id, idempotency_key)**; index `(buyer_id, created_at DESC)`, `(status, created_at DESC)`.
- `order_items`: `order_id â†’ orders CASCADE`, **`product_id â†’ products(id)` nullable tanpa cascade** (arsip dipakai, bukan hapus; FK menjaga snapshot menunjuk produk nyata), `stall_id â†’ stalls(id)`, **snapshot**: `product_name_snapshot NOT NULL`, `unit_price_minor`, `quantity`, `line_total_minor`; index `(order_id)`, `(stall_id)`.
- `order_stall_fulfillments`: `order_id â†’ orders CASCADE`, `stall_id â†’ stalls`, `fulfillment_status DEFAULT 'pending' CHECK IN ('pending','in_preparation','ready_for_pickup','completed','cancelled')`, `updated_by â†’ users(id)`; **UNIQUE (order_id, stall_id)**; index `(stall_id)`.
- `payments`: `order_id â†’ orders CASCADE`, `stall_id â†’ stalls`, `method CHECK IN ('cash','qris_placeholder')`, `status CHECK IN ('cash_due','cash_paid','void','unavailable','awaiting_external_confirmation')`, `amount_minor CHECK >=0`, `paid_at`, `confirmed_by â†’ users(id)`, `expires_at`, `external_reference`; index `(order_id)`, `(stall_id)`.
- `payment_events`: ledger append-only (`payment_id â†’ payments`, `from_status`, `to_status`, `actor_user_id â†’ users(id)`, `reason_code`, `request_id`); komentar migrasi: aplikasi tidak melakukan UPDATE/DELETE (ORD-03, SESS-04).

### 0009 â€” `audit_logs`, `email_outbox`
- `audit_logs`: `actor_user_id â†’ users(id)` nullable, `action`, `resource_type`, `resource_id`, `outcome`, `request_id`, `metadata_redacted jsonb DEFAULT '{}'`; index `(created_at DESC)`, `(actor_user_id, created_at DESC)`.
- `email_outbox`: `purpose`, `recipient`, `template_key`, `payload_redacted jsonb` (meski namanya "redacted", kolom ini menyimpan **kode OTP terenkripsi AES-256-GCM**, tidak pernah plaintext), `status CHECK IN ('pending','sent','failed')`, `attempt_count`, `next_attempt_at`, `provider_message_id`, `sent_at`; index `(status, next_attempt_at)`.

## 7.3 ERD (berdasarkan struktur aktual)

```mermaid
erDiagram
    users ||--o{ otp_challenges : "user_id (nullable, CASCADE)"
    users ||--o{ login_sessions : "user_id (CASCADE)"
    users ||--o{ carts : "buyer_id UNIQUE (CASCADE)"
    users ||--o{ seller_stalls : "seller_id (CASCADE)"
    users ||--o{ stalls : "created_by (nullable, tanpa cascade)"
    users ||--o{ orders : "buyer_id (FK nyata)"
    users ||--o{ audit_logs : "actor_user_id (nullable)"
    pending_registrations ||--o{ otp_challenges : "pending_registration_id (CASCADE)"
    stalls ||--o{ seller_stalls : "stall_id (CASCADE)"
    stalls ||--o{ products : "stall_id (CASCADE)"
    stalls ||--o{ order_items : "stall_id"
    stalls ||--o{ order_stall_fulfillments : "stall_id"
    stalls ||--o{ payments : "stall_id"
    products ||--o{ cart_items : "product_id (CASCADE)"
    products ||--o{ order_items : "product_id (nullable)"
    carts ||--o{ cart_items : "cart_id (CASCADE)"
    orders ||--o{ order_items : "order_id (CASCADE)"
    orders ||--o{ order_stall_fulfillments : "order_id (CASCADE)"
    orders ||--o{ payments : "order_id (CASCADE)"
    payments ||--o{ payment_events : "payment_id"
    users {
        uuid id PK
        text username UK
        text email_normalized UK
        text password_hash
        text role
        text status
        jsonb preferences
    }
    orders {
        uuid id PK
        text public_code UK
        uuid buyer_id FK
        text status
        bigint total_minor
        text idempotency_key
    }
    order_items {
        uuid id PK
        uuid order_id FK
        uuid product_id FK "nullable"
        text product_name_snapshot
        bigint unit_price_minor
        int quantity
    }
    payments {
        uuid id PK
        uuid order_id FK
        uuid stall_id FK
        text method
        text status
        bigint amount_minor
    }
```

## 7.4 Contoh data yang mengalir melalui relasi

1. **Registrasi:** baris `pending_registrations` (email+hash password) â†’ OTP benar â†’ `users` dibuat (`email_verified_at=now()`) â†’ pending ditandai verified.
2. **Login:** `otp_challenges` (pre_auth_token_hash) â†’ konsumsi â†’ baris `login_sessions` (hash refresh + family) yang menempel ke `users.id`.
3. **Order:** `orders(buyer_id)` (1) â†’ N `order_items` (snapshot harga) â†’ per stan: 1 `payments` + 1 `order_stall_fulfillments`; setiap transisi payment menambah `payment_events`.
4. **Katalog:** `stalls` (1) â†’ N `products`; `seller_stalls` menghubungkan userâ†”stan dengan role owner/staff.

## 7.5 Apakah ada tabel bernama sama di dua database?

**Tidak.** Hanya ada satu database; tidak ada duplikasi tabel auth/marketplace. Identitas pengguna dipakai marketplace lewat **FK nyata** (`orders.buyer_id REFERENCES users(id)`, `carts.buyer_id`, `stalls.created_by`, `seller_stalls.seller_id`) â€” bukan sekadar kolom bernama mirip. Kesimpulan: tabel berdiri dalam **satu database yang benar-benar terhubung oleh foreign key**.

---

<a name="bagian-8"></a>
# BAGIAN 8 â€” AUTHENTICATION DAN AUTHORIZATION

## 8.1 Definisi dalam konteks Project Cyber

- **Authentication (otentikasi)** = membuktikan "kamu siapa". Implementasi: password Argon2id + OTP email, JWT access token, refresh token sesi DB. Kode: `internal/auth/`, `internal/sessions/`, middleware `authenticate`.
- **Authorization (otorisasi)** = membuktikan "kamu boleh melakukan ini". Implementasi: middleware `role()` (buyer/seller/admin persis) + cek kepemilikan di SQL (`EXISTS seller_stalls`, `WHERE o.buyer_id=$1`). Kode: `middleware.go:82â€“95`, tiap service.

## 8.2 Password hashing

`platform/crypto/password.go` â€” **Argon2id** (bukan bcrypt): memori **64 MiB**, iterasi **3**, paralelisme **2**, salt 16 byte, key 32 byte; format string PHC `$argon2id$v=19$m=65536,t=3,p=2$...`. Verifikasi memakai pembanding konstan-waktu. `DummyVerify` menjalankan verifikasi hash dummy untuk login email tak dikenal agar waktu respons seragam.

## 8.3 Token & cookie

| Elemen | Nilai aktual | Lokasi |
|---|---|---|
| Access token | JWT **HS256**, klaim `iss/aud/sub/sid/role/iat/nbf/exp`, TTL **10 menit**, leeway 30 detik | `platform/jwt/jwt.go` |
| Penyimpanan access token | **Memori browser saja** (`token-store.ts`), bukan localStorage â€” keputusan D8, memitigasi XSS | `apps/web/src/lib/api/token-store.ts` |
| Refresh token | 32 byte acak base64url, **disimpan sebagai SHA-256 hash** di `login_sessions`, cookie **`kk_rt`**: `Path=/api/v1/auth`, `HttpOnly`, `Secure` (production), `SameSite=Lax`, MaxAge = absolute TTL (30 hari) | `middleware.go:97â€“112`, `sessions/service.go:50â€“87` |
| CSRF | Cookie `kk_csrf` **tidak HttpOnly** (dibaca JS) + header `X-CSRF-Token` (double-submit); diverifikasi pada refresh & semua mutasi non-GET dari klien | `middleware.go:114â€“140`, `client.ts:109â€“114` |
| Rotasi | Setiap refresh mengganti token; `previous_refresh_token_hash` menyimpan yang lama; replay lama â†’ **revoke seluruh token_family_id** | `sessions/service.go:98â€“165` |
| Revocation | Setiap request terproteksi memeriksa sesi DB (`Sessions.Access`) â€” revocation efektif sebelum expiry JWT | `sessions/service.go:292â€“311` |
| Pre-auth token | 32 byte, hash SHA-256 tersimpan di `otp_challenges.pre_auth_token_hash`, sekali pakai | `auth/service.go` |
| OTP | 6 digit CSPRNG, hash HMAC-SHA256 di DB, terenkripsi AES-256-GCM di outbox | `crypto/otp.go`, `crypto/secret.go` |

## 8.4 Sequence login lengkap

```mermaid
sequenceDiagram
    participant B as Browser
    participant F as Next.js (proxy)
    participant A as Go API
    participant DB as PostgreSQL
    participant M as Mailjet/Log

    B->>F: POST /api/v1/auth/login {email,password}
    F->>A: proxy
    A->>DB: UserByEmail + VerifyPassword (Argon2id)
    A->>DB: TX: supersede challenge, insert challenge(pre_auth_hash), enqueue outbox
    A->>M: worker kirim OTP (asinkron)
    A-->>B: 200 {status:otp_required, pre_auth_token}
    B->>F: POST /api/v1/auth/login/verify {pre_auth_token, otp}
    F->>A: proxy
    A->>DB: VerifyOTP (HMAC), ConsumeTx, Sessions.CreateTx
    A-->>B: Set-Cookie kk_rt (HttpOnly) + kk_csrf; 200 {access_token, user}
    B->>B: token-store.setAccessToken (memori) + zustand signIn
    B->>F: GET /api/v1/cart (Authorization: Bearer ...)
    F->>A: proxy
    A->>DB: jwt.Verify + Sessions.Access(sid)
    A-->>B: 200 {data}
```

## 8.5 Token kedaluwarsa & refresh

1. Access token 10 menit â†’ request berikutnya 401.
2. `client.ts:129â€“135`: 401 + `auth` + belum pernah retry â†’ `refreshSession()` (`POST /auth/refresh`, `credentials:"include"`, header CSRF).
3. Sukses â†’ simpan access token baru â†’ ulangi request asli **satu kali** (`retryOnUnauthorized:false`).
4. Gagal â†’ `notifySessionLost()` â†’ zustand `markAnonymous()` â†’ guard mengarahkan ke `/login?next=...`.
5. Refresh token sendiri punya dua batas: **idle 7 hari** (diperpanjang tiap rotasi, maks **absolut 30 hari**).

## 8.6 CORS & keamanan header

- **CORS:** allowlist origin eksak dari `CORS_ALLOWED_ORIGINS`; `Allow-Credentials: true`; preflight â†’ 204. Pada dev, proxy Next membuat cookie first-party sehingga CORS hampir tidak diperlukan.
- **SecureHeadersMiddleware:** `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Cache-Control: no-store`, `CSP: default-src 'none'; frame-ancestors 'none'`.
- **Rate limit:** 5 rps/burst 15 per `group|IP` (in-memory, lapisan pertama; lockout durable ada di `auth_throttles`).

## 8.7 Implementasi vs hasil uji

Semua mekanisme di atas **ada di kode** dan beberapa diujicokan oleh test integrasi + E2E (Bagian 13), tetapi **17 acceptance criteria di `docs/ACCEPTANCE.md` semuanya berstatus "Belum dijalankan"** â€” jadi klaim "konfigurasi keamanan sudah benar" **tidak dapat dinyatakan terbukti**. Contoh verifikasi yang menunggu eksekusi: timing anti-enumeration (kriteria 3), replay refresh (kriteria 5 â€” sudah ada test integrasi `TestRefreshRotationAndReuseDetection`), dan review keamanan independen (belum ada).

---

<a name="bagian-9"></a>
# BAGIAN 9 â€” PENJELASAN FRONTEND NEXT.JS

## 9.1 Kerangka aplikasi

- **App Router** (bukan Pages Router). Root layout `src/app/layout.tsx`: font Geist, metadata "Kantin Kampus", **script bootstrap tema blocking** (membaca `localStorage["kantin.theme"]`/`["kantin.accent"]` sebelum paint, fallback `prefers-color-scheme`, validasi 5 aksen, set `data-theme`/`data-accent` di `<html>`), dan `<Providers>`.
- **Route groups:** `(auth)` publik (login/register/verify) dan `(app)` terproteksi (semua halaman utama). `(app)/layout.tsx` membungkus dengan `<AppShell>` (yang memuat `RequireAuth`) dan menambah `RequireRole(["buyer"])` hanya untuk rute buyer.
- **`src/app/page.tsx`:** router peran â€” `bootstrap()` (pemulihan sesi via refresh) â†’ `anonymous` â†’ `/login`; `authenticated` â†’ home per role (seller â†’ `/seller/orders`, admin â†’ `/admin`, lainnya â†’ `/catalog`).

## 9.2 Guards (client-side; server tetap otoritatif)

`features/auth/guards.tsx`:
- `RequireAuth` â€” boot sesi bila idle; `anonymous` â†’ redirect `/login?next=<path>`; menampilkan `FullPageLoader "Memuat sesi..."` sampai `authenticated`.
- `RequireRole({roles})` â€” role tidak cocok â†’ redirect ke `homePathForRole(user.role)`.
- `RedirectIfAuthenticated` â€” untuk halaman publik; sudah login â†’ home per role.
- Komentar file (baris 10â€“13): guard klien hanya UX; perlindungan sesungguhnya di middleware/role backend.

## 9.3 API client (`lib/api/client.ts`) â€” inti komunikasi

Alur `apiRequest<T>(path, options)`:
1. `API_BASE = "/api/v1"` (relative â€” lewat rewrite Next).
2. Header: `Accept`; body FormData dilewati apa adanya, selain itu `Content-Type: application/json` + `JSON.stringify`.
3. **CSRF:** metode non-GET menempel `X-CSRF-Token` dari cookie `kk_csrf` (dibaca via `document.cookie`).
4. **Auth:** `Authorization: Bearer <token>` dari token-store (memori).
5. `fetch(..., {credentials:"include"})`.
6. **401** â†’ satu kali `refreshSession()` (POST `/auth/refresh`) â†’ retry sekali; gagal â†’ `notifySessionLost()`.
7. Non-OK â†’ `ApiError(status, code, fields, requestId)`. OK â†’ **unwrap** envelope: kembalikan `(parsed)?.data`.

## 9.4 Zustand â€” store autentikasi (`features/auth/auth-store.ts`)

**Apa itu Zustand (menurut dokumentasi resmi pmndrs, github.com/pmndrs/zustand):** pustaka state management React yang ringan ("bears the bare minimum state management principles") â€” satu fungsi `create` membuat store global yang bisa diakses komponen mana pun tanpa Provider dan tanpa boilerplate reducer, dengan re-render minimal karena komponen berlangganan *slice* state yang ia pakai.

**Di Project Cyber**, Zustand dipakai **hanya untuk state autentikasi** (client state), tanpa middleware persistensi:

| Elemen | Aktual |
|---|---|
| State | `status: "idle" \| "loading" \| "authenticated" \| "anonymous"`, `user: UserInfo \| null` |
| `bootstrap()` | guard memanggil saat idle: `authApi.refresh()` â†’ sukses: `setAccessToken` + `authenticated`; gagal: `anonymous` |
| `signIn(tokens)` | dipanggil OTP verify: simpan token + user |
| `signOut()` | `authApi.logout()` (error diabaikan), hapus token, `anonymous` |
| `markAnonymous()` | target callback `onSessionLost` dari API client |
| `setUser()` | sinkronisasi username setelah PATCH /me |
| `homePathForRole` | sellerâ†’`/seller/orders`, adminâ†’`/admin`, defaultâ†’`/catalog` |

**Mengapa dipisah dari React Query:** auth adalah *client state* (sumber kebenaran di browser + cookie), sedangkan data server dikelola React Query. Jika tidak ada Zustand: setiap komponen harus mengoper prop user, atau boot sesi diulang di banyak tempat â€” guards menjadi berantakan.

## 9.5 TanStack React Query â€” server state

**Apa itu (dikutip docs resmi, tanstack.com/query/latest/docs/framework/react/overview):** *"TanStack Query ... makes fetching, caching, synchronizing and updating server state in your web applications a breeze."* Motivasinya: server state berbeda dari client state â€” tersimpan remote, diubah orang lain, dan bisa basi (stale). React Query menangani caching, deduplikasi request, refetch latar, pagination, dan garbage collection hasil query.

**Di Project Cyber:**

- `components/providers.tsx` membuat satu `QueryClient`:
  - `staleTime: 30_000` (data dianggap segar 30 detik);
  - `retry` kustom: **tidak retry** untuk `ApiError` status < 500 (4xx bukan masalah sementara), maksimum 2 retry lainnya;
  - `refetchOnWindowFocus: false`.
- Kunci query yang dipakai: `["cart"]`, `["products", {stall_id, q}]`, `["products", id]`, `["stalls"]`, `["orders"]`, `["orders", id]`, `["orders","preview",items]`, `["seller","stalls"]`, `["seller","products", stallId|"all"]`, `["seller","orders"]`, `["admin","stalls", status|"all"]`, `["me"]`, `["sessions"]`.
- **`useQuery`** untuk baca (katalog memakai **`useInfiniteQuery`** dengan `getNextPageParam: lastPage.next_cursor`); **`useMutation`** untuk tulis, dengan pola konsisten: sukses â†’ `setQueryData` (tulis cache dengan respons) **dan/atau** `invalidateQueries` keluarga kunci. Contoh `use-cart.ts`: mutation kuantitas sukses â†’ `setQueryData(["cart"], cart)` + invalidate `["cart"]` dan `["products"]`.
- Contoh alur tombol tambah-ke-keranjang (`products/[id]/page.tsx` `handleAdd`): hitung `inCart + quantity` â†’ `useSetCartQuantity().mutate({productId, quantity})` â†’ `PUT /cart/items/:productId` â†’ respons cart baru ditulis ke cache â†’ badge/cart-bar otomatis ikut karena komponen lain membaca query `["cart"]`.

**Jika React Query tidak ada:** harus menulis manual loading/error state, dedup request, cache invalidation, dan pagination di setiap halaman â€” persis daftar masalah yang disebut dokumentasi TanStack.

## 9.6 Zod â€” validasi skema

**Apa itu (dikutip docs resmi, zod.dev):** *"Zod is a TypeScript-first validation library. Using Zod, you can define schemas you can use to validate data, from a simple string to a complex nested object."* `schema.safeParse(data)` mengembalikan sukses dengan data bertipe, atau daftar `issues` â€” tanpa melempar exception.

**Skema aktual di Project Cyber:**

| File | Skema |
|---|---|
| `login-form.tsx:13â€“16` | `z.object({ email: z.email("Format email tidak valid."), password: z.string().min(1, "Password wajib diisi.") })` |
| `register-form.tsx:37â€“49` | username 3â€“30 + regex `^[a-z0-9][a-z0-9._]{1,28}[a-z0-9]$`; email; password 10â€“128; `z.enum(["buyer","seller"])` |
| `stall-form.tsx:13â€“20` | name 3â€“80, description â‰¤500, location â‰¤120 |
| `product-form.tsx:16â€“28` | name 3â€“100; `price_rupiah` number 0..1e8 (dikonversi `Math.round(x*100)` ke minor); availability enum; stall_id (create) |

Pola: `safeParse` gagal â†’ `issuesToFieldErrors` â†’ tampilkan per-field; **request API tidak dikirim** bila validasi klien gagal. Validasi klien hanyalah kenyamanan; validasi otoritatif tetap di service Go (422 + `fields` juga dipetakan ke UI).

## 9.7 Halaman-halaman utama

| Halaman | File | Sumber data & alur |
|---|---|---|
| Katalog | `(app)/catalog/page.tsx` | `useInfiniteQuery(["products", {stall_id,q}])` â†’ `GET /products`; `SearchBox` debounce 300 ms; `StallFilter` query `["stalls"]` (staleTime 5 menit); grid `ProductCard`; "Muat lagi" saat `hasNextPage`; `<CartBar/>` |
| Detail produk | `products/[id]/page.tsx` | `useQuery(["products", id])` â†’ `GET /products/:id`; stepper lokal 1â€“99; `handleAdd` â†’ mutation cart |
| Keranjang | `cart/page.tsx` | `useCart({enabled:isBuyer})`; `groupByStall` (Map per stan); `hasUnavailable` memblokir checkout; tombol â†’ `/checkout` |
| Checkout | `checkout/page.tsx` + `checkout-summary.tsx` | `useQuery(["orders","preview",items])` â†’ `POST /orders/preview`; `idempotencyKeyRef` di-reset saat signature items berubah; konfirmasi â†’ `createOrder(items,"cash",crypto.randomUUID())` â†’ `POST /orders` (header `Idempotency-Key`) â†’ invalidate `["cart"]`,`["orders"]` â†’ push `/orders/:id`; radio QRIS `disabled` |
| Pesanan buyer | `orders/page.tsx` + `order-list.tsx` | `useInfiniteQuery(["orders"])` â†’ `GET /orders`; kartu: `public_code` mono, status badge, "X dari Y stan lunas" |
| Detail pesanan | `orders/[id]/page.tsx` + `order-detail.tsx` | `GET /orders/:id`; kode besar "Tunjukkan kode pesanan ini di kasir stan"; per stan: payment + fulfillment; kotak warning `cash_due` |
| Stan seller | `seller/stall/page.tsx` + `stall-form.tsx` | `GET /seller/stalls`; form Zod; mutation create/update; banner "stan baru butuh approval admin" |
| Produk seller | `seller/products/*` + `product-form.tsx`, `product-list.tsx`, `product-image-input.tsx` | CRUD + dialog arsip + dialog upload (2 MB, PNG/JPEG, preview object URL dengan `revokeObjectURL`) |
| Antrean seller | `seller/orders/page.tsx` + `order-queue.tsx`, `cash-confirm-dialog.tsx`, `fulfillment-controls.tsx` | `useInfiniteQuery(["seller","orders"])`; antrean bernomor untuk order aktif; tombol tunai hanya bila `method==="cash" && status==="cash_due"`; **checkbox wajib** "Uang tunai ... sudah saya terima secara fisik" sebelum tombol "Ya, uang diterima" aktif; `NEXT_STATUS` machine untuk pemenuhan |
| Admin | `admin/page.tsx` + `pending-stalls.tsx` | `useQuery(["admin","stalls",status])`; satu mutation dispatch ke approve/reject/deactivate/activate dengan dialog konfirmasi |
| Settings | `settings/page.tsx` | Tablist aksesibel (Profil/Foto/Sesi/Tampilan); `profile-form` sinkron zustand `setUser`; `sessions-list` + revoke; `theme-section` menyimpan preferensi ke server |

## 9.8 Tema & aksen (custom, bukan next-themes)

`lib/theme/theme-provider.tsx`: context React sendiri; kunci `kantin.theme`/`kantin.accent`; `applyTheme` menulis `dataset.theme/.accent` pada `<html>` (CSS variabel berdasarkan data-attribute). `ThemeSync` (dipanggil AppShell) dan `AccentPicker`/`ThemeSection` menambahkan **persistensi server** `PATCH /me {preferences:{theme_mode, accent}}` ketika login (error di-swallow); sebelum login hanya localStorage.

## 9.9 Loading / error / empty

Primitif `components/ui/feedback.tsx`: `FullPageLoader`, `Skeleton`, `EmptyState`, `ErrorState` (role="alert" + tombol "Coba lagi"). Konvensi semua fitur: pesan error Indonesia dari `ApiError.fields`/`message`, blok `role="alert"`, status `aria-live`.

---

<a name="bagian-10"></a>
# BAGIAN 10 â€” PENJELASAN MOBILE

**Aplikasi mobile TIDAK DITEMUKAN.** Tidak ada folder mobile, tidak ada `react-native`/`expo`/`flutter`/capacitor di dependency (`apps/web/package.json` hanya Next/React), dan PRD/README hanya menyebut website. Karena itu tidak ada SecureStore, navigasi mobile, atau API client mobile untuk dijelaskan.

Perbedaan penting yang perlu diketahui bila kelak dibuat: mekanisme token Project Cyber saat ini **bergantung pada cookie first-party lewat proxy Next.js** (`/api/v1/*` di-rewrite ke :8080). Aplikasi mobile tidak punya proxy itu, sehingga harus memanggil API Go langsung, mengelola sendiri penyimpanan refresh token (contoh: SecureStore/Keychain), mengirim header `Authorization` per request, dan tetap menyertakan `X-CSRF-Token` untuk `/auth/refresh` + `Idempotency-Key` untuk order â€” backend sudah menyediakan semua itu lewat header/cookie standar. Status: **rekomendasi desain, bukan implementasi**.

---

<a name="bagian-11"></a>
# BAGIAN 11 â€” INTEGRASI LAYANAN EKSTERNAL

## 11.1 PostgreSQL 16 (Docker Desktop + WSL)
- **Mengapa:** penyimpanan relasional utama; dijalankan lokal via `infra/compose.yaml` + volume persisten.
- **Konfigurasi:** `DATABASE_URL` (default `postgres://kantin:kantin@localhost:5432/kantin?sslmode=disable`).
- **Kode akses:** `platform/db/db.go` (`Open`, pool 10/5/30m, ping 60 detik), semua repository.
- **Data:** semua query terparameter.
- **Kegagalan:** startup menunggu maks 60 detik lalu exit(1); query gagal â†’ 500 dengan request_id.
- **Dampak tidak tersedia:** aplikasi backend tidak bisa start; API melayani 500 untuk semua endpoint ber-DB.

## 11.2 Mailjet API v3.1 (email OTP)
- **Mengapa:** kirim OTP registrasi/login tanpa SMTP server sendiri.
- **Konfigurasi:** `MAILJET_API_KEY`, `MAILJET_SECRET_KEY`, `MAIL_FROM_EMAIL`, `MAIL_FROM_NAME` â€” **wajib di production** (startup gagal bila kosong); di development digantikan `DevMailer` (OTP ke log).
- **Kode:** `platform/mailer/mailjet.go` â€” POST `https://api.mailjet.com/v3.1/send`, Basic auth, timeout 10 detik; sukses mensyaratkan status 200 + `Messages[0].To` + `Status=="success"`.
- **Data dikirim:** alamat penerima + kode OTP (didekripsi worker dari outbox).
- **Kegagalan:** retry outbox eksponensial 30sÃ—2^n maks 5 percobaan â†’ `failed`; challenge kedaluwarsa membuat baris outbox dihapus (kode basi tak pernah dikirim).
- **Dampak tidak tersedia:** OTP tidak terkirim â†’ registrasi/login tidak dapat diselesaikan (login gagal pada tahap OTP).

## 11.3 Supabase Storage (foto)
- **Mengapa:** menyimpan foto profil/produk tanpa kelola file server.
- **Konfigurasi:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server-only), `SUPABASE_STORAGE_BUCKET` (default `kantin-media`), `SIGNED_URL_TTL` 15 menit.
- **Kode:** `platform/storage/supabase.go` â€” REST murni: `POST /storage/v1/object/{bucket}/{key}` (upload, `x-upsert:true`), `DELETE ...` (hapus), `POST /storage/v1/object/sign/{bucket}/{key}` (signed URL). Tidak ada SDK.
- **Data:** file **WebP hasil konversi server** (`imaging.ToWebP`, hanya menerima PNG/JPEG asal, dimensi 32â€“4000 px).
- **Kegagalan:** jika env kosong â†’ `storage.Disabled{}` â†’ upload foto â†’ **503** dengan pesan jelas; aplikasi lain tetap jalan. Kegagalan hapus objek lama sifatnya best-effort.
- **Dampak tidak tersedia:** fitur foto nonaktif; katalog/order tetap berjalan.

## 11.4 Docker (compose) & GitHub Actions
- `infra/compose.yaml`: PostgreSQL 16 lokal; `make up/down/ps/logs`.
- `.github/workflows/ci.yml`: tiga job â€” `api` (service container postgres:16-alpine; vet; migrasi up, lalu down 1 + up; `go test ./... -count=1`; build), `web` (npm ci; lint; typecheck; test; build), `security` (gitleaks; `npm audit --audit-level=high`).

---

<a name="bagian-12"></a>
# BAGIAN 12 â€” SIMULASI SKENARIO NYATA

> Semua skenario berikut adalah **simulasi berdasarkan source code**, bukan hasil pengujian runtime (lihat Bagian 13 & `docs/ACCEPTANCE.md`).

## Skenario A: User login berhasil
- **Aktor:** buyer terdaftar & verified.
- **Urutan:** klik "Masuk" â†’ `LoginForm onSubmit` â†’ Zod ok â†’ `authApi.login` â†’ `POST /api/v1/auth/login`.
- **Backend:** `handleAuthLogin` â†’ `auth.Login` â†’ `UserByEmail` ditemukan â†’ `VerifyPassword` ok â†’ status `active` â†’ ClearFailures â†’ TX (supersede, insert challenge dengan pre_auth_hash, enqueue outbox) â†’ worker mengirim OTP (dev: ke log).
- **Respons:** 200 `{status:"otp_required", pre_auth_token}` â†’ redirect `/verify?mode=login&pre_auth_token=...&email=...`.
- **OTP:** user membaca email â†’ `OtpForm` â†’ `authApi.verifyLogin` â†’ `POST /api/v1/auth/login/verify` â†’ `VerifyLogin`: OTP cocok â†’ ConsumeTx â†’ `Sessions.CreateTx` â†’ `SignAccess`.
- **Respons:** 200 + `Set-Cookie kk_rt (HttpOnly), kk_csrf` + `{access_token, expires_in, user}` â†’ `useAuthStore.getState().signIn(tokens)` â†’ `router.replace(homePathForRole("buyer"))` = `/catalog`.
- **Data DB berubah:** `otp_challenges.consumed_at`, baris `login_sessions` baru, `auth_throttles.failure_count` direset.
- **Output gagal:** lihat Skenario B.

## Skenario B: User login gagal
Kondisi penolakan dan responsnya (semua dari kode aktual):

| Kondisi | Lokasi | Respons |
|---|---|---|
| Zod gagal (email format, password kosong) | `login-form.tsx` | Tidak ada request; error per field |
| Email tak terdaftar | `auth/service.go` Login | **401** generik (setelah DummyVerify) |
| Password salah (count kelipatan 5) | `recordPasswordFailure` | **429** + `Retry-After` (lock 3/15 menit) |
| Password salah (biasa) | Login | **401** "Email atau password salah" |
| Akun suspended | Login | **401** generik (tanpa mengungkap suspensi) |
| pre_auth invalid/kedaluwarsa (5 menit) | `VerifyLogin` | **401** "Verifikasi login kedaluwarsa..." |
| OTP salah (attempt < 5) | `VerifyLogin` | **400** OTP_INVALID_OR_EXPIRED |
| OTP salah ke-5 dalam ronde | `recordOTPFailure` | **429** (lock 5â€“15 menit sesuai ronde) |
| Rate limiter | `server.go s.rate` | **429** RATE_LIMITED, Retry-After 10 |

## Skenario C: Access token kedaluwarsa
1. Access token TTL 10 menit lewat; JWT `exp` melewati leeway 30 detik â†’ `jwt.Verify` gagal `ErrExpired` â†’ middleware **401**.
2. Frontend `client.ts` menangkap 401 â†’ `refreshSession()` (`POST /auth/refresh` membawa cookie `kk_rt` + header CSRF).
3. Backend `Rotate`: hash cocok, belum revoked, belum expired â†’ token refresh baru (`previous_refresh_token_hash` = lama), access token baru.
4. Request asli diulang sekali dengan Bearer baru â†’ sukses transparan bagi user.
5. Jika refresh gagal (sesi revoked/expired/reuse) â†’ cookie dibersihkan server (`clearAuthCookies`), `notifySessionLost` â†’ `markAnonymous` â†’ guard â†’ `/login?next=...`.

## Skenario D: User tanpa role seller mencoba membuat produk
1. Request `POST /api/v1/seller/stalls/{id}/products` dengan token buyer.
2. `s.role("seller", ...)` (`middleware.go:82â€“95`): `authenticate` sukses (JWT+sesi valid), lalu `if ac.Role != "seller"` â†’ **403 FORBIDDEN** "Anda tidak memiliki izin untuk aksi ini."
3. Handler tidak pernah dijalankan; tidak ada query bisnis.
4. UI: guard `RequireRole roles={["seller"]}` sudah mengalihkan seller-page sebelum fetch; admin page serupa. Test integrasi `TestUnauthenticatedAndRoleGuards` & `TestNegativeAuthorizationMatrix` mencakup kasus ini di level kode.
5. Catatan: untuk aksi lintas-seller pada resource, backend memilih **404** (bukan 403) agar tidak membocorkan keberadaan resource (`authz` anti-leak).

## Skenario E: Checkout berhasil
1. Buyer di `/checkout`; cart items â†’ `useQuery(["orders","preview",items])` â†’ `POST /orders/preview` â†’ `Preview` = `loadAndValidate(lock=false)` â†’ ringkasan harga server tampil.
2. Klik "Konfirmasi pesanan": `paymentMethod="cash"`; `idempotencyKeyRef` (dibuat `crypto.randomUUID()` sekali per kombinasi item).
3. `POST /orders` + header `Idempotency-Key` + body `{payment_method:"cash", items:[{product_id, quantity}]}`.
4. Backend: pre-check idempotensi â†’ TX:
   - `loadAndValidate(lock=true)` dengan `FOR UPDATE OF products` (harga & ketersediaan terkini);
   - INSERT `orders` (`awaiting_payment`, public_code 6 char dengan retry â‰¤5);
   - INSERT `order_items` (snapshot nama+harga);
   - INSERT `payments` per stan (`cash_due`, amount=subtotal stan);
   - INSERT `order_stall_fulfillments` per stan (`pending`);
   - audit `order_create`; COMMIT.
5. Respons **201** detail order â†’ frontend invalidate `["cart"]`,`["orders"]` â†’ push `/orders/{id}` â†’ buyer melihat `public_code` + instruksi "Bayar tunai di kasir stan X sebesar Y".
6. Seller di `/seller/orders` membuka `CashConfirmDialog` â†’ centang pernyataan uang diterima â†’ `confirmCash(paymentId)` â†’ `POST /seller/payments/{id}/confirm-cash` â†’ status `cash_paid`, `payment_events`, `RecalculateStatusTx` â†’ order `awaiting_payment â†’ confirmed`.
7. Seller majukan pemenuhan (pendingâ†’in_preparationâ†’ready_for_pickupâ†’completed); ketika semua payment lunas dan semua fulfillment `completed`, `DeriveOrderStatus` â†’ order `completed`; buyer melihat status baru setelah refetch/invalidate.

## Skenario F: Checkout gagal
| Penyebab | Deteksi | Respons/akibat |
|---|---|---|
| Stok/ketersediaan habis | `loadAndValidate`: produk archived/unavailable/stan inactive | **422** "Ada produk yang tidak tersedia; perbarui keranjang Anda"; UI menampilkan `fields` di alert |
| Produk tidak ditemukan | id tidak ada di IN-query | termasuk "tidak tersedia" (422) |
| Keranjang kosong / >50 item / duplikat | awal `loadAndValidate` | **422** dengan pesan spesifik |
| QRIS dipilih (flag off) | `Create` sebelum transaksi | **503** RESOURCE_UNAVAILABLE; tidak ada baris DB |
| Idempotency-Key sama, payload beda | pre-check + UNIQUE constraint | **409** IDEMPOTENCY_CONFLICT |
| Idempotency-Key hilang | handler | **400** fields.idempotency_key |
| Transaksi gagal (error DB di tengah) | `WithTx` rollback | seluruh order+items+payments+fulfillments batal atomik; klien mendapat 500 |
| Konfirmasi tunai ganda oleh dua seller aktor berbeda | UPDATE optimistik `WHERE status='cash_due'` | satu sukses, satu **409 PAYMENT_STATE_CONFLICT** |

## Skenario G: Database tidak tersedia
1. **Saat startup:** `db.Open` ping loop 60 detik â†’ gagal â†’ log "database tidak tersedia" + `os.Exit(1)`. Server tidak jalan sama sekali (fail-fast).
2. **Saat runtime:** query error â†’ repository mengembalikan error â†’ `writeDomainError` default â†’ **500 INTERNAL_ERROR** dengan `meta.request_id` (dicatat access log). Transaksi terbuka di-rollback oleh `WithTx`.
3. **Pool habis:** query menunggu koneksi dari pool (maks 10); request lambat menumpuk hingga `WriteTimeout` 60 detik.
4. Outbox worker: query gagal â†’ dicatat, ticker 5 detik mencoba lagi (tidak crash).
5. Frontend: 500 â†’ `ApiError` status â‰¥500 â†’ react-query boleh retry maks 2 â†’ `ErrorState` "Coba lagi".

---

<a name="bagian-13"></a>
# BAGIAN 13 â€” TESTING DAN QUALITY GATE

## 13.1 Inventaris test

| Jenis | Lokasi | Isi |
|---|---|---|
| Unit Go | `internal/platform/crypto/crypto_test.go`, `platform/jwt/jwt_test.go`, `platform/validate/validate_test.go`, `internal/orders/status_test.go` | Kriptografi, JWT verify (alg/exp), validator, mesin status |
| Integration Go | `tests/integration/api_test.go` (+abuse, authz_negative, sessions_rotation) | Harness nyata: PostgreSQL test + `httptest.Server`; helper `seedUser`, `loginThroughOTP`; mailer test menangkap OTP |
| Unit FE (Vitest) | `src/lib/api/client.test.ts` (6 kasus), `src/lib/format.test.ts` | Envelope unwrap, ApiError, header Bearer+CSRF, silent refresh retry, session-lost, public request tanpa refresh; formatIDR/label/waktu |
| E2E (Playwright) | `src/e2e/auth.spec.ts`, `cart-checkout-cash.spec.ts`, `photo-upload.spec.ts`, `sessions-revoke.spec.ts` | Registerâ†’OTPâ†’loginâ†’/catalog; checkout tunai lintas dua context; upload foto invalid+valid (ekspektasi 503 tanpa Supabase); cabut semua sesi lalu refresh â†’ 401 |

## 13.2 Tabel pemeriksaan (CI `.github/workflows/ci.yml`)

| Pemeriksaan | Lokasi | Apa yang diuji | Hasil terakhir | Bukti |
|---|---|---|---|---|
| `go vet ./...` | job api | masalah statis Go | BELUM DIVERIFIKASI (lokal tidak dieksekusi selama audit ini) | definisi CI baris 36 |
| Migrasi up & down/up | job api | 0001â€“0009 valid bolak-balik | BELUM DIVERIFIKASI | CI baris 39â€“48 |
| `go test ./... -count=1` | job api | unit + integration (butuh `KANTIN_TEST_DATABASE_URL`) | BELUM DIVERIFIKASI | CI baris 49â€“50 |
| `go build ./cmd/api ./cmd/seed` | job api | biner terkompilasi | BELUM DIVERIFIKASI | CI baris 51â€“52 |
| `npm run lint` | job web | ESLint next/core-web-vitals + TS | BELUM DIVERIFIKASI | CI baris 67 |
| `npm run typecheck` | job web | `tsc --noEmit` strict | BELUM DIVERIFIKASI | CI baris 68 |
| `npm run test` (Vitest) | job web | unit FE | BELUM DIVERIFIKASI | CI baris 69 |
| `npm run build` | job web | build produksi Next | BELUM DIVERIFIKASI | CI baris 70 |
| gitleaks | job security | kebocoran secret di riwayat git | BELUM DIVERIFIKASI | CI baris 78â€“81 |
| `npm audit --audit-level=high` | job security | kerentanan dependency FE | BELUM DIVERIFIKASI | CI baris 82â€“84 |
| Playwright E2E | tidak dijalankan CI (lokal: `npm run e2e`) | alur nyata browser | BELUM DIVERIFIKASI | `playwright.config.ts`; tidak ada step e2e di ci.yml |

Catatan jujur: selama audit ini **tidak ada test yang dijalankan** (read-only). `apps/web/test-results/.last-run.json` ada tetapi tidak dijadikan bukti keberhasilan. Kesimpulan status: semua gate **terdefinisi**, hasil eksekusi terkini **belum terbukti**.

## 13.3 Kualitas desain test yang menonjol
- Integration test memakai database sungguhan + server HTTP sungguhan (bukan mock layer bisnis), TTL dipendekkan (resend cooldown 1 detik) agar cepat.
- `abuse_test.go` menguji **konkurensi**: OTP paralel tidak bisa melewati ambang 5 (`TestConcurrentOTPAttemptsCannotBypassLimit`), resend tidak menghapus lock, counter password lintas request.
- `authz_negative_test.go` adalah matriks negatif (403/404/409) antar role.
- E2E menguji dua browser context bersamaan (buyer & seller) untuk alur tunai.

---

<a name="bagian-14"></a>
# BAGIAN 14 â€” KEKURANGAN, BUG, DAN PEKERJAAN TERTUNDA

Semua temuan berikut hanya dijelaskan, **tidak diperbaiki**.

| # | Masalah | Lokasi | Bukti | Dampak | Prioritas | Saran |
|---|---|---|---|---|---|---|
| 1 | **Reset password & ganti email tidak ada** | â€” | README baris 132; tidak ada endpoint/kode | User kehilangan akses permanen; operasional kampus terbebani | Tinggi | Rancang flow OTP reset + kebijakan sesi terkait |
| 2 | **17 acceptance criteria belum dijalankan** | `docs/ACCEPTANCE.md` | Semua baris "Belum dijalankan" | Klaim keandalan tidak bisa dibuat | Tinggi | Jalankan checklist per kriteria + catat bukti |
| 3 | **Drift dokumentasi di `generate_pdf.py`** | root | Menyebut `bcrypt`, cookie `kk_refresh`, kolom `users.name/phone`, status stan `rejected`, semua status "Terbukti Berjalan" â€” semua bertentangan dengan kode | Dokumen menyesatkan pembaca/penilai | Sedang | Perbarui atau hapus file; jadikan source code satu-satunya sumber |
| 4 | **`docs/API.md` tidak ada; `contracts/openapi.yaml` "dalam penyusunan"** | docs/, contracts/ | README M0; file memang tidak lengkap | Integrasi & onboarding terhambat; kontrak tidak bisa jadi acuan test | Sedang | Selesaikan OpenAPI dari tabel route Bagian 4B |
| 5 | **Rate limiter in-memory hilang saat restart & tidak dibagi antar instance** | `platform/httpx/ratelimit.go` | Token bucket di memori proses | Multi-instance = limit per instance; restart menghapus counter | Sedang | Lapisan pertama OK; lockout DB sudah durable â€” dokumentasikan batasnya |
| 6 | **Rate limiter reset map pada >100.000 kunci** | `ratelimit.go:43â€“46` | Map dibuang seluruhnya (kecuali kunci aktif) | Lonjakan traffic me-reset semua bucket | Rendahâ€“Sedang | Ganti dengan LRU/evaksi terukur |
| 7 | **Lockout wave-2 menyentuh scope email_ip â†’ NAT kampus terkunci kolektif** | `auth/service.go:493â€“515` | ApplyLock email_ip 15 menit | Satu penyerang di NAT bisa mengunci pengguna tak bersalah | Sedang (dicatat ACCEPTANCE Â§2) | Ambang gabungan + jalur dukungan (belum diputuskan pemilik) |
| 8 | **Tidak ada cara admin membuat akun admin selain seed** | `cmd/seed` | README baris 133 | Ketergantungan seed; keamanan seed kredensial default | Sedang | Provisioning admin via env/migrasi terkontrol |
| 9 | **Tidak ada monitoring/backup terjadwal/HTTPS** | infra | README batasan; ACCEPTANCE Â§2 | Risiko operasional produksi | Tinggi (pra-produksi) | Managed PG, backup+restore test, reverse proxy TLS |
| 10 | **CI tidak menjalankan Playwright** | `.github/workflows/ci.yml` | Tidak ada step e2e | Regresi alur kritis tidak tertangkap otomatis | Sedang | Job e2e dengan compose Postgres + log OTP |
| 11 | **`stalls.created_by` tanpa ON DELETE & `order_items.product_id` nullable** â€” by design, tetapi perlu kebijakan penghapusan user | migrations 0006/0008 | FK RESTRICT-like | Delete user gagal; retensi data belum diputuskan | Rendah | Kaitkan dengan keputusan retensi (ACCEPTANCE Â§2) |
| 12 | **Preview order mewajibkan role buyer walau tidak memakai buyer_id** | `handlers_orders.go:49â€“62` | route `role("buyer")` | Konsisten namun tidak intuitif; tidak ada bug | Info | Dokumentasikan |
| 13 | **Konfirmasi tunai lintas-stan: seller melihat payment 404** | `payments.ConfirmCash` | EXISTS check â†’ ErrNotFound | Perilaku anti-leak benar; perlu dipahami tim support | Info | Dokumentasikan di runbook |
| 14 | **QA keamanan independen belum ada** | â€” | README M8 | Klaim keamanan berbasis desain saja | Tinggi pra-rilis | Threat-model review + pentest ringan |
| 15 | **Coverage UI katalog/seller/admin "sedang diselesaikan"** (M5â€“M7) | README | Status milestone | Sebagian alur hanya backend terverifikasi | Sedang | Selesaikan UI + E2E per fitur |

## Fitur yang hanya tampak tersedia (belum terbukti bekerja)
- **QRIS**: ada method `qris_placeholder`, radio UI, kolom status `awaiting_external_confirmation` â€” tetapi **ditolak default** (503), tidak ada QR, tidak ada settlement. Jangan presentasikan sebagai pembayaran digital.
- **Foto**: pipeline lengkap (validasiâ†’WebPâ†’Supabaseâ†’signed URL) â€” **mati** tanpa env Supabase; E2E bahkan mengharapkan 503.
- **Email OTP**: Mailjet di production butuh kredensial; di dev OTP hanya di log.

---

<a name="bagian-15"></a>
# BAGIAN 15 â€” KESIMPULAN DAN MATERI BELAJAR

## 15.A Ringkasan Project Cyber

Project Cyber adalah **marketplace kantin kampus** berbasis web dengan backend Go "kosong framework" (net/http + pgx + PostgreSQL) dan frontend Next.js 16 (React 19). Identitas diverifikasi OTP email; login dua langkah (password + OTP). Sesi memakai access token JWT 10 menit di memori browser + refresh token hash di cookie HttpOnly dengan **rotasi dan deteksi reuse**. Marketplace menyediakan stan (dengan approval admin), produk (arsip, bukan hapus), keranjang, order **idempotent** dengan snapshot harga, pembayaran **tunai** yang dikonfirmasi seller, dan status pemenuhan per stan yang menurunkan status order secara otomatis. Email dikirim lewat pola **transactional outbox** (worker + retry), foto lewat Supabase Storage dengan konversi WebP. Keamanan berlapis: Argon2id, lockout bergelombang, rate limit, CSRF double-submit, audit log append-only. Status proyek: **pilot lokal/dev** â€” semua fitur ada di kode, tetapi acceptance criteria belum dijalankan.

## 15.B Peta hubungan seluruh sistem

```mermaid
flowchart LR
    subgraph Browser
        ZU[Zustand auth store] --- RQ[React Query]
        RQ --- AC[API client client.ts]
        AC --- TS[token-store memori]
    end
    Browser -->|:3000 rewrite /api/v1| NX[Next.js]
    NX -->|:8080| MW[Middleware chain]
    MW --> H1[Auth handlers] --> S1[auth service] --> R1[auth repo] --> PG[(PostgreSQL)]
    MW --> H2[Users/Catalog/Orders handlers] --> S2[domain services] --> R2[repos] --> PG
    S1 --> OB[email_outbox] --> WK[worker goroutine] --> MJ[Mailjet]
    S2 --> IMG[imaging ToWebP] --> SB[Supabase Storage]
    PG -.-> MIG[0001-0009 migrations]
    CI[GitHub Actions] -.->|vet, migrate, test, build, lint, typecheck, gitleaks| CIQ[Quality gates]
```

## 15.C Daftar function penting

| Function | File | Fungsi | Input â†’ Output | Dipanggil oleh |
|---|---|---|---|---|
| `main()` | `cmd/api/main.go` | Bootstrap seluruh aplikasi | env â†’ server hidup | OS |
| `Routes()` | `internal/http/server.go` | Daftarkan semua route + middleware | â€” â†’ ServeMux | main |
| `authenticate()` | `internal/http/middleware.go:41` | JWT + sesi DB â†’ identitas | Request â†’ authCtx | authed/role |
| `writeDomainError()` | `middleware.go:144` | Error domain â†’ HTTP | error â†’ JSON error | semua handler |
| `auth.Register/VerifyRegistration/Login/VerifyLogin/ResendOTP` | `internal/auth/service.go` | Siklus akun & OTP | input â†’ error/sukses | handlers_auth |
| `sessions.CreateTx/Rotate/Access/RevokeOther/RevokeCurrent/List` | `internal/sessions/service.go` | Siklus sesi & rotasi | token hash â†’ Rotation/View | auth service, middleware, handlers |
| `orders.Preview/Create/loadAndValidate/hashRequest/RecalculateStatusTx` | `internal/orders/service.go` | Harga server, order idempotent, status | ItemIn â†’ Detail | handlers, payments |
| `DeriveOrderStatus()` | `internal/orders/status.go:9` | Mesin status order | status[] â†’ status | RecalculateStatusTx |
| `payments.ConfirmCash/UpdateFulfillment` | `internal/payments/service.go` | Tunai & pemenuhan | id â†’ Result | handlers seller |
| `stalls.Create/AdminTransition` | `internal/stalls/service.go` | Stan + approval | input â†’ stall | handlers |
| `catalog.Create/Update/Archive/ListPublic/UploadImage` | `internal/catalog/service.go` | Produk & katalog | input â†’ product | handlers |
| `cart.SetQuantity/Get` | `internal/cart/service.go` | Keranjang | productId,qty â†’ cart | handlers |
| `users.Update/UploadPhoto/DeletePhoto` | `internal/users/service.go` | Profil & foto | input â†’ profile | handlers |
| `outbox.Worker.Run` | `internal/outbox/outbox.go` | Kirim email retry | â€” | goroutine main |
| `jwt.Sign/Verify` | `platform/jwt/jwt.go` | Token access | claims â†’ JWT | auth, middleware |
| `crypto.HashPassword/VerifyPassword/DummyVerify` | `platform/crypto/password.go` | Argon2id | password â†’ PHC | auth |
| `apiRequest()` | `apps/web/src/lib/api/client.ts` | fetch+CSRF+refresh | path â†’ data/ApiError | semua feature api.ts |
| `useAuthStore` | `features/auth/auth-store.ts` | state auth zustand | aksi â†’ state | guards, header, forms |
| `bootstrap()/signIn()/signOut()/markAnonymous()` | auth-store | siklus sesi klien | â€” | guards/client |

## 15.D Kamus istilah

| Istilah | Arti sederhana | Di Project Cyber |
|---|---|---|
| Handler | Penerima request HTTP yang mengubahnya jadi respons | `internal/http/handlers_*.go` |
| Middleware | "Pintu berlapis" yang dilewati request sebelum handler | `httpx.Chain`, `authenticate`, `role` |
| Repository | Lapisan yang satu-satunya menulis/membaca SQL | `internal/*/repository.go` atau SQL di service |
| Service | Tempat aturan bisnis (validasi otoritatif, transaksi) | `internal/<domain>/service.go` |
| DTO | Cetak biru bentuk data request/response | `internal/http/dto.go`, `lib/api/types.ts` |
| JWT | Token bertanda tangan berisi klaim identitas | HS256, TTL 10 menit, klaim sub/sid/role |
| Refresh token | Token panjang untuk memperbarui access token | 32 byte, hash di `login_sessions`, cookie `kk_rt` |
| Token rotation / reuse detection | Token baru tiap refresh; pemakaian token lama = alarm pencurian | `previous_refresh_token_hash`, revoke family |
| HttpOnly / Secure / SameSite | Atribut cookie: tak terbaca JS / hanya HTTPS / batasi lintas situs | `setRefreshCookie` middleware.go |
| CSRF | Serangan memakai sesi korban dari situs lain; dibendung token ganda | cookie `kk_csrf` + header `X-CSRF-Token` |
| CORS | Aturan browser soal origin mana yang boleh memanggil API | `CORSMiddleware` allowlist |
| Idempotency | Request berulang tidak menghasilkan efek ganda | header `Idempotency-Key` + UNIQUE (buyer_id,idempotency_key) |
| Transaction | Sekumpulan query yang berhasil semua atau batal semua | `db.WithTx` |
| Connection pool | Kumpulan koneksi DB dipakai ulang | 10 open / 5 idle / 30 menit |
| Foreign Key | Jaminan relasi antar tabel di level DB | 0008 `orders.buyer_id REFERENCES users(id)` |
| Index | Struktur pencarian cepat di kolom | partial index, `(status, created_at DESC)` |
| Migration | File perubahan skema yang berurutan & reversibel | golang-migrate 0001â€“0009 up/down |
| Race condition | Dua proses balapan mengubah data sama | ditangani `FOR UPDATE`, UPDATE optimistik, `IncAttempt` atomik |
| Optimistic concurrency | UPDATE dengan syarat status lama; 0 baris = kalah balapan | `WHERE status='cash_due'` |
| Deadlock | Dua transaksi saling menunggu kunci | dimitigasi urutan kunci konsisten & transaksi pendek |
| Context | Pembawa batas waktu/pembatalan antar fungsi Go | `signal.NotifyContext`, worker |
| Interface | Kontrak method tanpa implementasi | `DBTX`, `mailer.Mailer`, `storage.Storage` |
| Dependency Injection | Memberikan dependensi dari luar, bukan dibuat di dalam | `Server{Cfg, Auth, Sessions, ...}` |
| Outbox pattern | Simpan "surat" di DB dalam transaksi yang sama, kirim belakangan | `email_outbox` + worker |
| Argon2id | Algoritma hashing password tahan brute force | 64 MiB, t=3, p=2 |
| HMAC / AES-GCM | Tanda tangan data / enkripsi terautentikasi | hash OTP; enkripsi OTP di outbox |
| Cursor pagination | Penunjuk posisi opaque, aman untuk data berubah | `httpx/cursor.go`, `next_cursor` |
| Zustand | State manager React ringan berbasis `create()` | auth store |
| React Query | Cache & sinkronisasi server state | QueryClient + query keys |
| Zod | Validasi skema TypeScript-first | safeParse di form |
| Vitest | Test runner berbasis Vite | unit test FE |
| Playwright | Framework E2E browser | 4 spec |

## 15.E Materi presentasi

- **Apa yang dibuat:** platform pemesanan kantin kampus (web) â€” katalog, keranjang, order, bayar tunai di kasir, verifikasi OTP email.
- **Mengapa dibuat:** mempermudah mahasiswa memesan tanpa antre panjang, memberi seller (stan) kanal digital, dan memberi kampus kontrol approval stan. Proyek juga latihan arsitektur production-grade (auth aman, idempotensi, outbox).
- **Cara kerja (3 kalimat):** Next.js menyajikan UI dan mem-proxy `/api/v1` ke API Go; API Go menjalankan middleware keamanan lalu service domain yang berinteraksi dengan PostgreSQL lewat SQL terparameter; email OTP dikirim asinkron lewat outbox worker, foto lewat Supabase.
- **Teknologi:** Go 1.23 (net/http, pgx), PostgreSQL 16 (Docker), Next.js 16/React 19, Tailwind 4, Zustand, TanStack Query, Zod, Vitest, Playwright, Mailjet, Supabase Storage, GitHub Actions.
- **Masalah yang ditemukan (selama pengembangan, dari desain):** enumerasi akun, brute force, replay refresh token, order ganda saat retry, harga berubah di tengah order, email gagal kirim â€” masing-masing dijawab mekanisme di Bagian 5/8.
- **Perbaikan yang terbukti dilakukan:** hati-hati â€” **tidak ada** klaim runtime terverifikasi; yang bisa dinyatakan: mekanisme-mekanismenya terimplementasi dan **ada test otomatis yang mengujinya di kode** (integration + E2E), dengan status eksekusi terakhir BELUM DIVERIFIKASI.
- **Pekerjaan tertunda:** reset password, acceptance testing 17 kriteria, OpenAPI lengkap, HTTPS/domain/backup/monitoring, review keamanan independen, E2E di CI, keputusan retensi/pembatalan (ACCEPTANCE Â§2).

## 15.F 20 pertanyaan pemahaman (jawab sendiri dulu)

1. Mengapa password benar saja tidak cukup untuk membuat sesi di Project Cyber?
2. Apa fungsi `pre_auth_token` dan berapa lama umurnya?
3. Jelaskan tiga lapisan pencegahan brute force pada login (rate limit, lockout, OTP rounds).
4. Bagaimana sistem mencegah seseorang menguji email mana yang terdaftar? Sebutkan dua mekanisme.
5. Di mana access token disimpan di browser, dan mengapa tidak di localStorage?
6. Apa yang terjadi ketika refresh token lama dipakai ulang setelah rotasi? Sebutkan tabel dan kolom yang terlibat.
7. Mengapa setiap request terproteksi tetap mengecek tabel `login_sessions` padahal JWT sudah diverifikasi?
8. Jelaskan perbedaan authentication dan authorization memakai middleware `authenticate` vs `role`.
9. Mengapa seller yang menyentuh resource seller lain menerima 404, bukan 403?
10. Bagaimana order menjamin tidak dobel saat klien retry? Sebutkan header, kolom unik, dan hash kanonik.
11. Mengapa harga pada `order_items` disimpan sebagai snapshot? Apa yang terjadi jika harga produk berubah setelah order dibuat?
12. Jelaskan bagaimana `DeriveOrderStatus` menentukan status `confirmed`, `in_preparation`, `ready_for_pickup`, `completed`.
13. Mengapa konfirmasi tunai memakai `UPDATE ... WHERE status='cash_due'` daripada membaca status lalu langsung UPDATE?
14. Apa pola transactional outbox dan mengapa OTP tidak dikirim langsung di dalam request?
15. Mengapa OTP disimpan sebagai HMAC dan terenkripsi di outbox, bukan plaintext?
16. Bagaimana arsitektur menangani kondisi Supabase Storage tidak dikonfigurasi?
17. Apa peran Zustand vs TanStack Query vs useState di frontend? Berikan contoh masing-masing dari kode.
18. Bagaimana `client.ts` menangani 401, dan apa batas percobaannya? Apa yang terjadi bila refresh gagal?
19. Sebutkan isi CI (`.github/workflows/ci.yml`) dan jelaskan mengapa E2E tidak termasuk di dalamnya.
20. Apa saja yang membuat proyek ini belum layak produksi? Sebutkan minimal lima poin beserta sumbernya di repo.

> Setelah kamu menjawab, jawabanmu bisa dikoreksi dengan merujuk kembali bagian-bagian dokumen ini (setiap pertanyaan punya jawaban pada Bagian 3â€“14).

---

## LAMPIRAN â€” Referensi eksternal yang dipakai

- TanStack Query â€” Overview (server state, caching, dedup): https://tanstack.com/query/latest/docs/framework/react/overview
- Zod â€” Introduction & features (TypeScript-first schema validation): https://zod.dev/
- Vitest â€” Getting Started (test runner powered by Vite, `vitest run`, jsdom): https://vitest.dev/guide/
- Zustand â€” repository resmi pmndrs/zustand (state management minimal): https://github.com/pmndrs/zustand (docs: https://zustand.docs.pmnd.rs)
- Playwright â€” resmi: https://playwright.dev/docs/intro

*Akhir dokumen.*


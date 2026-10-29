# Website Kantin Kampus

Marketplace sederhana untuk kantin kampus: mahasiswa dan warga kampus (**buyer**) mencari produk dari stan, menyusun keranjang, membuat pesanan, lalu membayar langsung kepada kasir. Penjual (**seller**) mengelola stan dan produk serta menandai pembayaran tunai setelah uang diterima. Verifikasi identitas memakai OTP email.

> **Status: build pilot lokal/dev, bukan deployment produksi.** PostgreSQL berjalan di Docker Desktop + WSL, belum ada HTTPS/domain produksi, secret manager, backup terjadwal, monitoring, atau review keamanan independen. Rincian pada `docs/OPERATIONS.md` dan `docs/SECURITY.md`.

## Arsitektur

```text
Browser
  └─ Next.js web (UI, route handling, form state)                 :3000
       └─ HTTPS JSON API ─ Go backend (auth, business rules, authz) :8080
            ├─ PostgreSQL (Docker Desktop + WSL pada local dev)    :5432
            ├─ Mailjet API (email OTP melalui backend/outbox)
            └─ Supabase Storage (foto profil/produk, akses terbatas)

GitHub: source, review, CI, issue, dan dokumentasi
```

- Prefix API: `/api/v1`. Pada dev, Next.js mem-proxy `/api/v1/*` ke API Go sehingga cookie tetap first-party.
- Tidak ada integrasi payment gateway. Pembayaran tunai dikonfirmasi seller; QRIS hanya placeholder yang ditolak secara default.

## Struktur repository

```text
.
├── apps/
│   └── web/                       # Next.js: app/, components/, features/, lib/, src/e2e/
├── services/
│   └── api/                       # Go backend
│       ├── cmd/api/               # Entry point API (port 8080)
│       ├── cmd/seed/              # Seed akun dan data demo (dev only)
│       ├── internal/              # auth, users, catalog, cart, orders, payments,
│       │                          # sessions, stalls, audit, outbox, platform/, http/
│       ├── migrations/            # 0001-0009 (up/down)
│       └── tests/integration/     # Test integrasi (butuh KANTIN_TEST_DATABASE_URL)
├── contracts/                     # Kontrak OpenAPI (dalam penyusunan)
├── infra/
│   └── compose.yaml               # PostgreSQL 16 lokal + volume persisten
├── docs/                          # Dokumentasi (lihat daftar di bawah)
├── .github/workflows/ci.yml       # CI: vet, migrasi, test, build, lint, typecheck, secret scan
├── Makefile                       # Orkestrasi lokal (butuh GNU Make)
├── .env.example                   # Nama variabel + placeholder kosong
├── PRD-Website-Kantin-Kampus.md   # Sumber kebutuhan produk
├── CONTRIBUTING.md
└── README.md
```

## Mulai cepat

Ringkas:

```powershell
Copy-Item .env.example .env          # isi nilai lokal
docker compose --env-file .env -f infra/compose.yaml up -d
migrate -path services/api/migrations -database "postgres://kantin:kantin@localhost:5432/kantin?sslmode=disable" up
cd services/api; go run ./cmd/seed; cd ../..
cd services/api; go run ./cmd/api     # terminal 1, port 8080
cd apps/web; npm install; npm run dev # terminal 2, port 3000
```

Panduan lengkap (prasyarat, WSL2, instalasi golang-migrate, database test, troubleshooting): **`docs/LOCAL_SETUP.md`**.

## Perintah

Semua target `Makefile` memiliki padanan PowerShell; tabel lengkap ada di `docs/LOCAL_SETUP.md` §9.

| Target Make | Ringkas PowerShell |
|---|---|
| `make up` | `docker compose --env-file .env -f infra/compose.yaml up -d` |
| `make down` | `docker compose --env-file .env -f infra/compose.yaml down` |
| `make ps` | `docker compose --env-file .env -f infra/compose.yaml ps` |
| `make logs` | `docker compose --env-file .env -f infra/compose.yaml logs -f postgres` |
| `make migrate-up` | `migrate -path services/api/migrations -database $env:DATABASE_URL up` |
| `make migrate-down` | `migrate -path services/api/migrations -database $env:DATABASE_URL down 1` |
| `make seed` | `cd services/api; go run ./cmd/seed` |
| `make dev-api` | `cd services/api; go run ./cmd/api` |
| `make dev-web` | `cd apps/web; npm run dev` |
| `make test-api` | `cd services/api; $env:KANTIN_TEST_DATABASE_URL = "postgres://kantin:kantin@localhost:5432/kantin_test?sslmode=disable"; go test ./... -count=1` |
| `make test-web` | `cd apps/web; npm run test` |
| `make typecheck` | `cd apps/web; npm run typecheck` |
| `make lint` | `cd services/api; go vet ./...` lalu `cd apps/web; npm run lint` |
| `make e2e` | `cd apps/web; npm run e2e` |
| `make build` | `cd services/api; go build ./cmd/api ./cmd/seed` lalu `cd apps/web; npm run build` |

## Akun demo

`cmd/seed` membuat dan mencetak kredensial demo ke stdout. Gunakan nilai yang tercetak di output seed, jangan menyalinnya ke dokumen.

| Peran | Email default | Catatan |
|---|---|---|
| Admin | `admin@kantin.local` | Hanya dibuat oleh seed; belum ada UI manajemen akun admin |
| Seller | `seller@kantin.local` | Stan pertama berstatus `active` |
| Seller kedua | `seller2@kantin.local` | Stan kedua berstatus `pending_review` (menunggu persetujuan admin) |
| Buyer | `buyer@kantin.local` | |

Alur login tetap membutuhkan OTP. Pada `APP_ENV=development`, kode OTP dicetak ke log API (`DEV MODE: kode OTP dicetak ke log`).

## Dokumentasi

| Berkas | Isi |
|---|---|
| [`docs/LOCAL_SETUP.md`](docs/LOCAL_SETUP.md) | Prasyarat, setup langkah demi langkah, database test, ekuivalensi PowerShell, troubleshooting |
| [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) | ERD, kolom per tabel, index, kamus status, perilaku retensi dan cleanup |
| [`docs/SECURITY.md`](docs/SECURITY.md) | Threat model, kontrol auth/token/CSRF/CORS/upload, batasan yang diketahui |
| [`docs/OPERATIONS.md`](docs/OPERATIONS.md) | Operasi lokal: compose, migrasi, seed, backup/restore, reset DB, Mailjet, Supabase, monitoring |
| [`docs/ACCEPTANCE.md`](docs/ACCEPTANCE.md) | 17 acceptance criteria PRD §18.1 (seluruhnya "Belum dijalankan") dan keputusan pra-produksi yang terbuka |
| [`docs/API.md`](docs/API.md) | Rujukan endpoint API (dalam penyusunan; bila belum ada, lihat daftar route di `services/api/internal/http/server.go`) |
| [`contracts/openapi.yaml`](contracts/openapi.yaml) | Kontrak OpenAPI (dalam penyusunan) |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Branch, commit, checklist PR, perintah verifikasi, ekspektasi migrasi |
| `PRD-Website-Kantin-Kampus.md` | Sumber kebutuhan produk dan keputusan yang masih terbuka |

## Status milestone

Snapshot per 28 Oktober 2026. Status "ada di kode" berarti implementasi tersedia di repository, **bukan** berarti sudah dijalankan dan lulus pengujian; `docs/ACCEPTANCE.md` masih kosong dari hasil uji.

| Milestone | Hasil | Status saat ini |
|---|---|---|
| M0 Kontrak | Kontrak OpenAPI dan daftar endpoint | Dalam penyusunan (`contracts/openapi.yaml` dan `docs/API.md` belum ada di checkout ini) |
| M1 Fondasi | Repository, Docker/WSL PostgreSQL, migrasi, konfigurasi, CI, logging dasar | Ada di kode (Compose, 9 migrasi, `.env.example`, workflow CI) |
| M2 Skema + platform | Skema database dan lapisan platform (config, db, logging, HTTP, JWT, kriptografi) | Ada di kode |
| M3 Auth | Registrasi OTP, login OTP, hashing, sesi, lockout, audit | Ada di kode (backend dan UI auth); belum diverifikasi terhadap acceptance criteria |
| M4 Profil/tema | Profil pengguna, foto profil, tema terang/gelap, lima aksen warna | Ada di kode (backend profil/foto dan UI tema); alur foto butuh Supabase |
| M5 Katalog + approval | Stan/produk, otorisasi seller, upload foto, persetujuan stan oleh admin | Backend ada di kode; UI katalog/seller/admin sedang diselesaikan |
| M6 Keranjang + order | Keranjang, preview, order idempotent, snapshot harga, riwayat | Backend ada di kode; UI keranjang/pesanan sedang diselesaikan |
| M7 Pembayaran tunai | Konfirmasi tunai seller, status pemenuhan per stan, QRIS placeholder | Backend ada di kode (QRIS ditolak secara default); UI seller sedang diselesaikan |
| M8 Hardening | Header keamanan, rate limit, lockout, audit, secret scan di CI | Sebagian; review keamanan independen, backup/restore terjadwal, domain/HTTPS, dan monitoring belum ada |

## Batasan yang perlu diketahui

- QRIS adalah placeholder: tidak ada QR, payment gateway, settlement, atau bukti pembayaran.
- Belum ada reset password maupun perubahan email.
- Manajemen akun admin belum ada; akun admin hanya dibuat oleh seed.
- PostgreSQL lokal bukan target produksi; belum ada HA, backup terjadwal, atau pemulihan insiden.
- Retensi data, kebijakan pembatalan, jam operasional, dan kontak dukungan belum ditetapkan pemilik proyek (lihat `docs/ACCEPTANCE.md` §2).

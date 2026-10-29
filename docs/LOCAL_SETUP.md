# Setup Lokal

Panduan ini memakai PowerShell di Windows, dengan Docker Desktop + WSL2. Target lingkungan pengembangan sesuai PRD §16. Rujukan: PRD §15 (konfigurasi dan rahasia), §16 (local setup), §17 (GitHub workflow).

> Build ini adalah pilot lokal/dev. Bukan deployment produksi (lihat `README.md` dan `docs/OPERATIONS.md`).

## 1. Prasyarat

| Kebutuhan | Versi / catatan |
|---|---|
| Docker Desktop dengan integrasi WSL2 | Wajib untuk menjalankan PostgreSQL 16 dari container (`infra/compose.yaml`) |
| Go | `go.mod` mensyaratkan Go 1.23; CI memakai Go 1.23 |
| Node.js | 20+ LTS; CI memakai Node 22 |
| npm | Menyertai Node.js; dependency web dikunci di `apps/web/package-lock.json` |
| golang-migrate CLI | v4.18.3. **Instalasi dari sumber wajib memakai tag driver postgres**: `go install -tags postgres github.com/golang-migrate/migrate/v4/cmd/migrate@v4.18.3` |
| Akun Mailjet (opsional di dev) | Tidak wajib: pada `APP_ENV` selain `production`, OTP dicetak ke log API |
| Proyek Supabase + bucket (opsional di dev) | Tidak wajib: tanpa konfigurasi, fitur foto dinonaktifkan (`503`) |

## 2. Salin konfigurasi

```powershell
Copy-Item .env.example .env
```

Isi `.env` sesuai kebutuhan lokal. Nilai yang perlu diisi untuk alur dasar:

| Variabel | Nilai lokal yang lazim | Catatan |
|---|---|---|
| `APP_ENV` | `development` | Selain `production`, OTP dicetak ke log |
| `HTTP_ADDR` | `:8080` | Port API |
| `WEB_BASE_URL` | `http://localhost:3000` | |
| `API_BASE_URL` | `http://localhost:8080` | Base URL untuk rewrite proxy Next.js |
| `NEXT_PUBLIC_TIME_ZONE` | `Asia/Jakarta` | Zona waktu tampilan (D20) |
| `NEXT_PUBLIC_CURRENCY` | `IDR` | Mata uang tampilan |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `kantin` / `kantin` / `kantin` | Kosongkan untuk memakai default Compose |
| `POSTGRES_PORT` | `5432` | Ubah bila port host bentrok |
| `DATABASE_URL` | `postgres://kantin:kantin@localhost:5432/kantin?sslmode=disable` | Wajib untuk migrasi dan API |
| `JWT_SIGNING_KEY` / `OTP_HASH_KEY` | boleh kosong di dev | Wajib bila `APP_ENV=production`; dev memakai kunci default yang tidak aman |
| `OTP_TTL`, `OTP_RESEND_COOLDOWN`, `OTP_MAX_ROUNDS` | default app: 5m, 60s, 3 | Nilai kebijakan final belum ditetapkan |
| `ACCESS_TOKEN_TTL`, `REFRESH_IDLE_TTL`, `REFRESH_ABSOLUTE_TTL` | default app: 10m, 168h, 720h | |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | Kosongkan bila memakai proxy first-party dari Next.js |
| `TRUSTED_PROXY_CIDRS` | kosong | Isi hanya bila API berada di belakang proxy tepercaya |
| `RATE_LIMIT_RPS`, `RATE_LIMIT_BURST` | default app: 5, 15 | |
| `MAX_UPLOAD_BYTES` | default app: 2 MiB | |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`, `SIGNED_URL_TTL` | kosong / `kantin-media` / `15m` | Wajib untuk fitur foto |
| `MAILJET_API_KEY`, `MAILJET_SECRET_KEY`, `MAIL_FROM_EMAIL`, `MAIL_FROM_NAME` | kosong | Wajib bila `APP_ENV=production` |
| `LOG_LEVEL`, `AUDIT_RETENTION_DAYS` | `info`, `30` | |
| `ALLOW_QRIS_PLACEHOLDER` | `false` | Hanya untuk demo terbatas |
| `KANTIN_TEST_DATABASE_URL` | kosong | Jangan diisi untuk menjalankan aplikasi |

Jangan pernah commit `.env`; file ini sudah tercakup `.gitignore`.

## 3. Jalankan PostgreSQL

```powershell
docker compose --env-file .env -f infra/compose.yaml up -d
docker compose --env-file .env -f infra/compose.yaml ps
```

Tunggu sampai healthcheck `pg_isready` menunjukkan `healthy`.

## 4. Terapkan migrasi

```powershell
$env:DATABASE_URL = "postgres://kantin:kantin@localhost:5432/kantin?sslmode=disable"
migrate -path services/api/migrations -database $env:DATABASE_URL up
```

Perintah rollback satu migrasi:

```powershell
migrate -path services/api/migrations -database $env:DATABASE_URL down 1
```

## 5. Isi data demo

```powershell
cd services/api
go run ./cmd/seed
cd ../..
```

Seed mencetak email dan password akun demo ke stdout. Ambil nilainya dari output seed tersebut (nilai dapat dioverride lewat `SEED_*`).

## 6. Jalankan API dan web

Dua terminal terpisah:

```powershell
# Terminal 1 - API Go (port 8080)
cd services/api
go run ./cmd/api
```

```powershell
# Terminal 2 - Next.js (port 3000)
cd apps/web
npm install
npm run dev
```

Akses web di `http://localhost:3000`. Health check API: `http://localhost:8080/healthz`.

Cara cepat membaca OTP saat dev: lihat log API, cari baris `DEV MODE: kode OTP dicetak ke log` (level `warn`) yang memuat field `otp`.

## 7. Akun demo

| Peran | Email default | Sumber password |
|---|---|---|
| Admin | `admin@kantin.local` | Printed oleh `cmd/seed` (dapat dioverride `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`) |
| Seller | `seller@kantin.local` | Printed oleh `cmd/seed` (`SEED_SELLER_EMAIL` / `SEED_SELLER_PASSWORD`) |
| Seller kedua | `seller2@kantin.local` | Printed oleh `cmd/seed` (`SEED_SELLER2_EMAIL`; password memakai `SEED_SELLER_PASSWORD`) |
| Buyer | `buyer@kantin.local` | Printed oleh `cmd/seed` (`SEED_BUYER_EMAIL` / `SEED_BUYER_PASSWORD`) |

Catatan:

- Email di atas adalah nilai default di dalam `cmd/seed`. Jangan menuliskan password demo di dokumen; rujuk output seed.
- Seed membuat stan pertama berstatus `active` dan stan kedua berstatus `pending_review` (menunggu persetujuan admin).
- `cmd/seed` menolak berjalan bila `APP_ENV=production`.
- Login tetap butuh OTP: gunakan kode dari log API pada `APP_ENV=development`.

## 8. Database pengujian integrasi

Tes integrasi memakai database terpisah `kantin_test` (variabel `KANTIN_TEST_DATABASE_URL`).

```powershell
# 1. Buat database test
docker compose --env-file .env -f infra/compose.yaml exec postgres psql -U kantin -d postgres -c "CREATE DATABASE kantin_test;"

# 2. Terapkan migrasi ke database test
$env:KANTIN_TEST_DATABASE_URL = "postgres://kantin:kantin@localhost:5432/kantin_test?sslmode=disable"
migrate -path services/api/migrations -database $env:KANTIN_TEST_DATABASE_URL up

# 3. Jalankan test API (variabel di langkah 2 masih aktif di sesi ini)
cd services/api
go test ./... -count=1
```

CI membuat database `kantin_test` lewat service PostgreSQL dan men-set variabel yang sama (lihat `.github/workflows/ci.yml`).

Test web:

```powershell
cd apps/web
npm run test
```

Test end-to-end (Playwright, butuh server web berjalan dan browser terpasang):

```powershell
cd apps/web
npx playwright install chromium
npm run e2e
```

## 9. Ekivalensi target Makefile di PowerShell

`Makefile` mengasumsikan GNU Make. Semua target memiliki padanan PowerShell berikut (dijalankan dari root repository):

| Target Make | Perintah PowerShell |
|---|---|
| `make help` | `Get-Content Makefile` |
| `make up` | `docker compose --env-file .env -f infra/compose.yaml up -d` |
| `make down` | `docker compose --env-file .env -f infra/compose.yaml down` |
| `make ps` | `docker compose --env-file .env -f infra/compose.yaml ps` |
| `make logs` | `docker compose --env-file .env -f infra/compose.yaml logs -f postgres` |
| `make migrate-up` | `$env:DATABASE_URL = "postgres://kantin:kantin@localhost:5432/kantin?sslmode=disable"; migrate -path services/api/migrations -database $env:DATABASE_URL up` |
| `make migrate-down` | `$env:DATABASE_URL = "postgres://kantin:kantin@localhost:5432/kantin?sslmode=disable"; migrate -path services/api/migrations -database $env:DATABASE_URL down 1` |
| `make seed` | `cd services/api; go run ./cmd/seed` |
| `make dev-api` | `cd services/api; go run ./cmd/api` |
| `make dev-web` | `cd apps/web; npm run dev` |
| `make test-api` | `cd services/api; $env:KANTIN_TEST_DATABASE_URL = "postgres://kantin:kantin@localhost:5432/kantin_test?sslmode=disable"; go test ./... -count=1` |
| `make test-web` | `cd apps/web; npm run test` |
| `make typecheck` | `cd apps/web; npm run typecheck` |
| `make lint` | `cd services/api; go vet ./...` lalu `cd apps/web; npm run lint` |
| `make e2e` | `cd apps/web; npm run e2e` |
| `make build` | `cd services/api; go build ./cmd/api ./cmd/seed` lalu `cd apps/web; npm run build` |

Catatan: variabel `DATABASE_URL` pada Makefile dibaca dari environment. Di PowerShell, set `$env:DATABASE_URL` lebih dulu bila memakai URL berbeda dari default.

## 10. Troubleshooting

| Gejala | Tindakan |
|---|---|
| `docker compose` gagal: `env file .env not found` | Buat `.env` dengan `Copy-Item .env.example .env` |
| Container PostgreSQL `unhealthy` | `docker compose --env-file .env -f infra/compose.yaml logs -f postgres`; periksa `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` |
| `migrate` gagal dengan `unknown driver "postgres"` | Instal ulang CLI dengan `-tags postgres` (bagian 1) |
| API keluar dengan `konfigurasi tidak valid` | Periksa `TRUSTED_PROXY_CIDRS` (format CIDR) dan `DATABASE_URL` |
| API keluar dengan `database tidak tersedia` | Pastikan container healthy dan `DATABASE_URL` cocok dengan `POSTGRES_*` |
| `bind: address already in use` pada port 8080 atau 3000 | Hentikan proses lama atau ubah `HTTP_ADDR` / jalankan `npm run dev -- -p 3001` |
| OTP tidak ditemukan di log | Pastikan `APP_ENV` bukan `production`; worker outbox memproses antrean setiap 5 detik |
| Upload foto `503 RESOURCE_UNAVAILABLE` | Isi `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY`, atau pastikan bucket `SUPABASE_STORAGE_BUCKET` ada |
| `npm run e2e` gagal karena browser belum ada | Jalankan `npx playwright install chromium` di `apps/web` |
| Halaman web complains CORS | Isi `CORS_ALLOWED_ORIGINS=http://localhost:3000`, atau akses lewat proxy first-party Next.js |

Catatan: Menghapus `.next` (`Remove-Item -Recurse -Force apps\web\.next`) kadang diperlukan bila `next dev` gagal start karena cache build lama.

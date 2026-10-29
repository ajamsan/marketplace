# Operasi Lokal

Dokumen ini mencakup operasi lingkungan pengembangan di satu mesin lokal dengan Docker Desktop + WSL2, PostgreSQL 16 di Compose, API Go di port 8080, dan Next.js di port 3000. Rujukan: PRD §13 (arsitektur), §15 (konfigurasi), §16 (local setup), §20 (risiko).

> **Belum siap produksi.** PostgreSQL lokal di Docker tidak punya HA, tidak ada backup terjadwal, tidak ada secret manager, tidak ada TLS/HTTPS di dalam aplikasi, dan tidak ada monitoring terpusat. Deployment produksi memerlukan hosting, database terkelola, domain, HTTPS, backup, observability, dan prosedur pemulihan insiden yang belum ditetapkan (PRD §13, §20).

## 1. Ringkasan perintah harian

```powershell
# Start / stop / status PostgreSQL
docker compose --env-file .env -f infra/compose.yaml up -d
docker compose --env-file .env -f infra/compose.yaml ps
docker compose --env-file .env -f infra/compose.yaml logs -f postgres
docker compose --env-file .env -f infra/compose.yaml down

# Migrasi
migrate -path services/api/migrations -database "postgres://kantin:kantin@localhost:5432/kantin?sslmode=disable" up
migrate -path services/api/migrations -database "postgres://kantin:kantin@localhost:5432/kantin?sslmode=disable" down 1

# Seed data demo (hanya dev)
cd services/api; go run ./cmd/seed

# API dan web
cd services/api; go run ./cmd/api
cd apps/web; npm run dev
```

Semua perintah di atas juga tersedia sebagai target `make` (lihat `Makefile` dan `docs/LOCAL_SETUP.md`).

## 2. PostgreSQL via Docker Compose

- Service: `postgres` dengan image `postgres:16-alpine`, nama container `kantin-postgres`, volume persisten `kantin_pgdata`, healthcheck `pg_isready`, dan `restart: unless-stopped`.
- Nilai default bila env kosong: user `kantin`, password `kantin`, database `kantin`, port host `5432` (lihat `infra/compose.yaml`).
- Connection string lokal default yang dipakai API: `postgres://kantin:kantin@localhost:5432/kantin?sslmode=disable`.
- Compose membaca `.env` melalui `--env-file .env`; tanpa file itu, nilai default di atas yang terpakai.

Perintah lain yang berguna:

```powershell
docker compose --env-file .env -f infra/compose.yaml exec postgres psql -U kantin -d kantin
docker compose --env-file .env -f infra/compose.yaml exec postgres psql -U kantin -d kantin -c "SELECT status, count(*) FROM orders GROUP BY status;"
```

## 3. Migrasi

- Tool: `golang-migrate` CLI. Instalasi dari sumber **wajib** memakai tag driver postgres:
  `go install -tags postgres github.com/golang-migrate/migrate/v4/cmd/migrate@v4.18.3` (versi yang sama dipakai CI).
- Semua migrasi berada di `services/api/migrations`, format `NNNN_nama.up.sql` dan `NNNN_nama.down.sql`, total 9 pasang (0001-0009).
- `up` menerapkan semua migrasi; `down 1` membatalkan satu migrasi terakhir.
- Migrasi divalidasi di CI dengan urutan up → down 1 → up pada database `kantin_test`.
- Bila migrasi gagal di tengah jalan, database ditandai *dirty*. Setelah memastikan kondisi tabel benar, paksa versi yang sesuai lalu ulangi:

```powershell
migrate -path services/api/migrations -database "postgres://kantin:kantin@localhost:5432/kantin?sslmode=disable" force 3
migrate -path services/api/migrations -database "postgres://kantin:kantin@localhost:5432/kantin?sslmode=disable" up
```

Versi target pada `force` harus disesuaikan dengan nomor migrasi yang gagal; tidak ada nilai default yang aman untuk ditetapkan di dokumen ini.

## 4. Seed data demo

```powershell
cd services/api
go run ./cmd/seed
```

- Seed idempoten: akun, stan, dan produk yang sudah ada dilewati.
- Seed menolak berjalan bila `APP_ENV=production`.
- Seed mencetak email dan password akun demo ke stdout. Gunakan nilai yang tercetak di output seed; jangan menyalinkan kredensial ke dokumen atau issue.
- Email akun demo dapat dioverride lewat `SEED_ADMIN_EMAIL`, `SEED_SELLER_EMAIL`, `SEED_SELLER2_EMAIL`, `SEED_BUYER_EMAIL`; password lewat `SEED_ADMIN_PASSWORD`, `SEED_SELLER_PASSWORD`, `SEED_BUYER_PASSWORD`. Password seller kedua memakai `SEED_SELLER_PASSWORD`.
- Seed membuat dua stan: satu berstatus `active` (seller pertama) dan satu berstatus `pending_review` (seller kedua) untuk memperagakan alur persetujuan admin.

## 5. Menjalankan API dan web

```powershell
# Terminal 1 - API (port 8080, default HTTP_ADDR=:8080)
cd services/api
go run ./cmd/api

# Terminal 2 - web (port 3000)
cd apps/web
npm run dev
```

- Health check API: `GET http://localhost:8080/healthz` → `{"data":{"status":"ok"},"meta":{"request_id":"..."}}`.
- Web mem-proxy `/api/v1/*` ke `API_BASE_URL` (default `http://localhost:8080`) lewat rewrite di `apps/web/next.config.ts`, sehingga browser tetap first-party dan cookie refresh tetap first-party pada dev.
- API membaca konfigurasi dari environment process. Untuk memakai `.env`, variabel perlu di-export di shell PowerShell (contoh: `$env:DATABASE_URL = "postgres://kantin:kantin@localhost:5432/kantin?sslmode=disable"`) atau dijalankan lewat proses yang memang memuat file tersebut.

## 6. Membaca OTP dev dari log API

- Bila `APP_ENV` bukan `production`, API memakai `mailer.DevMailer` dan mencetak OTP ke log server pada level `warn`, dengan pesan `DEV MODE: kode OTP dicetak ke log` dan field `purpose`, `recipient`, `otp`.
- Worker outbox memproses antrean setiap 5 detik, jadi OTP muncul beberapa detik setelah permintaan pendaftaran atau login.
- Contoh baris log (JSON, `slog`):

```json
{"time":"...","level":"WARN","msg":"DEV MODE: kode OTP dicetak ke log","purpose":"register","recipient":"...","otp":"......"}
```

- Di produksi, mailer diganti ke Mailjet dan OTP tidak pernah masuk log; baris di atas tidak akan muncul.

## 7. Backup dan restore lokal

Database lokal berisi data dev; dump tidak boleh di-commit (`.gitignore` mengecualikan `*.dump`).

### 7.1 Backup dengan dump di dalam container (tanpa tool PostgreSQL di host)

```powershell
New-Item -ItemType Directory -Force .\backup | Out-Null
docker compose --env-file .env -f infra/compose.yaml exec postgres pg_dump -U kantin -d kantin -f /tmp/kantin.sql
docker cp kantin-postgres:/tmp/kantin.sql .\backup\kantin.sql
```

Cara ini dipilih karena redirect output biner langsung dari `docker exec` ke file di PowerShell dapat merusak isi file.

### 7.2 Restore

```powershell
docker cp .\backup\kantin.sql kantin-postgres:/tmp/kantin.sql
docker compose --env-file .env -f infra/compose.yaml exec -T postgres psql -U kantin -d kantin -f /tmp/kantin.sql
```

Untuk restore ke database bersih, jalankan `migrate ... up` terlebih dahulu lalu import dump.

### 7.3 Backup dengan tool PostgreSQL di host

Memerlukan instalasi client `pg_dump`/`psql` (PostgreSQL 16) dan `PGPASSWORD` atau `.pgpass`:

```powershell
pg_dump -h localhost -p 5432 -U kantin -d kantin -f .\backup\kantin.sql
psql -h localhost -p 5432 -U kantin -d kantin -f .\backup\kantin.sql
```

Format kustom (`-Fc`) menghasilkan satu file biner; gunakan `-f` agar file ditulis langsung oleh `pg_dump` tanpa perantara stdout.

### 7.4 Melihat skema tanpa data

```powershell
docker compose --env-file .env -f infra/compose.yaml exec postgres pg_dump -U kantin -d kantin --schema-only
```

Uji restore berkala (PRD §18.2) belum dijalankan dan harus dijadwalkan sebelum pilot.

## 8. Reset database lokal

Reset menghapus seluruh data lokal (volume `kantin_pgdata`):

```powershell
docker compose --env-file .env -f infra/compose.yaml down -v
docker compose --env-file .env -f infra/compose.yaml up -d
migrate -path services/api/migrations -database "postgres://kantin:kantin@localhost:5432/kantin?sslmode=disable" up
cd services/api; go run ./cmd/seed
```

Peringatan: `down -v` menghapus akun demo, stan, produk, dan seluruh pesanan lokal. Jangan dijalankan pada environment yang berisi data yang perlu disimpan.

## 9. Konfigurasi Supabase Storage

Isi di `.env`:

| Variabel | Isi |
|---|---|
| `SUPABASE_URL` | URL project Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key, hanya di backend |
| `SUPABASE_STORAGE_BUCKET` | Nama bucket, default `kantin-media` |
| `SIGNED_URL_TTL` | Umur signed URL, default `15m` |

Langkah praktis:

1. Buat project Supabase dan bucket sesuai kebijakan privasi kampus (publik atau privat belum diputuskan; PRD §6.7 PROF-04).
2. Salin URL dan service role key ke `.env` (jangan di-commit).
3. Pastikan API memakai bucket yang sama; key objek dibuat acak (`profiles/<uuid>.<ext>`, `products/<uuid>.<ext>`).
4. Verifikasi upload foto profil dan foto produk, termasuk penghapusan objek lama saat foto diganti.

Bila `SUPABASE_URL` atau `SUPABASE_SERVICE_ROLE_KEY` kosong, API aktif dengan storage dinonaktifkan: log memuat peringatan `Supabase Storage belum dikonfigurasi; fitur foto dinonaktifkan` dan endpoint foto membalas `503 RESOURCE_UNAVAILABLE`.

## 10. Konfigurasi Mailjet

| Variabel | Isi |
|---|---|
| `MAILJET_API_KEY` | API key Mailjet |
| `MAILJET_SECRET_KEY` | Secret key Mailjet |
| `MAIL_FROM_EMAIL` | Email sender terverifikasi |
| `MAIL_FROM_NAME` | Nama pengirim |

Langkah praktis:

1. Verifikasi domain dan alamat sender di Mailjet.
2. Isi kredensial di `.env`.
3. Jalankan API dengan `APP_ENV=production` agar `MailjetClient` (Send API v3.1) dipakai; pada `APP_ENV` lain OTP hanya dicetak ke log.
4. Uji alur pendaftaran dan login; kegagalan provider dicatat pada log `outbox: gagal kirim email` dan di-retry worker.

Pengiriman memakai isi sederhana (subject + `TextPart` + satu blok `HTMLPart`); belum ada mesin template.

## 11. Troubleshooting

| Gejala | Penyebab yang mungkin | Tindakan |
|---|---|---|
| API berhenti dengan log `database tidak tersedia` | PostgreSQL belum healthy atau `DATABASE_URL` salah | `docker compose --env-file .env -f infra/compose.yaml ps`; periksa `DATABASE_URL`; coba `docker compose ... logs -f postgres` |
| `migrate` gagal dengan `unknown driver "postgres"` | CLI dipasang tanpa tag driver | Instal ulang: `go install -tags postgres github.com/golang-migrate/migrate/v4/cmd/migrate@v4.18.3` |
| Migrasi gagal dengan `Dirty database version` | Migrasi terputus di tengah | Periksa tabel `schema_migrations`, lalu `migrate force <versi>` dan ulangi `up` |
| Pesan `port 5432 is already in use` | Ada PostgreSQL lain di host | Ubah `POSTGRES_PORT` di `.env` (misal `5433`) dan sesuaikan `DATABASE_URL` serta `KANTIN_TEST_DATABASE_URL` |
| Halaman web menampilkan error CORS di konsol browser | Origin web tidak ada di allowlist | Isi `CORS_ALLOWED_ORIGINS=http://localhost:3000`, atau akses web melalui proxy first-party yang sudah ada |
| `401 UNAUTHENTICATED` dengan pesan `Token CSRF tidak valid` | Cookie `kk_csrf` hilang atau header `X-CSRF-Token` tidak dikirim | Akses web melalui `http://localhost:3000` (bukan IP lain), muat ulang, pastikan client mengirim header pada mutasi |
| `503 RESOURCE_UNAVAILABLE` saat upload foto | Storage Supabase belum dikonfigurasi | Isi `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY`, atau kosongkan dengan sengaja untuk mode tanpa foto |
| `503 RESOURCE_UNAVAILABLE` saat memilih QRIS | `ALLOW_QRIS_PLACEHOLDER=false` (default) | Biarkan tershut untuk mode normal; hanya aktifkan untuk demo terbatas sesuai PRD §5.5 |
| OTP tidak masuk email | `APP_ENV` bukan `production` (OTP hanya di log), atau Mailjet gagal | Cek log API untuk baris `DEV MODE` atau `outbox: gagal kirim email`; pastikan kredensial Mailjet benar |
| `npm run dev` gagal karena port 3000 dipakai | Proses lain memakai port | Hentikan proses lain atau jalankan `npm run dev -- -p 3001` |
| `go run ./cmd/api` gagal karena port 8080 dipakai | Proses API lama masih berjalan | Hentikan proses lama atau set `HTTP_ADDR=:8081` di environment |

## 12. Monitoring dan logging

- API memakai `log/slog` dengan handler JSON ke stdout. Level diambil dari `LOG_LEVEL` (`debug`, `info`, `warn`, `error`; default `info`).
- Setiap request mendapat `request_id`: header `X-Request-Id` dari klien dipakai bila ada dan maksimal 64 karakter, jika tidak ID acak dibuat server. ID dikembalikan pada header respons dan pada `meta.request_id`.
- Access log memuat `method`, `path`, `status`, `duration_ms`, dan `request_id`, tanpa body request.
- Error handler mencatat `request_id` dan objek error; `RecoverMiddleware` mengubah panic menjadi `500 INTERNAL_ERROR` generik dan tetap mencatatnya.
- Event keamanan tersimpan di tabel `auth_events`, `audit_logs`, dan `payment_events` (lihat `docs/DATA_MODEL.md`).
- Metrik teragregasi, alerting, dan retensi log terpusat **belum ada**. Ambang alert dan masa retensi log harus ditetapkan sebelum produksi (PRD §12.4).

## 13. Yang belum ada dan harus disiapkan sebelum produksi

- Hosting, managed database, domain, HTTPS, dan reverse proxy.
- Secret manager dan prosedur rotasi kunci (termasuk dampak rotasi terhadap sesi aktif).
- Backup terjadwal, uji restore, dan prosedur pemulihan insiden.
- Monitoring, alerting, dan metrics.
- SOP kasir, kebijakan pembatalan, kebijakan retensi data, dan kontak dukungan.
- Approval seller, kebijakan privasi, dan zona waktu/mata uang final kampus.

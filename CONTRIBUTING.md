# Kontribusi

Panduan ini berlaku untuk seluruh perubahan pada repository Website Kantin Kampus. Rujukan: PRD §17 (GitHub workflow), §18 (pengujian dan acceptance criteria).

## 1. Alur kerja

1. Buat branch dari `main` dengan nama sesuai §2.
2. Kerjakan perubahan dalam commit kecil (§3).
3. Jalankan verifikasi lokal (§4) sebelum membuka pull request.
4. Buka PR dengan isi minimal pada §5.
5. Tunggu review. Perubahan pada auth, pembayaran, akses data lintas role, dan schema sensitif memerlukan review spesialis (§5).

`main` dilindungi: perubahan masuk melalui pull request, review, dan status CI. Jangan pernah melakukan force-push atau bypassing hooks.

## 2. Penamaan branch

Format: `<tipe>/<deskripsi-kecil>`.

| Tipe | Kegunaan | Contoh |
|---|---|---|
| `feat/` | Fitur baru | `feat/seller-fulfillment-status` |
| `fix/` | Perbaikan bug | `fix/otp-resend-cooldown` |
| `docs/` | Perubahan dokumentasi saja | `docs/data-model-cleanup` |

Gunakan huruf kecil, tanda hubung, dan deskripsi singkat. Format akhir mengikuti kesepakatan tim (PRD §17).

## 3. Gaya commit

- Commit kecil dan fokus pada satu perubahan.
- Pesan commit menyebut perubahan, bukan kredensial atau data pengguna. Contoh: `feat(auth): tambahkan lockout email_ip pada ronde OTP kedua`.
- Jangan pernah menulis OTP, password, token, kunci API, email pengguna nyata, atau dump database dalam pesan commit maupun diff.
- Hindari kata seperti "fix stuff" atau "final fix"; tulis alasan perubahan bila tidak jelas dari diff.

Catatan: checkout ini belum memiliki riwayat git, sehingga gaya pesan commit di atas adalah konvensi yang ditetapkan untuk tim, bukan turunan dari riwayat yang sudah ada.

## 4. Verifikasi lokal

Dijalankan dari root repository.

```powershell
# API
cd services/api
go vet ./...
$env:KANTIN_TEST_DATABASE_URL = "postgres://kantin:kantin@localhost:5432/kantin_test?sslmode=disable"
go test ./... -count=1

# Web
cd ../../apps/web
npm run lint
npm run typecheck
npm run test
npm run e2e
```

Catatan:

- `go test ./...` menjalankan test unit dan integrasi. Test integrasi memerlukan database `kantin_test` yang sudah dibuat dan dimigrasikan (lihat `docs/LOCAL_SETUP.md` §8). Tanpa `KANTIN_TEST_DATABASE_URL`, test integrasi dilewati.
- `npm run e2e` memakai Playwright (`apps/web/playwright.config.ts`, test di `apps/web/src/e2e`) dan memerlukan server web berjalan serta browser Playwright terpasang (`npx playwright install chromium`).
- CI (`.github/workflows/ci.yml`) menjalankan `go vet`, validasi migrasi (up, down 1, up), `go test`, `go build`, `npm ci`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, secret scan (gitleaks), dan `npm audit --audit-level=high` untuk web.
- Jangan mengklaim hasil lulus tanpa menjalankan pipeline atau perintah di atas.

## 5. Checklist pull request

- [ ] Ringkasan perubahan dan alasan.
- [ ] Dampak pada schema (termasuk migrasi baru) dan pada kontrak API.
- [ ] Cara memverifikasi perubahan secara manual dan otomatis.
- [ ] Screenshot UI bila ada perubahan visual.
- [ ] Risiko, migrasi data, dan langkah rollout bila relevan.
- [ ] Tidak ada `.env`, kunci API, dump database, atau data pengguna nyata dalam diff.
- [ ] Dokumentasi terkait diperbarui (lihat §7).
- [ ] Review spesialis diminta bila menyentuh:
  - [ ] Autentikasi, sesi, token, OTP, lockout, atau reset/alur akses.
  - [ ] Pembayaran, status pembayaran, penandaan tunai, atau QRIS placeholder.
  - [ ] Akses data lintas role (buyer/seller/admin) atau kepemilikan sumber daya.
  - [ ] Perubahan schema/migrasi database yang sensitif.

## 6. Ekspektasi migrasi

- Migrasi baru memakai penomoran berurutan berikutnya di `services/api/migrations` dan menyediakan pasangan `.up.sql` dan `.down.sql`.
- Migrasi harus dapat ditinjau, idempoten dalam konteksnya, dan tidak merusak data yang sudah ada.
- Migrasi yang sudah pernah diterapkan **tidak** boleh diedit; buat migrasi baru untuk koreksi.
- Perubahan schema pada tabel sensitif (`users`, `login_sessions`, `auth_throttles`, `orders`, `payments`, `payment_events`, `audit_logs`) memerlukan review spesialis dan harus disertai dampak terhadap retensi bila mengubah kolom data.
- Setelah menambah migrasi, perbarui `docs/DATA_MODEL.md` (kolom, constraint, index) dan, bila berstatus, kamus status.
- CI memvalidasi migrasi dengan urutan up, down 1, up pada database kosong; jalankan urutan yang sama secara lokal bila migrasi berisiko.
- Bila migrasi gagal di tengah jalan, database menjadi *dirty* dan harus dipulihkan dengan `migrate force <versi>` sesuai kondisi tabel (lihat `docs/OPERATIONS.md` §3).

## 7. Dokumentasi

Perbarui berkas berikut bila perilakunya berubah:

| Perubahan | Berkas |
|---|---|
| Kolom, constraint, index, status, retensi | `docs/DATA_MODEL.md` |
| Kontrol keamanan, kebocoran, batasan baru | `docs/SECURITY.md` |
| Perintah operasional, backup, konfigurasi layanan | `docs/OPERATIONS.md` |
| Cara setup, prasyarat, ekuivalensi perintah | `docs/LOCAL_SETUP.md` |
| Hasil pengujian acceptance criteria | `docs/ACCEPTANCE.md` |
| Ringkasan produk, perintah, status milestone | `README.md` |

## 8. Gaya kode

- Ikuti pola yang sudah ada di berkas sekitarnya; pisahkan handler HTTP, service domain, repository, dan integrasi eksternal.
- Fungsi kecil dan nama yang menjelaskan aksi; gunakan istilah domain berbahasa Indonesia seperti pada kode yang ada.
- Komentar dipakai untuk menjelaskan alasan atau aturan yang tidak jelas, bukan untuk mengulang baris kode.
- Jangan menambahkan dependensi baru tanpa alasan yang jelas; dependensi web dikunci di `apps/web/package-lock.json` dan dependensi Go di `services/api/go.mod`/`go.sum`.
- Jangan mengubah file di luar lingkup perubahan Anda, dan jangan mengubah berkas `.env` milik orang lain.

## 9. Rahasia dan data

- `.env` (dan varian `.env.*`) tidak boleh masuk repository; `.gitignore` sudah mengecualikannya.
- Kredensial Mailjet, Supabase service role key, JWT signing key, dan OTP hash key hanya melalui environment atau secret manager host.
- Secret scanning (gitleaks) berjalan di CI; temuan harus ditangani, bukan diabaikan.
- Jangan menaruh dump database, data pengguna nyata, atau isi `.env.example` yang sudah terisi ke repository maupun issue.
- Bila kunci bocor, rotasi lewat environment dan dokumentasikan dampaknya terhadap sesi aktif (lihat `docs/SECURITY.md` §10).

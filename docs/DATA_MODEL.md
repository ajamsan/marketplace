# Model Data

Sumber kebenaran: migrasi `services/api/migrations/0001_users.up.sql` sampai `0009_audit_outbox.up.sql` (PostgreSQL 16, `postgres:16-alpine`). PRD rujukan: §9 (model data relasional), §8 (model status).

Semua kolom waktu bertipe `timestamptz` dan ditulis sebagai UTC (`now()`). Tampilan web memakai zona waktu `NEXT_PUBLIC_TIME_ZONE` (default `Asia/Jakarta`, keputusan D20) dan mata uang `NEXT_PUBLIC_CURRENCY` (default `IDR`); keduanya dapat dikonfigurasi lewat `.env`.

## 1. ERD

```text
users 1 ──< login_sessions
  │ 1
  │ └──< otp_challenges >── 1 pending_registrations
  │ 1
  │ └── 1 carts 1 ──< cart_items >── 1 products >── 1 stalls
  │
  ├──< seller_stalls >── 1 stalls            (users N:M stalls)
  ├──< orders 1 ──< order_items >── 1 stalls
  │            1
  │            ├──< payments 1 ──< payment_events
  │            └──< order_stall_fulfillments >── 1 stalls
  │
  └──< audit_logs            (aktor, nullable untuk sistem)

auth_throttles, auth_events   (kunci = hash; tanpa FK ke users)
email_outbox                  (transactional outbox; payload berisi
                                challenge_id + code terenkripsi)
```

Catatan relasi:

- `users` 1:1 `carts` lewat `carts.buyer_id UNIQUE`.
- `orders.buyer_id` tidak memakai `ON DELETE CASCADE`; `order_items`, `payments`, `order_stall_fulfillments` memakai cascade dari `orders` (PRD §9.3: data transaksi tidak boleh hilang bersama user).
- `seller_stalls` adalah tabel penghubung seller ke stan dengan composite PK.

## 2. Definisi tabel

Kolom `NULL` berarti nullable. `Default` diisi dari definisi migrasi.

### 2.1 `users`

| Kolom | Tipe | Null | Default | Constraint / keterangan |
|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PRIMARY KEY |
| `username` | text | no | - | UNIQUE |
| `email_normalized` | text | no | - | UNIQUE; lowercase + trim saat normalisasi |
| `password_hash` | text | no | - | Argon2id (format PHC), tidak pernah plaintext |
| `role` | text | no | - | CHECK `role IN ('buyer','seller','admin')` |
| `status` | text | no | `'active'` | CHECK `status IN ('pending','active','suspended','deleted')` |
| `email_verified_at` | timestamptz | yes | - | NULL = belum verifikasi OTP |
| `profile_image_key` | text | yes | - | Object key Supabase, bukan kredensial |
| `preferences` | jsonb | no | `'{}'::jsonb` | Menyimpan `theme_mode` dan `accent` |
| `created_at` | timestamptz | no | `now()` | |
| `updated_at` | timestamptz | no | `now()` | |

Index: PRIMARY KEY (`id`); UNIQUE implisit (`username`), UNIQUE implisit (`email_normalized`); `users_role_status_idx (role, status)`.

### 2.2 `pending_registrations`

| Kolom | Tipe | Null | Default | Constraint / keterangan |
|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PRIMARY KEY |
| `email_normalized` | text | no | - | Kunci unik parsial (lihat index) |
| `username` | text | no | - | Sudah ternormalisasi |
| `password_hash` | text | no | - | Hash; plaintext tidak disimpan |
| `role` | text | no | - | CHECK `role IN ('buyer','seller')` |
| `attempt_group_id` | uuid | no | - | Kelompok percobaan pendaftaran |
| `verified_at` | timestamptz | yes | - | Diisi saat OTP valid |
| `expires_at` | timestamptz | no | - | TTL pendaftaran pending |
| `created_at` | timestamptz | no | `now()` | |

Index: PRIMARY KEY (`id`); `pending_registrations_email_active_uk` UNIQUE (`email_normalized`) `WHERE verified_at IS NULL`; `pending_registrations_expires_idx (expires_at)`.

### 2.3 `otp_challenges`

| Kolom | Tipe | Null | Default | Constraint / keterangan |
|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PRIMARY KEY |
| `user_id` | uuid | yes | - | FK `users(id)` `ON DELETE CASCADE` |
| `pending_registration_id` | uuid | yes | - | FK `pending_registrations(id)` `ON DELETE CASCADE` |
| `email_normalized` | text | no | - | Kunci lookup dan lockout |
| `purpose` | text | no | - | CHECK `purpose IN ('register','login')` |
| `otp_hash` | text | no | - | HMAC-SHA256 kode OTP, bukan teks biasa |
| `pre_auth_token_hash` | text | yes | - | SHA-256 token pre-auth login |
| `attempt_count` | integer | no | `0` | Counter atomik percobaan salah |
| `round_number` | integer | no | `1` | Ronde lockout |
| `request_ip_hash` | text | yes | - | HMAC IP, bukan IP mentah |
| `expires_at` | timestamptz | no | - | Batas berlaku OTP |
| `consumed_at` | timestamptz | yes | - | Single-use |
| `superseded_at` | timestamptz | yes | - | Digantikan oleh tantangan/resend baru |
| `last_sent_at` | timestamptz | no | `now()` | Dasar cooldown resend |
| `created_at` | timestamptz | no | `now()` | Dasar perhitungan ronde |

Index: PRIMARY KEY (`id`); `otp_challenges_lookup_idx (email_normalized, purpose, created_at DESC)`; `otp_challenges_active_expires_idx (expires_at) WHERE consumed_at IS NULL`; `otp_challenges_preauth_idx (pre_auth_token_hash) WHERE pre_auth_token_hash IS NOT NULL AND consumed_at IS NULL`.

### 2.4 `auth_throttles`

| Kolom | Tipe | Null | Default | Constraint / keterangan |
|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PRIMARY KEY |
| `scope_type` | text | no | - | CHECK `scope_type IN ('email','ip','email_ip','challenge')` |
| `scope_key_hash` | text | no | - | HMAC kunci (email/IP/gabungan), bukan nilai mentah |
| `flow` | text | no | - | CHECK `flow IN ('password','otp_register','otp_login','otp_resend','register_start')` |
| `failure_count` | integer | no | `0` | Dinaikkan atomik per kegagalan |
| `wave_number` | integer | no | `0` | Gelombang lockout |
| `window_started_at` | timestamptz | no | `now()` | Awal jendela counter |
| `locked_until` | timestamptz | yes | - | NULL = tidak terkunci |
| `created_at` | timestamptz | no | `now()` | |
| `updated_at` | timestamptz | no | `now()` | |

Index/constraint: PRIMARY KEY (`id`); `auth_throttles_scope_uk` UNIQUE (`flow`, `scope_type`, `scope_key_hash`). Tidak ada index sekunder.

### 2.5 `auth_events`

| Kolom | Tipe | Null | Default | Constraint / keterangan |
|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PRIMARY KEY |
| `flow` | text | no | - | Contoh: `register`, `password`, `otp_login`, `sessions` |
| `event` | text | no | - | Nama kategori event |
| `outcome` | text | no | - | Contoh: `fail`, `success`, `locked`, `blocked` |
| `email_hash` | text | yes | - | HMAC email, bukan alamat lengkap |
| `ip_hash` | text | yes | - | HMAC IP |
| `request_id` | text | yes | - | Correlation ID request |
| `created_at` | timestamptz | no | `now()` | |

Index: PRIMARY KEY (`id`); `auth_events_created_idx (created_at DESC)`.

### 2.6 `login_sessions`

| Kolom | Tipe | Null | Default | Constraint / keterangan |
|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PRIMARY KEY; `sid` pada access token |
| `user_id` | uuid | no | - | FK `users(id)` `ON DELETE CASCADE` |
| `refresh_token_hash` | text | no | - | SHA-256 token refresh aktif |
| `previous_refresh_token_hash` | text | yes | - | SHA-256 token sebelumnya; dasar deteksi reuse |
| `token_family_id` | uuid | no | - | Keluarga token; seluruhnya dicabut saat reuse |
| `csrf_token_hash` | text | no | - | SHA-256 token CSRF sesi |
| `user_agent_summary` | text | yes | - | Label browser/platform perkiraan |
| `platform` | text | yes | - | Platform perkiraan |
| `ip_masked` | text | yes | - | IP disamarkan untuk tampilan |
| `ip_hash` | text | yes | - | HMAC IP |
| `created_at` | timestamptz | no | `now()` | |
| `last_seen_at` | timestamptz | no | `now()` | Diperbarui saat refresh |
| `expires_at` | timestamptz | no | - | Idle TTL sesi |
| `absolute_expires_at` | timestamptz | no | - | Batas absolut sesi |
| `revoked_at` | timestamptz | yes | - | NULL = masih aktif |
| `revoke_reason` | text | yes | - | Tidak dibatasi CHECK; nilai yang dipakai kode ada di §4 |

Index: PRIMARY KEY (`id`); `login_sessions_user_idx (user_id, revoked_at, expires_at)`; `login_sessions_refresh_idx (refresh_token_hash)`; `login_sessions_family_idx (token_family_id)`.

Catatan: tidak ada kolom `is_current`. Status "sesi saat ini" dihitung dari `sid` pada access token, bukan flag yang bisa dimutasi (PRD §9.1).

### 2.7 `stalls`

| Kolom | Tipe | Null | Default | Constraint / keterangan |
|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PRIMARY KEY |
| `name` | text | no | - | Tidak unik global (kebijakan kampus belum ditetapkan) |
| `description` | text | yes | - | Maksimal 500 karakter (validasi service) |
| `location_label` | text | yes | - | Maksimal 120 karakter (validasi service) |
| `status` | text | no | `'pending_review'` | CHECK `status IN ('pending_review','active','inactive')` |
| `created_by` | uuid | yes | - | FK `users(id)` tanpa cascade |
| `created_at` | timestamptz | no | `now()` | |
| `updated_at` | timestamptz | no | `now()` | |

Index: PRIMARY KEY (`id`). Tidak ada index sekunder.

### 2.8 `seller_stalls`

| Kolom | Tipe | Null | Default | Constraint / keterangan |
|---|---|---|---|---|
| `seller_id` | uuid | no | - | FK `users(id)` `ON DELETE CASCADE`; bagian PK |
| `stall_id` | uuid | no | - | FK `stalls(id)` `ON DELETE CASCADE`; bagian PK |
| `role` | text | no | `'owner'` | CHECK `role IN ('owner','staff')` |
| `created_at` | timestamptz | no | `now()` | |

Index/constraint: PRIMARY KEY (`seller_id`, `stall_id`). Tidak ada index tambahan pada `stall_id`.

### 2.9 `products`

| Kolom | Tipe | Null | Default | Constraint / keterangan |
|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PRIMARY KEY |
| `stall_id` | uuid | no | - | FK `stalls(id)` `ON DELETE CASCADE` |
| `name` | text | no | - | 3-100 karakter (validasi service) |
| `description` | text | yes | - | Maksimal 500 karakter (validasi service) |
| `price_minor` | bigint | no | - | CHECK `price_minor >= 0`; harga dalam minor unit |
| `currency` | char(3) | no | `'IDR'` | Kode mata uang |
| `availability_status` | text | no | `'available'` | CHECK `availability_status IN ('available','unavailable')` |
| `image_key` | text | yes | - | Object key acak `products/<uuid>.<ext>` |
| `created_by` | uuid | yes | - | FK `users(id)` tanpa cascade |
| `created_at` | timestamptz | no | `now()` | |
| `updated_at` | timestamptz | no | `now()` | |
| `archived_at` | timestamptz | yes | - | Non-NULL = diarsipkan (bukan hard delete) |

Index: PRIMARY KEY (`id`); `products_stall_avail_idx (stall_id, availability_status) WHERE archived_at IS NULL`; `products_name_lower_idx (lower(name)) WHERE archived_at IS NULL`.

### 2.10 `carts`

| Kolom | Tipe | Null | Default | Constraint / keterangan |
|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PRIMARY KEY |
| `buyer_id` | uuid | no | - | FK `users(id)` `ON DELETE CASCADE`; UNIQUE (satu cart per buyer) |
| `created_at` | timestamptz | no | `now()` | |
| `updated_at` | timestamptz | no | `now()` | |

Index: PRIMARY KEY (`id`); UNIQUE implisit (`buyer_id`).

### 2.11 `cart_items`

| Kolom | Tipe | Null | Default | Constraint / keterangan |
|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PRIMARY KEY |
| `cart_id` | uuid | no | - | FK `carts(id)` `ON DELETE CASCADE` |
| `product_id` | uuid | no | - | FK `products(id)` `ON DELETE CASCADE` |
| `quantity` | integer | no | - | CHECK `quantity > 0`; service membatasi 1-99 |
| `created_at` | timestamptz | no | `now()` | |
| `updated_at` | timestamptz | no | `now()` | |
| | | | | UNIQUE (`cart_id`, `product_id`) |

Index: PRIMARY KEY (`id`); UNIQUE (`cart_id`, `product_id`); `cart_items_cart_idx (cart_id)` (tumpang tindih dengan index UNIQUE).

### 2.12 `orders`

| Kolom | Tipe | Null | Default | Constraint / keterangan |
|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PRIMARY KEY |
| `public_code` | text | no | - | UNIQUE; kode 6 karakter base32 untuk disebut di kasir, bukan token akses |
| `buyer_id` | uuid | no | - | FK `users(id)` tanpa cascade |
| `status` | text | no | - | CHECK 8 nilai status order (§4) |
| `currency` | char(3) | no | `'IDR'` | |
| `subtotal_minor` | bigint | no | - | CHECK `subtotal_minor >= 0` |
| `total_minor` | bigint | no | - | CHECK `total_minor >= 0`; dihitung server |
| `idempotency_key` | text | yes | - | UNIQUE bersama `buyer_id` |
| `request_hash` | text | yes | - | Hash payload canonical untuk deteksi konflik idempotensi |
| `created_at` | timestamptz | no | `now()` | |
| `updated_at` | timestamptz | no | `now()` | |
| `cancelled_at` | timestamptz | yes | - | Diisi saat pembatalan |

Index/constraint: PRIMARY KEY (`id`); UNIQUE (`public_code`); UNIQUE (`buyer_id`, `idempotency_key`); `orders_buyer_created_idx (buyer_id, created_at DESC)`; `orders_status_created_idx (status, created_at DESC)`. Pada PostgreSQL, `NULL` pada `idempotency_key` tetap lolos dari constraint UNIQUE, sehingga banyak order tanpa key diizinkan.

### 2.13 `order_items`

| Kolom | Tipe | Null | Default | Constraint / keterangan |
|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PRIMARY KEY |
| `order_id` | uuid | no | - | FK `orders(id)` `ON DELETE CASCADE` |
| `product_id` | uuid | yes | - | FK `products(id)` tanpa cascade; boleh NULL bila produk dihapus |
| `stall_id` | uuid | no | - | FK `stalls(id)` tanpa cascade |
| `product_name_snapshot` | text | no | - | Snapshot nama saat order dibuat |
| `unit_price_minor` | bigint | no | - | CHECK `unit_price_minor >= 0`; snapshot harga |
| `quantity` | integer | no | - | CHECK `quantity > 0` |
| `line_total_minor` | bigint | no | - | CHECK `line_total_minor >= 0` |
| `currency` | char(3) | no | `'IDR'` | |
| `created_at` | timestamptz | no | `now()` | |

Index: PRIMARY KEY (`id`); `order_items_order_idx (order_id)`; `order_items_stall_idx (stall_id)`.

### 2.14 `order_stall_fulfillments`

| Kolom | Tipe | Null | Default | Constraint / keterangan |
|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PRIMARY KEY |
| `order_id` | uuid | no | - | FK `orders(id)` `ON DELETE CASCADE` |
| `stall_id` | uuid | no | - | FK `stalls(id)` tanpa cascade |
| `fulfillment_status` | text | no | `'pending'` | CHECK 5 nilai (§4) |
| `updated_by` | uuid | yes | - | FK `users(id)` tanpa cascade |
| `updated_at` | timestamptz | no | `now()` | |
| | | | | UNIQUE (`order_id`, `stall_id`) |

Index: PRIMARY KEY (`id`); UNIQUE (`order_id`, `stall_id`); `order_fulfillments_stall_idx (stall_id)`.

### 2.15 `payments`

| Kolom | Tipe | Null | Default | Constraint / keterangan |
|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PRIMARY KEY |
| `order_id` | uuid | no | - | FK `orders(id)` `ON DELETE CASCADE` |
| `stall_id` | uuid | no | - | FK `stalls(id)` tanpa cascade; satu pembayaran per stan |
| `method` | text | no | - | CHECK `method IN ('cash','qris_placeholder')` |
| `status` | text | no | - | CHECK 5 nilai (§4) |
| `amount_minor` | bigint | no | - | CHECK `amount_minor >= 0` |
| `currency` | char(3) | no | `'IDR'` | |
| `paid_at` | timestamptz | yes | - | Diisi saat tunai dikonfirmasi |
| `confirmed_by` | uuid | yes | - | FK `users(id)` tanpa cascade; seller yang menerima uang |
| `expires_at` | timestamptz | yes | - | Batas berlaku; belum dipakai alur QRIS placeholder |
| `external_reference` | text | yes | - | Tidak diisi untuk QRIS placeholder |
| `created_at` | timestamptz | no | `now()` | |
| `updated_at` | timestamptz | no | `now()` | |

Index: PRIMARY KEY (`id`); `payments_order_idx (order_id)`; `payments_stall_idx (stall_id)`.

### 2.16 `payment_events`

| Kolom | Tipe | Null | Default | Constraint / keterangan |
|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PRIMARY KEY |
| `payment_id` | uuid | no | - | FK `payments(id)` `ON DELETE CASCADE` |
| `from_status` | text | no | - | Status sebelum perubahan |
| `to_status` | text | no | - | Status sesudah perubahan |
| `actor_user_id` | uuid | yes | - | FK `users(id)` tanpa cascade |
| `reason_code` | text | yes | - | Alasan perubahan |
| `request_id` | text | yes | - | Correlation ID |
| `created_at` | timestamptz | no | `now()` | |

Index: PRIMARY KEY (`id`); `payment_events_payment_idx (payment_id)`. Tabel bersifat append-only menurut konvensi aplikasi: tidak ada `UPDATE`/`DELETE` dari kode aplikasi.

### 2.17 `audit_logs`

| Kolom | Tipe | Null | Default | Constraint / keterangan |
|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PRIMARY KEY |
| `actor_user_id` | uuid | yes | - | FK `users(id)` tanpa cascade; NULL untuk aksi sistem |
| `action` | text | no | - | Contoh: `order_create`, `payment_confirm_cash` |
| `resource_type` | text | no | - | Contoh: `order`, `payment`, `user` |
| `resource_id` | text | yes | - | ID objek yang dipengaruhi |
| `outcome` | text | no | - | Contoh: `success`, `pending_review` |
| `request_id` | text | yes | - | Correlation ID |
| `metadata_redacted` | jsonb | no | `'{}'::jsonb` | Metadata allowlist, tanpa rahasia |
| `created_at` | timestamptz | no | `now()` | |

Index: PRIMARY KEY (`id`); `audit_logs_created_idx (created_at DESC)`; `audit_logs_actor_idx (actor_user_id, created_at DESC)`.

### 2.18 `email_outbox`

| Kolom | Tipe | Null | Default | Constraint / keterangan |
|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PRIMARY KEY |
| `purpose` | text | no | - | `register` atau `login` |
| `recipient` | text | no | - | Email penerima |
| `template_key` | text | no | - | `otp_register` atau `otp_login` |
| `payload_redacted` | jsonb | no | `'{}'::jsonb` | Berisi `challenge_id` dan `code_enc` (AES-256-GCM), bukan kode plaintext |
| `status` | text | no | `'pending'` | CHECK `status IN ('pending','sent','failed')` |
| `attempt_count` | integer | no | `0` | Jumlah percobaan kirim |
| `next_attempt_at` | timestamptz | no | `now()` | Kapan worker mencoba lagi |
| `provider_message_id` | text | yes | - | ID pesan dari provider |
| `created_at` | timestamptz | no | `now()` | |
| `sent_at` | timestamptz | yes | - | Diisi saat terkirim |

Index: PRIMARY KEY (`id`); `email_outbox_due_idx (status, next_attempt_at)`.

## 3. Zona waktu dan mata uang

- Penyimpanan: `timestamptz` UTC.
- Konversi: dilakukan di sisi web saat format tampilan (`apps/web/src/lib/format.ts`), memakai `NEXT_PUBLIC_TIME_ZONE` dengan default `Asia/Jakarta` (D20, dapat dikonfigurasi).
- Mata uang tampilan: `NEXT_PUBLIC_CURRENCY` dengan default `IDR`; harga disimpan sebagai integer minor unit (`price_minor`, `total_minor`).

## 4. Kamus status

| Vocabulary | Nilai yang diizinkan database | Sumber constraint | Catatan implementasi |
|---|---|---|---|
| `orders.status` | `awaiting_payment`, `confirmed`, `in_preparation`, `ready_for_pickup`, `completed`, `cancelled`, `expired`, `rejected` | CHECK `0008` | Status agregat dihitung `orders.DeriveOrderStatus`: selama ada pembayaran yang bukan `cash_paid`, status tetap `awaiting_payment`; QRIS placeholder tidak pernah menghasilkan status lunas |
| `order_stall_fulfillments.fulfillment_status` | `pending`, `in_preparation`, `ready_for_pickup`, `completed`, `cancelled` | CHECK `0008` | Transisi maju saja: `pending` → `in_preparation` → `ready_for_pickup` → `completed`; status sama bersifat idempotent |
| `payments.status` | `cash_due`, `cash_paid`, `void`, `unavailable`, `awaiting_external_confirmation` | CHECK `0008` | `cash_due` → `cash_paid` hanya oleh seller stan terkait; `awaiting_external_confirmation` dipakai untuk QRIS placeholder |
| `payments.method` | `cash`, `qris_placeholder` | CHECK `0008` | `qris_placeholder` ditolak (`503 RESOURCE_UNAVAILABLE`) kecuali `ALLOW_QRIS_PLACEHOLDER=true` |
| `stalls.status` | `pending_review`, `active`, `inactive` | CHECK `0006` | Transisi oleh admin: approve/reject (`pending_review`), activate (`inactive`), deactivate (`active`) |
| `products.availability_status` | `available`, `unavailable` | CHECK `0006` | Label frontend juga memuat `out_of_stock`, tetapi nilai itu tidak diizinkan constraint database |
| `users.role` | `buyer`, `seller`, `admin` | CHECK `0001` | Pendaftaran publik hanya menerima `buyer` atau `seller` (`pending_registrations.role` CHECK `buyer`,`seller`) |
| `users.status` | `pending`, `active`, `suspended`, `deleted` | CHECK `0001` | Akses terproteksi mensyaratkan `status='active'` |
| `otp_challenges.purpose` | `register`, `login` | CHECK `0003` | Tantangan login membawa `pre_auth_token_hash` |
| `auth_throttles.scope_type` | `email`, `ip`, `email_ip`, `challenge` | CHECK `0004` | Kode memakai `email` dan `email_ip` |
| `auth_throttles.flow` | `password`, `otp_register`, `otp_login`, `otp_resend`, `register_start` | CHECK `0004` | Kode memakai `password`, `otp_register`, `otp_login` |
| `seller_stalls.role` | `owner`, `staff` | CHECK `0006` | Seed dan service membuat `owner` |
| `email_outbox.status` | `pending`, `sent`, `failed` | CHECK `0009` | Worker outbox seperti dijelaskan pada §5 |

### Nilai `login_sessions.revoke_reason` yang dipakai kode

Kolom `revoke_reason` tidak dibatasi CHECK. Nilai yang benar-benar ditulis aplikasi:

| Nilai | Kapan |
|---|---|
| `logout` | Pengguna logout (`sessions.RevokeCurrent`) |
| `revoked_by_user` | Pengguna mencabut sesi lain (`sessions.RevokeOther`) |
| `reuse_detected` | Token refresh lama dipakai ulang; seluruh keluarga token dicabut (`sessions.revokeFamily`) |
| `expired` | Sesi kedaluwarsa saat rotasi token (`sessions.Rotate`) |

## 5. Perilaku retensi dan pembersihan (lingkungan dev)

Pembersihan dijalankan oleh ticker 1 jam di `services/api/cmd/api/main.go`:

| Kebersihan | Pemicu | Perilaku |
|---|---|---|
| `auth.Repo.CleanupExpired(ctx, retentionDays)` | Ticker 1 jam | Menghapus `pending_registrations` yang `expires_at` lebih lama dari 2 hari; `otp_challenges` yang `expires_at` lebih lama dari 2 hari; `auth_throttles` dengan `COALESCE(locked_until, updated_at)` lebih lama dari `AUDIT_RETENTION_DAYS`; `auth_events` lebih lama dari `AUDIT_RETENTION_DAYS`; `email_outbox` berstatus `sent` dengan `sent_at` lebih lama dari 7 hari |
| `sessions.CleanupExpired(ctx)` | Ticker 1 jam | Menghapus `login_sessions` yang sudah dicabut (`revoked_at IS NOT NULL`) lebih lama dari 7 hari |
| Worker outbox | Ticker 5 detik | Memproses maksimal 10 baris `status='pending'` dengan `next_attempt_at <= now()` menggunakan `FOR UPDATE SKIP LOCKED`; menghapus baris jika tantangannya sudah consuming/tergantikan/kedaluwarsa; retry dengan backoff `30s * 2^(attempt-1)` (maksimum 10 menit); setelah 5 percobaan status menjadi `failed` |
| Retensi audit | `AUDIT_RETENTION_DAYS` (default 30) | Nilai ini diteruskan ke `auth.Repo.CleanupExpired` dan berlaku untuk `auth_throttles` serta `auth_events`. Tabel `audit_logs` sendiri **belum** memiliki pembersihan otomatis di kode; kebijakan dan mekanisme penghapusan `audit_logs` harus ditentukan |
| Data transaksi | - | Tidak ada penghapusan otomatis untuk `orders`, `order_items`, `payments`, `payment_events`, `audit_logs`. Kebijakan retensi/pseudonimisasi data pesanan dan penghapusan akun belum ditetapkan (PRD §4 butir 8, §9.3) |

## 6. Yang masih harus diputuskan

- Retensi data pesanan, log audit, dan mekanisme penghapusan akun (termasuk efek cascade pada `carts`, `cart_items`, `login_sessions`).
- Kebersihan berkala untuk tabel `audit_logs`.
- Apakah satu seller boleh memiliki beberapa stan (model `seller_stalls` sudah mendukung, aturan kampus belum ditetapkan).
- Mata uang dan zona waktu final kampus; saat ini default `IDR` dan `Asia/Jakarta` (D20) dan dapat dikonfigurasi.
- Strategi pencarian produk (index `lower(name)` sudah ada; ILIKE/trigram/FTS belum diputuskan).

# Product Requirements Document
## Website Kantin Kampus

**Status:** Draf untuk validasi kebutuhan  
**Versi:** 1.0  
**Tanggal:** 28 Oktober 2026  
**Bahasa:** Indonesia

> Dokumen ini menetapkan kebutuhan produk dan rancangan awal teknis; dokumen ini bukan bukti bahwa aplikasi telah dibangun, diuji, atau lolos tinjauan keamanan. Nilai konfigurasi, kebijakan kampus, dan keputusan yang belum diketahui ditandai sebagai perlu diisi atau dikonfirmasi.

## 1. Ringkasan produk

Website Kantin Kampus membantu mahasiswa dan warga kampus menemukan makanan dari stan, mengelola keranjang, membuat pesanan, lalu membayar secara langsung kepada kasir atau mengikuti alur QRIS yang masih berupa placeholder. Penjual mengelola profil stan dan produk serta memperbarui status pembayaran tunai setelah uang diterima. Pengguna dapat melihat riwayat pesanan dan mengelola sesi login.

Produk versi awal adalah aplikasi web responsif dengan dua peran utama: **buyer** dan **seller**. Identitas dan data transaksi disimpan di PostgreSQL lokal melalui Docker Desktop dan WSL pada lingkungan pengembangan. Foto produk dan foto profil disimpan di Supabase Storage. Email OTP dikirim melalui Mailjet. Kode aplikasi dikelola dalam repository GitHub.

### 1.1 Tujuan

- Memudahkan buyer mencari produk berdasarkan nama dan stan, melihat harga, dan membuat pesanan.
- Memberi seller alur ringkas untuk mengelola katalog stan dan mengonfirmasi pembayaran tunai.
- Menggunakan verifikasi email ber-OTP untuk pendaftaran dan login.
- Menyediakan pengelolaan sesi agar pengguna dapat mencabut sesi perangkat lain tanpa memutus sesi yang sedang dipakai.
- Menjadi dasar yang dapat diimplementasikan bertahap, dijelaskan kepada tim, dan diuji dengan kriteria yang jelas.

### 1.2 Indikator keberhasilan

Target numerik ditetapkan setelah baseline dan uji coba kampus tersedia. Pada pilot, ukur:

| Indikator | Definisi |
|---|---|
| Keberhasilan pendaftaran | Persentase pengguna yang menyelesaikan formulir dan OTP |
| Keberhasilan checkout | Persentase keranjang valid yang menjadi pesanan |
| Akurasi total | Total pesanan sesuai snapshot harga dan kuantitas saat dibuat |
| Konfirmasi tunai | Pesanan tunai yang kasir tandai lunas hanya setelah pembayaran diterima |
| Kegagalan OTP/email | Pengiriman gagal, kedaluwarsa, atau verifikasi gagal, dibedakan per sebab |
| Keandalan aplikasi | Tingkat error API dan ketersediaan selama jam operasional pilot |
| Kegunaan seller | Waktu menyelesaikan tugas umum seperti menambah produk dan menandai lunas |

Angka sasaran, periode retensi, jam layanan, dan metode pengumpulan analitik masih perlu disepakati. Jangan mengumpulkan data analitik pribadi yang tidak dibutuhkan.

## 2. Pengguna dan peran

### 2.1 Buyer

Mahasiswa atau warga kampus yang mendaftar sebagai buyer, menjelajahi produk, menyusun keranjang, mengirim pesanan, memilih metode pembayaran yang tersedia, dan memeriksa status serta riwayat pesanannya.

### 2.2 Seller

Pemilik atau petugas stan yang mendaftar sebagai seller, melihat pesanan untuk stan yang berwenang dikelolanya, mengatur produk, dan menandai pembayaran tunai lunas setelah kasir menerima pembayaran.

### 2.3 Admin operasional (keputusan terbuka)

Versi kebutuhan saat ini hanya menyebut buyer dan seller. Belum dipastikan apakah perlu akun admin kampus untuk menyetujui seller, menonaktifkan akun, meninjau laporan, atau mengelola stan. Jangan memberikan hak admin kepada seller. Putuskan alur ini sebelum produksi.

### 2.4 Matriks hak akses awal

| Aksi | Buyer | Seller pemilik stan | Admin (jika ditambahkan) |
|---|---:|---:|---:|
| Mengelola profil sendiri dan sesi | Ya | Ya | Sesuai kebijakan |
| Melihat katalog aktif | Ya | Ya | Ya |
| Mengubah produk | Tidak | Ya, stan terkait | Ya |
| Melihat detail pesanan | Pesanan sendiri | Pesanan stan terkait | Sesuai kebijakan |
| Membuat pesanan | Ya | Tidak secara default | Tidak secara default |
| Menandai pembayaran lunas | Tidak | Ya, untuk stan terkait | Sesuai kebijakan |
| Mengubah status pemenuhan | Tidak | Ya, untuk stan terkait | Sesuai kebijakan |

Server wajib memeriksa izin setiap permintaan. Menyembunyikan tombol pada antarmuka bukan kontrol akses.

## 3. Cakupan produk

### 3.1 Termasuk dalam versi awal

- Situs web responsif, bukan aplikasi mobile native.
- Pendaftaran email/password dengan pilihan buyer atau seller dan verifikasi OTP email.
- Login dengan email/password lalu tantangan OTP email.
- JWT access token berumur singkat serta refresh session yang dapat diputar dan dicabut.
- Dashboard berbeda untuk buyer dan seller; sidebar navigasi dan header preferensi tema.
- Tema terang/gelap dan aksen merah, kuning, hijau, biru, atau ungu.
- Katalog produk dengan foto, nama, stan, harga, dan ketersediaan.
- Keranjang berbasis kuantitas dan bar bawah yang menampilkan jumlah item serta total.
- Ringkasan checkout dan pembuatan pesanan dengan snapshot item/harga.
- Pilihan tunai dan opsi QRIS informatif tanpa QR atau klaim transaksi digital.
- Seller melihat pesanan stan dan menandai tunai lunas setelah menerima uang.
- Riwayat pembelian buyer dan riwayat/status pesanan yang relevan bagi seller.
- Daftar sesi login serta pencabutan sesi satu per satu tanpa mencabut sesi aktif.
- Pengaturan foto profil; area pengaturan lain disiapkan sebagai perluasan, tanpa menetapkan fitur yang belum diminta.
- Validasi, audit keamanan dasar, proteksi brute force/penyalahgunaan, dokumentasi setup, dan pengujian penerimaan.

### 3.2 Tidak termasuk dalam versi awal

- Aplikasi Android/iOS, login melalui aplikasi mobile, atau integrasi aplikasi native.
- QRIS sungguhan, pembuatan/penayangan QR, payment gateway, settlement, atau rekonsiliasi bank.
- Pembayaran kartu, dompet digital, refund otomatis, split payment, dan promosi/loyalty.
- Chat, ulasan/rating, rekomendasi berbasis AI, dan notifikasi push.
- Geolokasi presisi, pelacakan lokasi perangkat, atau klaim identifikasi perangkat yang pasti.
- Reset password dan perubahan email sampai kebijakan serta alurnya ditetapkan (lihat pertanyaan terbuka).
- Multi-campus, multi-currency, multi-bahasa, dan aplikasi offline.
- Pemaksaan redirect semua permintaan ke `http://localhost:3000`.
- Upaya menyembunyikan DevTools/F12 sebagai fitur keamanan.

## 4. Asumsi dan keputusan yang harus dikonfirmasi

1. Seller boleh mendaftar sendiri. Apakah seller harus disetujui admin sebelum dapat menjual?
2. Apakah satu akun seller hanya memiliki satu stan, atau dapat memiliki beberapa stan?
3. Apakah buyer dapat membeli item dari beberapa stan dalam satu pesanan? Rancangan awal mengizinkan satu checkout memiliki item lintas stan, dengan konfirmasi pembayaran per stan. Ini perlu disetujui karena berdampak pada pemenuhan dan pembayaran.
4. Bagaimana buyer menunjukkan identitas saat membayar tunai: nama tampilan, kode pesanan, atau email tersamar? Rekomendasi: kode pesanan pendek dan nama tampilan; email penuh tidak ditampilkan ke seller kecuali ada kebutuhan yang disetujui.
5. Apakah pesanan dapat dibatalkan buyer, dan sampai status apa? Siapa menangani pesanan tidak diambil?
6. Apakah harga sudah termasuk pajak/biaya tambahan? Rancangan awal tidak menambahkan biaya tersembunyi.
7. Berapa lama masa berlaku pesanan QRIS placeholder dan apa instruksi yang ditampilkan? Tanpa integrasi, status tidak boleh menyiratkan pembayaran sukses.
8. Kebijakan retensi/penghapusan akun, data pesanan, log audit, serta persyaratan privasi kampus perlu ditetapkan.
9. Apakah target deployment produksi dapat mengakses PostgreSQL terkelola? PostgreSQL di Docker Desktop + WSL adalah target lokal/dev yang ditentukan; bukan asumsi bahwa konfigurasi itu tepat untuk produksi.
10. Tetapkan domain, lingkungan hosting, batas ukuran gambar, mata uang, zona waktu kampus, jam operasional, dan kontak dukungan.

## 5. Alur pengguna utama

### 5.1 Pendaftaran

1. Pengguna memasukkan username, email, password, dan memilih buyer atau seller.
2. Antarmuka menjelaskan persetujuan syarat/privasi jika kebijakan tersebut sudah disediakan.
3. Server memvalidasi input, mengecek batas percobaan, membuat tantangan OTP satu kali, dan mengirim email melalui Mailjet.
4. Pengguna memasukkan OTP sebelum kedaluwarsa. Kode tidak disimpan dalam bentuk teks biasa.
5. Setelah valid, server membuat akun terverifikasi secara atomik dan mengakhiri tantangan OTP.
6. Jika pendaftaran gagal karena email telah digunakan, respons publik tetap generik untuk mengurangi enumerasi akun; antarmuka memberi instruksi aman sesuai kebijakan.

Rekomendasi implementasi: simpan pendaftaran yang belum diverifikasi sebagai `pending_registration` dengan data sensitif minimum dan masa kedaluwarsa, atau buat akun berstatus `pending_verification`. Jangan membuat akun aktif sebelum OTP valid. Pilih salah satu pendekatan dan dokumentasikan penghapusan data pending.

### 5.2 Login

1. Pengguna mengirim email dan password.
2. Server menerapkan throttling/lockout password sebelum atau sesudah memeriksa kredensial sesuai desain anti-enumerasi.
3. Jika benar, server membuat tantangan pre-auth terbatas dan mengirim OTP login.
4. Pengguna memasukkan OTP. Jika valid, server membuat sesi refresh baru dan memberikan access token.
5. Password benar tanpa OTP tidak menghasilkan sesi terautentikasi.

### 5.3 Menambah produk ke keranjang

1. Buyer membuka katalog atau detail produk.
2. Buyer menambah produk; kontrol berubah menjadi stepper kuantitas.
3. Bar keranjang di bawah menampilkan jumlah item dan total indikatif.
4. Server memvalidasi ulang ketersediaan dan harga saat checkout. Keranjang klien bukan sumber harga tepercaya.

### 5.4 Checkout dan pembayaran tunai

1. Buyer membuka ringkasan berisi produk, stan, kuantitas, subtotal, total, dan keterangan pembayaran.
2. Buyer memilih tunai, mengonfirmasi, dan server membuat order beserta item snapshot dalam satu transaksi database.
3. Setiap stan melihat item/porsi pesanan yang relevan untuk stan tersebut dan kode order.
4. Buyer membayar langsung kepada kasir. Seller hanya menandai lunas setelah menerima uang.
5. Server menyimpan siapa yang mengubah status, kapan, dari status apa ke status apa, dan untuk pembayaran/stan yang mana.
6. Buyer melihat status diperbarui pada detail/riwayat pesanan.

### 5.5 Opsi QRIS placeholder

Halaman checkout dapat menawarkan pilihan “QRIS (belum tersedia)” atau pilihan informasi yang jelas menyatakan fitur belum aktif. Jika pilihan ini diaktifkan untuk demonstrasi, pesanan harus berstatus `awaiting_manual_or_external_confirmation` atau `unavailable`; tampilkan instruksi dan batas waktu hanya jika kebijakan operasional sudah ditentukan. **Jangan menampilkan QR, nomor pembayaran, tombol yang seolah memproses transaksi, atau status lunas otomatis.** Jangan menyebutnya integrasi/payment gateway.

### 5.6 Pengelolaan sesi

1. Pengguna melihat daftar sesi: label perangkat/browser yang diperkirakan, platform, waktu login, terakhir aktif, dan informasi jaringan yang disamarkan.
2. Lokasi, bila ada, adalah perkiraan kasar dari IP dan dapat salah. Jangan meminta izin geolokasi untuk fitur ini.
3. Pengguna mencabut satu sesi lain. Refresh token sesi target dicabut; sesi saat ini tetap aktif.
4. Sesi aktif ditandai jelas. Tidak tersedia tombol untuk mencabut sesi aktif dari alur ini; logout saat ini memiliki aksi tersendiri.
5. Pencabutan berlaku saat permintaan berikutnya memakai refresh token. Access token yang telah diterbitkan tetap berlaku sampai expiry pendek, kecuali aplikasi menerapkan pemeriksaan revocation tambahan.

## 6. Kebutuhan fungsional

Prioritas: **P0** wajib pilot; **P1** penting setelah alur inti stabil; **P2** peningkatan.

### 6.1 Akun dan autentikasi

- **AUTH-01 (P0):** Form pendaftaran menerima username, email, password, dan peran buyer/seller.
- **AUTH-02 (P0):** Email diverifikasi dengan OTP sebelum akun dapat mengakses fitur terproteksi.
- **AUTH-03 (P0):** Login memerlukan password benar dan OTP yang valid.
- **AUTH-04 (P0):** OTP memiliki expiry, cooldown resend, batas percobaan, purpose, dan single-use.
- **AUTH-05 (P0):** OTP disimpan sebagai hash/HMAC ber-key; OTP tidak ditulis ke log.
- **AUTH-06 (P0):** Respons pendaftaran/login/OTP tidak mengungkap secara berlebihan apakah email terdaftar.
- **AUTH-07 (P0):** Password disimpan memakai Argon2id (pilihan utama) atau bcrypt dengan parameter yang layak dan dapat dikalibrasi.
- **AUTH-08 (P0):** Access token JWT berumur singkat, bertanda tangan kuat, memuat issuer/audience/subject/expiry dan ID sesi yang sesuai.
- **AUTH-09 (P0):** Refresh token acak berentropi tinggi disimpan sebagai hash, dirotasi saat refresh, serta keluarga token lama dicabut saat reuse terdeteksi.
- **AUTH-10 (P0):** Logout mencabut sesi refresh saat ini dan membersihkan token klien.
- **AUTH-11 (P0):** Pengguna melihat dan mencabut sesi lain satu per satu tanpa mencabut sesi yang sedang dipakai.
- **AUTH-12 (P1):** Alur reset password, ubah email, dan pemulihan akun ditetapkan setelah kebijakan disepakati.

### 6.2 Proteksi percobaan dan lockout

Hitungan harus dilakukan server-side dan persisten, dengan jendela waktu yang eksplisit, pencatatan audit, dan mekanisme yang tidak bisa dilewati dengan menghapus OTP, meminta kode baru, mengganti browser, atau mengulang request. Pertahankan counter lintas ronde sesuai kunci/rentang yang ditetapkan. Terapkan pula rate limit pengiriman OTP agar email provider tidak disalahgunakan.

| Alur | Kebijakan yang diminta | Aturan pelaksanaan |
|---|---|---|
| OTP registrasi | 5 OTP salah: blokir ronde berikutnya; ronde kedua 5 salah: email + IP 5 menit; ronde ketiga 5 salah: email + IP 15 menit | Ronde pertama mencatat 5 kegagalan dan mencegah submit OTP lebih lanjut untuk tantangan itu. Ronde berikutnya baru dibuka melalui proses resend yang diizinkan setelah cooldown. Lock dihitung pada email ternormalisasi dan IP yang teramati, dengan fallback saat IP tak tersedia. Setelah ronde ketiga, gunakan kebijakan eskalasi/dukungan, bukan reset otomatis yang memudahkan bypass. |
| Password login | 5 salah: email 3 menit; gelombang berikutnya 5 salah: email + IP 15 menit | Gelombang/counter tidak direset oleh request login baru. Setelah lock habis, counter berlanjut/naik berdasarkan jendela yang ditentukan; keberhasilan autentikasi dapat membersihkan counter sesuai kebijakan, tetapi tidak boleh membersihkan lock aktif. |
| OTP login | 5 OTP salah: blokir ronde pertama; ronde kedua 5 salah: email + IP 15 menit | Tantangan pre-auth terikat email, purpose, dan konteks yang tidak dapat dipindah; pengiriman ulang tidak menghapus jumlah kegagalan/lock. |

Ketentuan lintas alur:

- Normalisasi email secara konsisten sebelum key counter dibuat; jangan menciptakan aturan alias Gmail yang tidak berlaku umum.
- IP diambil dari koneksi yang dipercaya. Header `X-Forwarded-For` hanya dipercaya bila request datang dari proxy yang terkonfigurasi.
- Jangan menyimpan OTP/password mentah dalam tabel, telemetry, URL, atau log.
- Gunakan respons generik pada klien; log internal mencatat kategori sebab tanpa rahasia.
- Tampilkan waktu tunggu yang wajar tanpa membocorkan counter email pihak lain.
- Counter IP dapat berdampak pada jaringan kampus bersama; rancang ambang gabungan, observabilitas, dan jalur penanganan false positive.
- Menambah rate limiter per IP, akun, email, perangkat/sesi, dan pengiriman provider dengan batas yang dapat dikonfigurasi. Angka selain yang ditentukan perlu diputuskan setelah uji beban/abuse.
- Uji kasus concurrent requests dengan operasi atomik/locking database supaya percobaan serentak tidak melewati ambang.

### 6.3 Dashboard dan preferensi

- **DASH-01 (P0):** Buyer dan seller melihat navigasi sesuai peran.
- **DASH-02 (P0):** Header menyediakan tema terang/gelap dan pilihan aksen merah, kuning, hijau, biru, atau ungu.
- **DASH-03 (P1):** Preferensi disimpan per akun setelah login dan memiliki fallback lokal untuk pengalaman sebelum login, tanpa menyimpan data sensitif di local storage.
- **DASH-04 (P0):** Layout berfungsi pada layar ponsel dan desktop melalui browser; ini bukan aplikasi mobile native.
- **DASH-05 (P1):** Status loading, kosong, gagal, dan sukses memiliki desain yang konsisten.

### 6.4 Katalog dan produk

- **CAT-01 (P0):** Buyer melihat foto, nama produk, stan, harga, dan ketersediaan.
- **CAT-02 (P0):** Produk nonaktif/tidak tersedia tidak dapat dimasukkan ke keranjang.
- **CAT-03 (P1):** Buyer dapat mencari produk dan memfilter stan; kategori dapat ditambahkan jika data kategori disetujui.
- **CAT-04 (P0):** Seller dapat membuat, melihat, mengubah, dan menonaktifkan produk di stan yang berhak dikelolanya.
- **CAT-05 (P0):** Harga disimpan dalam satuan minor integer, bukan floating point; mata uang harus ditetapkan (asumsi awal: IDR).
- **CAT-06 (P0):** Seller dapat mengunggah foto melalui alur server yang aman, memvalidasi ukuran/tipe, dan menghapus/mengganti foto terkait.
- **CAT-07 (P1):** Perubahan harga setelah order dibuat tidak mengubah snapshot order yang sudah tersimpan.

### 6.5 Keranjang dan checkout

- **CART-01 (P0):** Buyer menambah, mengurangi, dan menghapus kuantitas produk.
- **CART-02 (P0):** Bar keranjang menampilkan jumlah item dan estimasi total yang diperbarui.
- **CART-03 (P0):** Checkout memvalidasi produk aktif, kuantitas positif, batas kuantitas, dan harga terbaru di server.
- **CART-04 (P0):** Pembuatan order dan order item dilakukan atomik serta menerima idempotency key untuk mencegah order ganda saat retry.
- **CART-05 (P0):** Ringkasan memperlihatkan subtotal/total, stan, metode bayar, dan instruksi status yang tidak ambigu.
- **CART-06 (P1):** Keranjang persisten untuk pengguna login. Strategi keranjang lintas stan perlu disetujui.

### 6.6 Pesanan dan pembayaran

- **ORD-01 (P0):** Buyer melihat daftar dan detail pesanan miliknya, termasuk tanggal, produk, stan, harga snapshot, kuantitas, metode, dan status.
- **ORD-02 (P0):** Seller hanya melihat pesanan yang memuat item stan yang dikelolanya.
- **ORD-03 (P0):** Seller menandai pembayaran tunai sebagai diterima; API merekam aktor, waktu, dan status sebelumnya.
- **ORD-04 (P0):** Tombol lunas tidak muncul untuk status/metode yang tidak dapat dikonfirmasi seller.
- **ORD-05 (P0):** Request ulang konfirmasi idempotent; perubahan status ilegal ditolak.
- **ORD-06 (P0):** QRIS tidak mengeluarkan QR dan tidak menghasilkan konfirmasi pembayaran otomatis.
- **ORD-07 (P1):** Seller memperbarui status persiapan/pesanan jika tahapan ini disepakati; status pembayaran dipisah dari status pemenuhan.
- **ORD-08 (P1):** Tampilkan kode order yang cukup pendek untuk disebut di kasir, unik dalam cakupan yang aman, dan tidak menjadi token akses.

### 6.7 Profil dan foto

- **PROF-01 (P0):** Pengguna dapat mengunggah, mengganti, dan menghapus foto profil.
- **PROF-02 (P0):** Validasi tipe file berdasarkan konten, ukuran, dan dimensi; nama objek dibuat acak dan tidak memakai nama file pengguna.
- **PROF-03 (P0):** Supabase Storage menyimpan file; kredensial service role hanya berada di backend, tidak di bundle Next.js/browser.
- **PROF-04 (P1):** Foto dapat disajikan publik hanya bila kebijakan privasi mengizinkan; jika privat, gunakan URL bertanda tangan berumur pendek.

### 6.8 Sesi dan audit

- **SESS-01 (P0):** Daftar sesi berisi label browser/platform yang diperkirakan, IP tersamarkan, waktu login, dan terakhir aktif.
- **SESS-02 (P0):** Pencabutan satu sesi tidak mencabut sesi pemohon.
- **SESS-03 (P0):** Logout sesi dan rotasi refresh token dicatat.
- **SESS-04 (P0):** Log audit untuk tindakan sensitif mencatat actor, objek, timestamp, hasil, serta request/correlation ID; tidak berisi rahasia.
- **SESS-05 (P1):** Tentukan masa retensi dan akses audit sebelum produksi.

## 7. UX dan prinsip antarmuka

- Gaya sederhana dan mudah dipindai; konten produk menjadi fokus, bukan dekorasi.
- Sidebar konsisten untuk dashboard, dengan item aktif yang terlihat dan label yang jelas. Susunan screenshot hanya menjadi inspirasi visual, bukan spesifikasi piksel.
- Pada layar kecil, sidebar beralih menjadi navigasi ringkas yang tetap dapat diakses keyboard.
- Aksen warna tidak menggantikan label teks atau ikon untuk status penting. Kontras harus memadai pada tema terang dan gelap.
- Status order memakai label teks: menunggu pembayaran, lunas, diproses, siap diambil, selesai, dibatalkan, atau gagal/kedaluwarsa sesuai status yang diimplementasikan.
- Konfirmasi pembayaran seller meminta tindakan eksplisit dan memperlihatkan kode order, jumlah yang diterima, dan stan; hindari tombol yang mudah tertekan tanpa sengaja.
- Tampilkan email buyer tersamar atau kode order di dashboard seller. Paparan email penuh memerlukan alasan bisnis dan persetujuan privasi.
- DevTools F12 tidak dapat secara andal atau seharusnya disembunyikan sebagai pengamanan. Keamanan harus berada di server. Debug logging/route hanya untuk development, tidak berisi rahasia, dan tidak terbuka di produksi.
- Route guard harus memeriksa status sesi/role dan mengarahkan ke halaman login atau halaman yang relevan berdasarkan route. Jangan memaksa semua request menuju `localhost:3000`; URL tersebut hanya untuk lingkungan lokal.
- Semua form memiliki label, validasi yang dapat dipahami, focus state, pesan error, dukungan keyboard, dan atribut aksesibilitas.

## 8. Model status dan transisi

Pisahkan **status order**, **status pemenuhan per stan**, dan **status pembayaran**. Untuk satu order lintas stan, pembayaran tunai bisa dikonfirmasi terpisah per stan; ringkasan order baru disebut lunas bila aturan pembayaran yang disepakati terpenuhi.

### 8.1 Status order (usulan awal)

`awaiting_payment` → `confirmed` → `in_preparation` → `ready_for_pickup` → `completed`  
Cabang terminal: `cancelled`, `expired`, `rejected` (hanya jika kebijakan operasional mengizinkan).

### 8.2 Status pembayaran

- Tunai: `cash_due` → `cash_paid` (kasir seller mengonfirmasi penerimaan uang).
- Tunai dapat menjadi `void` jika order dibatalkan sebelum pembayaran; mekanisme setelah tunai diterima harus kebijakan eksplisit, bukan perubahan otomatis.
- QRIS placeholder: `unavailable` atau `awaiting_external_confirmation`; tidak boleh menjadi `paid` tanpa integrasi/konfirmasi terdefinisi.
- Tiap perubahan menyimpan waktu dan aktor. Buyer tidak dapat memanggil endpoint seller untuk menandai lunas.

### 8.3 OTP dan sesi

- OTP: `pending` → `verified`; cabang terminal `expired`, `locked`, `superseded`, `consumed`.
- Pre-auth login: `pending_otp` → `authenticated` atau `expired/locked`.
- Sesi: `active` → `revoked`, `expired`, atau `rotated`; refresh token sebelumnya tidak dapat digunakan kembali.

Validasi transisi diletakkan di service domain dan ditegakkan dalam transaksi database. Hindari menerima status bebas dari klien.

## 9. Model data relasional

Gunakan PostgreSQL dengan UUID acak untuk primary key. Waktu disimpan sebagai `timestamptz` UTC dan ditampilkan dengan zona waktu kampus yang dikonfirmasi. Nama kolom di bawah adalah rancangan; migrasi final perlu disesuaikan dengan versi PostgreSQL dan ORM/query tooling yang dipilih.

### 9.1 Tabel inti

#### `users`

| Kolom | Tipe/aturan | Catatan |
|---|---|---|
| `id` | UUID PK | ID acak, bukan urutan yang mudah ditebak |
| `username` | varchar, unique sesuai aturan normalisasi | Nama tampilan/handle |
| `email` | citext atau varchar normalized, unique | Email ternormalisasi; lindungi data personal |
| `password_hash` | text | Argon2id atau bcrypt; jangan pernah plaintext |
| `role` | enum/check | `buyer` atau `seller`; admin terpisah bila disetujui |
| `email_verified_at` | timestamptz nullable | NULL berarti belum terverifikasi |
| `status` | enum/check | `pending`, `active`, `suspended`, `deleted` sesuai kebijakan |
| `profile_image_key` | text nullable | Object key Supabase, bukan kredensial |
| `created_at`, `updated_at` | timestamptz | Audit dasar |

#### `pending_registrations` (bila dipilih)

`id UUID PK`, `email_normalized`, `username`, `password_hash`, `role`, `expires_at`, `created_at`, `attempt_group_id`, `verified_at nullable`. Hapus/bersihkan setelah expiry sesuai retensi. Batasi unik email untuk pendaftaran pending yang belum expired dengan strategi yang aman. Jangan menyimpan password mentah.

#### `otp_challenges`

Menggantikan penyimpanan OTP plaintext di rancangan awal.

| Kolom | Catatan |
|---|---|
| `id UUID PK` | ID tantangan |
| `user_id UUID nullable FK users` | NULL untuk pendaftaran pending jika sesuai desain |
| `pending_registration_id UUID nullable FK` | Relasi untuk pendaftaran belum selesai |
| `email_normalized` | Kunci lookup/lockout; batasi paparan |
| `purpose` | `register` / `login` |
| `otp_hash` | Hash/HMAC ber-key, bukan teks kode |
| `pre_auth_token_hash` | Untuk login OTP, bila dipakai; token asli hanya ke klien |
| `attempt_count`, `round_number` | Counter atomik |
| `expires_at`, `consumed_at`, `superseded_at` | Siklus hidup single-use |
| `created_at`, `last_sent_at` | Cooldown/resend |
| `request_ip_hash` | HMAC IP dengan rotasi key/retensi; hindari menyimpan IP mentah tanpa kebutuhan |

Tambahkan indeks untuk email/purpose/status/expiry. Tantangan baru tidak boleh menghapus lockout sebelumnya.

#### `auth_throttles` dan `auth_events`

`auth_throttles` menyimpan `id`, `scope_type` (`email`, `ip`, `email_ip`, `challenge`), `scope_key_hash`, `flow`, `round_number`, `failure_count`, `window_started_at`, `locked_until`, `created_at`, `updated_at`. Buat unique constraint pada kombinasi flow/scope/key/window sesuai desain, gunakan update atomik atau transaksi serializable yang terukur. `auth_events` menyimpan kategori event, email/IP pseudonymized bila dibutuhkan, hasil, timestamp, dan correlation ID. Tetapkan retensi; jangan simpan password atau OTP.

#### `login_sessions`

| Kolom | Catatan |
|---|---|
| `id UUID PK`, `user_id UUID FK` | Pemilik sesi |
| `refresh_token_hash` | Hash token refresh aktif |
| `token_family_id UUID` | Deteksi reuse setelah rotasi |
| `user_agent_summary` | Browser/platform perkiraan, bukan fingerprint unik |
| `ip_hash` atau `ip_masked` | Minimalkan; jangan tampilkan IP publik ke buyer atau seller lain |
| `created_at`, `last_seen_at`, `expires_at` | Waktu sesi |
| `revoked_at`, `revoke_reason` | Pencabutan/audit |
| `is_current` | Sebaiknya dihitung dari session ID request; jangan bergantung hanya pada flag mutable |

Kolom `temp otp` dan `pre_auth_token` plaintext yang diusulkan awal tidak disimpan. Pre-auth token disimpan sebagai hash/ditandatangani singkat dan hanya berlaku untuk tantangan terkait.

#### `stalls`

`id UUID PK`, `name`, `description nullable`, `location_label nullable`, `status`, `created_at`, `updated_at`. Keunikan nama stan ditentukan oleh aturan kampus, bukan diasumsikan global.

#### `seller_stalls`

`seller_id UUID FK users`, `stall_id UUID FK stalls`, `role` (owner/staff bila butuh), `created_at`; composite PK `(seller_id, stall_id)`. Memungkinkan satu seller atau beberapa staf mengelola stan, bila model ini disetujui. Jika satu seller hanya satu stan, constraint dapat dipersempit.

#### `products`

`id UUID PK`, `stall_id UUID FK stalls`, `name`, `description nullable`, `price_minor bigint CHECK >= 0`, `currency char(3)`, `image_key nullable`, `availability_status`, `stock_quantity nullable`, `created_by UUID FK users`, `created_at`, `updated_at`, `archived_at nullable`. Persediaan dapat dihilangkan bila stok tidak dikelola. Tentukan perilaku saat stok habis.

#### `carts` dan `cart_items`

`carts(id UUID PK, buyer_id UUID FK users UNIQUE, created_at, updated_at)` dan `cart_items(id UUID PK, cart_id UUID FK carts, product_id UUID FK products, quantity integer CHECK > 0, created_at, updated_at, UNIQUE(cart_id, product_id))`. Cart adalah kenyamanan; harga selalu dihitung ulang server ketika order dibuat.

#### `orders`

`id UUID PK`, `public_code` unik/acak, `buyer_id UUID FK users`, `status`, `currency`, `subtotal_minor`, `total_minor`, `idempotency_key`, `created_at`, `updated_at`, `cancelled_at nullable`. Constraint unik `(buyer_id, idempotency_key)` bila key disediakan. Simpan nilai total dalam integer minor units dan hitung ulang server-side.

#### `order_items`

`id UUID PK`, `order_id UUID FK orders`, `product_id UUID nullable FK products`, `stall_id UUID FK stalls`, `product_name_snapshot`, `unit_price_minor`, `quantity`, `line_total_minor`, `currency`, `created_at`. Snapshot mempertahankan nama/harga/stan pada waktu pembelian walau produk berubah atau diarsipkan.

#### `order_stall_fulfillments`

Untuk order lintas stan: `id UUID PK`, `order_id UUID FK orders`, `stall_id UUID FK stalls`, `fulfillment_status`, `updated_by UUID FK users nullable`, `updated_at`, `UNIQUE(order_id, stall_id)`. Hak akses seller diperiksa terhadap `seller_stalls`.

#### `payments`

`id UUID PK`, `order_id UUID FK orders`, `stall_id UUID nullable FK stalls`, `method` (`cash`, `qris_placeholder`), `status`, `amount_minor`, `currency`, `paid_at nullable`, `confirmed_by UUID FK users nullable`, `expires_at nullable`, `external_reference nullable`, `created_at`, `updated_at`. Untuk tunai per stan, gunakan satu record per stan. Jangan mengisi provider reference palsu. QRIS placeholder tidak boleh mempunyai bukti transaksi yang direkayasa.

#### `payment_events`

`id UUID PK`, `payment_id UUID FK payments`, `from_status`, `to_status`, `actor_user_id UUID nullable FK users`, `reason_code`, `created_at`, `request_id`. Tabel append-only untuk perubahan penting; akses update/delete dibatasi.

#### `audit_logs`

`id UUID PK`, `actor_user_id UUID nullable`, `action`, `resource_type`, `resource_id`, `outcome`, `request_id`, `metadata_redacted JSONB`, `created_at`. Metadata hanya allowlist; tanpa token, OTP, password, alamat email lengkap, atau payload sensitif yang tidak diperlukan.

#### `email_outbox` (direkomendasikan)

`id UUID PK`, `purpose`, `recipient_encrypted_or_minimized`, `template_key`, `payload_redacted JSONB`, `status`, `attempt_count`, `next_attempt_at`, `provider_message_id nullable`, `created_at`, `sent_at nullable`. Gunakan pola transactional outbox agar tantangan OTP dan permintaan pengiriman tidak kehilangan konsistensi. Jangan masukkan OTP ke log/outbox plaintext; bila pengiriman ulang membutuhkan kode, desain penyimpanan terenkripsi berumur pendek atau buat ulang tantangan dengan kontrol yang sesuai.

### 9.2 Relasi ringkas

```text
users 1---N login_sessions
users 1---N otp_challenges
users 1---1 carts 1---N cart_items N---1 products N---1 stalls
users N---N stalls (seller_stalls)
users 1---N orders 1---N order_items N---1 stalls
orders 1---N payments 1---N payment_events
orders 1---N order_stall_fulfillments N---1 stalls
users 1---N audit_logs (sebagai actor, nullable untuk sistem)
```

### 9.3 Indeks dan integritas

- Index `users(email_normalized)` unique dan `users(role, status)` sesuai query.
- Index `products(stall_id, availability_status)` serta pencarian nama sesuai strategi (ILIKE/trigram/FTS ditetapkan kemudian).
- Index `orders(buyer_id, created_at DESC)`; index status/tanggal untuk antrian seller melalui item/fulfillment.
- Index `login_sessions(user_id, revoked_at, expires_at)` dan expiry OTP untuk cleanup.
- Foreign key dan CHECK constraint menjaga kuantitas/harga/status valid.
- Tentukan kebijakan penghapusan: data finansial/pesanan umumnya tidak ikut cascade-delete dari user; gunakan pseudonimisasi sesuai kebijakan retensi.
- Migrasi schema diberi versi, dapat ditinjau, dan memiliki prosedur backup/restore untuk lingkungan yang relevan.

## 10. API contract

Prefix awal: `/api/v1`. Semua respons JSON UTF-8; waktu ISO-8601 UTC. Endpoint mutasi memvalidasi `Content-Type`, ukuran body, autentikasi, otorisasi, CSRF bila cookie digunakan, dan rate limit. Sertakan `request_id` pada respons/log. Kontrak final OpenAPI disimpan di repository dan menjadi sumber kebenaran.

### 10.1 Format respons

Sukses:

```json
{
  "data": {},
  "meta": {"request_id": "..."}
}
```

Gagal:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Periksa kembali data yang dimasukkan.",
    "fields": {"email": "Format email tidak valid."}
  },
  "meta": {"request_id": "..."}
}
```

Pesan generik dipakai pada autentikasi bila detail akan membocorkan keberadaan akun atau status keamanan.

### 10.2 Endpoint autentikasi

| Method & path | Tujuan | Akses |
|---|---|---|
| `POST /auth/register` | Validasi dan mulai pendaftaran; kirim OTP | Publik, rate limited |
| `POST /auth/register/verify` | Verifikasi OTP dan aktifkan akun | Publik + challenge terbatas |
| `POST /auth/otp/resend` | Kirim ulang OTP dengan cooldown dan counter yang sama | Publik, rate limited |
| `POST /auth/login` | Validasi password dan mulai pre-auth OTP | Publik, rate limited |
| `POST /auth/login/verify` | Verifikasi OTP, buat sesi, berikan access token | Publik + pre-auth challenge |
| `POST /auth/refresh` | Rotasi refresh session | Refresh credential valid, rate limited |
| `POST /auth/logout` | Cabut sesi saat ini | Authenticated |
| `GET /auth/sessions` | Daftar sesi milik pengguna | Authenticated |
| `DELETE /auth/sessions/{sessionId}` | Cabut sesi target selain sesi aktif | Authenticated + ownership check |

Jangan memasukkan OTP, token, atau password pada query string. Pilih strategi token sebelum implementasi: refresh token dalam cookie `HttpOnly`, `Secure`, `SameSite` yang tepat biasanya mengurangi paparan JavaScript, tetapi memerlukan perlindungan CSRF dan konfigurasi domain; jika refresh token dikirim body, jelaskan mitigasi penyimpanan browser dan XSS. Access token sebaiknya hanya hidup singkat dan tidak disimpan di localStorage tanpa analisis risiko.

### 10.3 Endpoint profil dan foto

| Method & path | Tujuan |
|---|---|
| `GET /me` | Profil dan role pengguna aktif |
| `PATCH /me` | Mengubah field profil yang diizinkan |
| `POST /me/profile-photo` | Minta upload target terbatas atau unggah melalui backend |
| `DELETE /me/profile-photo` | Hapus foto profil terkait |

### 10.4 Endpoint katalog/stan

| Method & path | Tujuan/otorisasi |
|---|---|
| `GET /stalls` | Daftar stan aktif |
| `GET /stalls/{stallId}` | Detail stan aktif |
| `GET /products` | Katalog; filter `stall_id`, `q`, `cursor` dengan batas |
| `GET /products/{productId}` | Detail produk aktif |
| `POST /seller/stalls/{stallId}/products` | Buat produk; seller terkait |
| `PATCH /seller/products/{productId}` | Ubah produk; seller pemilik/anggota yang berwenang |
| `DELETE /seller/products/{productId}` | Arsip/nonaktifkan produk, bukan hard delete bila sudah dipesan |

### 10.5 Endpoint keranjang/pesanan

| Method & path | Tujuan |
|---|---|
| `GET /cart` | Keranjang buyer |
| `PUT /cart/items/{productId}` | Set kuantitas; validasi produk |
| `DELETE /cart/items/{productId}` | Hapus item |
| `POST /orders/preview` | Hitung ulang subtotal dan validasi sebelum konfirmasi |
| `POST /orders` | Buat order; wajib `Idempotency-Key` |
| `GET /orders` | Riwayat order buyer dengan pagination |
| `GET /orders/{orderId}` | Detail order milik buyer; seller hanya melalui route seller berizin |
| `GET /seller/orders` | Pesanan untuk stan yang dikelola seller |
| `POST /seller/payments/{paymentId}/confirm-cash` | Tandai tunai diterima dengan optimistic concurrency/status check |
| `POST /seller/fulfillments/{fulfillmentId}/status` | Ubah status pemenuhan yang diizinkan |

### 10.6 Contoh kontrak checkout

Request:

```http
POST /api/v1/orders
Authorization: Bearer <access-token>
Idempotency-Key: <random-unique-key>
Content-Type: application/json
```

```json
{
  "payment_method": "cash",
  "items": [
    {"product_id": "uuid", "quantity": 2}
  ]
}
```

Server mengambil harga/stan terbaru dari database, menolak item tidak tersedia, menyimpan snapshot, dan mengembalikan `order_id`, `public_code`, jumlah, serta status. Klien tidak mengirim `unit_price`, `total`, `paid`, atau ID buyer sebagai sumber kebenaran. Jika metode `qris_placeholder` diizinkan, respons menyatakan `unavailable`/`awaiting_external_confirmation` beserta instruksi yang disetujui—tanpa QR.

### 10.7 Kode error minimum

`VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `OTP_INVALID_OR_EXPIRED`, `RESOURCE_UNAVAILABLE`, `IDEMPOTENCY_CONFLICT`, `PAYMENT_STATE_CONFLICT`, `INTERNAL_ERROR`. Sertakan HTTP status konsisten: 400/422 validasi, 401 autentikasi, 403 izin, 404 resource, 409 konflik state/idempotency, 429 limit, 5xx kegagalan server. Hindari detail stack trace di respons produksi.

## 11. Validasi dan penanganan kesalahan

- Validasi server menjadi otoritatif; validasi frontend hanya membantu pengalaman pengguna.
- Username: batas panjang, karakter yang diizinkan, normalisasi dan aturan unik ditetapkan serta konsisten.
- Email: trim/normalisasi konsisten, panjang maksimum aman, validasi sintaks; validasi domain bukan bukti kepemilikan.
- Password: tetapkan panjang minimum/maksimum, terima password manager dan paste, tolak password yang terlalu umum bila daftar tersedia; jangan mewajibkan aturan komposisi yang memicu password mudah ditebak.
- OTP: panjang/format tetap, expiry dan purpose terikat, perbandingan aman, sekali pakai, invalidasi setelah sukses/resend sesuai desain.
- Harga/kuantitas: integer, rentang wajar, validasi overflow, batas item per order dan jumlah produk per request.
- Upload: allowlist format raster yang didukung, cek magic bytes, maksimum ukuran/dimensi, cegah SVG/HTML aktif kecuali sanitizer khusus, nama objek acak, dan kebijakan malware scanning bila tersedia.
- Pagination memakai cursor atau batas maksimum; filter/search dibatasi dan diindeks.
- Error frontend tidak menampilkan stack trace, SQL, token, alamat internal, atau rahasia provider.
- Retry email/database mengikuti backoff dan idempotency; kegagalan provider tidak boleh diam-diam mengaktifkan akun atau menandai pembayaran berhasil.
- Catat metrik kegagalan teragregasi dengan redaksi. Jangan pernah mengirim credential ke observability provider.

## 12. Keamanan, privasi, dan penyalahgunaan

### 12.1 Kontrol wajib

- Argon2id dengan salt unik (atau bcrypt terkalibrasi); pepper hanya bila pengelolaan secret dan rotasinya jelas.
- OTP acak kriptografis, expiry singkat yang dapat dikonfigurasi, single-use, hash/HMAC, cooldown, dan rate limit.
- JWT asymmetric signing atau HMAC secret kuat yang disimpan aman; validasi issuer, audience, algorithm allowlist, expiry, not-before, dan key rotation.
- Refresh token random, disimpan hash, rotasi setiap penggunaan, deteksi reuse, revoke per sesi, expiry idle/absolute yang ditentukan.
- CORS allowlist; HTTPS untuk deployment; cookie aman bila dipilih; CSRF protection untuk cookie-authenticated mutation.
- Validasi input, query parameterized, proteksi SQL injection, output escaping, CSP dan header keamanan yang layak.
- Cek ownership dan role pada setiap resource, termasuk order, produk, gambar, dan sesi.
- Secrets tidak masuk Git, log, screenshot, respons, atau bundle frontend. Sediakan `.env.example` dengan placeholder kosong.
- Dependency review, patch rutin, secret scanning dan branch protection di GitHub sebelum rilis.
- Audit perubahan pembayaran/status dan akses minim dengan least privilege.
- Backup/restore, migrasi, dan pemantauan error untuk lingkungan yang memuat data penting.

### 12.2 IP, lokasi, dan identifikasi perangkat

IP dapat berubah, dipakai bersama NAT kampus/VPN, atau disembunyikan proxy. Lokasi dari IP adalah estimasi kasar dan tidak boleh dipresentasikan sebagai lokasi pasti. Browser/OS/user-agent juga dapat dipalsukan; fingerprinting invasif tidak termasuk kebutuhan awal. UI menampilkan label seperti “perkiraan browser” dan IP disamarkan. IP publik tidak diperlihatkan kepada buyer. Seller melihat kode order/nama minimum yang dibutuhkan untuk pelayanan, bukan alamat jaringan buyer.

### 12.3 Abuse case yang perlu diuji

- Enumerasi akun melalui register, login, resend OTP, atau perbedaan timing.
- Brute force password/OTP termasuk request paralel dan pengiriman kode berulang.
- Penyalahgunaan endpoint Mailjet untuk email bombing.
- Token refresh dicuri, diputar ulang, atau digunakan setelah revoke.
- Seller mencoba mengakses stan/order milik seller lain.
- Buyer mencoba mengubah harga, total, status pembayaran, atau buyer ID dari klien.
- Replay checkout, retry jaringan, double click, dan callback tidak tepercaya.
- Upload file berbahaya, file besar, content-type palsu, serta akses objek foto orang lain.
- Kebocoran data melalui log, error, cache, URL, analitik, dan screenshot support.
- Brute force kode order atau ID sesi; ID acak bukan pengganti otorisasi.
- Lockout email/IP digunakan untuk denial-of-service ke pengguna sah; ukur false positive dan desain pemulihan aman.

### 12.4 Logging dan pemantauan

Gunakan log terstruktur dengan correlation ID, timestamp, komponen, kategori error, dan metadata teredaksi. Metrik minimal: kegagalan login/OTP, lockout, email send/error, 4xx/5xx, order dibuat, perubahan status pembayaran, latency database, dan storage failures. Alert threshold serta retensi ditentukan sebelum produksi. Jangan simpan request body autentikasi.

## 13. Stack dan arsitektur

```text
Browser
  └─ Next.js web (UI, route handling, form state)
       └─ HTTPS JSON API ─ Go backend (auth, business rules, authorization)
            ├─ PostgreSQL (Docker Desktop + WSL pada local development)
            ├─ Mailjet API (email OTP melalui backend/outbox)
            └─ Supabase Storage (foto profil/produk; akses terbatas)

GitHub: source, review, CI, issue dan dokumentasi
```

- Go backend memiliki domain logic, validasi final, policy/authorization, transaksi PostgreSQL, dan integrasi eksternal.
- Next.js memanggil API melalui base URL konfigurasi, bukan hardcode localhost.
- PostgreSQL Docker lokal menyediakan volume persisten untuk development; dokumentasikan reset database dengan jelas agar data pengguna tidak hilang tak sengaja.
- Supabase digunakan untuk file foto saja sesuai kebutuhan saat ini; database Supabase tidak menggantikan PostgreSQL lokal kecuali keputusan berubah.
- Produksi memerlukan hosting/managed database, domain, HTTPS, backup, observability, serta pengelolaan rahasia yang belum ditentukan.
- Email OTP dikirim server-side via Mailjet; kunci API tidak pernah dikirim ke browser.
- Tidak ada integrasi payment gateway pada versi awal.

## 14. Struktur repository yang diusulkan

```text
kantin-kampus/
├── apps/
│   └── web/                         # Next.js
│       ├── app/                     # Route dan layout
│       ├── components/              # Komponen UI bersama
│       ├── features/                # auth, catalog, cart, orders, seller, settings
│       ├── lib/                     # API client, tema, validasi frontend
│       ├── public/
│       └── tests/                   # unit/component/e2e sesuai tooling
├── services/
│   └── api/                         # Go backend
│       ├── cmd/api/                 # Entry point
│       ├── internal/
│       │   ├── auth/
│       │   ├── users/
│       │   ├── catalog/
│       │   ├── cart/
│       │   ├── orders/
│       │   ├── payments/
│       │   ├── sessions/
│       │   ├── storage/
│       │   ├── mail/
│       │   ├── platform/            # config, db, middleware, logging
│       │   └── http/                # router, handlers, DTO
│       ├── migrations/
│       └── tests/
├── contracts/
│   └── openapi.yaml
├── infra/
│   ├── compose.yaml                 # PostgreSQL lokal; secrets via env
│   └── scripts/                     # setup/migrate/seed yang aman
├── docs/
│   ├── PRD.md
│   ├── API.md
│   ├── DATA_MODEL.md
│   ├── SECURITY.md
│   └── LOCAL_SETUP.md
├── .env.example                     # Nama variabel + placeholder kosong
├── .gitignore
├── README.md
└── CONTRIBUTING.md
```

Gunakan nama folder sesuai domain, fungsi kecil, dan komentar untuk menjelaskan alasan/aturan yang tidak jelas—bukan komentar pada setiap baris. Pisahkan handler HTTP, service/domain, repository, dan integrasi eksternal tanpa membuat abstraksi berlebihan.

## 15. Konfigurasi dan rahasia

Buat `.env.example` dengan key dan placeholder kosong/contoh non-rahasia. Jangan meminta pengguna membagikan secret melalui percakapan dan jangan mengarang nilainya.

| Variabel placeholder | Pemilik pengisian | Kegunaan |
|---|---|---|
| `APP_ENV` | Tim | `development`, `test`, atau `production` |
| `WEB_BASE_URL` | Tim | URL web per lingkungan |
| `API_BASE_URL` | Tim | URL API untuk web |
| `DATABASE_URL` | Tim | Koneksi PostgreSQL lokal/lingkungan target |
| `JWT_SIGNING_KEY` atau konfigurasi key pair | Tim | Kunci tanda tangan dan rotasi |
| `JWT_ISSUER`, `JWT_AUDIENCE`, `ACCESS_TOKEN_TTL` | Tim | Validasi token dan masa akses |
| `REFRESH_TOKEN_TTL`, `SESSION_IDLE_TTL` | Tim | Masa hidup sesi yang perlu disetujui |
| `OTP_TTL`, `OTP_RESEND_COOLDOWN` | Tim | Waktu OTP/cooldown; nilai final ditetapkan kebijakan |
| `OTP_HASH_KEY` | Tim | HMAC OTP bila digunakan, dipisah dari key lain |
| `MAILJET_API_KEY`, `MAILJET_SECRET_KEY` | Pemilik akun Mailjet | Pengiriman email server-side |
| `MAIL_FROM_EMAIL`, `MAIL_FROM_NAME` | Tim/operasional | Sender terverifikasi |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Pemilik proyek Supabase | Backend-only storage; role key jangan diekspos |
| `SUPABASE_STORAGE_BUCKET` | Tim | Bucket foto dan kebijakan akses |
| `TRUSTED_PROXY_CIDRS` | Infrastruktur | Proxy yang boleh memasok forwarded IP |
| `CORS_ALLOWED_ORIGINS` | Infrastruktur | Origin web yang diizinkan |
| `LOG_LEVEL`, `AUDIT_RETENTION_DAYS` | Operasional | Logging dan retensi yang disetujui |

Simpan nilai lokal di `.env` yang diabaikan Git. Produksi memakai secret manager dari host. Kunci yang bocor harus dapat dirotasi tanpa mengubah source code. Dokumentasikan prosedur rotasi dan dampak terhadap sesi aktif.

## 16. Local setup dan lingkungan

1. Pasang Docker Desktop, aktifkan integrasi WSL untuk distro pengembangan, dan pastikan Docker dapat menjalankan container dari terminal WSL.
2. Pasang versi Go dan Node.js LTS yang dipilih tim; catat versi terkunci di dokumentasi/toolchain.
3. Salin `.env.example` menjadi `.env` lokal dan isi sendiri nilai konfigurasi yang diperlukan. Jangan commit `.env`.
4. Jalankan PostgreSQL melalui Compose dengan volume persisten, healthcheck, user/password lokal, dan port yang tidak bentrok.
5. Jalankan migrasi database, seed data demo non-pribadi, backend Go, lalu frontend Next.js.
6. Konfigurasikan Mailjet sender/domain test dan Supabase bucket; gunakan sandbox/test mode bila tersedia.
7. Verifikasi email, upload foto, endpoint health, dan flow auth di lingkungan lokal tanpa memakai data pengguna nyata.
8. Dokumentasikan cara menghentikan layanan dan backup/restore lokal.

Perintah konkret dimasukkan setelah keputusan versi dan tooling (Go modules/query generator, migration tool, package manager, dan ORM/raw SQL) ditetapkan. Versi PostgreSQL serta rencana deployment produksi masih perlu dipilih.

## 17. GitHub workflow

- `main` terlindungi; perubahan melalui pull request, review, dan status CI.
- Cabang pendek: `feat/...`, `fix/...`, `docs/...`; nama akhir mengikuti kesepakatan tim.
- Commit kecil dengan pesan yang menyebut perubahan, bukan kredensial/data.
- PR berisi ringkasan, alasan, perubahan schema/API, cara memverifikasi, screenshot UI bila relevan, serta risiko/migrasi.
- CI menjalankan format/lint, unit test, static analysis, dependency checks, migration validation, dan build. Jangan menyebut hasil lolos tanpa menjalankan pipeline nyata.
- Review khusus diperlukan untuk auth, pembayaran, akses data lintas role, dan perubahan schema sensitif.
- Aktifkan secret scanning/dependency alerts dan branch protection sesuai kemampuan GitHub plan.
- Jangan menaruh data produksi, dump database, `.env`, key Mailjet, atau key Supabase di repository/issues.

## 18. Strategi pengujian dan acceptance criteria

Tidak ada klaim keberhasilan implementasi sebelum kriteria ini dijalankan pada produk nyata. Pengujian dilakukan sesuai fase dan lingkungan; hasil, tanggal, versi, dan isu tersisa dicatat.

### 18.1 Acceptance criteria inti

1. Buyer mendaftar dengan username/email/password/role, menerima OTP, dan tidak bisa masuk sebelum OTP valid.
2. OTP salah lima kali mengikuti ronde dan lockout yang ditentukan; resend, challenge baru, concurrency, dan refresh halaman tidak menghapus lock aktif.
3. Login membutuhkan password dan OTP; respons publik tidak membedakan email yang tidak terdaftar dengan kredensial yang salah secara tidak perlu.
4. Password dan OTP tidak tersimpan plaintext; pemeriksaan database dan log tidak menemukan rahasia.
5. JWT tidak berlaku setelah expiry; refresh token berotasi; replay token lama mencabut keluarga sesi sesuai kebijakan.
6. Buyer tidak dapat mengubah produk, melihat order orang lain, menandai pembayaran lunas, atau memanggil aksi seller lewat API.
7. Seller stan A tidak dapat membaca/mengubah produk atau pesanan stan B.
8. Harga checkout ditentukan server dan snapshot order tetap sama setelah harga katalog berubah.
9. Retry order dengan idempotency key yang sama tidak menciptakan order ganda; key sama dengan payload berbeda ditolak.
10. Seller dapat menandai tunai lunas sekali secara idempotent; aktor dan waktunya terekam; buyer melihat status yang benar.
11. QRIS tidak menghasilkan QR, tidak mengaku sudah dibayar, dan tidak menghasilkan bukti/settlement palsu.
12. Pengguna mencabut satu sesi lain, sesi pemohon tetap aktif, dan refresh pada sesi yang dicabut gagal.
13. Lokasi/IP disajikan sebagai perkiraan/tersamar dan IP publik tidak tampil pada buyer.
14. Upload invalid/terlalu besar ditolak dan file yang diganti/dihapus mengikuti kebijakan storage.
15. Tampilan dapat digunakan dengan keyboard, pada viewport ponsel dan desktop, serta pada semua tema/aksen yang didukung.
16. Route guard mengarahkan pengguna ke halaman login atau halaman sesuai role; halaman publik tetap dapat diakses tanpa sesi.
17. DevTools tetap berfungsi; akses data/API diuji dan dilindungi server-side.

### 18.2 Lapisan test yang disarankan

- Unit: aturan domain, password/token utilities, OTP expiry/single-use, lockout progression, validasi state.
- Integration: repository PostgreSQL, transaksi order, counter concurrent, Mailjet adapter mock, Supabase adapter mock.
- API/authorization: role, ownership, idempotency, error mapping, rate limiting, CSRF/CORS bila cookie digunakan.
- End-to-end: register→OTP, login→OTP, add-to-cart→checkout→cash confirmation, session revoke, profile photo.
- Security checks: dependency scanning, secret scanning, static analysis, negative authorization, abuse/concurrency tests.
- Manual usability/accessibility: keyboard, screen reader smoke check, kontras tema, error messages, seller workflow di kasir.
- Uji restore backup dan migrasi untuk persiapan produksi.

### 18.3 Kriteria rilis pilot

- Semua acceptance criteria P0 lulus dan bukti hasil tersimpan.
- Tidak ada bug kritis/tinggi terbuka dalam auth, akses lintas role, harga/order, dan pembayaran.
- Kebijakan privasi, retensi, seller approval, operasional kasir, dan prosedur dukungan disetujui pemilik kampus.
- Domain, HTTPS, secret management, backup, monitoring, dan pemulihan insiden tersedia.
- Uji keamanan independen/review sesuai risiko dilakukan. Tanpa itu, nyatakan sebagai pilot terbatas dengan keterbatasan yang jelas.

## 19. Milestone implementasi

Estimasi waktu ditetapkan setelah ukuran tim, kesiapan akun, keputusan produk, dan pengalaman implementer diketahui.

| Fase | Hasil | Gerbang selesai |
|---|---|---|
| M0 — Discovery | Putuskan multi-stan, approval seller, order lintas stan, aturan tunai/QRIS, privasi, deployment | Pertanyaan bagian 4 memiliki owner dan keputusan |
| M1 — Fondasi | Repository, struktur, Docker/WSL PostgreSQL, migrasi, config, CI, observability dasar | Setup lokal dapat diulang dari dokumentasi |
| M2 — Auth | Registrasi OTP, login OTP, hashing, sessions, lockout, audit | Acceptance auth dan abuse awal lulus |
| M3 — Katalog | Stan/produk, otorisasi seller, upload foto Supabase, katalog buyer | Isolasi seller dan validasi foto lulus |
| M4 — Cart/order | Keranjang, preview, idempotent order, riwayat, snapshot harga | Total konsisten dan akses order benar |
| M5 — Operasional | Dashboard seller, konfirmasi cash, status fulfilment, QRIS placeholder | Transisi status audit dan tidak ada klaim payment palsu |
| M6 — UX/settings | Tema, aksen, responsif, sessions UI, foto profil, aksesibilitas | Smoke usability dan route guard selesai |
| M7 — Pilot readiness | Security review, backup/restore, domain/HTTPS, SOP, uji beban/abuse | Pemilik produk menyetujui rilis terbatas |

## 20. Risiko dan mitigasi

| Risiko | Dampak | Mitigasi/keputusan |
|---|---|---|
| PostgreSQL lokal dipakai sebagai produksi tanpa HA/backup | Kehilangan data atau layanan berhenti | Tetapkan database produksi dan backup sebelum pilot publik |
| Satu order lintas stan tetapi pembayaran/pengambilan per stan | Status order membingungkan dan kasir sulit rekonsiliasi | Putuskan model satu order vs satu order per stan; rancangan mendukung split payment per stan |
| Salah menandai tunai lunas | Selisih uang dan sengketa | Konfirmasi eksplisit, kode order, audit append-only, koreksi melalui alur supervisor yang disetujui |
| OTP/email provider gagal atau lambat | Pengguna tidak dapat login | Outbox, retry/backoff, status operasional, fallback dukungan yang aman |
| Lockout IP memblokir banyak pengguna kampus | False positive pada NAT | Kunci gabungan bertahap, ambang terukur, monitoring, mekanisme pemulihan tanpa reset bebas |
| Penyerang mengunci akun korban | Denial of service | Lockout progresif, respons generik, verifikasi/dukungan, aturan reset tidak menghapus counter aktif |
| Email buyer ditampilkan pada layar seller | Kebocoran data pribadi | Pakai kode order/nama minimum; email penuh tersamar kecuali disetujui |
| Supabase bucket salah konfigurasi | Foto privat terekspos atau tidak dapat diakses | Tentukan public/private, RLS/policy dan signed URLs, uji akses lintas akun |
| Pengguna mengira placeholder QRIS adalah pembayaran aktif | Kerugian/kebingungan | Label belum tersedia, tanpa QR, tanpa status paid, materi kasir jelas |
| Fitur admin/seller approval belum didefinisikan | Penyalahgunaan katalog atau stan palsu | Tentukan governance kampus dan ownership sebelum produksi |
| Penghapusan user menghapus data transaksi yang diperlukan | Pelanggaran retensi/rekonsiliasi | Kebijakan retensi dan pseudonimisasi, bukan cascade tanpa analisis |

## 21. Sumber referensi yang disebut pengguna

Percakapan rujukan menyebut berkas berikut. Isi PDF/gambar tidak tersedia sebagai teks yang dapat diverifikasi pada salinan percakapan yang berhasil dibaca; karena itu PRD ini menggunakan nama/judul sebagai penunjuk topik dan tidak mengklaim kutipan atau detail spesifik dari isi berkas. Cocokkan kembali detail teknis dan visual dengan file asli sebelum implementasi.

- `Modul Proyek PKL(1).pdf` — referensi mini marketplace/PKL.
- `dasarpemrogramangolang(1).pdf` — referensi pembelajaran Go.
- `2fa-api-spec-blueprint (1)(2).pdf` dan `Operation_Authenticate (1)(2).pdf` — referensi 2FA/API dan autentikasi.
- `wsl-docker-pemula-v3(1).pdf` — referensi WSL dan Docker untuk local setup.
- `Lembar Latihan Praktik Relasi Data SQL(2).pdf` — referensi relasi tabel SQL.
- `Screenshot 2026-10-27 231026(1).png` dan `Screenshot 2026-10-27 225445(1).png` — referensi visual dashboard/sidebar/sesi menurut permintaan; implementasi perlu merujuk gambar asli untuk detail tata letak.

Fitur aplikasi mobile dan login melalui aplikasi mobile yang mungkin muncul dalam berkas referensi dikecualikan dari ruang lingkup produk ini.

## 22. Daftar isi yang disarankan untuk dokumentasi pendamping

- `README.md`: tujuan, prasyarat, cara setup singkat, link dokumentasi.
- `docs/LOCAL_SETUP.md`: Docker Desktop/WSL, PostgreSQL, migrasi, menjalankan Go dan Next.js.
- `docs/SECURITY.md`: threat model, OTP/rate limit, token/session, secret rotation, incident response.
- `docs/DATA_MODEL.md`: ERD, definisi kolom, indeks, status dan kebijakan retensi.
- `docs/API.md`/`contracts/openapi.yaml`: endpoint, schema, auth, error code, pagination.
- `docs/OPERATIONS.md`: backup/restore, Mailjet, Supabase, monitoring, deployment dan support.
- `CONTRIBUTING.md`: branch, PR, code style, migration/testing expectations.

## 23. Informasi yang pemilik proyek perlu isi manual

Sebelum implementasi/produksi, pemilik proyek perlu menentukan dan mengisi sendiri:

- Kredensial PostgreSQL lokal dan konfigurasi database lingkungan target.
- Mailjet API key/secret, sender email terverifikasi, template email, dan domain pengiriman.
- Supabase project URL, service role key backend-only, bucket, serta aturan publik/privat foto.
- JWT signing keys/rotasi, OTP HMAC key, dan nilai TTL/cooldown yang disetujui.
- Domain web/API, CORS origin, trusted proxy, hosting, HTTPS, dan secret manager.
- Nama kampus, zona waktu, mata uang, nama stan awal, jam operasional, serta kontak dukungan.
- Kebijakan persetujuan seller, pembatalan, masa simpan pesanan/audit, reset password, dan penghapusan akun.
- Keputusan apakah satu checkout boleh lintas stan dan bagaimana konfirmasi kasir ditampilkan.

Nilai rahasia tidak perlu dibagikan ke dokumen PRD atau chat; masukkan ke secret manager atau `.env` lokal yang tidak di-commit.

---

**Akhir dokumen.** PRD ini siap ditinjau sebagai baseline kebutuhan. Keputusan pada bagian 4 dan validasi terhadap isi lampiran asli masih diperlukan sebelum spesifikasi dibekukan.

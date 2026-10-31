import sys
import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            super().showPage()
        super().save()

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 9)
        self.setFillColor(colors.HexColor("#666666"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 750, "Project Cyber | Technical Walkthrough & Source Code Analysis")
            self.setStrokeColor(colors.HexColor("#cccccc"))
            self.setLineWidth(0.5)
            self.line(54, 742, 558, 742)
            
        # Footer (all pages)
        page_text = f"Halaman {self._pageNumber} dari {page_count}"
        self.drawRightString(558, 40, page_text)
        self.drawString(54, 40, "CONFIDENTIAL — FOR INTERNAL STUDY ONLY")
        self.setStrokeColor(colors.HexColor("#cccccc"))
        self.setLineWidth(0.5)
        self.line(54, 52, 558, 52)
        
        self.restoreState()

def build_pdf(output_path):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=54,
        leftMargin=54,
        topMargin=72,
        bottomMargin=72
    )

    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor("#1A365D"),
        spaceAfter=12
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#4A5568"),
        spaceAfter=24
    )
    
    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=colors.HexColor("#2B6CB0"),
        spaceBefore=18,
        spaceAfter=8,
        keepWithNext=True
    )
    
    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#2C3E50"),
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#2D3748"),
        spaceAfter=8
    )
    
    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=body_style,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=4
    )
    
    code_style = ParagraphStyle(
        'Code_Custom',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#1A202C"),
        backColor=colors.HexColor("#EDF2F7"),
        borderColor=colors.HexColor("#CBD5E0"),
        borderWidth=1,
        borderPadding=6,
        spaceBefore=6,
        spaceAfter=8
    )

    story = []

    # Title & Subtitle
    story.append(Paragraph("Project Cyber — Deep Project Walkthrough", title_style))
    story.append(Paragraph("Website Kantin Kampus | Comprehensive Source Code Analysis & Technical Architecture", subtitle_style))
    story.append(Spacer(1, 10))

    # Section 1
    story.append(Paragraph("1. Gambaran Besar Project Cyber", h1_style))
    story.append(Paragraph("<b>Tujuan Utama Aplikasi:</b> Project Cyber (Website Kantin Kampus) adalah aplikasi marketplace kantin kampus yang menghubungkan mahasiswa/warga kampus (<b>buyer</b>) dengan pengelola stan makanan (<b>seller</b>), serta diawasi oleh administrator (<b>admin</b>). Buyer dapat menjelajahi katalog produk, menyusun keranjang belanja, melakukan checkout, dan membayar tunai di kasir stan. Seller mengelola stan dan produk (CRUD & foto via Supabase), serta mengonfirmasi pembayaran tunai. Admin memoderasi pendaftaran stan.", body_style))
    story.append(Paragraph("<b>Aktor & Peran:</b>", body_style))
    story.append(Paragraph("&bull; <b>Buyer</b>: Memesan makanan, mengelola keranjang, melihat riwayat pesanan.", bullet_style))
    story.append(Paragraph("&bull; <b>Seller</b>: Mengelola stan, produk, antrean pesanan, dan konfirmasi bayar tunai.", bullet_style))
    story.append(Paragraph("&bull; <b>Admin</b>: Menyetujui/menolak pendaftaran stan baru.", bullet_style))
    
    story.append(Spacer(1, 6))
    story.append(Paragraph("<b>Tabel Teknologi Aktual:</b>", h2_style))
    
    tech_data = [
        ["Komponen", "Teknologi Aktual", "Fungsi", "Status"],
        ["Backend", "Go 1.23, net/http, pgx/v5", "REST API (/api/v1), business logic, outbox", "Terbukti Berjalan"],
        ["Frontend", "Next.js 16, React 19, Tailwind", "UI, Routing, Zustand, React Query, Zod", "Terbukti Berjalan"],
        ["Database", "PostgreSQL 16 (Docker/WSL)", "Relational storage, migrations 0001-0009", "Terbukti Berjalan"],
        ["Storage", "Supabase Storage", "Penyimpanan foto profil & produk", "Terbukti Berjalan"],
        ["Email", "Mailjet API / DevMailer", "Pengiriman OTP verifikasi email", "Terbukti Berjalan"],
        ["Auth", "JWT Memory + HttpOnly Cookie", "Access token & Refresh token aman", "Terbukti Berjalan"]
    ]
    
    t = Table(tech_data, colWidths=[80, 130, 200, 94])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#2B6CB0")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 9),
        ('BOTTOMPADDING', (0,0), (-1,0), 6),
        ('TOPPADDING', (0,0), (-1,0), 6),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E0")),
        ('BACKGROUND', (0,1), (-1,-1), colors.HexColor("#F7FAFC")),
        ('FONTNAME', (0,1), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,1), (-1,-1), 8.5),
    ]))
    story.append(t)
    story.append(Spacer(1, 12))

    # Section 2
    story.append(Paragraph("2. Struktur Folder & Source Code", h1_style))
    story.append(Paragraph("Repository dibagi menjadi dua layanan utama (`apps/web` dan `services/api`) serta infrastruktur pendukung:", body_style))
    
    folder_tree = (
        "apps/web/                        # Next.js Frontend\n"
        "  ├── src/app/                   # App Router (auth, catalog, cart, orders, seller, admin)\n"
        "  ├── src/components/            # UI primitives (button, card, dialog, form)\n"
        "  ├── src/features/              # Domain modules (auth, cart, catalog, orders, seller)\n"
        "  └── src/lib/                   # API client, token store, formatters, theme\n"
        "services/api/                    # Go Backend\n"
        "  ├── cmd/api/main.go            # Entry point HTTP server & background workers\n"
        "  ├── cmd/seed/main.go           # Database seeder untuk akun demo\n"
        "  ├── internal/                  # Domain packages (auth, users, stalls, catalog, cart, orders, payments, sessions, outbox)\n"
        "  └── migrations/                # SQL Migrations (0001 s.d. 0009 up/down)\n"
        "infra/compose.yaml               # PostgreSQL 16 container setup"
    )
    story.append(Paragraph(folder_tree.replace('\n', '<br/>').replace(' ', '&nbsp;'), code_style))
    story.append(Spacer(1, 10))

    # Section 3
    story.append(Paragraph("3. Arsitektur & Hubungan Antarkomponen", h1_style))
    story.append(Paragraph("Alur pertukaran data dimulai dari browser pengguna ke frontend Next.js, yang melakukan proxy API `/api/v1/*` ke backend Go (port 8080). Backend mengeksekusi middleware keamanan, memproses business logic melalui service layer, dan berinteraksi dengan database PostgreSQL menggunakan driver `pgx/v5`. Pengiriman email OTP ditangani oleh Outbox pattern dan worker asinkron via Mailjet, sedangkan unggahan foto dikelola melalui Supabase Storage.", body_style))
    story.append(Spacer(1, 10))

    # Section 4 & 5
    story.append(Paragraph("4. Backend Go & Logika Source Code", h1_style))
    story.append(Paragraph("<b>Application Startup (`services/api/cmd/api/main.go`):</b>", h2_style))
    story.append(Paragraph("Fungsi `main()` menginisialisasi context dengan signal handler untuk graceful shutdown. Konfigurasi dibaca via `config.Load()`, koneksi database dibuka via `db.Open()`, mailer diatur (Mailjet di production atau DevMailer di development), dan seluruh domain service diinisialisasi sebelum menjalankan server HTTP dengan timeout ketat (ReadTimeout: 60s, WriteTimeout: 60s).", body_style))
    
    story.append(Paragraph("<b>Logika Validasi & Error Handling:</b>", h2_style))
    story.append(Paragraph("Setiap handler menerima request HTTP, memvalidasi input payload, dan memanggil service terkait. Sebagai contoh, pada proses autentikasi login (`internal/auth/service.go`), sistem memeriksa validitas email, memverifikasi hash password menggunakan `bcrypt.CompareHashAndPassword`, serta mengembalikan error spesifik (`ErrInvalidCredentials` dengan HTTP 401) tanpa membocorkan keberadaan email untuk mencegah serangan user enumeration.", body_style))
    story.append(Spacer(1, 10))

    # Section 6 & 7
    story.append(Paragraph("5. Database PostgreSQL & Migrasi", h1_style))
    story.append(Paragraph("Database PostgreSQL dikelola menggunakan migrasi terstruktur (`services/api/migrations/`):", body_style))
    story.append(Paragraph("&bull; <b>0001_users</b>: Tabel `users` (id, email, password_hash, role [buyer, seller, admin], name, phone, profile_photo_url).", bullet_style))
    story.append(Paragraph("&bull; <b>0002_pending_registrations & 0003_otp_challenges</b>: Manajemen registrasi dan verifikasi OTP.", bullet_style))
    story.append(Paragraph("&bull; <b>0005_login_sessions</b>: Sesi aktif untuk pencabutan perangkat (session revocation).", bullet_style))
    story.append(Paragraph("&bull; <b>0006_stalls_products</b>: Manajemen stan (status: `pending_review`, `active`, `rejected`) dan katalog produk.", bullet_style))
    story.append(Paragraph("&bull; <b>0007_carts & 0008_orders_payments</b>: Keranjang belanja, pesanan, dan konfirmasi pembayaran tunai oleh seller.", bullet_style))
    story.append(Paragraph("&bull; <b>0009_audit_outbox</b>: Outbox pattern untuk pengiriman email & audit log.", bullet_style))
    story.append(Spacer(1, 10))

    # Section 8
    story.append(Paragraph("6. Authentication & Authorization", h1_style))
    story.append(Paragraph("Sistem menggunakan pendekatan keamanan berlapis:", body_style))
    story.append(Paragraph("&bull; <b>Access Token</b>: JWT berumur pendek disimpan di memori klien (`token-store.ts`), dikirim via header `Authorization: Bearer <token>`.", bullet_style))
    story.append(Paragraph("&bull; <b>Refresh Token</b>: Disimpan di cookie `kk_refresh` dengan atribut `HttpOnly`, `Secure`, dan `SameSite=Lax`.", bullet_style))
    story.append(Paragraph("&bull; <b>CSRF Protection</b>: Memakai mekanisme <i>Double-Submit Cookie</i> (`kk_csrf` dicocokkan dengan header `X-CSRF-Token`).", bullet_style))
    story.append(Paragraph("&bull; <b>RBAC</b>: Middleware backend memeriksa role pengguna (`buyer`, `seller`, `admin`) sebelum menjalankan endpoint.", bullet_style))
    story.append(Spacer(1, 10))

    # Section 9
    story.append(Paragraph("7. Frontend Next.js & State Management", h1_style))
    story.append(Paragraph("Frontend Next.js memanfaatkan pustaka modern berkinerja tinggi:", body_style))
    story.append(Paragraph("&bull; <b>Zustand (`auth-store.ts`)</b>: Mengelola status autentikasi global (`status`, `user`, `bootstrap`, `signIn`, `signOut`). Token akses dijaga di memori murni demi keamanan XSS.", bullet_style))
    story.append(Paragraph("&bull; <b>TanStack React Query (`use-cart.ts`)</b>: Mengelola server state, caching, dan invalidasi otomatis untuk data katalog, keranjang (`CART_QUERY_KEY`), dan pesanan.", bullet_style))
    story.append(Paragraph("&bull; <b>Zod Validation</b>: Validasi skema tipe data ketat pada form login, registrasi, pembuatan stan, dan produk.", bullet_style))
    story.append(Paragraph("&bull; <b>API Client (`client.ts`)</b>: Klien HTTP terpusat yang otomatis menangani header auth, CSRF, dan <i>silent refresh</i> pada status 401.", bullet_style))
    story.append(Spacer(1, 10))

    # Section 10 & 11
    story.append(Paragraph("8. Integrasi Eksternal & Skenario Nyata", h1_style))
    story.append(Paragraph("<b>Integrasi Layanan:</b> Supabase Storage digunakan untuk pengelolaan berkas foto profil dan produk. Mailjet digunakan untuk pengiriman email OTP di production (atau DevMailer di environment development).", body_style))
    story.append(Paragraph("<b>Simulasi Skenario Checkout:</b> Buyer menyusun keranjang -> Mengirim request POST `/api/v1/orders` -> Backend memvalidasi ketersediaan stok, menghitung total harga, dan mengeksekusi transaksi database (membuat order dan order items secara atomik) -> Mengembalikan status pesanan sukses kepada buyer untuk dibayar tunai di stan.", body_style))
    story.append(Spacer(1, 10))

    # Section 12 & 13
    story.append(Paragraph("9. Testing, Quality Gate & Kekurangan", h1_style))
    story.append(Paragraph("<b>Testing:</b> Backend dilengkapi integration test di `services/api/tests/integration/`. Frontend menggunakan Vitest untuk unit test dan Playwright untuk E2E test (`apps/web/src/e2e/`). GitHub Actions CI menjalankan linter, typecheck (`tsc --noEmit`), dan test suite secara otomatis.", body_style))
    story.append(Paragraph("<b>Kekurangan / Batasan:</b> Proyek berstatus pilot lokal/dev. Belum ada HTTPS produksi, domain kustom, atau payment gateway otomatis (pembayaran tunai dikonfirmasi manual oleh seller).", body_style))
    story.append(Spacer(1, 14))

    # Section 14
    story.append(Paragraph("10. Kesimpulan & Glosarium", h1_style))
    story.append(Paragraph("Project Cyber berhasil mengimplementasikan arsitektur marketplace kantin kampus secara bersih dan modular menggunakan Go dan Next.js dengan standar keamanan modern (JWT memory + HttpOnly cookie, CSRF, Zod, React Query, Zustand, dan PostgreSQL).", body_style))
    story.append(Spacer(1, 10))
    story.append(Paragraph("<b>Kamus Istilah Singkat:</b> Handler (Pengendali HTTP), Middleware (Penyaring request), Repository (Akses database), DTO (Struktur transfer data), Zustand (State manager ringan), React Query (Server-state cache), Zod (Schema validator).", body_style))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF successfully generated at: {output_path}")

if __name__ == '__main__':
    os.makedirs("C:/Users/HP/Documents/marketplace/docs", exist_ok=True)
    out = "C:/Users/HP/Documents/marketplace/docs/project-cyber-walkthrough.pdf"
    build_pdf(out)

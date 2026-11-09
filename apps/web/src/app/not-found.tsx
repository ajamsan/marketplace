import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-md">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Halaman tidak ditemukan
        </p>
        <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight text-foreground">
          Alamat ini tidak ada di Kantin Kampus
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Tautan mungkin salah ketik atau halaman sudah dipindahkan. Kembali ke beranda untuk
          melihat menu hari ini, atau masuk untuk membuka katalog.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-foreground px-5 text-sm font-semibold text-background transition-colors hover:bg-foreground/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Kembali ke beranda
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Masuk ke akun
          </Link>
        </div>
      </div>
    </main>
  );
}

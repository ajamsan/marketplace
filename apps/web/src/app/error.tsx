"use client";

import { useEffect } from "react";
import Link from "next/link";

// Menampilkan kegagalan tak terduga pada satu segmen rute tanpa menjatuhkan seluruh aplikasi.
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Terjadi kesalahan
        </p>
        <h1 className="mt-3 font-serif text-2xl font-bold tracking-tight text-foreground">
          Halaman ini gagal dimuat
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Data mungkin belum selesai dimuat atau koneksi ke server terputus. Coba muat ulang bagian
          ini. Kalau masih gagal, kembali ke beranda lalu buka lagi halamannya.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => retry()}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-foreground px-5 text-sm font-semibold text-background transition-colors hover:bg-foreground/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Muat ulang halaman
          </button>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Kembali ke beranda
          </Link>
        </div>
      </div>
    </main>
  );
}

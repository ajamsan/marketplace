"use client";

import { useAuthStore } from "@/features/auth/auth-store";
import Link from "next/link";

export function HeroSection() {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = status === "authenticated" && !!user;
  const isBuyer = isAuthenticated && user?.role === "buyer";

  return (
    <section className="border-b border-border bg-background pt-10 pb-12 md:pt-12 md:pb-16">
      <div className="reveal mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="h-px w-10 bg-foreground/40" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Marketplace kantin kampus
            </p>
          </div>

          <h1 className="mt-4 max-w-3xl text-balance font-serif text-[2.25rem] font-bold leading-[1.04] tracking-[-0.02em] text-foreground sm:text-4xl lg:text-[3.5rem]">
            Pesan dari stan kampus, ambil saat siap.
          </h1>

          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
            Pilih menu dari stan yang buka hari ini, susun keranjang, lalu bayar tunai di kasir
            stan. Penjual menandai pesanan saat disiapkan dan saat siap diambil.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <a
              href="#koleksi"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm bg-foreground px-5 text-sm font-semibold tracking-wide text-background transition-colors hover:bg-foreground/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:w-44"
            >
              Lihat menu hari ini
            </a>
            {isAuthenticated ? (
              <>
                {isBuyer && (
                  <Link
                    href="/cart"
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm border border-border bg-surface px-5 text-sm font-semibold text-foreground transition-colors hover:border-foreground/40 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:w-44"
                  >
                    Keranjang
                  </Link>
                )}
                <Link
                  href="/orders"
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm border border-border bg-surface px-5 text-sm font-semibold text-foreground transition-colors hover:border-foreground/40 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:w-44"
                >
                  Pesanan saya
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/register"
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm border border-border bg-surface px-5 text-sm font-semibold text-foreground transition-colors hover:border-foreground/40 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:w-44"
                >
                  Buat akun pembeli
                </Link>
                <Link
                  href="/register?role=seller"
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm border border-border bg-surface px-5 text-sm font-semibold text-foreground transition-colors hover:border-foreground/40 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:w-44"
                >
                  Ajukan stan
                </Link>
                <p className="text-sm text-muted-foreground sm:basis-full">
                  Sudah punya akun?{" "}
                  <Link
                    href="/login"
                    className="font-semibold text-foreground underline decoration-foreground/30 underline-offset-4 hover:text-accent hover:decoration-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    Masuk
                  </Link>
                </p>
              </>
            )}
          </div>

          <p className="mt-3 text-sm text-muted-foreground">
            Bayar tunai di kasir stan. Status pesanan mengikuti konfirmasi kasir, bukan estimasi.
          </p>
        </div>
      </div>
    </section>
  );
}
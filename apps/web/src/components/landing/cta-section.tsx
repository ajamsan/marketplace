"use client";

import { useAuthStore } from "@/features/auth/auth-store";
import Link from "next/link";

const BENEFITS = [
  "Akses penuh ke katalog stan kampus",
  "Keranjang lintas stan, satu checkout",
  "Pantau status pesanan real-time",
  "Riwayat pesanan lengkap",
  "Kelola sesi aktif untuk keamanan",
];

export function CTASection() {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = status === "authenticated" && !!user;
  const isBuyer = isAuthenticated && user?.role === "buyer";

  return (
    <section id="gabung" className="border-b border-border bg-surface-muted/30 py-16 md:py-20">
      <div className="reveal mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-1 border-b border-border/80 pb-6 mb-8 md:mb-10 max-w-3xl">
          <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground block">
            Bergabung
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {isAuthenticated ? "Anda sudah menjadi bagian dari komunitas" : "Masuk ke komunitas yang menghargai waktu dan rasa"}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
            {isAuthenticated
              ? "Gunakan tautan di bawah untuk melanjutkan ke katalog, keranjang, atau riwayat pesanan."
              : "Daftar gratis sebagai pembeli atau ajukan stan. Tidak ada biaya bulanan, tidak ada tier keanggotaan, tidak ada janji kosong. Hanya akses jujur ke makanan yang disiapkan dengan tulus oleh tetangga kampus Anda."}
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <ul className="grid gap-4 sm:grid-cols-2" role="list">
              {BENEFITS.map((benefit) => (
                <li key={benefit} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="mt-1 h-5 w-5 shrink-0 text-accent"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {isAuthenticated ? (
                <>
                  <Link
                    href="/catalog"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm bg-foreground px-5 text-sm font-semibold tracking-wide text-background transition-colors hover:bg-foreground/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    Buka katalog
                  </Link>
                  {isBuyer && (
                    <Link
                      href="/cart"
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border border-border bg-surface px-5 text-sm font-semibold text-foreground transition-colors hover:border-foreground/40 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      Keranjang
                    </Link>
                  )}
                  <Link
                    href="/orders"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border border-border bg-surface px-5 text-sm font-semibold text-foreground transition-colors hover:border-foreground/40 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    Pesanan saya
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm bg-foreground px-5 text-sm font-semibold tracking-wide text-background transition-colors hover:bg-foreground/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    Daftar sebagai pembeli
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border border-border bg-surface px-5 text-sm font-semibold text-foreground transition-colors hover:border-foreground/40 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    Ajukan stan penjual
                  </Link>
                </>
              )}
            </div>

            {!isAuthenticated && (
              <p className="mt-4 text-sm text-muted-foreground">
                Sudah punya akun?{" "}
                <Link
                  href="/login"
                  className="font-medium text-foreground underline decoration-foreground/30 underline-offset-4 hover:text-accent hover:decoration-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  Masuk di sini
                </Link>
                .
              </p>
            )}
          </div>

          {!isAuthenticated && (
            <aside className="lg:col-span-5 lg:border-l lg:border-border lg:pl-8 xl:pl-12">
              <div className="rounded-sm border border-border bg-surface p-6 sm:p-8">
                <h3 className="font-serif text-xl font-bold tracking-tight text-foreground">
                  Apa yang terjadi setelah daftar?
                </h3>
                <ol className="mt-4 space-y-4">
                  <li className="flex gap-3">
                    <span aria-hidden="true" className="flex shrink-0 items-center justify-center w-6 h-6 rounded-full bg-accent-soft text-accent font-serif text-sm font-bold">
                      1
                    </span>
                    <div>
                      <p className="font-medium text-foreground">Verifikasi email</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        Kode OTP dikirim ke email Anda. Masukkan kode, akun aktif.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span aria-hidden="true" className="flex shrink-0 items-center justify-center w-6 h-6 rounded-full bg-accent-soft text-accent font-serif text-sm font-bold">
                      2
                    </span>
                    <div>
                      <p className="font-medium text-foreground">Jelajahi menu hari ini</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        Lihat stan yang buka, foto asli, harga jujur, ketersediaan real-time.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span aria-hidden="true" className="flex shrink-0 items-center justify-center w-6 h-6 rounded-full bg-accent-soft text-accent font-serif text-sm font-bold">
                      3
                    </span>
                    <div>
                      <p className="font-medium text-foreground">Pesan & ambil</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        Susun keranjang, bayar tunai di kasir, pantau status sampai siap diambil.
                      </p>
                    </div>
                  </li>
                </ol>

                <p className="mt-6 border-t border-border pt-4 text-sm leading-relaxed text-muted-foreground">
                  <strong className="text-foreground">Catatan:</strong> Akun admin tidak dibuka untuk pendaftaran umum.
                  Akun tersebut dibuat oleh operator kampus yang mengelola stan.
                </p>
              </div>
            </aside>
          )}
        </div>
      </div>
    </section>
  );
}
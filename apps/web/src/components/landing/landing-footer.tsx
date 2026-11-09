"use client";

import Link from "next/link";
import { useAuthStore, homePathForRole } from "@/features/auth/auth-store";

const linkClass =
  "inline-flex min-h-11 items-center text-muted-foreground underline decoration-transparent decoration-1 underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

export function LandingFooter() {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const accountLinks = status === "authenticated" && user
    ? [
        {
          href: homePathForRole(user.role),
          label: user.role === "buyer" ? "Katalog produk" : user.role === "seller" ? "Pesanan stan" : "Persetujuan stan",
        },
        { href: "/settings", label: "Pengaturan akun" },
      ]
    : [
        { href: "/login", label: "Masuk" },
        { href: "/register", label: "Daftar akun pembeli atau penjual" },
        { href: "/catalog", label: "Katalog produk" },
      ];

  return (
    <footer className="border-t border-border bg-surface py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <span className="block font-serif text-2xl font-bold tracking-tight text-foreground">
              Kantin Kampus
            </span>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Marketplace untuk stan di lingkungan kampus. Pembeli memesan lebih dulu, penjual
              menyiapkan, dan pembayaran tunai dikonfirmasi di kasir stan.
            </p>
            <p className="mt-7 max-w-sm border-t border-border pt-5 text-xs leading-relaxed text-muted-foreground">
              Build pilot untuk pengujian lokal, <span className="font-medium text-foreground">bukan deployment produksi</span>.
              Belum ada payment gateway, monitoring, atau backup terjadwal.
            </p>
          </div>

          <div className="md:col-span-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Jelajah
            </h2>
            <ul className="mt-5 space-y-3 text-sm">
              <li><Link href="/#koleksi" className={linkClass}>Menu hari ini</Link></li>
              <li><Link href="/about" className={linkClass}>Tentang</Link></li>
              <li><Link href="/about#cerita" className={linkClass}>Cerita kami</Link></li>
              <li><Link href="/role" className={linkClass}>Peran pembeli, penjual, admin</Link></li>
              <li><Link href="/scope" className={linkClass}>Cakupan pilot</Link></li>
            </ul>
          </div>

          <div className="md:col-span-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Akun
            </h2>
            <ul className="mt-5 space-y-3 text-sm">
              {accountLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={linkClass}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; 2026 Kantin Kampus</p>
          <p>Status pesanan mengikuti konfirmasi kasir, bukan estimasi otomatis.</p>
        </div>
      </div>
    </footer>
  );
}

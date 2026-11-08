"use client";

import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-surface py-12 text-xs text-muted-foreground">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
          <div className="md:col-span-5">
            <span className="text-base font-bold text-foreground">Kantin Kampus</span>
            <p className="mt-2 max-w-xs text-xs leading-relaxed">
              Pesan makanan dari berbagai stan kampus, lalu bayar tunai di kasir. Cepat, mudah, dan transparan.
            </p>
            <p className="mt-3 text-[11px]">
              Jam buka: 07.30 – 18.00 WIB, Senin–Jumat
            </p>
          </div>

          <div className="md:col-span-3">
            <span className="text-xs font-semibold text-foreground">Menu</span>
            <ul className="mt-2 space-y-2">
              <li><a href="#menu" className="hover:text-foreground">Menu hari ini</a></li>
              <li><Link href="/catalog" className="hover:text-foreground">Katalog semua stan</Link></li>
              <li><a href="#tentang" className="hover:text-foreground">Tentang</a></li>
            </ul>
          </div>

          <div className="md:col-span-4">
            <span className="text-xs font-semibold text-foreground">Akses</span>
            <ul className="mt-2 space-y-2">
              <li><a href="#member" className="hover:text-foreground">Kartu member</a></li>
              <li><Link href="/login" className="hover:text-foreground">Masuk</Link></li>
              <li><Link href="/register" className="hover:text-foreground">Daftar</Link></li>
              <li><Link href="/cart" className="hover:text-foreground">Keranjang</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
          <span>&copy; 2026 Kantin Kampus</span>
          <span className="text-muted-foreground">Dibuat untuk civitas kampus</span>
        </div>
      </div>
    </footer>
  );
}

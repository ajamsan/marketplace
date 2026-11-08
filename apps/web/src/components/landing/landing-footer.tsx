"use client";

import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-surface py-16 text-xs text-muted-foreground">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* Brand Col */}
          <div className="md:col-span-5">
            <span className="font-serif text-lg tracking-[0.2em] font-semibold text-foreground uppercase block">
              MAISON KANTIN
            </span>
            <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground block mt-1">
              Haute Gastronomy &bull; Campus Atelier
            </span>
            <p className="mt-4 max-w-sm text-xs leading-relaxed text-muted-foreground">
              Menghadirkan standar santapan kelas atas di lingkungan kampus melalui kurasi koki terkemuka, 
              bahan lokal segar, dan sistem pemesanan modern yang menghargai waktu Anda.
            </p>
            <div className="mt-4 text-[11px] text-muted-foreground">
              Pavilion Gastronomi Kampus Pusat &bull; Jam Layanan: Senin sampai Jumat, 07.30 - 18.00 WIB
            </div>
          </div>

          {/* Quick Real Links */}
          <div className="md:col-span-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-foreground block mb-3">
              Jelajahi Menu
            </span>
            <ul className="space-y-2">
              <li>
                <a href="#koleksi" className="hover:text-foreground transition-colors">
                  Koleksi Kurasi Pilihan
                </a>
              </li>
              <li>
                <Link href="/catalog" className="hover:text-foreground transition-colors">
                  Katalog Seluruh Stan Kampus
                </Link>
              </li>
              <li>
                <a href="#filosofi" className="hover:text-foreground transition-colors">
                  Filosofi Memasak Lambat
                </a>
              </li>
              <li>
                <a href="#nilai" className="hover:text-foreground transition-colors">
                  Tiga Komitmen Integritas
                </a>
              </li>
            </ul>
          </div>

          {/* Account & Privileges */}
          <div className="md:col-span-4">
            <span className="text-xs font-semibold uppercase tracking-widest text-foreground block mb-3">
              Akses & Layanan
            </span>
            <ul className="space-y-2">
              <li>
                <a href="#keanggotaan" className="hover:text-foreground transition-colors">
                  Kartu Digital Connoisseur Guild
                </a>
              </li>
              <li>
                <Link href="/login" className="hover:text-foreground transition-colors">
                  Masuk Akun Pembeli / Penjual
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-foreground transition-colors">
                  Registrasi Akun Baru
                </Link>
              </li>
              <li>
                <Link href="/cart" className="hover:text-foreground transition-colors">
                  Keranjang Pemesanan
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 border-t border-border/80 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
          <div>
            &copy; 2026 Maison Kantin. Pengalaman bersantap kurasi kampus.
          </div>
          <div className="text-muted-foreground">
            Dipersiapkan segar setiap hari tanpa kompromi rasa.
          </div>
        </div>
      </div>
    </footer>
  );
}

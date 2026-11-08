"use client";

import { useState } from "react";
import Link from "next/link";
import { LogOut, Menu, User, X } from "lucide-react";

import { useAuthStore, homePathForRole } from "@/features/auth/auth-store";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function LandingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);

  const isAuthenticated = status === "authenticated" && !!user;

  const handleSignOut = async () => {
    await signOut();
  };

  const closeMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-surface/95 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-16 sm:h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand identity */}
        <Link
          href="/"
          className="group flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
          aria-label="Maison Kantin - Beranda"
        >
          <span className="font-serif text-xl tracking-[0.2em] font-semibold text-foreground transition-colors group-hover:text-accent sm:text-2xl">
            MAISON KANTIN
          </span>
          <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-medium">
            Haute Gastronomy &bull; Campus Atelier
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav
          className="hidden md:flex items-center gap-8 text-xs uppercase tracking-[0.18em] font-medium text-foreground/80"
          aria-label="Navigasi Utama"
        >
          <a
            href="#koleksi"
            className="transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm py-1"
          >
            Koleksi Kurasi
          </a>
          <a
            href="#filosofi"
            className="transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm py-1"
          >
            Penceritaan
          </a>
          <a
            href="#nilai"
            className="transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm py-1"
          >
            Nilai Merek
          </a>
          <a
            href="#keanggotaan"
            className="transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm py-1"
          >
            Keanggotaan PrivAc
          </a>
        </nav>

        {/* Right side controls */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />

          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link
                href={homePathForRole(user.role)}
                className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-surface px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-foreground hover:bg-surface-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <User className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{user.username}</span>
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                aria-label="Keluar dari akun"
                className="inline-flex items-center gap-1.5 rounded-sm border border-border/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-danger hover:border-danger/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Keluar</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3.5 py-1.5 text-xs font-semibold uppercase tracking-widest text-foreground hover:text-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
              >
                Masuk
              </Link>
              <Link
                href="/register"
                className="rounded-sm bg-foreground px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-background hover:bg-foreground/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Daftar
              </Link>
            </div>
          )}
        </div>

        {/* Mobile controls */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
            aria-controls="mobile-navigation"
            className="inline-flex h-10 w-10 items-center justify-center rounded-sm border border-border bg-surface text-foreground hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen ? (
        <div
          id="mobile-navigation"
          className="border-b border-border bg-surface px-5 py-6 md:hidden shadow-lg animate-in fade-in"
        >
          <nav className="flex flex-col gap-4 text-sm font-medium uppercase tracking-wider text-foreground" aria-label="Navigasi Seluler">
            <a
              href="#koleksi"
              onClick={closeMenu}
              className="py-2 border-b border-border/50 hover:text-accent transition-colors"
            >
              Koleksi Kurasi
            </a>
            <a
              href="#filosofi"
              onClick={closeMenu}
              className="py-2 border-b border-border/50 hover:text-accent transition-colors"
            >
              Penceritaan
            </a>
            <a
              href="#nilai"
              onClick={closeMenu}
              className="py-2 border-b border-border/50 hover:text-accent transition-colors"
            >
              Nilai Merek
            </a>
            <a
              href="#keanggotaan"
              onClick={closeMenu}
              className="py-2 border-b border-border/50 hover:text-accent transition-colors"
            >
              Keanggotaan PrivAc
            </a>
          </nav>

          <div className="mt-6 pt-4 border-t border-border flex flex-col gap-2.5">
            {isAuthenticated ? (
              <>
                <Link
                  href={homePathForRole(user.role)}
                  onClick={closeMenu}
                  className="flex w-full items-center justify-center gap-2 rounded-sm bg-foreground py-2.5 text-xs font-semibold uppercase tracking-widest text-background"
                >
                  <User className="h-4 w-4" aria-hidden="true" />
                  <span>Ruang Anggota ({user.username})</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    handleSignOut();
                    closeMenu();
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-sm border border-border py-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:text-danger"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  <span>Keluar Akun</span>
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/login"
                  onClick={closeMenu}
                  className="flex items-center justify-center rounded-sm border border-border py-2.5 text-xs font-semibold uppercase tracking-widest text-foreground hover:bg-surface-muted"
                >
                  Masuk
                </Link>
                <Link
                  href="/register"
                  onClick={closeMenu}
                  className="flex items-center justify-center rounded-sm bg-foreground py-2.5 text-xs font-semibold uppercase tracking-widest text-background hover:bg-foreground/90"
                >
                  Daftar
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}

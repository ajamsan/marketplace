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
    <header className="sticky top-0 z-40 w-full border-b border-border bg-surface/95 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
          aria-label="Kantin Kampus - Beranda"
        >
          <span className="text-lg font-bold tracking-tight text-foreground">
            Kantin Kampus
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Pesan makanan, bayar di kasir
          </span>
        </Link>

        <nav
          className="hidden md:flex items-center gap-6 text-sm font-medium text-foreground/80"
          aria-label="Navigasi utama"
        >
          <a href="#menu" className="hover:text-foreground transition-colors py-1">
            Menu
          </a>
          <a href="#tentang" className="hover:text-foreground transition-colors py-1">
            Tentang
          </a>
          <a href="#nilai" className="hover:text-foreground transition-colors py-1">
            Kenapa Kami
          </a>
          <a href="#member" className="hover:text-foreground transition-colors py-1">
            Member
          </a>
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <ThemeToggle />
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link
                href={homePathForRole(user.role)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:bg-surface-muted transition-colors"
              >
                <User className="h-4 w-4" aria-hidden="true" />
                <span>{user.username}</span>
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                aria-label="Keluar dari akun"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-danger hover:border-danger/40 transition-colors"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span>Keluar</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3 py-1.5 text-sm font-medium text-foreground hover:text-accent transition-colors"
              >
                Masuk
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-accent px-4 py-1.5 text-sm font-semibold text-accent-foreground hover:bg-accent/90 transition-colors"
              >
                Daftar
              </Link>
            </div>
          )}
        </div>

        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Tutup menu" : "Buka menu"}
            aria-controls="mobile-navigation"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface text-foreground hover:bg-surface-muted"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {mobileMenuOpen ? (
        <div
          id="mobile-navigation"
          className="border-b border-border bg-surface px-5 py-6 md:hidden shadow-lg"
        >
          <nav className="flex flex-col gap-3 text-sm font-medium text-foreground" aria-label="Navigasi seluler">
            <a href="#menu" onClick={closeMenu} className="py-2 border-b border-border/50">
              Menu
            </a>
            <a href="#tentang" onClick={closeMenu} className="py-2 border-b border-border/50">
              Tentang
            </a>
            <a href="#nilai" onClick={closeMenu} className="py-2 border-b border-border/50">
              Kenapa Kami
            </a>
            <a href="#member" onClick={closeMenu} className="py-2 border-b border-border/50">
              Member
            </a>
          </nav>

          <div className="mt-6 pt-4 border-t border-border flex flex-col gap-2">
            {isAuthenticated ? (
              <>
                <Link
                  href={homePathForRole(user.role)}
                  onClick={closeMenu}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-2.5 text-sm font-semibold text-accent-foreground"
                >
                  <User className="h-4 w-4" aria-hidden="true" />
                  <span>Ruang Saya</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    handleSignOut();
                    closeMenu();
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-border py-2 text-sm font-medium text-muted-foreground hover:text-danger"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  <span>Keluar</span>
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/login"
                  onClick={closeMenu}
                  className="flex items-center justify-center rounded-lg border border-border py-2.5 text-sm font-medium text-foreground hover:bg-surface-muted"
                >
                  Masuk
                </Link>
                <Link
                  href="/register"
                  onClick={closeMenu}
                  className="flex items-center justify-center rounded-lg bg-accent py-2.5 text-sm font-semibold text-accent-foreground hover:bg-accent/90"
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

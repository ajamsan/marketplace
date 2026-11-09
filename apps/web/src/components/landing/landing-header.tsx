"use client";

import { useState } from "react";
import Link from "next/link";
import { LogOut, Menu, User, X } from "lucide-react";

import { useAuthStore } from "@/features/auth/auth-store";

const NAV_LINKS = [
  { href: "/#koleksi", label: "Menu hari ini" },
  { href: "/about", label: "Tentang" },
];

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
    <header className="sticky top-0 z-40 w-full h-16 border-b border-border/80 bg-surface/95 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex h-full items-center min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
        >
          <span className="font-serif text-xl font-bold leading-none tracking-tight text-foreground truncate">
            Kantin Kampus
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Navigasi utama">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={closeMenu}
              className="relative inline-flex h-full items-center text-sm font-medium text-muted-foreground transition-colors after:absolute after:bottom-[calc(50%-1px)] after:left-0 after:h-px after:w-0 after:bg-foreground after:transition-all after:duration-200 hover:text-foreground hover:after:w-full focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {isAuthenticated ? (
            <>
              <Link
                href="/catalog"
                className="inline-flex h-11 items-center gap-1.5 rounded-sm border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <User className="h-4 w-4" aria-hidden="true" />
                <span className="max-w-32 truncate">{user.username}</span>
              </Link>
              <Link
                href="/orders"
                className="inline-flex h-11 items-center gap-1.5 rounded-sm border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Pesanan
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex h-11 items-center gap-1.5 rounded-sm border border-border px-3 text-sm font-medium text-muted-foreground transition-colors hover:border-danger/40 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span>Keluar</span>
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex h-11 items-center rounded-sm px-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Masuk
              </Link>
              <Link
                href="/register"
                className="inline-flex h-11 items-center rounded-sm bg-foreground px-4 text-sm font-semibold text-background transition-colors hover:bg-foreground/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Daftar
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
            aria-controls="mobile-navigation"
            className="inline-flex h-11 w-11 items-center justify-center rounded-sm border border-border text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
        <div id="mobile-navigation" className="border-t border-border bg-surface px-4 py-4 md:hidden">
          <nav className="flex flex-col" aria-label="Navigasi seluler">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className="h-11 flex items-center rounded-sm px-3 text-sm font-medium text-foreground transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
            {isAuthenticated ? (
              <>
                <Link
                  href="/catalog"
                  onClick={closeMenu}
                  className="flex h-11 items-center justify-center gap-2 rounded-sm bg-foreground text-sm font-semibold text-background"
                >
                  <User className="h-4 w-4" aria-hidden="true" />
                  <span>Buka menu</span>
                </Link>
                <Link
                  href="/orders"
                  onClick={closeMenu}
                  className="flex h-11 items-center justify-center gap-2 rounded-sm border border-border text-sm font-medium text-foreground"
                >
                  Pesanan
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    handleSignOut();
                    closeMenu();
                  }}
                  className="flex h-11 items-center justify-center gap-2 rounded-sm border border-border text-sm font-medium text-muted-foreground"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  <span>Keluar akun</span>
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  onClick={closeMenu}
                  className="flex h-11 items-center justify-center rounded-sm border border-border text-sm font-medium text-foreground"
                >
                  Masuk
                </Link>
                <Link
                  href="/register"
                  onClick={closeMenu}
                  className="flex h-11 items-center justify-center rounded-sm bg-foreground text-sm font-semibold text-background"
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

"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ThemeToggle } from "@/components/layout/theme-toggle";

// Menyediakan kerangka mewah dan konsisten untuk formulir autentikasi.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <header className="flex h-20 items-center justify-between border-b border-border/80 bg-surface/90 px-4 backdrop-blur-md md:px-8">
        <Link
          href="/"
          className="group flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
          aria-label="Kembali ke Beranda Maison Kantin"
        >
          <span className="font-serif text-lg tracking-[0.2em] font-semibold text-foreground transition-colors group-hover:text-accent sm:text-xl">
            MAISON KANTIN
          </span>
          <span className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground font-medium">
            Haute Gastronomy &bull; Campus Atelier
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Beranda</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}

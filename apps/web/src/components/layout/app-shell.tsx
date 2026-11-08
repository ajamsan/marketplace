"use client";

import type { ReactNode } from "react";

import { Header } from "./header";
import { MobileNav } from "./mobile-nav";
import { Sidebar } from "./sidebar";
import { ThemeSync } from "./theme-sync";
import { RequireAuth } from "@/features/auth/guards";
import { useAuthStore } from "@/features/auth/auth-store";

// Menyusun navigasi dan konten utama dalam kerangka yang memerlukan sesi aktif.
export function AppShell({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user);

  return (
    <RequireAuth>
      <ThemeSync />
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar role={user?.role} />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="sticky top-0 z-30 flex flex-col bg-surface/95 backdrop-blur-md">
            <Header />
            <MobileNav role={user?.role} />
          </div>
          <main className="flex-1 px-4 py-5 md:px-6 md:py-6">{children}</main>
        </div>
      </div>
    </RequireAuth>
  );
}

"use client";

import { useEffect, type ReactNode } from "react";

import { Header } from "./header";
import { MobileNav } from "./mobile-nav";
import { Sidebar } from "./sidebar";
import { ThemeSync } from "./theme-sync";
import { RequireAuth } from "@/features/auth/guards";
import { useAuthStore } from "@/features/auth/auth-store";
import { FullPageLoader } from "@/components/ui/feedback";

// Menyusun navigasi dan konten utama dalam kerangka yang memerlukan sesi aktif.
export function AppShell({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const bootstrap = useAuthStore((state) => state.bootstrap);

  useEffect(() => {
    if (status === "idle") void bootstrap();
  }, [status, bootstrap]);

  return (
    <>
      <ThemeSync />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-background"
      >
        Lewati ke konten utama
      </a>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar role={user?.role} />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="sticky top-0 z-30 flex flex-col bg-surface/95 backdrop-blur-md">
            <Header />
            <MobileNav role={user?.role} />
          </div>
          <main id="main" tabIndex={-1} className="flex-1 px-4 py-5 md:px-6 md:py-6">
            {status === "idle" || status === "loading" ? (
              <FullPageLoader label="Memuat sesi..." />
            ) : (
              <RequireAuth>{children}</RequireAuth>
            )}
          </main>
        </div>
      </div>
    </>
  );
}

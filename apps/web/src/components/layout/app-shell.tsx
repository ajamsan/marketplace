"use client";

import type { ReactNode } from "react";

import { Header } from "./header";
import { MobileNav } from "./mobile-nav";
import { Sidebar } from "./sidebar";
import { ThemeSync } from "./theme-sync";
import { RequireAuth } from "@/features/auth/guards";
import { useAuthStore } from "@/features/auth/auth-store";

export function AppShell({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user);

  return (
    <RequireAuth>
      <ThemeSync />
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar role={user?.role} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <MobileNav role={user?.role} />
          <main className="flex-1 px-4 py-5 md:px-6 md:py-6">{children}</main>
        </div>
      </div>
    </RequireAuth>
  );
}

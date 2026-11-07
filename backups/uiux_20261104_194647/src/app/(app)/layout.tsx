"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { RequireRole } from "@/features/auth/guards";

const BUYER_ROUTES = ["/catalog", "/cart", "/checkout", "/orders", "/products"];

// Mengenali rute yang memerlukan peran pembeli sebelum halaman dirender.
function isBuyerRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return BUYER_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

// Menerapkan kerangka aplikasi dan pemeriksaan peran sesuai rute aktif.
export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <AppShell>
      {isBuyerRoute(pathname) ? <RequireRole roles={["buyer"]}>{children}</RequireRole> : children}
    </AppShell>
  );
}
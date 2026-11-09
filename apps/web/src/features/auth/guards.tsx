"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { homePathForRole, useAuthStore } from "./auth-store";
import type { Role } from "@/lib/api/types";

/**
 * Route guard sisi klien: memeriksa status sesi dan role sebelum menampilkan
 * halaman. Otorisasi sesungguhnya tetap di server (PRD §2.4, §7).
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const status = useAuthStore((state) => state.status);
  const bootstrap = useAuthStore((state) => state.bootstrap);

  useEffect(() => {
    if (status === "idle") void bootstrap();
  }, [status, bootstrap]);

  useEffect(() => {
    if (status === "anonymous") {
      const next = encodeURIComponent(pathname || "/catalog");
      router.replace(`/login?next=${next}`);
    }
  }, [status, pathname, router]);

  // Loading state handled by AppShell; only render children when authenticated
  if (status !== "authenticated") return null;
  return <>{children}</>;
}

// Memastikan halaman hanya muncul untuk pengguna yang memiliki salah satu peran yang diizinkan.
export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const bootstrap = useAuthStore((state) => state.bootstrap);

  useEffect(() => {
    if (status === "idle") void bootstrap();
  }, [status, bootstrap]);

  useEffect(() => {
    if (status === "authenticated" && user && !roles.includes(user.role)) {
      router.replace(homePathForRole(user.role));
    }
  }, [status, user, roles, router]);

  if (status !== "authenticated" || !user) return null;
  if (!roles.includes(user.role)) return <div role="status" className="sr-only">Mengalihkan...</div>;
  return <>{children}</>;
}

/** Guard untuk halaman publik: bila belum login, arahkan ke halaman login. */
export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const bootstrap = useAuthStore((state) => state.bootstrap);

  useEffect(() => {
    if (status === "idle") void bootstrap();
  }, [status, bootstrap]);

  useEffect(() => {
    if (status === "authenticated" && user) {
      router.replace(homePathForRole(user.role));
    }
  }, [status, user, router]);

  if (status === "authenticated") return <div role="status" className="sr-only">Mengalihkan...</div>;
  return <>{children}</>;
}
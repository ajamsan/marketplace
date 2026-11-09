"use client";

import { useEffect } from "react";

import { useAuthStore } from "@/features/auth/auth-store";

// Halaman statis punya header yang bergantung pada status sesi; tanpa ini sesi tidak pernah dipulihkan.
export function AuthBootstrap() {
  const status = useAuthStore((state) => state.status);
  const bootstrap = useAuthStore((state) => state.bootstrap);

  useEffect(() => {
    if (status === "idle") void bootstrap();
  }, [status, bootstrap]);

  return null;
}

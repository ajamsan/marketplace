"use client";

import { useEffect, useRef } from "react";

import { useTheme } from "@/lib/theme/use-theme";
import { authApi } from "@/features/auth/api";
import { useAuthStore } from "@/features/auth/auth-store";

/**
 * Menyinkronkan preferensi tema/aksen ke akun setelah login. Fallback lokal
 * (localStorage) tetap dipakai sebelum login (DASH-03).
 */
export function ThemeSync() {
  const { theme, accent } = useTheme();
  const status = useAuthStore((state) => state.status);
  const firstRender = useRef(true);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    void authApi
      .updateMe({ preferences: { theme_mode: theme, accent } })
      .catch(() => undefined);
  }, [theme, accent, status]);

  return null;
}

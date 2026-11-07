"use client";

import { useEffect, useRef } from "react";

import { ACCENTS, useTheme } from "@/lib/theme/use-theme";
import { authApi } from "@/features/auth/api";
import { useAuthStore } from "@/features/auth/auth-store";
import { cn } from "@/lib/utils";

/**
 * Pemilih aksen warna. Sebelum login disimpan di localStorage, setelah login
 * disinkronkan ke preferensi akun (D19, DASH-03).
 */
export function AccentPicker() {
  const { accent, setAccent } = useTheme();
  const status = useAuthStore((state) => state.status);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (status !== "authenticated") return;
    void authApi.updateMe({ preferences: { accent } }).catch(() => undefined);
  }, [accent, status]);

  return (
    <div
      role="radiogroup"
      aria-label="Warna aksen"
      className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1"
    >
      {ACCENTS.map((item) => (
        <button
          key={item.id}
          type="button"
          role="radio"
          aria-checked={accent === item.id}
          aria-label={`Aksen ${item.label}`}
          title={item.label}
          onClick={() => setAccent(item.id)}
          className={cn(
            "h-6 w-6 rounded-full border-2",
            accent === item.id ? "border-foreground" : "border-transparent",
          )}
          style={{ backgroundColor: item.swatch }}
        />
      ))}
    </div>
  );
}

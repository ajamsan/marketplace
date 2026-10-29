"use client";

import { useState } from "react";

import { authApi } from "@/features/auth/api";
import { useAuthStore } from "@/features/auth/auth-store";
import { ApiError } from "@/lib/api/client";
import { ACCENTS, useTheme, type AccentId, type ThemeMode } from "@/lib/theme/use-theme";
import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ThemeSection() {
  const { theme, accent, setTheme, setAccent } = useTheme();
  const authStatus = useAuthStore((state) => state.status);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  function persist(nextTheme: ThemeMode, nextAccent: AccentId) {
    if (authStatus !== "authenticated") {
      setStatusMessage("Pilihan disimpan di perangkat ini.");
      return;
    }
    void authApi
      .updateMe({ preferences: { theme_mode: nextTheme, accent: nextAccent } })
      .then(() => setStatusMessage("Preferensi tampilan disimpan ke akunmu."))
      .catch((error) => {
        if (error instanceof ApiError) {
          setStatusMessage(`Gagal menyimpan ke akun: ${error.message}`);
          return;
        }
        setStatusMessage("Gagal menyimpan preferensi ke akun.");
      });
  }

  function handleThemeToggle() {
    const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    persist(nextTheme, accent);
  }

  function handleAccent(nextAccent: AccentId) {
    setAccent(nextAccent);
    persist(theme, nextAccent);
  }

  return (
    <Card>
      <CardHeader
        title="Tampilan"
        description="Pilih tema dan warna aksen. Pilihan juga disimpan di perangkat ini."
      />
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-foreground">Tema</p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={theme === "dark"}
              aria-label="Tema gelap"
              onClick={handleThemeToggle}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium",
                theme === "dark"
                  ? "border-accent bg-accent-soft text-foreground"
                  : "border-border bg-surface text-muted-foreground hover:bg-surface-muted",
              )}
            >
              {theme === "dark" ? "Gelap" : "Terang"}
            </button>
            <p className="text-sm text-muted-foreground">
              {theme === "dark" ? "Mode gelap aktif." : "Mode terang aktif."}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-foreground">Warna aksen</p>
          <div role="radiogroup" aria-label="Warna aksen" className="flex flex-wrap gap-2">
            {ACCENTS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={accent === item.id}
                onClick={() => handleAccent(item.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  accent === item.id
                    ? "border-accent bg-accent-soft text-foreground"
                    : "border-border bg-surface text-muted-foreground hover:bg-surface-muted",
                )}
              >
                <span
                  aria-hidden="true"
                  className="h-4 w-4 rounded-full border border-border"
                  style={{ backgroundColor: item.swatch }}
                />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <p aria-live="polite" className="text-sm text-muted-foreground">
          {statusMessage}
        </p>
      </div>
    </Card>
  );
}

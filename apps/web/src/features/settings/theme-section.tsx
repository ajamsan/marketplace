"use client";

import { useState } from "react";
import { Check, Moon, Sun } from "lucide-react";

import { authApi } from "@/features/auth/api";
import { useAuthStore } from "@/features/auth/auth-store";
import { ApiError } from "@/lib/api/client";
import { ACCENTS, useTheme, type AccentId, type ThemeMode } from "@/lib/theme/use-theme";
import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const THEME_OPTIONS: { id: ThemeMode; label: string; description: string; icon: typeof Sun }[] = [
  {
    id: "light",
    label: "Terang",
    description: "Kertas hangat, tinta gelap.",
    icon: Sun,
  },
  {
    id: "dark",
    label: "Gelap",
    description: "Kanvas pekat, teks terang.",
    icon: Moon,
  },
];

// Mengelola tema dan aksen serta menyimpan preferensi ke akun bila tersedia.
export function ThemeSection() {
  const { theme, accent, setTheme, setAccent } = useTheme();
  const authStatus = useAuthStore((state) => state.status);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Menyimpan preferensi ke akun atau memberi tahu pengguna bahwa pilihan lokal dipakai.
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

  function handleTheme(nextTheme: ThemeMode) {
    if (nextTheme === theme) return;
    setTheme(nextTheme);
    persist(nextTheme, accent);
  }

  // Mengubah warna aksen dan menyimpan preferensi tampilan.
  function handleAccent(nextAccent: AccentId) {
    if (nextAccent === accent) return;
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
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-foreground">Tema</legend>
          <div role="radiogroup" aria-label="Tema" className="grid grid-cols-2 gap-3">
            {THEME_OPTIONS.map((option) => {
              const Icon = option.icon;
              const selected = theme === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => handleTheme(option.id)}
                  className={cn(
                    "flex min-h-11 flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    selected
                      ? "border-accent bg-accent-soft"
                      : "border-border bg-surface hover:border-foreground/30",
                  )}
                >
                  <span className="flex w-full items-center justify-between">
                    <Icon
                      className={cn("h-5 w-5", selected ? "text-accent" : "text-muted-foreground")}
                      aria-hidden="true"
                    />
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full border",
                        selected ? "border-accent bg-accent" : "border-border",
                      )}
                    >
                      {selected ? (
                        <Check className="h-3 w-3 text-accent-foreground" strokeWidth={3} />
                      ) : null}
                    </span>
                  </span>
                  <span className="text-sm font-semibold text-foreground">{option.label}</span>
                  <span className="text-xs leading-snug text-muted-foreground">
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-foreground">Warna aksen</legend>
          <div role="radiogroup" aria-label="Warna aksen" className="flex flex-wrap gap-2">
            {ACCENTS.map((item) => {
              const selected = accent === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => handleAccent(item.id)}
                  className={cn(
                    "flex min-h-11 items-center gap-2.5 rounded-full border py-2 pl-2 pr-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    selected
                      ? "border-accent bg-accent-soft text-foreground"
                      : "border-border bg-surface text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="flex h-6 w-6 items-center justify-center rounded-full border border-black/10"
                    style={{ backgroundColor: item.swatch }}
                  >
                    {selected ? (
                      <Check className="h-3.5 w-3.5 text-white drop-shadow" strokeWidth={3} />
                    ) : null}
                  </span>
                  {item.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <p aria-live="polite" className="text-sm text-muted-foreground">
          {statusMessage}
        </p>
      </div>
    </Card>
  );
}

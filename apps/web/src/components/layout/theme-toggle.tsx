"use client";

import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/lib/theme/use-theme";

// Mengubah tema dan memberi label aksi sesuai tema yang sedang digunakan.
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const nextLabel = theme === "dark" ? "Aktifkan tema terang" : "Aktifkan tema gelap";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={nextLabel}
      title={nextLabel}
      className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-surface text-foreground hover:bg-surface-muted"
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
}

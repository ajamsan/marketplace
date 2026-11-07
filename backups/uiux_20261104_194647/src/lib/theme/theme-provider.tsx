"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  DEFAULT_ACCENT,
  DEFAULT_THEME,
  isAccentId,
  type AccentId,
  type ThemeMode,
} from "./accent-defs";

const THEME_KEY = "kantin.theme";
const ACCENT_KEY = "kantin.accent";

interface ThemeContextValue {
  theme: ThemeMode;
  accent: AccentId;
  setTheme: (theme: ThemeMode) => void;
  setAccent: (accent: AccentId) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// Memulihkan tema dari penyimpanan lokal atau preferensi sistem perangkat.
export function readStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return DEFAULT_THEME;
  const stored = window.localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) return "dark";
  return DEFAULT_THEME;
}

// Memulihkan aksen tersimpan dan memakai nilai bawaan bila tidak dikenal.
export function readStoredAccent(): AccentId {
  if (typeof window === "undefined") return DEFAULT_ACCENT;
  const stored = window.localStorage.getItem(ACCENT_KEY);
  return isAccentId(stored) ? stored : DEFAULT_ACCENT;
}

// Menerapkan pilihan visual pada elemen akar agar seluruh aplikasi mengikutinya.
export function applyTheme(theme: ThemeMode, accent: AccentId) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.accent = accent;
}

// Menyediakan tema aktif dan aksi perubahan ke seluruh komponen turunan.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(DEFAULT_THEME);
  const [accent, setAccentState] = useState<AccentId>(DEFAULT_ACCENT);

  // Hidrasi preferensi dari localStorage setelah mount agar tidak terjadi
  // hydration mismatch (server & client awal sama, lalu client menyesuaikan).
  useEffect(() => {
    const storedTheme = readStoredTheme();
    const storedAccent = readStoredAccent();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(storedTheme);
    setAccentState(storedAccent);
    applyTheme(storedTheme, storedAccent);
  }, []);

  useEffect(() => {
    applyTheme(theme, accent);
  }, [theme, accent]);

  // Menyimpan mode pilihan dan menerapkannya tanpa menunggu render berikutnya.
  const setTheme = useCallback((next: ThemeMode) => {
    setThemeState(next);
    if (typeof window !== "undefined") window.localStorage.setItem(THEME_KEY, next);
    applyTheme(next, accent);
  }, [accent]);

  // Menyimpan warna aksen dan memperbarui atribut tema global.
  const setAccent = useCallback((next: AccentId) => {
    setAccentState(next);
    if (typeof window !== "undefined") window.localStorage.setItem(ACCENT_KEY, next);
    applyTheme(theme, next);
  }, [theme]);

  // Membalik mode aktif sambil memperbarui state, penyimpanan, dan dokumen.
  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next = current === "dark" ? "light" : "dark";
      if (typeof window !== "undefined") window.localStorage.setItem(THEME_KEY, next);
      applyTheme(next, accent);
      return next;
    });
  }, [accent]);

  const value = useMemo(
    () => ({ theme, accent, setTheme, setAccent, toggleTheme }),
    [theme, accent, setTheme, setAccent, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// Mengakses preferensi tema dan menolak pemakaian di luar providernya.
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme harus dipakai di dalam ThemeProvider");
  }
  return context;
}

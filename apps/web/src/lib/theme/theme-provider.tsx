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

export function readStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return DEFAULT_THEME;
  const stored = window.localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) return "dark";
  return DEFAULT_THEME;
}

export function readStoredAccent(): AccentId {
  if (typeof window === "undefined") return DEFAULT_ACCENT;
  const stored = window.localStorage.getItem(ACCENT_KEY);
  return isAccentId(stored) ? stored : DEFAULT_ACCENT;
}

export function applyTheme(theme: ThemeMode, accent: AccentId) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.accent = accent;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return DEFAULT_THEME;
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
    if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) return "dark";
    return DEFAULT_THEME;
  });

  const [accent, setAccentState] = useState<AccentId>(() => {
    if (typeof window === "undefined") return DEFAULT_ACCENT;
    const stored = window.localStorage.getItem(ACCENT_KEY);
    return isAccentId(stored) ? stored : DEFAULT_ACCENT;
  });

  useEffect(() => {
    applyTheme(theme, accent);
  }, [theme, accent]);

  const setTheme = useCallback((next: ThemeMode) => {
    setThemeState(next);
    if (typeof window !== "undefined") window.localStorage.setItem(THEME_KEY, next);
    applyTheme(next, accent);
  }, [accent]);

  const setAccent = useCallback((next: AccentId) => {
    setAccentState(next);
    if (typeof window !== "undefined") window.localStorage.setItem(ACCENT_KEY, next);
    applyTheme(theme, next);
  }, [theme]);

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

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme harus dipakai di dalam ThemeProvider");
  }
  return context;
}

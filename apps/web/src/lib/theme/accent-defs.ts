export type AccentId = "red" | "yellow" | "green" | "blue" | "purple";

export const ACCENTS: { id: AccentId; label: string; swatch: string }[] = [
  { id: "red", label: "Merah", swatch: "#b91c1c" },
  { id: "yellow", label: "Kuning", swatch: "#8a5306" },
  { id: "green", label: "Hijau", swatch: "#1d4b38" },
  { id: "blue", label: "Biru", swatch: "#1e40af" },
  { id: "purple", label: "Ungu", swatch: "#6d28d9" },
];

export const DEFAULT_ACCENT: AccentId = "green";

// Memastikan nilai tersimpan termasuk salah satu aksen yang didukung aplikasi.
export function isAccentId(value: unknown): value is AccentId {
  return ACCENTS.some((accent) => accent.id === value);
}

export type ThemeMode = "light" | "dark";

export const DEFAULT_THEME: ThemeMode = "light";

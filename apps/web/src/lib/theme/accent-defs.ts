export type AccentId = "red" | "yellow" | "green" | "blue" | "purple";

export const ACCENTS: { id: AccentId; label: string; swatch: string }[] = [
  { id: "red", label: "Merah", swatch: "#dc2626" },
  { id: "yellow", label: "Kuning", swatch: "#ca8a04" },
  { id: "green", label: "Hijau", swatch: "#15803d" },
  { id: "blue", label: "Biru", swatch: "#2563eb" },
  { id: "purple", label: "Ungu", swatch: "#7c3aed" },
];

export const DEFAULT_ACCENT: AccentId = "blue";

export function isAccentId(value: unknown): value is AccentId {
  return ACCENTS.some((accent) => accent.id === value);
}

export type ThemeMode = "light" | "dark";

export const DEFAULT_THEME: ThemeMode = "light";

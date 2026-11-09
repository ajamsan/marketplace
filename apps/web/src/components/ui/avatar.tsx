import Image from "next/image";

import { cn } from "@/lib/utils";

// Mengambil inisial dari dua kata pertama nama untuk avatar teks.
export function avatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? (parts[1]?.[0] ?? "") : "";
  return (first + second).toUpperCase();
}

// Menampilkan foto profil bila ada, atau inisial nama dengan warna identitas.
export function Avatar({
  username,
  imageUrl,
  size = 44,
  className,
}: {
  username: string;
  imageUrl: string | null;
  size?: number;
  className?: string;
}) {
  const dimension = { width: size, height: size };
  const shared = cn(
    "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-accent-soft font-semibold text-accent",
    className,
  );

  if (imageUrl) {
    return (
      <Image
        src={imageUrl}
        alt=""
        width={dimension.width}
        height={dimension.height}
        unoptimized
        className={cn(shared, "object-cover")}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={shared}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
    >
      {avatarInitials(username)}
    </span>
  );
}

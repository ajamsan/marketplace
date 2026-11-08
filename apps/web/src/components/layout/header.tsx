"use client";

import { LogOut, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AccentPicker } from "./accent-picker";
import { ThemeToggle } from "./theme-toggle";
import { useAuthStore } from "@/features/auth/auth-store";
import { Button } from "@/components/ui/button";

// Menampilkan identitas pengguna, preferensi tampilan, dan aksi keluar berstandar atelier.
export function Header() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);

  // Mengakhiri sesi sebelum mengarahkan pengguna ke halaman masuk.
  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border/80 bg-surface/95 px-4 backdrop-blur-md md:px-8">
      {/* Mobile brand header */}
      <div className="flex flex-col md:hidden">
        <Link href="/" className="font-serif text-sm font-semibold tracking-[0.2em] text-foreground">
          MAISON KANTIN
        </Link>
        <span className="text-[8px] uppercase tracking-[0.2em] text-muted-foreground">
          Atelier &bull; Gastronomy
        </span>
      </div>

      {/* Desktop label */}
      <div className="hidden items-center gap-3 md:flex">
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Ruang Kurasi Kuliner
        </span>
      </div>

      {/* Action controls */}
      <div className="flex items-center gap-2.5">
        <AccentPicker />
        <ThemeToggle />
        {user ? (
          <>
            <Link
              href="/settings"
              className="hidden items-center gap-2 rounded-sm border border-border bg-surface px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-foreground hover:bg-surface-muted transition-colors sm:inline-flex"
            >
              <User className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              <span>{user.username}</span>
            </Link>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSignOut}
              className="rounded-sm uppercase tracking-wider text-xs font-semibold"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Keluar</span>
            </Button>
          </>
        ) : null}
      </div>
    </header>
  );
}

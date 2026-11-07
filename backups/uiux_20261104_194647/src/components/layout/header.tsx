"use client";

import { LogOut, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AccentPicker } from "./accent-picker";
import { ThemeToggle } from "./theme-toggle";
import { useAuthStore } from "@/features/auth/auth-store";
import { Button } from "@/components/ui/button";

// Menampilkan identitas pengguna, preferensi tampilan, dan aksi keluar.
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
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-4 md:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <span className="text-sm font-bold text-foreground">Kantin Kampus</span>
      </div>
      <div className="hidden md:block" />
      <div className="flex items-center gap-2">
        <AccentPicker />
        <ThemeToggle />
        {user ? (
          <>
            <Link
              href="/settings"
              className="hidden items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:bg-surface-muted sm:inline-flex"
            >
              <User className="h-4 w-4" aria-hidden="true" />
              {user.username}
            </Link>
            <Button variant="secondary" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Keluar
            </Button>
          </>
        ) : null}
      </div>
    </header>
  );
}

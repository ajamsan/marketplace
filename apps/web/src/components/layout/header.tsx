"use client";

import { useQuery } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { ThemeToggle } from "./theme-toggle";
import { authApi } from "@/features/auth/api";
import { useAuthStore } from "@/features/auth/auth-store";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const ROLE_LABEL: Record<string, string> = {
  buyer: "Pembeli",
  seller: "Penjual",
  admin: "Admin",
};

function pageLabel(pathname: string): string {
  if (pathname === "/catalog") return "Katalog";
  if (pathname === "/cart") return "Keranjang";
  if (pathname === "/checkout") return "Checkout";
  if (pathname === "/orders" || pathname.startsWith("/orders/")) return "Pesanan";
  if (pathname === "/settings") return "Pengaturan";
  if (pathname === "/seller/orders") return "Pesanan stan";
  if (pathname === "/seller/stall") return "Stan saya";
  if (pathname === "/seller/products/new") return "Tambah produk";
  if (pathname.startsWith("/seller/products/") && pathname.endsWith("/edit")) return "Edit produk";
  if (pathname === "/seller/products") return "Produk";
  if (pathname === "/admin") return "Admin";
  if (pathname.startsWith("/products/")) return "Detail produk";
  return "Ruang kerja";
}

// Menampilkan identitas pengguna, preferensi tampilan, dan aksi keluar.
export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const profileQuery = useQuery({
    queryKey: ["me"],
    queryFn: authApi.me,
    enabled: Boolean(user),
    staleTime: 60_000,
  });
  const profileImage = profileQuery.data?.profile_image_url ?? null;

  // Mengakhiri sesi sebelum mengarahkan pengguna ke halaman masuk.
  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border/80 bg-surface/95 px-4 backdrop-blur-md md:px-8">
      {/* Mobile brand header */}
      <div className="flex flex-col md:hidden">
        <Link href="/" className="font-serif text-base font-semibold text-foreground">
          Kantin Kampus
        </Link>
        <span className="text-[11px] text-muted-foreground">
          Marketplace stan kampus
        </span>
      </div>

      {/* Desktop label */}
      <div className="hidden items-center gap-3 md:flex">
        <span className="font-serif text-sm font-semibold text-foreground">Kantin Kampus</span>
        <span aria-hidden="true" className="text-border">/</span>
        <span className="text-sm font-medium text-muted-foreground">{pageLabel(pathname)}</span>
      </div>

      {/* Action controls */}
      <div className="flex items-center gap-2.5">
        <ThemeToggle />
        {user ? (
          <>
            <Link
              href="/settings"
              className="hidden h-11 items-center gap-2.5 rounded-lg border border-border bg-surface py-0 pl-1.5 pr-3 transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:inline-flex"
            >
              <Avatar
                username={user.username}
                imageUrl={profileImage}
                size={36}
                className="border-accent/30"
              />
              <span className="flex flex-col items-start gap-0.5">
                <span className="max-w-36 truncate text-xs font-semibold uppercase tracking-wider text-foreground">
                  {user.username}
                </span>
                <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  {ROLE_LABEL[user.role] ?? user.role}
                </span>
              </span>
            </Link>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSignOut}
              className="h-11 rounded-lg px-4 uppercase tracking-wider text-xs font-semibold"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span>Keluar</span>
            </Button>
          </>
        ) : null}
      </div>
    </header>
  );
}

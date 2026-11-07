"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";

import { useCart } from "./use-cart";
import { useAuthStore } from "@/features/auth/auth-store";
import { formatIDR } from "@/lib/format";

// Menampilkan jumlah dan subtotal keranjang sebagai akses cepat bagi pembeli.
export function CartBar() {
  const role = useAuthStore((state) => state.user?.role);
  const isBuyer = role === "buyer";
  const { data: cart, isPending } = useCart({ enabled: isBuyer });

  if (!isBuyer) return null;

  const items = cart?.items ?? [];
  const count = items.reduce((total, item) => total + item.quantity, 0);
  const subtotal = cart?.subtotal_minor ?? 0;

  return (
    <aside
      aria-label="Keranjang"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-foreground"
          >
            <ShoppingCart className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            {isPending ? (
              <p className="text-sm font-semibold text-foreground">Memuat keranjang...</p>
            ) : (
              <p className="truncate text-sm font-semibold text-foreground">
                {count} item · {formatIDR(subtotal)}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Total indikatif; harga final dihitung server saat checkout.
            </p>
          </div>
        </div>
        <Link
          href="/cart"
          className="shrink-0 rounded-lg border border-transparent bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90"
        >
          Lihat keranjang
        </Link>
      </div>
    </aside>
  );
}

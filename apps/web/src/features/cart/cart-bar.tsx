"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";

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

  if (count === 0 && !isPending) return null;

  return (
    <aside
      aria-label="Akses Cepat Keranjang"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-surface/95 backdrop-blur-md shadow-lg"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 md:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-foreground text-background"
          >
            <ShoppingBag className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            {isPending ? (
              <p className="text-xs font-semibold text-foreground">Menghubungkan ke pesanan...</p>
            ) : (
              <p className="truncate text-sm font-semibold text-foreground">
                <span className="font-serif font-bold text-base">{count}</span> item di keranjang &bull;{" "}
                <span className="font-serif font-bold text-base">{formatIDR(subtotal)}</span>
              </p>
            )}
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Pembayaran tunai di kasir setelah pemesanan
            </p>
          </div>
        </div>
        <Link
          href="/cart"
          className="shrink-0 rounded-sm bg-foreground px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-background hover:bg-foreground/85 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Buka Keranjang
        </Link>
      </div>
    </aside>
  );
}

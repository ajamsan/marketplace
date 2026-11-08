"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ShoppingBag, X } from "lucide-react";

import { useAuthStore } from "@/features/auth/auth-store";
import { useCart, useSetCartQuantity } from "@/features/cart/use-cart";
import { formatIDR } from "@/lib/format";
import type { Product } from "@/lib/api/types";
import { AvailabilityBadge } from "@/features/catalog/availability-badge";

export interface CuratedProduct extends Product {
  tasting_notes?: string[];
  pairing_suggestion?: string;
  artisan_origin?: string;
  preparation_time?: string;
}

interface QuickViewModalProps {
  product: CuratedProduct | null;
  open: boolean;
  onClose: () => void;
}

export function QuickViewModal({ product, open, onClose }: QuickViewModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const isBuyer = status === "authenticated" && user?.role === "buyer";

  const { data: cart } = useCart();
  const setQuantity = useSetCartQuantity();

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    dialogRef.current?.focus();
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || !product) return null;

  const cartItem = cart?.items?.find((item) => item.product_id === product.id);
  const currentQuantity = cartItem ? cartItem.quantity : 0;
  const isAvailable = product.availability_status === "available";

  const handleAddToCart = () => {
    if (!isBuyer || !isAvailable) return;
    setQuantity.mutate({
      productId: product.id,
      quantity: Math.min(currentQuantity + 1, 99),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="presentation"
    >
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quickview-title"
        tabIndex={-1}
        className="relative z-10 w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-surface shadow-2xl outline-none"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface/90 text-foreground hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-2">
          <div className="relative aspect-square sm:aspect-auto sm:h-full bg-surface-muted overflow-hidden">
            {product.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.image_url}
                alt={product.name}
                className="h-full w-full object-cover"
                width={600}
                height={600}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center p-8 text-center text-xs text-muted-foreground">
                Foto produk belum tersedia
              </div>
            )}
            <div className="absolute bottom-3 left-3">
              <AvailabilityBadge status={product.availability_status} />
            </div>
          </div>

          <div className="flex flex-col justify-between p-6 sm:p-8">
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {product.stall_name}
              </div>
              <h2
                id="quickview-title"
                className="mt-1 text-2xl font-bold tracking-tight text-foreground"
              >
                {product.name}
              </h2>
              <div className="mt-2 text-xl font-semibold text-foreground">
                {formatIDR(product.price_minor)}
              </div>

              {product.description ? (
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  {product.description}
                </p>
              ) : null}

              {product.tasting_notes && product.tasting_notes.length > 0 ? (
                <div className="mt-4 border-t border-border pt-3">
                  <h3 className="text-[10px] font-medium uppercase tracking-wider text-foreground">
                    Rasa utama
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {product.tasting_notes.map((note) => (
                      <span
                        key={note}
                        className="rounded-full border border-border bg-surface-muted px-2.5 py-1 text-[11px] text-foreground"
                      >
                        {note}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-6 border-t border-border pt-4">
              {isBuyer ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={!isAvailable || setQuantity.isPending}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                    <span>
                      {setQuantity.isPending
                        ? "Menyimpan..."
                        : currentQuantity > 0
                        ? `Tambah Lagi (${currentQuantity})`
                        : "Tambah ke Keranjang"}
                    </span>
                  </button>
                  {currentQuantity > 0 ? (
                    <Link
                      href="/cart"
                      onClick={onClose}
                      className="inline-flex items-center justify-center rounded-lg border border-border px-3 py-2.5 text-sm font-medium text-foreground hover:bg-surface-muted"
                    >
                      Buka Keranjang
                    </Link>
                  ) : null}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link
                    href="/login"
                    onClick={onClose}
                    className="flex w-full items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground hover:bg-accent/90"
                  >
                    Masuk untuk Memesan
                  </Link>
                  <p className="text-[11px] text-center text-muted-foreground">
                    Belum punya akun?{" "}
                    <Link
                      href="/register"
                      onClick={onClose}
                      className="font-medium text-foreground underline hover:text-accent"
                    >
                      Daftar akun
                    </Link>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

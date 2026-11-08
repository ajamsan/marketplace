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
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quickview-title"
        tabIndex={-1}
        className="relative z-10 w-full max-w-2xl overflow-hidden rounded-md border border-border bg-surface shadow-2xl outline-none"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup jendela rincian"
          className="absolute right-4 top-4 z-20 inline-flex h-9 w-9 items-center justify-center rounded-sm border border-border/60 bg-surface/80 text-foreground hover:bg-surface-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-2">
          {/* Product visual preview */}
          <div className="relative aspect-square sm:aspect-auto sm:h-full bg-surface-muted overflow-hidden">
            {product.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.image_url}
                alt={`Sajian kuliner ${product.name}`}
                className="h-full w-full object-cover"
                width={600}
                height={600}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-surface-muted p-8 text-center text-xs text-muted-foreground uppercase tracking-widest">
                Portofolio Visual Eksklusif
              </div>
            )}
            <div className="absolute bottom-3 left-3">
              <AvailabilityBadge status={product.availability_status} />
            </div>
          </div>

          {/* Details & Tasting Notes */}
          <div className="flex flex-col justify-between p-6 sm:p-8">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {product.artisan_origin ?? product.stall_name}
              </div>
              <h2
                id="quickview-title"
                className="mt-1 font-serif text-2xl font-bold tracking-tight text-foreground"
              >
                {product.name}
              </h2>
              <div className="mt-2 text-xl font-semibold tracking-wide text-foreground">
                {formatIDR(product.price_minor)}
              </div>

              {product.description ? (
                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                  {product.description}
                </p>
              ) : null}

              {/* Tasting Notes */}
              {product.tasting_notes && product.tasting_notes.length > 0 ? (
                <div className="mt-5 border-t border-border/60 pt-4">
                  <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground">
                    Profil Sensorik (Tasting Notes)
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {product.tasting_notes.map((note) => (
                      <span
                        key={note}
                        className="rounded-xs border border-border bg-surface-muted px-2.5 py-1 text-[11px] font-medium text-foreground tracking-wide"
                      >
                        {note}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Pairing / Provenance */}
              {product.pairing_suggestion ? (
                <div className="mt-4 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground uppercase tracking-wider text-[10px] block mb-0.5">
                    Rekomendasi Pendamping:
                  </span>
                  {product.pairing_suggestion}
                </div>
              ) : null}
            </div>

            {/* Actions */}
            <div className="mt-8 border-t border-border pt-4">
              {isBuyer ? (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={!isAvailable || setQuantity.isPending}
                    className="flex flex-1 items-center justify-center gap-2 rounded-sm bg-foreground px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-background hover:bg-foreground/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                    <span>
                      {setQuantity.isPending
                        ? "Menyimpan..."
                        : currentQuantity > 0
                        ? `Tambah Lagi (Di Keranjang: ${currentQuantity})`
                        : "Tambah ke Keranjang"}
                    </span>
                  </button>
                  {currentQuantity > 0 ? (
                    <Link
                      href="/cart"
                      onClick={onClose}
                      className="inline-flex items-center justify-center rounded-sm border border-border px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-foreground hover:bg-surface-muted transition-colors"
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
                    className="flex w-full items-center justify-center gap-2 rounded-sm bg-foreground px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-background hover:bg-foreground/85 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <span>Masuk untuk Memesan</span>
                  </Link>
                  <p className="text-[11px] text-center text-muted-foreground">
                    Belum punya akun pembeli?{" "}
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

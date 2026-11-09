"use client";

import { useEffect, useId, useRef } from "react";
import Link from "next/link";
import { ShoppingBag, X } from "lucide-react";

import { useAuthStore } from "@/features/auth/auth-store";
import { useCart, useSetCartQuantity } from "@/features/cart/use-cart";
import { formatIDR } from "@/lib/format";
import type { Product } from "@/lib/api/types";
import { AvailabilityBadge } from "@/features/catalog/availability-badge";
import { ProductPhoto } from "@/features/catalog/product-card";

interface QuickViewModalProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function QuickViewModal({ product, open, onClose }: QuickViewModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const isBuyer = status === "authenticated" && user?.role === "buyer";

  const { data: cart } = useCart({ enabled: isBuyer });
  const setQuantity = useSetCartQuantity();

  // Menahan fokus di dalam dialog dan mengembalikannya ke pemicu saat ditutup.
  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panel) return;

      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    panel?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="presentation">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-sm border border-border bg-surface shadow-xl outline-none"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup rincian produk"
          className="absolute right-3 top-3 z-20 inline-flex h-11 w-11 items-center justify-center rounded-sm border border-border bg-surface text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-2">
          <div className="relative aspect-[4/3] bg-surface-muted sm:aspect-auto sm:min-h-72">
            <ProductPhoto
              src={product.image_url}
              alt={`Foto ${product.name}`}
              className="h-full w-full"
            />
            <div className="absolute bottom-3 left-3">
              <AvailabilityBadge status={product.availability_status} />
            </div>
          </div>

          <div className="flex flex-col justify-between p-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {product.stall_name}
              </p>
              <h2 id={titleId} className="mt-1 pr-10 font-serif text-2xl font-bold tracking-tight text-foreground">
                {product.name}
              </h2>
              <p className="mt-2 font-serif text-xl font-semibold tabular-nums text-foreground">
                {formatIDR(product.price_minor)}
              </p>

              {product.description ? (
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  {product.description}
                </p>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  Penjual belum menambahkan deskripsi untuk produk ini.
                </p>
              )}
            </div>

            <div className="mt-6 border-t border-border pt-4">
              {isBuyer ? (
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={!isAvailable || setQuantity.isPending}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-sm bg-foreground px-4 text-sm font-semibold text-background transition-colors hover:bg-foreground/85 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                    <span>
                      {setQuantity.isPending
                        ? "Menyimpan..."
                        : currentQuantity > 0
                          ? `Tambah lagi (di keranjang: ${currentQuantity})`
                          : "Tambah ke keranjang"}
                    </span>
                  </button>

                  {!isAvailable ? (
                    <p role="status" className="text-xs text-muted-foreground">
                      Produk ini sedang tidak tersedia, jadi belum bisa dipesan.
                    </p>
                  ) : null}

                  {currentQuantity > 0 ? (
                    <Link
                      href="/cart"
                      onClick={onClose}
                      className="flex min-h-11 items-center justify-center rounded-sm border border-border text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      Buka keranjang
                    </Link>
                  ) : null}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link
                    href="/login"
                    onClick={onClose}
                    className="flex min-h-11 w-full items-center justify-center rounded-sm bg-foreground px-4 text-sm font-semibold text-background transition-colors hover:bg-foreground/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    Masuk untuk memesan
                  </Link>
                  <p className="text-center text-xs text-muted-foreground">
                    Belum punya akun?{" "}
                    <Link
                      href="/register"
                      onClick={onClose}
                      className="font-medium text-foreground underline underline-offset-4 hover:text-accent"
                    >
                      Daftar sebagai pembeli
                    </Link>
                    .
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

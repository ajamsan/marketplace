"use client";

import { memo, useState } from "react";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";

import { AvailabilityBadge } from "./availability-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CartQuantityStepper } from "@/features/cart/quantity-stepper";
import { MAX_QUANTITY } from "@/features/cart/quantity-stepper";
import { useCart, useSetCartQuantity } from "@/features/cart/use-cart";
import { useAuthStore } from "@/features/auth/auth-store";
import { ApiError } from "@/lib/api/client";
import type { Product } from "@/lib/api/types";
import { formatIDR } from "@/lib/format";
import { cn } from "@/lib/utils";

// Menampilkan foto produk atau placeholder yang tetap memiliki nama aksesibel.
export const ProductPhoto = memo(function ProductPhoto({
  src,
  alt,
  className,
  eager = false,
}: {
  src: string | null;
  alt: string;
  className?: string;
  eager?: boolean;
}) {
  if (!src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn(
          "flex flex-col items-center justify-center gap-1.5 overflow-hidden bg-surface-muted text-xs text-muted-foreground uppercase tracking-widest",
          className,
        )}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="h-6 w-6 text-muted-foreground/60"
          aria-hidden="true"
        >
          <path d="M3 7a2 2 0 0 1 2-2h2l1.5-2h7L17 5h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
          <circle cx="12" cy="12" r="3.5" />
        </svg>
        <span className="text-[10px]">Tanpa Foto</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={600}
      height={450}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : undefined}
      className={cn("object-cover transition-transform duration-500 group-hover:scale-105", className)}
    />
  );
});

// Menyajikan informasi produk serta kontrol keranjang khusus pembeli.
export function ProductCard({ product }: { product: Product }) {
  const role = useAuthStore((state) => state.user?.role);
  const isBuyer = role === "buyer";
  const available = product.availability_status === "available";

  return (
    <Card className="group flex h-full flex-col overflow-hidden rounded-md border border-border bg-surface p-0 transition-all duration-300 hover:border-foreground/30 hover:shadow-md">
      <Link
        href={`/products/${product.id}`}
        className="block overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-label={`Lihat rincian lengkap ${product.name}`}
      >
        <ProductPhoto
          src={product.image_url}
          alt={`Foto sajian ${product.name}`}
          className="aspect-[4/3] w-full"
        />
      </Link>
      <div className="flex flex-1 flex-col justify-between gap-3 p-5">
        <div>
          <div className="flex items-start justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {product.stall_name}
            </span>
            <AvailabilityBadge status={product.availability_status} />
          </div>
          <h3 className="mt-1 font-serif text-base font-bold tracking-tight text-foreground">
            <Link
              href={`/products/${product.id}`}
              className="hover:text-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-xs"
            >
              {product.name}
            </Link>
          </h3>
          {product.description ? (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          ) : null}
        </div>

        <div className="border-t border-border/70 pt-3">
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Harga
            </span>
            <span className="text-base font-semibold text-foreground">
              {formatIDR(product.price_minor)}
            </span>
          </div>
          {isBuyer ? <ProductActions product={product} available={available} /> : null}
        </div>
      </div>
    </Card>
  );
}

// Mengatur penambahan produk dan menampilkan perubahan jumlah keranjang.
function ProductActions({ product, available }: { product: Product; available: boolean }) {
  const { data: cart } = useCart({ enabled: true });
  const addToCart = useSetCartQuantity();
  const [message, setMessage] = useState<string | null>(null);

  const inCart = cart?.items.find((item) => item.product_id === product.id)?.quantity ?? 0;
  const atLimit = inCart >= MAX_QUANTITY;

  // Menambah satu unit ke keranjang sambil mencegah jumlah melampaui batas.
  const handleAdd = () => {
    setMessage(null);
    if (atLimit) {
      setMessage(`Kuantitas maksimum ${MAX_QUANTITY} untuk produk ini.`);
      return;
    }
    addToCart.mutate(
      { productId: product.id, quantity: inCart + 1 },
      {
        onSuccess: () => setMessage(null),
        onError: (error) =>
          setMessage(
            error instanceof ApiError
              ? (Object.values(error.fields ?? {})[0] ?? error.message)
              : "Gagal menambahkan ke keranjang.",
          ),
      },
    );
  };

  if (!available) {
    return (
      <p className="mt-auto text-xs text-muted-foreground text-center py-1">
        Sajian belum tersedia saat ini.
      </p>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-2">
      <div className="mt-auto w-full">
        {inCart > 0 ? (
          <CartQuantityStepper
            productId={product.id}
            quantity={inCart}
            name={product.name}
            available={available}
          />
        ) : (
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={addToCart.isPending || atLimit}
            className="w-full rounded-sm uppercase tracking-wider text-xs font-semibold py-2.5 px-2 flex items-center justify-center gap-1.5"
          >
            <ShoppingCart className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{addToCart.isPending ? "Menambahkan..." : "Tambah ke Keranjang"}</span>
          </Button>
        )}
      </div>
      {message ? (
        <p
          role="status"
          className={cn(
            "text-xs font-medium text-center",
            addToCart.isError ? "text-danger" : "text-muted-foreground",
          )}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

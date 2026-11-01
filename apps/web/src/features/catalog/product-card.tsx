"use client";

import { memo, useMemo, useState } from "react";
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

export const ProductPhoto = memo(function ProductPhoto({
  src,
  alt,
  className,
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  if (!src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn(
          "flex items-center justify-center overflow-hidden bg-surface-muted text-xs text-muted-foreground",
          className,
        )}
      >
        Tanpa foto
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={cn("object-cover", className)}
    />
  );
});

export function ProductCard({ product }: { product: Product }) {
  const role = useAuthStore((state) => state.user?.role);
  const isBuyer = role === "buyer";
  const available = product.availability_status === "available";

  return (
    <Card className="flex h-full flex-col overflow-hidden p-0">
      <Link
        href={`/products/${product.id}`}
        className="block focus-visible:outline-none"
        aria-label={`Lihat detail ${product.name}`}
      >
        <ProductPhoto
          src={product.image_url}
          alt={`Foto ${product.name}`}
          className="aspect-[4/3] w-full"
        />
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            <Link href={`/products/${product.id}`} className="hover:underline">
              {product.name}
            </Link>
          </h3>
          <AvailabilityBadge status={product.availability_status} />
        </div>
        <p className="text-xs text-muted-foreground">{product.stall_name}</p>
        <p className="text-base font-semibold text-foreground">
          {formatIDR(product.price_minor)}
        </p>
        {isBuyer ? <ProductActions product={product} available={available} /> : null}
      </div>
    </Card>
  );
}

function ProductActions({ product, available }: { product: Product; available: boolean }) {
  const { data: cart } = useCart({ enabled: true });
  const addToCart = useSetCartQuantity();
  const [message, setMessage] = useState<string | null>(null);

  const inCart = cart?.items.find((item) => item.product_id === product.id)?.quantity ?? 0;
  const atLimit = inCart >= MAX_QUANTITY;

  const handleAdd = () => {
    setMessage(null);
    if (atLimit) {
      setMessage(`Kuantitas maksimum ${MAX_QUANTITY} untuk produk ini.`);
      return;
    }
    addToCart.mutate(
      { productId: product.id, quantity: inCart + 1 },
      {
        onSuccess: () => setMessage("Masuk keranjang."),
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
      <p className="mt-auto text-xs text-muted-foreground">
        Produk ini tidak dapat ditambahkan ke keranjang.
      </p>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-2">
      <p className="min-h-[1.25rem] text-xs text-muted-foreground">
        {inCart > 0 ? `Di keranjang: ${inCart} item` : "\u00a0"}
      </p>
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
            className="w-full"
          >
            <ShoppingCart className="h-4 w-4" aria-hidden="true" />
            {addToCart.isPending ? "Menambahkan..." : "Tambah ke keranjang"}
          </Button>
        )}
      </div>
      {message ? (
        <p
          role="status"
          className={cn(
            "text-xs font-medium",
            addToCart.isError ? "text-danger" : "text-muted-foreground",
          )}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

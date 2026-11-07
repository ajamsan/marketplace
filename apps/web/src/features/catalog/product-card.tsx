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
          "flex flex-col items-center justify-center gap-1 overflow-hidden bg-surface-muted text-xs text-muted-foreground",
          className,
        )}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="h-6 w-6"
          aria-hidden="true"
        >
          <path d="M3 7a2 2 0 0 1 2-2h2l1.5-2h7L17 5h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
          <circle cx="12" cy="12" r="3.5" />
        </svg>
        <span>Tanpa foto</span>
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

// Menyajikan informasi produk serta kontrol keranjang khusus pembeli.
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
        // Menghapus pesan lama setelah penambahan berhasil.
        onSuccess: () => setMessage(null),
        // Menyajikan pesan server bila penambahan tidak dapat disimpan.
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
      <div className="mt-auto min-h-[2.5rem] w-full">
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

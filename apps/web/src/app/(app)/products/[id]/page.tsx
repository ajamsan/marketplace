"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ShoppingCart } from "lucide-react";

import { getProduct } from "@/features/catalog/api";
import { AvailabilityBadge } from "@/features/catalog/availability-badge";
import { ProductPhoto } from "@/features/catalog/product-card";
import { CartBar } from "@/features/cart/cart-bar";
import { MAX_QUANTITY, QuantityStepper } from "@/features/cart/quantity-stepper";
import { useCart, useSetCartQuantity } from "@/features/cart/use-cart";
import { useAuthStore } from "@/features/auth/auth-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState, Skeleton } from "@/components/ui/feedback";
import { ApiError } from "@/lib/api/client";
import { formatIDR } from "@/lib/format";

// Menampilkan rincian produk dan aksi penambahan jumlah ke keranjang dengan estetika gastronomi.
export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const role = useAuthStore((state) => state.user?.role);
  const isBuyer = role === "buyer";
  const { data: cart } = useCart({ enabled: isBuyer });
  const addToCart = useSetCartQuantity();

  const product = useQuery({
    queryKey: ["products", id],
    queryFn: () => getProduct(id),
  });

  const data = product.data;
  const available = data?.availability_status === "available";
  const inCart = cart?.items.find((item) => item.product_id === id)?.quantity ?? 0;
  const atLimit = inCart + quantity > MAX_QUANTITY;

  const handleAdd = () => {
    if (!data) return;
    setMessage(null);
    if (atLimit) {
      setMessage(`Kuantitas maksimum ${MAX_QUANTITY} untuk produk ini.`);
      return;
    }
    addToCart.mutate(
      { productId: data.id, quantity: inCart + quantity },
      {
        onSuccess: () => setMessage("Berhasil ditambahkan ke pesanan Anda."),
        onError: (error) =>
          setMessage(
            error instanceof ApiError
              ? (Object.values(error.fields ?? {})[0] ?? error.message)
              : "Gagal menambahkan ke keranjang.",
          ),
      },
    );
  };

  const errorMessage =
    product.error instanceof ApiError ? product.error.message : "Gagal memuat detail sajian.";

  return (
    <div className="pb-32 md:pb-24 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
      <div className="flex flex-col gap-6">
        <Link
          href="/catalog"
          className="inline-flex w-fit items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Kembali ke Katalog Kurasi</span>
        </Link>

        {product.isPending ? (
          <Card className="flex flex-col sm:flex-row gap-6 p-6">
            <Skeleton className="aspect-[4/3] w-full sm:w-1/2 rounded-md" />
            <div className="flex-1 flex flex-col gap-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-8 w-1/4" />
              <Skeleton className="h-20 w-full mt-4" />
            </div>
          </Card>
        ) : product.isError || !data ? (
          <ErrorState
            message={errorMessage}
            onRetry={() => {
              void product.refetch();
            }}
          />
        ) : (
          <Card className="flex flex-col sm:flex-row gap-8 p-6 sm:p-8 rounded-md border border-border bg-surface shadow-md">
            <div className="w-full sm:w-1/2 overflow-hidden rounded-sm bg-surface-muted">
              <ProductPhoto
                src={data.image_url}
                alt={`Foto sajian ${data.name}`}
                className="aspect-[4/3] w-full object-cover"
              />
            </div>

            <div className="flex flex-1 flex-col justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                    Atelier: {data.stall_name}
                  </span>
                  <AvailabilityBadge status={data.availability_status} />
                </div>

                <h1 className="mt-2 font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {data.name}
                </h1>

                <div className="mt-3">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-medium">
                    Harga Satuan
                  </span>
                  <span className="font-serif text-2xl font-bold text-foreground">
                    {formatIDR(data.price_minor)}
                  </span>
                </div>

                {data.description ? (
                  <p className="mt-4 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                    {data.description}
                  </p>
                ) : (
                  <p className="mt-4 text-xs italic text-muted-foreground">
                    Sajian artisanal dipersiapkan segar dari dapur stan pilihan.
                  </p>
                )}
              </div>

              {available ? (
                <div className="flex flex-col gap-4 border-t border-border/80 pt-6">
                  {inCart > 0 ? (
                    <div className="rounded-xs border border-border bg-surface-muted/50 p-2.5 text-xs text-muted-foreground">
                      Telah ada <strong>{inCart} porsi</strong> di keranjang Anda.
                    </div>
                  ) : null}

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-foreground mb-2">
                      Jumlah Porsi
                    </label>
                    <QuantityStepper
                      value={quantity}
                      onChange={setQuantity}
                      label={data.name}
                      busy={addToCart.isPending}
                    />
                  </div>

                  <Button
                    onClick={handleAdd}
                    disabled={addToCart.isPending || atLimit}
                    className="w-full uppercase tracking-widest text-xs font-semibold py-3"
                  >
                    <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                    <span>{addToCart.isPending ? "Menyimpan ke Pesanan..." : "Tambah ke Keranjang"}</span>
                  </Button>

                  {message ? (
                    <p
                      role="status"
                      className={
                        addToCart.isError
                          ? "text-xs font-medium text-danger text-center"
                          : "text-xs font-medium text-success text-center"
                      }
                    >
                      {message}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="border-t border-border/80 pt-6">
                  <p className="text-xs font-medium text-muted-foreground text-center py-2">
                    Sajian ini sedang tidak tersedia untuk dipesan saat ini.
                  </p>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
      <CartBar />
    </div>
  );
}

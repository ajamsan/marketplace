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

// Menampilkan rincian produk dan aksi penambahan jumlah ke keranjang.
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
    // Memuat data produk berdasarkan ID pada alamat halaman.
    queryFn: () => getProduct(id),
  });

  const data = product.data;
  const available = data?.availability_status === "available";
  const inCart = cart?.items.find((item) => item.product_id === id)?.quantity ?? 0;
  const atLimit = inCart + quantity > MAX_QUANTITY;

  // Memeriksa batas jumlah dan mengirim hasil pilihan ke keranjang.
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
        // Memberi umpan balik setelah server menerima perubahan keranjang.
        onSuccess: () => setMessage("Masuk keranjang."),
        // Menampilkan alasan kegagalan dari API atau pesan umum jaringan.
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
    product.error instanceof ApiError ? product.error.message : "Gagal memuat produk.";

  return (
    <div className="pb-28 md:pb-24">
      <div className="flex flex-col gap-4">
        <Link
          href="/catalog"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-foreground hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Kembali ke katalog
        </Link>

        {product.isPending ? (
          <Card className="flex flex-col gap-3">
            <Skeleton className="aspect-[4/3] w-full" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-9 w-1/3" />
          </Card>
        ) : product.isError || !data ? (
          <ErrorState
            message={errorMessage}
            onRetry={() => {
              void product.refetch();
            }}
          />
        ) : (
          <Card className="flex flex-col gap-4 p-0 sm:flex-row">
            <ProductPhoto
              src={data.image_url}
              alt={`Foto ${data.name}`}
              className="aspect-[4/3] w-full sm:w-2/5"
            />
            <div className="flex flex-1 flex-col gap-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h1 className="text-xl font-bold text-foreground">{data.name}</h1>
                <AvailabilityBadge status={data.availability_status} />
              </div>
              <p className="text-sm text-muted-foreground">Stan {data.stall_name}</p>
              <p className="text-lg font-semibold text-foreground">
                {formatIDR(data.price_minor)}
              </p>
              {data.description ? (
                <p className="text-sm text-foreground">{data.description}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Tanpa deskripsi.</p>
              )}

              {available ? (
                <div className="flex flex-col gap-3 border-t border-border pt-4">
                  {inCart > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Sudah ada {inCart} item di keranjang. Kuantitas di bawah akan
                      ditambahkan.
                    </p>
                  ) : null}
                  <QuantityStepper
                    value={quantity}
                    onChange={setQuantity}
                    label={data.name}
                    busy={addToCart.isPending}
                  />
                  <p className="text-xs text-muted-foreground">
                    Jumlah yang ditambahkan ke keranjang.
                  </p>
                  <Button onClick={handleAdd} disabled={addToCart.isPending || atLimit}>
                    <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                    {addToCart.isPending ? "Menambahkan..." : "Tambah ke keranjang"}
                  </Button>
                  {message ? (
                    <p
                      role="status"
                      className={
                        addToCart.isError
                          ? "text-xs font-medium text-danger"
                          : "text-xs font-medium text-muted-foreground"
                      }
                    >
                      {message}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="border-t border-border pt-4 text-sm font-medium text-muted-foreground">
                  Produk ini sedang tidak tersedia dan tidak dapat ditambahkan ke keranjang.
                </p>
              )}
            </div>
          </Card>
        )}
      </div>
      <CartBar />
    </div>
  );
}

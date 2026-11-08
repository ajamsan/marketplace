"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { previewOrder, type OrderItemInput } from "@/features/orders/api";
import { CheckoutSummary } from "@/features/orders/checkout-summary";
import { CartBar } from "@/features/cart/cart-bar";
import { useCart } from "@/features/cart/use-cart";
import { useAuthStore } from "@/features/auth/auth-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { ApiError } from "@/lib/api/client";

// Memvalidasi keranjang, memuat pratinjau harga, lalu menampilkan konfirmasi checkout dengan estetika kurasi.
export default function CheckoutPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const role = useAuthStore((state) => state.user?.role);
  const isBuyer = role === "buyer";
  const cart = useCart({ enabled: isBuyer });

  const items = useMemo<OrderItemInput[]>(
    () =>
      (cart.data?.items ?? []).map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
      })),
    [cart.data],
  );

  const preview = useQuery({
    queryKey: ["orders", "preview", items],
    queryFn: () => previewOrder(items),
    enabled: isBuyer && items.length > 0,
  });

  const handleCreated = (orderId: string) => {
    void queryClient.invalidateQueries({ queryKey: ["cart"] });
    void queryClient.invalidateQueries({ queryKey: ["orders"] });
    router.push(`/orders/${orderId}`);
  };

  const cartError =
    cart.error instanceof ApiError ? cart.error.message : "Gagal memuat keranjang.";
  const previewError =
    preview.error instanceof ApiError ? preview.error.message : "Gagal memuat pratinjau pesanan.";
  const previewFields =
    preview.error instanceof ApiError ? Object.values(preview.error.fields ?? {}) : [];

  if (!isBuyer) {
    return (
      <div className="pb-32 md:pb-24 max-w-3xl mx-auto px-4 pt-6">
        <Card className="rounded-md border border-border bg-surface p-8 text-center">
          <h2 className="font-serif text-xl font-bold text-foreground">Akses Khusus Pembeli</h2>
          <p className="mt-2 text-xs text-muted-foreground">
            Halaman checkout pesanan hanya dapat diakses oleh akun peran pembeli.
          </p>
        </Card>
        <CartBar />
      </div>
    );
  }

  return (
    <div className="pb-32 md:pb-24 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-1 border-b border-border/80 pb-6">
          <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground block">
            Tahap Akhir Pemesanan
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Konfirmasi Pesanan Kurasi
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Periksa kembali rincian sajian dan stan atelier sebelum membuat pesanan resmi.
          </p>
        </header>

        {cart.isPending ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-32 w-full rounded-md" />
            <Skeleton className="h-40 w-full rounded-md" />
          </div>
        ) : cart.isError ? (
          <ErrorState
            message={cartError}
            onRetry={() => {
              void cart.refetch();
            }}
          />
        ) : items.length === 0 ? (
          <EmptyState
            title="Keranjang kurasi masih kosong"
            description="Tambahkan kreasi hidangan dari katalog sebelum melanjutkan ke checkout."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  router.push("/catalog");
                }}
                className="rounded-sm uppercase tracking-wider text-xs font-semibold px-5 py-2.5 mt-2"
              >
                Eksplorasi Katalog
              </Button>
            }
          />
        ) : preview.isPending ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-48 w-full rounded-md" />
            <Skeleton className="h-32 w-full rounded-md" />
          </div>
        ) : preview.isError || !preview.data ? (
          <div className="flex flex-col gap-3">
            {previewFields.length > 0 ? (
              <div
                role="alert"
                className="rounded-sm border border-danger/40 bg-danger-soft p-3 text-xs text-foreground"
              >
                {previewFields.map((message) => (
                  <p key={message}>{message}</p>
                ))}
              </div>
            ) : null}
            <ErrorState
              message={previewError}
              onRetry={() => {
                void preview.refetch();
              }}
            />
          </div>
        ) : (
          <CheckoutSummary preview={preview.data} items={items} onCreated={handleCreated} />
        )}
      </div>
      <CartBar />
    </div>
  );
}

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
      <div className="pb-28 md:pb-24">
        <Card>
          <p className="text-sm text-foreground">
            Halaman checkout hanya untuk akun pembeli.
          </p>
        </Card>
        <CartBar />
      </div>
    );
  }

  return (
    <div className="pb-28 md:pb-24">
      <div className="flex flex-col gap-4">
        <header className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-foreground">Checkout</h1>
          <p className="text-sm text-muted-foreground">
            Periksa ringkasan sebelum membuat pesanan.
          </p>
        </header>

        {cart.isPending ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-40 w-full" />
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
            title="Keranjang masih kosong"
            description="Tambahkan produk dari katalog sebelum checkout."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  router.push("/catalog");
                }}
              >
                Buka katalog
              </Button>
            }
          />
        ) : preview.isPending ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : preview.isError || !preview.data ? (
          <div className="flex flex-col gap-3">
            {previewFields.length > 0 ? (
              <div
                role="alert"
                className="rounded-lg border border-danger/40 bg-danger-soft p-3 text-sm text-foreground"
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

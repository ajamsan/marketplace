"use client";

import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";

import { listOrders } from "@/features/orders/api";
import { OrderList } from "@/features/orders/order-list";
import { CartBar } from "@/features/cart/cart-bar";
import { Button } from "@/components/ui/button";
import { ErrorState, Skeleton } from "@/components/ui/feedback";
import { ApiError } from "@/lib/api/client";

export default function OrdersPage() {
  const orders = useInfiniteQuery({
    queryKey: ["orders"],
    queryFn: ({ pageParam }) => listOrders(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
  });

  const items = useMemo(
    () => orders.data?.pages.flatMap((page) => page.orders) ?? [],
    [orders.data],
  );

  const errorMessage =
    orders.error instanceof ApiError ? orders.error.message : "Gagal memuat riwayat pesanan.";

  return (
    <div className="pb-28 md:pb-24">
      <div className="flex flex-col gap-4">
        <header className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-foreground">Pesanan saya</h1>
          <p className="text-sm text-muted-foreground">
            Riwayat pesanan beserta status pembayaran per stan.
          </p>
        </header>

        {orders.isPending ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : orders.isError ? (
          <ErrorState
            message={errorMessage}
            onRetry={() => {
              void orders.refetch();
            }}
          />
        ) : (
          <>
            <OrderList orders={items} />
            {orders.hasNextPage ? (
              <div className="flex justify-center">
                <Button
                  variant="secondary"
                  onClick={() => {
                    void orders.fetchNextPage();
                  }}
                  disabled={orders.isFetchingNextPage}
                >
                  {orders.isFetchingNextPage ? "Memuat..." : "Muat lagi"}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
      <CartBar />
    </div>
  );
}

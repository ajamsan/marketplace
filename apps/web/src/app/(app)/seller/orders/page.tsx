"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import { ApiError } from "@/lib/api/client";
import { RequireRole } from "@/features/auth/guards";
import { listSellerOrders } from "@/features/seller/api";
import { OrderQueue } from "@/features/seller/order-queue";

// Membatasi antrean pesanan pada akun penjual.
export default function SellerOrdersPage() {
  return (
    <RequireRole roles={["seller"]}>
      <SellerOrdersView />
    </RequireRole>
  );
}

// Memuat dan menggabungkan halaman antrean untuk ditampilkan per stan.
function SellerOrdersView() {
  const query = useInfiniteQuery({
    queryKey: ["seller", "orders"],
    // Mengambil halaman antrean berdasarkan cursor terakhir dari server.
    queryFn: ({ pageParam }) => listSellerOrders(pageParam),
    initialPageParam: null as string | null,
    // Meneruskan cursor untuk memuat batch antrean berikutnya.
    getNextPageParam: (lastPage) => lastPage.next_cursor,
  });

  const orders = query.data?.pages.flatMap((page) => page.orders) ?? [];
  const errorMessage = query.error
    ? query.error instanceof ApiError
      ? query.error.message
      : "Antrian pesanan gagal dimuat."
    : null;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-lg font-bold text-foreground">Pesanan stan</h1>
        <p className="text-sm text-muted-foreground">
          Pesanan ditampilkan per stan yang Anda kelola. Pembayaran hanya dapat dikonfirmasi
          untuk tunai.
        </p>
      </header>

      <OrderQueue
        orders={orders}
        isLoading={query.isLoading}
        error={errorMessage}
        onRetry={() => void query.refetch()}
        hasMore={Boolean(query.hasNextPage)}
        isLoadingMore={query.isFetchingNextPage}
        onLoadMore={() => void query.fetchNextPage()}
      />
    </div>
  );
}

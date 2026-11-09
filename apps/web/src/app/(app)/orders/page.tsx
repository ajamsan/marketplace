"use client";

import { useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Filter, X, Search } from "lucide-react";

import { listOrders } from "@/features/orders/api";
import { OrderList } from "@/features/orders/order-list";
import { CartBar } from "@/features/cart/cart-bar";
import { Button } from "@/components/ui/button";
import { ErrorState, Skeleton } from "@/components/ui/feedback";
import { ApiError } from "@/lib/api/client";

type OrderStatus = "all" | "awaiting_payment" | "confirmed" | "in_preparation" | "ready_for_pickup" | "completed" | "cancelled" | "expired" | "rejected";

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "all", label: "Semua status" },
  { value: "awaiting_payment", label: "Menunggu pembayaran" },
  { value: "confirmed", label: "Dikonfirmasi" },
  { value: "in_preparation", label: "Disiapkan" },
  { value: "ready_for_pickup", label: "Siap diambil" },
  { value: "completed", label: "Selesai" },
  { value: "cancelled", label: "Dibatalkan" },
  { value: "expired", label: "Kedaluwarsa" },
  { value: "rejected", label: "Ditolak" },
];

export default function OrdersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus>("all");

  const orders = useInfiniteQuery({
    queryKey: ["orders", { q: search, status: statusFilter }],
    queryFn: ({ pageParam }) => listOrders({ cursor: pageParam, q: search || undefined, status: statusFilter !== "all" ? statusFilter : undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
  });

  const allItems = useMemo(
    () => {
      const flat = orders.data?.pages.flatMap((page) => page.orders) ?? [];
      // Deduplicate by order ID in case same order appears in multiple pages
      const seen = new Set<string>();
      return flat.filter((order) => {
        if (seen.has(order.id)) return false;
        seen.add(order.id);
        return true;
      });
    },
    [orders.data],
  );

  // Client-side filtering fallback (in case backend doesn't support query params)
  const items = useMemo(() => {
    return allItems.filter((order) => {
      const matchesSearch = !search || order.public_code.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [allItems, search, statusFilter]);

  const hasActiveFilters = search || statusFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
  };

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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 bg-surface p-4 rounded-md border border-border shadow-2xs">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              placeholder="Cari kode pesanan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-sm border border-border bg-background pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
              aria-label="Cari kode pesanan"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OrderStatus)}
              className="w-full rounded-sm border border-border bg-background pl-10 pr-8 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent appearance-none"
              aria-label="Filter status"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Hapus filter
          </button>
        )}

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
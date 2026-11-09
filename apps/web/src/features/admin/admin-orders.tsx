"use client";

import { useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";

import { ApiError } from "@/lib/api/client";
import { fulfillmentStatusLabel, formatDateTime, formatIDR, orderStatusLabel, paymentStatusLabel } from "@/lib/format";
import { listAdminOrders } from "./api";
import { Badge, Card, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Memilih nada badge pembayaran agar mudah dipindai oleh admin.
function paymentTone(status: string) {
  if (status === "cash_paid") return "success" as const;
  if (status === "cash_due") return "warning" as const;
  return "neutral" as const;
}

// Menyajikan riwayat pesanan lintas stan beserta nomor antrian hariannya.
export function AdminOrdersHistory() {
  const [search, setSearch] = useState("");
  const [stallFilter, setStallFilter] = useState("all");

  const query = useInfiniteQuery({
    queryKey: ["admin", "orders"],
    queryFn: ({ pageParam }) => listAdminOrders({ cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
  });

  const items = useMemo(
    () => query.data?.pages.flatMap((page) => page.orders) ?? [],
    [query.data],
  );

  const stalls = useMemo(() => {
    const seen = new Map<string, string>();
    for (const order of items) {
      for (const payment of order.payments) {
        if (!seen.has(payment.stall_id)) seen.set(payment.stall_id, payment.stall_name);
      }
      for (const item of order.items) {
        if (!seen.has(item.stall_id)) seen.set(item.stall_id, item.stall_name);
      }
    }
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1], "id"));
  }, [items]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((order) => {
      if (stallFilter !== "all") {
        const inStall = order.payments.some((p) => p.stall_id === stallFilter)
          || order.items.some((i) => i.stall_id === stallFilter);
        if (!inStall) return false;
      }
      if (!term) return true;
      return (
        order.public_code.toLowerCase().includes(term)
        || order.buyer_username.toLowerCase().includes(term)
      );
    });
  }, [items, search, stallFilter]);

  const errorMessage = query.error instanceof ApiError
    ? query.error.status === 404
      ? "Endpoint laporan admin belum aktif di backend ini. Restart backend (go run ./cmd/api) lalu coba lagi."
      : query.error.message
    : "Riwayat pesanan gagal dimuat.";

  return (
    <Card>
      <CardHeader
        title="Riwayat pesanan stan"
        description="Seluruh pesanan lintas stan dengan nomor antrian. Antrian direset dari #1 setiap pukul 00.00 WIB."
      />

      <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari kode pesanan atau nama pembeli..."
            aria-label="Cari pesanan"
            className="w-full min-h-11 rounded-lg border border-border bg-background py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <select
          value={stallFilter}
          onChange={(event) => setStallFilter(event.target.value)}
          aria-label="Filter stan"
          className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="all">Semua stan</option>
          {stalls.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {query.isPending ? (
        <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
          <span className="sr-only">Memuat riwayat pesanan...</span>
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : query.isError ? (
        <ErrorState message={errorMessage} onRetry={() => void query.refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={search || stallFilter !== "all" ? "Tidak ada pesanan yang cocok" : "Belum ada pesanan"}
          description={
            search || stallFilter !== "all"
              ? "Coba kata kunci lain atau hapus filter."
              : "Riwayat pesanan seluruh stan akan muncul di sini."
          }
        />
      ) : (
        <>
          <ol className="flex flex-col gap-3">
            {filtered.map((order) => (
              <li
                key={order.id}
                className="rounded-lg border border-border bg-surface-muted p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div
                      className={cn(
                        "flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg border",
                        order.queue_number > 0
                          ? "border-accent bg-accent-soft text-accent"
                          : "border-border bg-surface text-muted-foreground",
                      )}
                    >
                      {order.queue_number > 0 ? (
                        <>
                          <span className="text-[9px] font-semibold uppercase tracking-wide">Antrian</span>
                          <span className="font-serif text-lg font-bold leading-none">#{order.queue_number}</span>
                        </>
                      ) : (
                        <span className="px-1 text-center text-[9px] font-medium leading-tight">Belum ada antrian</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-semibold text-foreground">{order.public_code}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.buyer_username} · {formatDateTime(order.created_at)}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Badge tone={order.status === "completed" ? "success" : order.status === "cancelled" ? "danger" : "info"}>
                          {orderStatusLabel(order.status)}
                        </Badge>
                        {order.fulfillments.map((fulfillment) => (
                          <Badge key={fulfillment.id} tone="neutral">
                            {fulfillment.stall_name}: {fulfillmentStatusLabel(fulfillment.status)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="font-serif text-base font-bold text-foreground">
                    {formatIDR(order.total_minor)}
                  </p>
                </div>

                <ul className="mt-3 grid grid-cols-1 gap-2 border-t border-border pt-3 sm:grid-cols-2">
                  {order.payments.map((payment) => (
                    <li key={payment.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate text-muted-foreground">{payment.stall_name}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <Badge tone={paymentTone(payment.status)}>{paymentStatusLabel(payment.status)}</Badge>
                        <span className="tabular-nums text-xs text-foreground">{formatIDR(payment.amount_minor)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>

          {query.hasNextPage ? (
            <div className="mt-4 flex justify-center">
              <Button
                variant="secondary"
                onClick={() => void query.fetchNextPage()}
                disabled={query.isFetchingNextPage}
              >
                {query.isFetchingNextPage ? "Memuat..." : "Muat lagi"}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </Card>
  );
}

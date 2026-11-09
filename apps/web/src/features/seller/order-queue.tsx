"use client";

import { useMemo, useState } from "react";
import { Filter, X, Search } from "lucide-react";

import type {
  FulfillmentLine,
  OrderItemLine,
  PaymentLine,
  SellerOrder,
} from "@/lib/api/types";
import {
  formatDateTime,
  formatIDR,
  orderStatusLabel,
  paymentStatusLabel,
} from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { CashConfirmDialog } from "./cash-confirm-dialog";
import { FulfillmentControls } from "./fulfillment-controls";

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: "Tunai",
  qris_placeholder: "QRIS (belum tersedia)",
};

type OrderFilterStatus = "all" | "active" | "completed" | "cancelled" | "awaiting_payment";

const FILTER_OPTIONS: { value: OrderFilterStatus; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "active", label: "Aktif (butuh aksi)" },
  { value: "completed", label: "Selesai" },
  { value: "awaiting_payment", label: "Menunggu pembayaran" },
  { value: "cancelled", label: "Dibatalkan" },
];

interface StallSlice {
  stallId: string;
  stallName: string;
  payment: PaymentLine | null;
  fulfillment: FulfillmentLine | null;
  items: OrderItemLine[];
}

// Menggabungkan item, pembayaran, dan pemenuhan menurut stan yang ditangani penjual.
function buildSlices(order: SellerOrder): StallSlice[] {
  const slices = new Map<string, StallSlice>();
  const ensure = (stallId: string, stallName: string): StallSlice => {
    const existing = slices.get(stallId);
    if (existing) return existing;
    const slice: StallSlice = {
      stallId,
      stallName,
      payment: null,
      fulfillment: null,
      items: [],
    };
    slices.set(stallId, slice);
    return slice;
  };
  for (const item of order.items) {
    ensure(item.stall_id, item.stall_name).items.push(item);
  }
  for (const payment of order.payments) {
    ensure(payment.stall_id, payment.stall_name).payment = payment;
  }
  for (const fulfillment of order.fulfillments) {
    ensure(fulfillment.stall_id, fulfillment.stall_name).fulfillment = fulfillment;
  }
  return [...slices.values()];
}

function getOrderFilterStatus(order: SellerOrder): OrderFilterStatus {
  if (order.status === "completed") return "completed";
  if (order.status === "cancelled" || order.status === "rejected" || order.status === "expired") return "cancelled";

  const allPaid = order.payments.length > 0 && order.payments.every((p) => p.status === "cash_paid");
  const anyDue = order.payments.some((p) => p.status === "cash_due");

  if (!allPaid && anyDue) return "awaiting_payment";
  if (allPaid && order.status !== "completed") return "active";
  return "all";
}

export interface OrderQueueProps {
  orders: SellerOrder[];
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}

// Menyajikan antrean penjual dengan status pembayaran dan aksi pemenuhan per stan.
export function OrderQueue({
  orders,
  isLoading,
  error,
  onRetry,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
}: OrderQueueProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderFilterStatus>("all");
  const [cashTarget, setCashTarget] = useState<{
    order: SellerOrder;
    payment: PaymentLine;
  } | null>(null);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
  };

  const hasActiveFilters = search || statusFilter !== "all";

  // Sort: active orders first by queue number (earliest first), then by created_at
  const sortedOrders = useMemo(() => {
    const active = orders
      .filter((o) => getOrderFilterStatus(o) === "active")
      .slice()
      .sort((a, b) => {
        // Sort by queue number if available, otherwise by created_at
        if (a.queue_number && b.queue_number) {
          return a.queue_number - b.queue_number;
        }
        if (a.queue_number) return -1;
        if (b.queue_number) return 1;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

    const pending = orders
      .filter((o) => getOrderFilterStatus(o) === "awaiting_payment" || getOrderFilterStatus(o) === "all")
      .slice()
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const completed = orders
      .filter((o) => o.status === "completed")
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const cancelled = orders
      .filter((o) => o.status === "cancelled" || o.status === "rejected" || o.status === "expired")
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return [...active, ...pending, ...completed, ...cancelled];
  }, [orders]);

  const loadMoreButton = hasMore && onLoadMore ? (
    <div className="flex justify-center">
      <Button variant="secondary" onClick={onLoadMore} disabled={isLoadingMore}>
        {isLoadingMore ? "Memuat..." : "Muat pesanan berikutnya"}
      </Button>
    </div>
  ) : null;

  const filteredOrders = useMemo(() => {
    return sortedOrders.filter((order) => {
      const matchesSearch = !search || order.public_code.toLowerCase().includes(search.toLowerCase()) ||
        order.buyer_username.toLowerCase().includes(search.toLowerCase());

      const orderStatus = getOrderFilterStatus(order);
      const matchesStatus = statusFilter === "all" ||
        (statusFilter === "active" && orderStatus === "active") ||
        (statusFilter === "completed" && orderStatus === "completed") ||
        (statusFilter === "awaiting_payment" && orderStatus === "awaiting_payment") ||
        (statusFilter === "cancelled" && orderStatus === "cancelled");

      return matchesSearch && matchesStatus;
    });
  }, [sortedOrders, search, statusFilter]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
        <span className="sr-only">Memuat antrian pesanan...</span>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }

  if (filteredOrders.length === 0) {
    return (
      <EmptyState
        title={search || statusFilter !== "all" ? "Tidak ada pesanan yang cocok" : "Belum ada pesanan masuk"}
        description={search || statusFilter !== "all"
          ? "Coba hapus filter atau ubah kata kunci pencarian."
          : "Pesanan yang memuat produk dari stan Anda akan muncul di antrian ini."}
        action={hasActiveFilters || loadMoreButton ? (
          <div className="mt-2 flex flex-col items-center gap-2">
            {hasActiveFilters ? (
              <Button variant="secondary" onClick={clearFilters}>
                Hapus filter
              </Button>
            ) : null}
            {loadMoreButton}
          </div>
        ) : null}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filter bar */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 bg-surface p-4 rounded-md border border-border shadow-2xs">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            placeholder="Cari kode pesanan atau nama pembeli..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-sm border border-border bg-background pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
            aria-label="Cari pesanan"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as OrderFilterStatus)}
            className="w-full rounded-sm border border-border bg-background pl-10 pr-8 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent appearance-none"
            aria-label="Filter status"
          >
            {FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 px-4">
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          Hapus filter
        </Button>
      )}

      <div className="flex flex-col gap-4">
        {filteredOrders.map((order) => {
          const slices = buildSlices(order);
          const allPaid = order.payments.length > 0 && order.payments.every((p) => p.status === "cash_paid");
          const isDone = order.status === "completed";
          const queueNumber = allPaid && !isDone ? order.queue_number : null;

          return (
            <Card key={order.id} className={isDone ? "bg-surface-muted/30" : ""}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Kode pesanan</p>
                  <p className="text-2xl font-bold text-foreground">{order.public_code}</p>
                </div>
                <div className="flex items-center gap-2">
                  {queueNumber ? (
                    <Badge tone="info" className="text-sm">
                      Antrian #{queueNumber}
                    </Badge>
                  ) : isDone ? (
                    <Badge tone="success" className="text-sm">
                      Selesai
                    </Badge>
                  ) : (
                    <Badge tone={order.status === "cancelled" || order.status === "rejected" || order.status === "expired" ? "danger" : "warning"} className="text-sm">
                      {orderStatusLabel(order.status)}
                    </Badge>
                  )}
                </div>
              </div>

              <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-muted-foreground">Pembeli</dt>
                  <dd className="font-medium text-foreground">{order.buyer_username}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Dibuat</dt>
                  <dd className="font-medium text-foreground">{formatDateTime(order.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Total stan ini</dt>
                  <dd className="font-medium text-foreground">{formatIDR(order.stall_total_minor)}</dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-col gap-3">
                {slices.map((slice) => (
                  <section key={slice.stallId} className="rounded-lg border border-border bg-surface-muted p-3">
                    <h3 className="text-sm font-semibold text-foreground">{slice.stallName}</h3>

                    <ul className="mt-2 flex flex-col gap-1 text-sm">
                      {slice.items.map((item) => (
                        <li key={`${item.product_id}-${item.quantity}`} className="flex justify-between gap-3">
                          <span className="text-foreground">{item.name} x{item.quantity}</span>
                          <span className="text-muted-foreground">{formatIDR(item.line_total_minor)}</span>
                        </li>
                      ))}
                    </ul>

                    {slice.payment ? (
                      <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="text-muted-foreground">
                            Metode: {PAYMENT_METHOD_LABEL[slice.payment.method] ?? slice.payment.method}
                          </span>
                          <Badge
                            tone={
                              slice.payment.status === "cash_paid" ? "success"
                              : slice.payment.status === "cash_due" ? "warning"
                              : "neutral"
                            }
                          >
                            {paymentStatusLabel(slice.payment.status)}
                          </Badge>
                          <span className="font-medium text-foreground">{formatIDR(slice.payment.amount_minor)}</span>
                        </div>

                        {slice.payment.method === "cash" && slice.payment.status === "cash_due" ? (
                          <Button
                            size="lg"
                            className="w-full"
                            onClick={() => setCashTarget({ order, payment: slice.payment as PaymentLine })}
                          >
                            Terima pembayaran tunai
                          </Button>
                        ) : null}
                      </div>
                    ) : null}

                    {slice.fulfillment ? (
                      <div className="mt-3 border-t border-border pt-3">
                        <FulfillmentControls
                          fulfillment={slice.fulfillment}
                          paymentStatus={slice.payment?.status}
                        />
                      </div>
                    ) : null}
                  </section>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      {loadMoreButton}

      {cashTarget ? (
        <CashConfirmDialog
          open
          paymentId={cashTarget.payment.id}
          publicCode={cashTarget.order.public_code}
          stallName={cashTarget.payment.stall_name}
          amountMinor={cashTarget.payment.amount_minor}
          onClose={() => setCashTarget(null)}
        />
      ) : null}
    </div>
  );
}

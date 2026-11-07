"use client";

import { useState } from "react";

import type {
  FulfillmentLine,
  OrderItemLine,
  PaymentLine,
  SellerOrder,
} from "@/lib/api/types";
import {
  formatDateTime,
  formatIDR,
  fulfillmentStatusLabel,
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
  // Menyiapkan wadah stan sekali agar seluruh data stan masuk ke kelompok yang sama.
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
  const [cashTarget, setCashTarget] = useState<{
    order: SellerOrder;
    payment: PaymentLine;
  } | null>(null);

  // Menentukan pesanan yang seluruh pembayarannya sudah diterima.
  function isPaid(order: SellerOrder): boolean {
    return order.payments.length > 0 && order.payments.every((p) => p.status === "cash_paid");
  }

  // Mengecualikan pesanan selesai dari nomor antrean aktif.
  function isOrderDone(order: SellerOrder): boolean {
    return order.status === "completed";
  }

  const queueNumbers = new Map<string, number>();
  const activeSorted = orders
    .filter((order) => isPaid(order) && !isOrderDone(order))
    .slice()
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  activeSorted.forEach((order, index) => queueNumbers.set(order.id, index + 1));

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

  if (orders.length === 0) {
    return (
      <EmptyState
        title="Belum ada pesanan masuk"
        description="Pesanan yang memuat produk dari stan Anda akan muncul di antrian ini."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {orders.map((order) => {
        const slices = buildSlices(order);
        return (
          <Card key={order.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Kode pesanan</p>
                <p className="text-2xl font-bold text-foreground">
                  {order.public_code}
                </p>
                {isOrderDone(order) ? (
                  <Badge tone="success" className="mt-1">DONE</Badge>
                ) : queueNumbers.has(order.id) ? (
                  <Badge tone="info" className="mt-1 text-base">Antrian #{queueNumbers.get(order.id)}</Badge>
                ) : null}
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Pembeli</p>
                <p className="text-lg font-semibold text-foreground">{order.buyer_username}</p>
                <Badge tone={order.status === "completed" ? "success" : "info"} className="mt-1">
                  {orderStatusLabel(order.status)}
                </Badge>
              </div>
            </div>

            <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">Pembeli</dt>
                <dd className="font-medium text-foreground">{order.buyer_username}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Dibuat</dt>
                <dd className="font-medium text-foreground">
                  {formatDateTime(order.created_at)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Total stan ini</dt>
                <dd className="font-medium text-foreground">
                  {formatIDR(order.stall_total_minor)}
                </dd>
              </div>
            </dl>

            <div className="mt-4 flex flex-col gap-3">
              {slices.map((slice) => (
                <section
                  key={slice.stallId}
                  className="rounded-lg border border-border bg-surface-muted p-3"
                >
                  <h3 className="text-sm font-semibold text-foreground">{slice.stallName}</h3>

                  <ul className="mt-2 flex flex-col gap-1 text-sm">
                    {slice.items.map((item) => (
                      <li key={`${item.product_id}-${item.quantity}`} className="flex justify-between gap-3">
                        <span className="text-foreground">
                          {item.name} x{item.quantity}
                        </span>
                        <span className="text-muted-foreground">
                          {formatIDR(item.line_total_minor)}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {slice.payment ? (
                    <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="text-muted-foreground">
                          Metode:{" "}
                          {PAYMENT_METHOD_LABEL[slice.payment.method] ?? slice.payment.method}
                        </span>
                        <Badge
                          tone={
                            slice.payment.status === "cash_paid"
                              ? "success"
                              : slice.payment.status === "cash_due"
                                ? "warning"
                                : "neutral"
                          }
                        >
                          {paymentStatusLabel(slice.payment.status)}
                        </Badge>
                        <span className="font-medium text-foreground">
                          {formatIDR(slice.payment.amount_minor)}
                        </span>
                      </div>

                      {slice.payment.method === "cash" &&
                      slice.payment.status === "cash_due" ? (
                        <div>
                          <Button
                            size="sm"
                            onClick={() =>
                              setCashTarget({ order, payment: slice.payment as PaymentLine })
                            }
                          >
                            Terima pembayaran tunai
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {slice.fulfillment ? (
                    <div className="mt-3 border-t border-border pt-3">
                      <p className="text-sm text-muted-foreground">
                        Status pemenuhan: {fulfillmentStatusLabel(slice.fulfillment.status)}
                      </p>
                      <div className="mt-2">
                        <FulfillmentControls
                          fulfillment={slice.fulfillment}
                          paymentStatus={slice.payment?.status}
                        />
                      </div>
                    </div>
                  ) : null}
                </section>
              ))}
            </div>
          </Card>
        );
      })}

      {hasMore && onLoadMore ? (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={onLoadMore} disabled={isLoadingMore}>
            {isLoadingMore ? "Memuat..." : "Muat pesanan berikutnya"}
          </Button>
        </div>
      ) : null}

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

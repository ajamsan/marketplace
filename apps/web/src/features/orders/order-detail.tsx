"use client";

import { OrderStatusBadge } from "./order-status-badge";
import { Card, CardHeader } from "@/components/ui/card";
import type { OrderDetail as OrderDetailData, OrderItemLine } from "@/lib/api/types";
import {
  formatDateTime,
  formatIDR,
  fulfillmentStatusLabel,
  paymentStatusLabel,
} from "@/lib/format";

interface StallGroup {
  stallId: string;
  stallName: string;
  subtotal: number;
  items: OrderItemLine[];
}

function groupByStall(items: OrderItemLine[]): StallGroup[] {
  const groups = new Map<string, StallGroup>();
  for (const item of items) {
    const existing = groups.get(item.stall_id);
    if (existing) {
      existing.items.push(item);
      existing.subtotal += item.line_total_minor;
      continue;
    }
    groups.set(item.stall_id, {
      stallId: item.stall_id,
      stallName: item.stall_name,
      subtotal: item.line_total_minor,
      items: [item],
    });
  }
  return [...groups.values()];
}

function paymentMethodLabel(method: string): string {
  if (method === "cash") return "Tunai";
  if (method === "qris_placeholder") return "QRIS (belum tersedia)";
  return method;
}

export function OrderDetail({ order }: { order: OrderDetailData }) {
  const groups = groupByStall(order.items);

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Kode pesanan
        </p>
        <p className="font-mono text-3xl font-bold tracking-widest text-foreground">
          {order.public_code}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <OrderStatusBadge status={order.status} />
          <span className="text-xs text-muted-foreground">
            Dibuat {formatDateTime(order.created_at)}
          </span>
          <span className="text-sm font-semibold text-foreground">
            {formatIDR(order.total_minor)}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Tunjukkan kode pesanan ini di kasir stan saat mengambil pesanan.
        </p>
      </Card>

      <Card>
        <CardHeader
          title="Item pesanan"
          description="Nama dan harga mengikuti data saat pesanan dibuat."
        />
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">Pesanan ini tidak memiliki item.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {groups.map((group) => (
              <div key={group.stallId}>
                <h3 className="text-sm font-semibold text-foreground">{group.stallName}</h3>
                <ul className="mt-2 flex flex-col gap-2">
                  {group.items.map((item) => (
                    <li
                      key={item.product_id}
                      className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2 last:border-b-0"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity} x {formatIDR(item.unit_price_minor)}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        {formatIDR(item.line_total_minor)}
                      </p>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-right text-sm font-semibold text-foreground">
                  Subtotal {group.stallName}: {formatIDR(group.subtotal)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Status per stan"
          description="Setiap stan punya status pembayaran dan pemenuhan sendiri."
        />
        {order.payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada data pembayaran.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {order.payments.map((payment) => {
              const fulfillment = order.fulfillments.find(
                (item) => item.stall_id === payment.stall_id,
              );
              return (
                <li key={payment.id} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{payment.stall_name}</p>
                    <p className="text-sm font-semibold text-foreground">
                      {formatIDR(payment.amount_minor)}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Metode: {paymentMethodLabel(payment.method)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Pembayaran: {paymentStatusLabel(payment.status)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Pemenuhan:{" "}
                    {fulfillment ? fulfillmentStatusLabel(fulfillment.status) : "Belum diproses"}
                  </p>
                  {payment.status === "cash_due" ? (
                    <p className="mt-2 rounded-md bg-warning-soft px-3 py-2 text-xs font-medium text-foreground">
                      Bayar tunai di kasir stan {payment.stall_name} sebesar{" "}
                      {formatIDR(payment.amount_minor)}.
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="Ringkasan pembayaran" />
        <dl className="flex flex-col gap-1 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="text-foreground">{formatIDR(order.subtotal_minor)}</dd>
          </div>
          <div className="flex items-center justify-between font-semibold">
            <dt>Total</dt>
            <dd>{formatIDR(order.total_minor)}</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}

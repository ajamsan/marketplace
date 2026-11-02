"use client";

import Link from "next/link";

import { OrderStatusBadge } from "./order-status-badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import type { OrderSummary } from "@/lib/api/types";
import { formatDateTime, formatIDR } from "@/lib/format";

// Menampilkan daftar ringkas pesanan atau ajakan membuka katalog saat masih kosong.
export function OrderList({ orders }: { orders: OrderSummary[] }) {
  if (orders.length === 0) {
    return (
      <EmptyState
        title="Belum ada pesanan"
        description="Pesanan yang sudah dibuat akan tampil di sini."
        action={
          <Link
            href="/catalog"
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:bg-surface-muted"
          >
            Lihat katalog
          </Link>
        }
      />
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {orders.map((order) => (
        <li key={order.id}>
          <Card className="flex flex-col gap-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-base font-semibold text-foreground">
                  {order.public_code}
                </p>
                <p className="text-xs text-muted-foreground">
                  Dibuat {formatDateTime(order.created_at)}
                </p>
              </div>
              <div className="flex flex-col items-start gap-1 sm:items-end">
                <p className="text-sm font-semibold text-foreground">
                  {formatIDR(order.total_minor)}
                </p>
                <OrderStatusBadge status={order.status} />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
              <p className="text-xs text-muted-foreground">
                Pembayaran {order.payments_paid} dari {order.payments_total} stan sudah lunas
              </p>
              <Link
                href={`/orders/${order.id}`}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:bg-surface-muted"
              >
                Lihat detail
              </Link>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}

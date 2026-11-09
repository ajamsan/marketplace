"use client";

import { CheckCircle, Loader2, Clock } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import type { OrderDetail as OrderDetailData } from "@/lib/api/types";

interface TimelineEvent {
  label: string;
  time: string | null;
  status: "completed" | "current" | "pending";
  icon: React.ReactNode;
}

// Mengambil waktu paling awal dari beberapa pembayaran/pemenuhan di satu pesanan.
function earliest(values: Array<string | null | undefined>): string | null {
  const times = values.filter((v): v is string => Boolean(v));
  if (times.length === 0) return null;
  return times.reduce((min, value) => (new Date(value) < new Date(min) ? value : min));
}

function buildTimeline(order: OrderDetailData): TimelineEvent[] {
  const events: TimelineEvent[] = [
    {
      label: "Pesanan dibuat",
      time: order.created_at,
      status: "completed",
      icon: <CheckCircle className="h-4 w-4 text-success" aria-hidden="true" />,
    },
  ];

  const paymentStatuses = order.payments.map((p) => p.status);
  const hasCashDue = paymentStatuses.includes("cash_due");
  const hasCashPaid = paymentStatuses.includes("cash_paid");
  const paidAt = earliest(order.payments.map((p) => p.paid_at));

  if (hasCashDue || hasCashPaid) {
    events.push({
      label: hasCashPaid && !hasCashDue ? "Pembayaran diterima" : "Menunggu pembayaran",
      time: paidAt,
      status: hasCashDue ? "current" : "completed",
      icon: hasCashDue
        ? <Clock className="h-4 w-4 text-warning" aria-hidden="true" />
        : <CheckCircle className="h-4 w-4 text-success" aria-hidden="true" />,
    });
  }

  const inPrepAt = earliest(order.fulfillments.map((f) => f.in_preparation_at));
  const readyAt = earliest(order.fulfillments.map((f) => f.ready_for_pickup_at));
  const completedAt = earliest(order.fulfillments.map((f) => f.completed_at));

  const fulfillmentStatuses = order.fulfillments.map((f) => f.status);
  const hasInPrep = fulfillmentStatuses.includes("in_preparation");
  const hasReady = fulfillmentStatuses.includes("ready_for_pickup");
  const hasCompleted = fulfillmentStatuses.includes("completed");
  const allCompleted = hasCompleted && fulfillmentStatuses.every((s) => s === "completed");

  if (hasInPrep || hasReady || hasCompleted) {
    events.push({
      label: "Disiapkan",
      time: inPrepAt,
      status: hasInPrep ? "current" : "completed",
      icon: hasInPrep
        ? <Loader2 className="h-4 w-4 text-accent animate-spin" aria-hidden="true" />
        : <CheckCircle className="h-4 w-4 text-success" aria-hidden="true" />,
    });
  }

  if (hasReady || hasCompleted) {
    events.push({
      label: "Siap diambil",
      time: readyAt,
      status: allCompleted ? "completed" : "current",
      icon: allCompleted
        ? <CheckCircle className="h-4 w-4 text-success" aria-hidden="true" />
        : <Loader2 className="h-4 w-4 text-accent animate-spin" aria-hidden="true" />,
    });
  }

  if (hasCompleted) {
    events.push({
      label: "Selesai",
      time: completedAt,
      status: allCompleted ? "completed" : "current",
      icon: <CheckCircle className="h-4 w-4 text-success" aria-hidden="true" />,
    });
  }

  return events;
}

export function OrderTimeline({ order }: { order: OrderDetailData }) {
  const timeline = buildTimeline(order);

  return (
    <section aria-labelledby="timeline-heading">
      <h2 id="timeline-heading" className="sr-only">
        Riwayat status pesanan
      </h2>
      <ol className="flex flex-col gap-4">
        {timeline.map((event, index) => (
          <li key={event.label} className="relative flex gap-4">
            <div className="flex flex-col items-center shrink-0">
              <div
                className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-surface"
                aria-hidden="true"
              >
                {event.icon}
              </div>
              {index < timeline.length - 1 && (
                <div
                  className="absolute left-3.5 top-8 h-full w-0.5 bg-border"
                  aria-hidden="true"
                />
              )}
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <p className="text-sm font-medium text-foreground">{event.label}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                {event.time ? (
                  <>
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    {formatDateTime(event.time)}
                  </>
                ) : (
                  <span>Belum</span>
                )}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

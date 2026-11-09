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

// Cek apakah string adalah ISO datetime valid
function isValidISODate(value: string): boolean {
  const date = new Date(value);
  return !isNaN(date.getTime()) && value.includes("T");
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

  if (hasCashDue || hasCashPaid) {
    const payment = order.payments.find((p) => p.status === "cash_due" || p.status === "cash_paid");
    const paymentTime = payment && isValidISODate(payment.id) ? payment.id : null;
    events.push({
      label: "Menunggu pembayaran",
      time: paymentTime,
      status: hasCashDue ? "current" : "completed",
      icon: hasCashDue
        ? <Loader2 className="h-4 w-4 text-warning animate-spin" aria-hidden="true" />
        : <CheckCircle className="h-4 w-4 text-success" aria-hidden="true" />,
    });
  }

  const fulfillmentStatuses = order.fulfillments.map((f) => f.status);
  const hasInPrep = fulfillmentStatuses.includes("in_preparation");
  const hasReady = fulfillmentStatuses.includes("ready_for_pickup");
  const hasCompleted = fulfillmentStatuses.includes("completed");

  if (hasInPrep) {
    const fulfillment = order.fulfillments.find((f) => f.status === "in_preparation");
    const fulfillmentTime = fulfillment && isValidISODate(fulfillment.id) ? fulfillment.id : null;
    events.push({
      label: "Disiapkan",
      time: fulfillmentTime,
      status: "current",
      icon: <Loader2 className="h-4 w-4 text-accent animate-spin" aria-hidden="true" />,
    });
  } else if (hasReady || hasCompleted) {
    const fulfillment = order.fulfillments.find((f) => f.status === "ready_for_pickup" || f.status === "completed");
    const fulfillmentTime = fulfillment && isValidISODate(fulfillment.id) ? fulfillment.id : null;
    events.push({
      label: "Disiapkan",
      time: fulfillmentTime,
      status: "completed",
      icon: <CheckCircle className="h-4 w-4 text-success" aria-hidden="true" />,
    });
  }

  if (hasReady) {
    const fulfillment = order.fulfillments.find((f) => f.status === "ready_for_pickup");
    const fulfillmentTime = fulfillment && isValidISODate(fulfillment.id) ? fulfillment.id : null;
    events.push({
      label: "Siap diambil",
      time: fulfillmentTime,
      status: hasCompleted ? "completed" : "current",
      icon: hasCompleted
        ? <CheckCircle className="h-4 w-4 text-success" aria-hidden="true" />
        : <Loader2 className="h-4 w-4 text-accent animate-spin" aria-hidden="true" />,
    });
  } else if (hasCompleted) {
    const fulfillment = order.fulfillments.find((f) => f.status === "completed");
    const fulfillmentTime = fulfillment && isValidISODate(fulfillment.id) ? fulfillment.id : null;
    events.push({
      label: "Siap diambil",
      time: fulfillmentTime,
      status: "completed",
      icon: <CheckCircle className="h-4 w-4 text-success" aria-hidden="true" />,
    });
  }

  if (hasCompleted) {
    const fulfillment = order.fulfillments.find((f) => f.status === "completed");
    const fulfillmentTime = fulfillment && isValidISODate(fulfillment.id) ? fulfillment.id : null;
    events.push({
      label: "Selesai",
      time: fulfillmentTime,
      status: "current",
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
                  <>
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    <span className="italic">Waktu belum tercatat</span>
                  </>
                )}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
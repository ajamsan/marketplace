"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/lib/api/client";
import type { FulfillmentLine } from "@/lib/api/types";
import { FULFILLMENT_STATUS_LABEL, fulfillmentStatusLabel } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { updateFulfillment } from "./api";

const NEXT_STATUS: Record<string, string> = {
  pending: "in_preparation",
  in_preparation: "ready_for_pickup",
  ready_for_pickup: "completed",
};

// Menawarkan transisi pemenuhan berikutnya setelah pembayaran diterima.
export function FulfillmentControls({
  fulfillment,
  paymentStatus,
}: {
  fulfillment: FulfillmentLine;
  paymentStatus?: string;
}) {
  const queryClient = useQueryClient();
  const nextStatus = NEXT_STATUS[fulfillment.status];
  const isPaid = paymentStatus === "cash_paid";

  const mutation = useMutation({
    // Meminta server mengubah tahap pemenuhan pesanan.
    mutationFn: (status: string) => updateFulfillment(fulfillment.id, status),
    // Memuat ulang antrean agar status terbaru segera terlihat.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["seller", "orders"] });
    },
  });

  if (!isPaid) {
    return (
      <p className="text-xs font-medium text-warning">
        Menunggu pembayaran tunai diterima sebelum memproses pesanan.
      </p>
    );
  }

  if (!nextStatus) {
    return (
      <p className="text-xs text-muted-foreground">
        Status pemenuhan: {fulfillmentStatusLabel(fulfillment.status)}
      </p>
    );
  }

  const nextLabel = FULFILLMENT_STATUS_LABEL[nextStatus] ?? nextStatus;
  const errorMessage =
    mutation.error instanceof ApiError
      ? mutation.error.message
      : mutation.error
        ? "Status pemenuhan gagal diperbarui. Coba lagi."
        : null;

  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs text-muted-foreground">Status berikutnya: {nextLabel}</p>
      <div>
        <Button
          size="sm"
          variant="secondary"
          disabled={mutation.isPending}
          onClick={() => {
            if (!mutation.isPending) mutation.mutate(nextStatus);
          }}
        >
          {mutation.isPending ? "Menyimpan..." : `Tandai ${nextLabel}`}
        </Button>
      </div>
      {errorMessage ? (
        <p role="alert" className="text-xs font-medium text-danger">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

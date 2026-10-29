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

export function FulfillmentControls({ fulfillment }: { fulfillment: FulfillmentLine }) {
  const queryClient = useQueryClient();
  const nextStatus = NEXT_STATUS[fulfillment.status];

  const mutation = useMutation({
    mutationFn: (status: string) => updateFulfillment(fulfillment.id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["seller", "orders"] });
    },
  });

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

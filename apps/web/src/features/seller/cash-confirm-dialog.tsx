"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { ApiError } from "@/lib/api/client";
import { formatIDR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { confirmCash } from "./api";

export interface CashConfirmDialogProps {
  open: boolean;
  paymentId: string;
  publicCode: string;
  stallName: string;
  amountMinor: number;
  onClose: () => void;
  onConfirmed?: () => void;
}

export function CashConfirmDialog({
  open,
  paymentId,
  publicCode,
  stallName,
  amountMinor,
  onClose,
  onConfirmed,
}: CashConfirmDialogProps) {
  const queryClient = useQueryClient();
  const [acknowledged, setAcknowledged] = useState(false);

  const mutation = useMutation({
    mutationFn: () => confirmCash(paymentId),
    onSuccess: () => {
      setAcknowledged(false);
      void queryClient.invalidateQueries({ queryKey: ["seller", "orders"] });
      onConfirmed?.();
      onClose();
    },
  });

  function handleClose() {
    if (mutation.isPending) return;
    setAcknowledged(false);
    mutation.reset();
    onClose();
  }

  const errorMessage =
    mutation.error instanceof ApiError
      ? mutation.error.message
      : mutation.error
        ? "Pembayaran gagal dikonfirmasi. Coba lagi."
        : null;

  return (
    <Dialog
      open={open}
      title="Konfirmasi pembayaran tunai"
      description="Tandai uang tunai sudah diterima setelah uang benar-benar ada di tangan Anda."
      onClose={handleClose}
    >
      <dl className="flex flex-col gap-1 rounded-lg border border-border bg-surface-muted p-3 text-sm">
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Kode pesanan</dt>
          <dd className="font-semibold text-foreground">{publicCode}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Stan</dt>
          <dd className="font-semibold text-foreground">{stallName}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Jumlah diterima</dt>
          <dd className="font-semibold text-foreground">{formatIDR(amountMinor)}</dd>
        </div>
      </dl>

      <label className="flex items-start gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-border"
          checked={acknowledged}
          onChange={(event) => setAcknowledged(event.target.checked)}
          disabled={mutation.isPending}
        />
        <span>Uang tunai untuk pesanan ini sudah saya terima secara fisik.</span>
      </label>

      {errorMessage ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {errorMessage}
        </p>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={handleClose} disabled={mutation.isPending}>
          Batal
        </Button>
        <Button
          disabled={!acknowledged || mutation.isPending}
          onClick={() => {
            if (!mutation.isPending && acknowledged) mutation.mutate();
          }}
        >
          {mutation.isPending ? "Menyimpan..." : "Ya, uang diterima"}
        </Button>
      </div>
    </Dialog>
  );
}

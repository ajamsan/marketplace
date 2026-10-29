"use client";

import { useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";

import { useRemoveCartItem, useSetCartQuantity } from "./use-cart";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";

export const MIN_QUANTITY = 1;
export const MAX_QUANTITY = 99;

export function QuantityStepper({
  value,
  onChange,
  onRemove,
  label,
  disabled = false,
  busy = false,
}: {
  value: number;
  onChange: (next: number) => void;
  onRemove?: () => void;
  label: string;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onChange(Math.max(MIN_QUANTITY, value - 1))}
        disabled={disabled || busy || value <= MIN_QUANTITY}
        aria-label={`Kurangi jumlah ${label}`}
      >
        <Minus className="h-4 w-4" aria-hidden="true" />
      </Button>
      <span
        aria-live="polite"
        className="min-w-8 text-center text-sm font-semibold tabular-nums text-foreground"
      >
        {value}
      </span>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onChange(Math.min(MAX_QUANTITY, value + 1))}
        disabled={disabled || busy || value >= MAX_QUANTITY}
        aria-label={`Tambah jumlah ${label}`}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </Button>
      {onRemove ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          disabled={busy}
          aria-label={`Hapus ${label} dari keranjang`}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Hapus
        </Button>
      ) : null}
    </div>
  );
}

export function CartQuantityStepper({
  productId,
  quantity,
  name,
  available,
}: {
  productId: string;
  quantity: number;
  name: string;
  available: boolean;
}) {
  const setQuantityMutation = useSetCartQuantity();
  const removeMutation = useRemoveCartItem();
  const [error, setError] = useState<string | null>(null);
  const busy = setQuantityMutation.isPending || removeMutation.isPending;

  const handleChange = (next: number) => {
    setError(null);
    setQuantityMutation.mutate(
      { productId, quantity: next },
      {
        onError: (mutationError) =>
          setError(
            mutationError instanceof ApiError
              ? (Object.values(mutationError.fields ?? {})[0] ?? mutationError.message)
              : "Gagal memperbarui jumlah.",
          ),
      },
    );
  };

  const handleRemove = () => {
    setError(null);
    removeMutation.mutate(productId, {
      onError: (mutationError) =>
        setError(
          mutationError instanceof ApiError
            ? (Object.values(mutationError.fields ?? {})[0] ?? mutationError.message)
            : "Gagal menghapus item.",
        ),
    });
  };

  return (
    <div className="flex flex-col gap-1">
      <QuantityStepper
        value={quantity}
        onChange={handleChange}
        onRemove={handleRemove}
        label={name}
        disabled={!available}
        busy={busy}
      />
      {error ? (
        <p role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

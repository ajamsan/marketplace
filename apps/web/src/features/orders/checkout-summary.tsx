"use client";

import { useEffect, useRef, useState } from "react";

import { createOrder, type OrderItemInput } from "./api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ApiError } from "@/lib/api/client";
import type { OrderPreview } from "@/lib/api/types";
import { formatIDR } from "@/lib/format";

// Menampilkan ringkasan biaya dan mengirim pesanan dengan kunci idempotensi.
export function CheckoutSummary({
  preview,
  items,
  onCreated,
}: {
  preview: OrderPreview;
  items: OrderItemInput[];
  onCreated: (orderId: string) => void;
}) {
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const idempotencyKeyRef = useRef<string | null>(null);
  const itemsSignature = JSON.stringify(items);

  useEffect(() => {
    idempotencyKeyRef.current = null;
  }, [itemsSignature]);

  // Mengirim konfirmasi checkout dan meneruskan ID pesanan setelah tersimpan.
  const handleConfirm = async () => {
    setError(null);
    setFieldErrors({});
    setPending(true);
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = crypto.randomUUID();
    }
    try {
      const order = await createOrder(items, paymentMethod, idempotencyKeyRef.current);
      idempotencyKeyRef.current = null;
      onCreated(order.id);
    } catch (mutationError) {
      if (mutationError instanceof ApiError) {
        setError(mutationError.message);
        setFieldErrors(mutationError.fields ?? {});
      } else {
        setError("Gagal membuat pesanan. Coba lagi.");
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader
          title="Ringkasan pesanan"
          description="Harga dihitung ulang oleh server pada halaman ini."
        />
        <div className="flex flex-col gap-4">
          {preview.stalls.map((stall) => (
            <div key={stall.stall_id}>
              <h3 className="text-sm font-semibold text-foreground">{stall.stall_name}</h3>
              <ul className="mt-2 flex flex-col gap-2">
                {preview.items
                  .filter((item) => item.stall_id === stall.stall_id)
                  .map((item) => (
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
                Subtotal {stall.stall_name}: {formatIDR(stall.subtotal_minor)}
              </p>
            </div>
          ))}
        </div>
        <dl className="mt-4 flex flex-col gap-1 border-t border-border pt-4 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="text-foreground">{formatIDR(preview.subtotal_minor)}</dd>
          </div>
          <div className="flex items-center justify-between font-semibold">
            <dt>Total</dt>
            <dd>{formatIDR(preview.total_minor)}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-base font-semibold text-foreground">
            Metode pembayaran
          </legend>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3">
            <input
              type="radio"
              name="payment-method"
              value="cash"
              checked={paymentMethod === "cash"}
              onChange={() => setPaymentMethod("cash")}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-medium text-foreground">Tunai</span>
              <span className="block text-xs text-muted-foreground">
                Bayar di kasir stan saat mengambil pesanan.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3 rounded-lg border border-border bg-surface-muted p-3 opacity-70">
            <input
              type="radio"
              name="payment-method"
              value="qris_placeholder"
              disabled
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-medium text-foreground">
                QRIS (belum tersedia)
              </span>
              <span className="block text-xs text-muted-foreground">
                Belum tersedia, pembayaran digital belum dapat dipakai.
              </span>
            </span>
          </label>
          {fieldErrors.payment_method ? (
            <p role="alert" className="text-xs font-medium text-danger">
              {fieldErrors.payment_method}
            </p>
          ) : null}
        </fieldset>
      </Card>

      {error ? (
        <div role="alert" className="rounded-lg border border-danger/40 bg-danger-soft p-3 text-sm text-foreground">
          <p>{error}</p>
          {Object.entries(fieldErrors)
            .filter(([key]) => key !== "payment_method")
            .map(([key, message]) => (
              <p key={key} className="mt-1 text-xs">
                {message}
              </p>
            ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <Button size="lg" onClick={handleConfirm} disabled={pending}>
          {pending ? "Membuat pesanan..." : "Konfirmasi pesanan"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Setelah pesanan dibuat, bayar tunai di kasir stan dan tunjukkan kode pesanan.
        </p>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

import { createOrder, type OrderItemInput } from "./api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ApiError } from "@/lib/api/client";
import type { OrderPreview } from "@/lib/api/types";
import { formatIDR } from "@/lib/format";

// Menampilkan ringkasan biaya dan mengirim pesanan dengan kunci idempotensi berstandar gastronomi.
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
        setError("Gagal membuat pesanan. Coba lagi sebentar.");
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="rounded-md border border-border bg-surface p-6 sm:p-8 shadow-xs">
        <div className="border-b border-border/80 pb-4 mb-6">
          <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground block">
            Rincian Sajian
          </span>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-foreground mt-1">
            Ringkasan Pesanan Terkurasi
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Harga akhir diverifikasi resmi oleh server.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          {preview.stalls.map((stall) => (
            <div key={stall.stall_id} className="rounded-sm border border-border/60 bg-surface-muted/20 p-4">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground block">
                Stan Atelier
              </span>
              <h3 className="font-serif text-base font-bold text-foreground">{stall.stall_name}</h3>
              <ul className="mt-3 flex flex-col gap-2.5">
                {preview.items
                  .filter((item) => item.stall_id === stall.stall_id)
                  .map((item) => (
                    <li
                      key={item.product_id}
                      className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/50 pb-2.5 last:border-b-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="font-serif text-sm font-semibold text-foreground">{item.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {item.quantity} porsi &times; {formatIDR(item.unit_price_minor)}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        {formatIDR(item.line_total_minor)}
                      </p>
                    </li>
                  ))}
              </ul>
              <div className="mt-3 pt-3 border-t border-border/60 flex justify-between items-center text-xs font-semibold">
                <span className="text-muted-foreground uppercase tracking-wider text-[10px]">
                  Subtotal Stan
                </span>
                <span className="text-foreground">{formatIDR(stall.subtotal_minor)}</span>
              </div>
            </div>
          ))}
        </div>

        <dl className="mt-6 flex flex-col gap-2 border-t border-border pt-4 text-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <dt>Subtotal Semua Stan</dt>
            <dd className="font-medium text-foreground">{formatIDR(preview.subtotal_minor)}</dd>
          </div>
          <div className="flex items-baseline justify-between pt-2 border-t border-border/60">
            <dt className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Total Investasi
            </dt>
            <dd className="font-serif text-2xl font-bold text-foreground">
              {formatIDR(preview.total_minor)}
            </dd>
          </div>
        </dl>
      </Card>

      <Card className="rounded-md border border-border bg-surface p-6 sm:p-8 shadow-xs">
        <fieldset className="flex flex-col gap-3">
          <legend className="font-serif text-lg font-bold text-foreground mb-3">
            Metode Pembayaran
          </legend>
          <label className="flex cursor-pointer items-start gap-3 rounded-sm border border-border bg-surface p-4 transition-colors hover:border-foreground/40 has-[:checked]:border-foreground has-[:checked]:bg-surface-muted/40">
            <input
              type="radio"
              name="payment-method"
              value="cash"
              checked={paymentMethod === "cash"}
              onChange={() => setPaymentMethod("cash")}
              className="mt-1 h-4 w-4 accent-foreground"
            />
            <span>
              <span className="block text-sm font-semibold text-foreground">
                Tunai Langsung di Kasir Stan
              </span>
              <span className="block text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Lakukan pembayaran tunai kepada kasir stan atelier saat mengambil pesanan Anda.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3 rounded-sm border border-border bg-surface-muted/60 p-4 opacity-60">
            <input
              type="radio"
              name="payment-method"
              value="qris_placeholder"
              disabled
              className="mt-1 h-4 w-4"
            />
            <span>
              <span className="block text-sm font-semibold text-foreground">
                QRIS &bull; Pembayaran Digital (Segera Hadir)
              </span>
              <span className="block text-xs text-muted-foreground mt-0.5">
                Integrasi pembayaran kode QR sedang dalam persiapan atelier.
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
        <div role="alert" className="rounded-sm border border-danger/40 bg-danger-soft p-4 text-xs text-foreground">
          <p className="font-semibold">{error}</p>
          {Object.entries(fieldErrors)
            .filter(([key]) => key !== "payment_method")
            .map(([key, message]) => (
              <p key={key} className="mt-1">
                {message}
              </p>
            ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <Button
          size="lg"
          onClick={handleConfirm}
          disabled={pending}
          className="w-full rounded-sm uppercase tracking-widest text-xs font-semibold py-4"
        >
          {pending ? "Mengonfirmasi Pesanan..." : "Konfirmasi & Buat Pesanan"}
        </Button>
        <p className="text-center text-[11px] text-muted-foreground leading-relaxed">
          Setelah pesanan terbit, tunjukkan nomor pesanan digital Anda di kasir stan saat melakukan pelunasan tunai.
        </p>
      </div>
    </div>
  );
}

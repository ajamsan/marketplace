"use client";

import { useRouter } from "next/navigation";

import { AvailabilityBadge } from "@/features/catalog/availability-badge";
import { CartBar } from "@/features/cart/cart-bar";
import { CartQuantityStepper } from "@/features/cart/quantity-stepper";
import { useCart } from "@/features/cart/use-cart";
import { useAuthStore } from "@/features/auth/auth-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { ApiError } from "@/lib/api/client";
import type { CartItem } from "@/lib/api/types";
import { formatIDR } from "@/lib/format";

interface CartStallGroup {
  stallId: string;
  stallName: string;
  items: CartItem[];
  subtotal: number;
}

// Mengelompokkan barang agar subtotal keranjang dapat ditampilkan per stan atelier.
function groupByStall(items: CartItem[]): CartStallGroup[] {
  const groups = new Map<string, CartStallGroup>();
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
      items: [item],
      subtotal: item.line_total_minor,
    });
  }
  return [...groups.values()];
}

// Menyajikan isi keranjang, ketersediaan produk, dan jalur menuju checkout berstandar kurasi.
export default function CartPage() {
  const router = useRouter();
  const role = useAuthStore((state) => state.user?.role);
  const isBuyer = role === "buyer";
  const cart = useCart({ enabled: isBuyer });

  const items = cart.data?.items ?? [];
  const groups = groupByStall(items);
  const hasUnavailable = items.some((item) => item.availability_status !== "available");
  const canCheckout = items.length > 0 && !hasUnavailable;

  const errorMessage =
    cart.error instanceof ApiError ? cart.error.message : "Gagal memuat isi keranjang.";

  if (!isBuyer) {
    return (
      <div className="pb-32 md:pb-24 max-w-4xl mx-auto px-4 pt-6">
        <Card className="rounded-md border border-border bg-surface p-8 text-center">
          <h2 className="font-serif text-xl font-bold text-foreground">Akses Khusus Pembeli</h2>
          <p className="mt-2 text-xs text-muted-foreground">
            Halaman keranjang pemesanan hanya tersedia untuk akun peran pembeli.
          </p>
        </Card>
        <CartBar />
      </div>
    );
  }

  return (
    <div className="pb-32 md:pb-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-1 border-b border-border/80 pb-6">
          <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground block">
            Pemesanan Anda
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Keranjang Kurasi Sajian
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Periksa kembali kurasi hidangan sebelum melanjutkan ke konfirmasi dan pembayaran di kasir stan.
          </p>
        </header>

        {cart.isPending ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-32 w-full rounded-md" />
            <Skeleton className="h-32 w-full rounded-md" />
            <Skeleton className="h-16 w-full rounded-md" />
          </div>
        ) : cart.isError ? (
          <ErrorState
            message={errorMessage}
            onRetry={() => {
              void cart.refetch();
            }}
          />
        ) : items.length === 0 ? (
          <EmptyState
            title="Keranjang kurasi masih kosong"
            description="Jelajahi katalog untuk memilih kreasi kuliner dari atelier pilihan."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  router.push("/catalog");
                }}
                className="rounded-sm uppercase tracking-wider text-xs font-semibold px-5 py-2.5 mt-2"
              >
                Eksplorasi Katalog
              </Button>
            }
          />
        ) : (
          <>
            {groups.map((group) => (
              <Card key={group.stallId} className="rounded-md border border-border bg-surface p-6 shadow-xs">
                <div className="flex items-baseline justify-between border-b border-border/80 pb-3 mb-4">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground block">
                      Stan Atelier
                    </span>
                    <h2 className="font-serif text-lg font-bold text-foreground">
                      {group.stallName}
                    </h2>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">
                      Subtotal Stan
                    </span>
                    <span className="font-serif text-base font-bold text-foreground">
                      {formatIDR(group.subtotal)}
                    </span>
                  </div>
                </div>

                <ul className="flex flex-col gap-4">
                  {group.items.map((item) => (
                    <li
                      key={item.product_id}
                      className="flex flex-col gap-3 border-b border-border/60 pb-4 last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-serif text-base font-bold text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatIDR(item.unit_price_minor)} per porsi
                        </p>
                        <div className="mt-2">
                          <AvailabilityBadge status={item.availability_status} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                        <span className="font-semibold text-foreground text-sm sm:text-base">
                          {formatIDR(item.line_total_minor)}
                        </span>
                        <CartQuantityStepper
                          productId={item.product_id}
                          quantity={item.quantity}
                          name={item.name}
                          available={item.availability_status === "available"}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}

            {/* Total breakdown */}
            <Card className="flex flex-col gap-4 rounded-md border border-border bg-surface p-6 sm:p-8 shadow-md">
              <div className="flex items-baseline justify-between border-b border-border/80 pb-4">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground block font-semibold">
                    Total Investasi Rasa
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Harga final diverifikasi oleh server pada tahapan checkout
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
                    {formatIDR(cart.data?.subtotal_minor ?? 0)}
                  </span>
                </div>
              </div>

              <Button
                size="lg"
                onClick={() => {
                  router.push("/checkout");
                }}
                disabled={!canCheckout}
                className="w-full rounded-sm uppercase tracking-widest text-xs font-semibold py-3.5"
              >
                Lanjutkan ke Konfirmasi Pesanan
              </Button>

              {hasUnavailable ? (
                <p className="text-xs font-medium text-danger text-center">
                  Terdapat hidangan yang sedang tidak tersedia. Sesuaikan keranjang sebelum lanjut ke checkout.
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground text-center">
                  Seluruh kreasi tersedia. Anda dapat melakukan pembayaran tunai langsung di kasir stan setelah pesanan dibuat.
                </p>
              )}
            </Card>
          </>
        )}
      </div>
      <CartBar />
    </div>
  );
}

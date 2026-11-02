"use client";

import { useRouter } from "next/navigation";

import { AvailabilityBadge } from "@/features/catalog/availability-badge";
import { CartBar } from "@/features/cart/cart-bar";
import { CartQuantityStepper } from "@/features/cart/quantity-stepper";
import { useCart } from "@/features/cart/use-cart";
import { useAuthStore } from "@/features/auth/auth-store";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
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

// Mengelompokkan barang agar subtotal keranjang dapat ditampilkan per stan.
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

// Menyajikan isi keranjang, ketersediaan produk, dan jalur menuju checkout.
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
    cart.error instanceof ApiError ? cart.error.message : "Gagal memuat keranjang.";

  if (!isBuyer) {
    return (
      <div className="pb-28 md:pb-24">
        <Card>
          <p className="text-sm text-foreground">
            Halaman keranjang hanya untuk akun pembeli.
          </p>
        </Card>
        <CartBar />
      </div>
    );
  }

  return (
    <div className="pb-28 md:pb-24">
      <div className="flex flex-col gap-4">
        <header className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-foreground">Keranjang</h1>
          <p className="text-sm text-muted-foreground">
            Harga final dihitung ulang oleh server saat checkout.
          </p>
        </header>

        {cart.isPending ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-40" />
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
            title="Keranjang masih kosong"
            description="Tambahkan produk dari katalog untuk memulai pesanan."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  router.push("/catalog");
                }}
              >
                Buka katalog
              </Button>
            }
          />
        ) : (
          <>
            {groups.map((group) => (
              <Card key={group.stallId}>
                <CardHeader
                  title={group.stallName}
                  description={`Subtotal ${formatIDR(group.subtotal)}`}
                />
                <ul className="flex flex-col gap-4">
                  {group.items.map((item) => (
                    <li
                      key={item.product_id}
                      className="flex flex-col gap-3 border-b border-border pb-4 last:border-b-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatIDR(item.unit_price_minor)} per item
                        </p>
                        <div className="mt-2">
                          <AvailabilityBadge status={item.availability_status} />
                        </div>
                      </div>
                      <div className="flex flex-col items-start gap-2 sm:items-end">
                        <p className="text-sm font-semibold text-foreground">
                          {formatIDR(item.line_total_minor)}
                        </p>
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

            <Card className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-lg font-bold text-foreground">
                  {formatIDR(cart.data?.subtotal_minor ?? 0)}
                </p>
              </div>
              <Button
                size="lg"
                onClick={() => {
                  router.push("/checkout");
                }}
                disabled={!canCheckout}
              >
                Lanjut ke checkout
              </Button>
              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground">Keranjang masih kosong.</p>
              ) : hasUnavailable ? (
                <p className="text-xs font-medium text-danger">
                  Ada produk yang tidak tersedia. Hapus produk tersebut sebelum lanjut ke
                  checkout.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Semua produk tersedia. Lanjutkan ke checkout untuk membuat pesanan.
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

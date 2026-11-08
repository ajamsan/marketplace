"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag } from "lucide-react";

import { listProducts } from "@/features/catalog/api";
import { formatIDR } from "@/lib/format";
import { AvailabilityBadge } from "@/features/catalog/availability-badge";
import { QuickViewModal, type CuratedProduct } from "./quick-view-modal";
import { useAuthStore } from "@/features/auth/auth-store";
import { useCart, useSetCartQuantity } from "@/features/cart/use-cart";

export function ShowcaseSection() {
  const [quickViewProduct, setQuickViewProduct] = useState<CuratedProduct | null>(null);

  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const isBuyer = status === "authenticated" && user?.role === "buyer";

  const { data: cart } = useCart();
  const setCartQuantity = useSetCartQuantity();

  const apiProductsQuery = useQuery({
    queryKey: ["products", { limit: 6 }],
    queryFn: () => listProducts({ limit: 6 }),
  });

  const displayItems = useMemo<CuratedProduct[]>(() => {
    const apiItems = apiProductsQuery.data?.items ?? [];
    return apiItems.map((item) => ({
      ...item,
      artisan_origin: item.stall_name,
    }));
  }, [apiProductsQuery.data]);

  const handleQuickAdd = (product: CuratedProduct) => {
    if (!isBuyer || product.availability_status !== "available") return;
    const current = cart?.items?.find((i) => i.product_id === product.id)?.quantity ?? 0;
    setCartQuantity.mutate({
      productId: product.id,
      quantity: Math.min(current + 1, 99),
    });
  };

  return (
    <section id="menu" className="border-b border-border bg-surface-muted/30 py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="max-w-2xl">
            <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
              Menu Pilihan
            </span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Favorit dari setiap stan
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Pilihan menu yang paling sering dipesan. Klik detail untuk melihat lebih lengkap.
            </p>
          </div>
          <a
            href="/catalog"
            className="shrink-0 text-sm font-medium text-accent hover:underline"
          >
            Lihat semua menu →
          </a>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {displayItems.map((product) => {
            const inCartCount = cart?.items?.find((i) => i.product_id === product.id)?.quantity ?? 0;
            const isAvailable = product.availability_status === "available";

            return (
              <article
                key={product.id}
                className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-shadow hover:shadow-md"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-muted">
                  {product.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.image_url}
                      alt={product.name}
                      width={600}
                      height={450}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                      Foto produk belum tersedia
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <AvailabilityBadge status={product.availability_status} />
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {product.stall_name}
                  </span>
                  <h3 className="mt-1 text-base font-semibold text-foreground">
                    {product.name}
                  </h3>
                  {product.description ? (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {product.description}
                    </p>
                  ) : null}

                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                    <span className="text-sm font-semibold text-foreground">
                      {formatIDR(product.price_minor)}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQuickViewProduct(product)}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-muted"
                      >
                        Detail
                      </button>
                      {isBuyer ? (
                        <button
                          type="button"
                          onClick={() => handleQuickAdd(product)}
                          disabled={!isAvailable || setCartQuantity.isPending}
                          className="inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
                        >
                          <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{inCartCount > 0 ? `+${inCartCount}` : "Pesan"}</span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {displayItems.length === 0 && !apiProductsQuery.isPending ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">
            Belum ada menu tersedia.{" "}
            <a href="/catalog" className="text-accent hover:underline">
              Coba lihat katalog
            </a>
          </p>
        ) : null}
      </div>

      <QuickViewModal
        product={quickViewProduct}
        open={!!quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />
    </section>
  );
}

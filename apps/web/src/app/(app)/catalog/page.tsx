"use client";

import { useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";

import { listProducts } from "@/features/catalog/api";
import { ProductCard } from "@/features/catalog/product-card";
import { SearchBox } from "@/features/catalog/search-box";
import { StallFilter } from "@/features/catalog/stall-filter";
import { CartBar } from "@/features/cart/cart-bar";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { ApiError } from "@/lib/api/client";

// Memuat katalog berhalaman dan menggabungkannya untuk pencarian pembeli.
export default function CatalogPage() {
  const [search, setSearch] = useState("");
  const [stallId, setStallId] = useState("");

  const products = useInfiniteQuery({
    queryKey: ["products", { stall_id: stallId, q: search }],
    queryFn: ({ pageParam }) =>
      listProducts({
        stall_id: stallId || undefined,
        q: search || undefined,
        cursor: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
  });

  const items = useMemo(
    () => products.data?.pages.flatMap((page) => page.items) ?? [],
    [products.data],
  );

  const errorMessage =
    products.error instanceof ApiError
      ? products.error.message
      : "Gagal memuat katalog. Coba lagi sebentar.";

  return (
    <div className="pb-32 md:pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-1 border-b border-border/80 pb-6">
          <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground block">
            Menu stan kampus
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Katalog produk
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
            Cari produk berdasarkan nama atau pilih stan. Status ketersediaan diperbarui oleh
            penjual, jadi yang tampil di sini adalah kondisi terakhir dari stan.
          </p>
        </header>

        {/* Filter controls */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 bg-surface p-4 rounded-md border border-border shadow-2xs">
          <SearchBox value={search} onChange={setSearch} />
          <StallFilter value={stallId} onChange={setStallId} />
        </div>

        {/* Product listing states */}
        {products.isPending ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <div
                key={index}
                className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4"
              >
                <Skeleton className="aspect-[4/3] w-full rounded-sm" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-5 w-1/3" />
              </div>
            ))}
          </div>
        ) : products.isError ? (
          <ErrorState
            message={errorMessage}
            onRetry={() => {
              void products.refetch();
            }}
          />
        ) : items.length === 0 ? (
          <EmptyState
            title="Sajian tidak ditemukan"
            description="Coba kata kunci lain atau pilih stan yang berbeda."
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            {products.hasNextPage ? (
              <div className="flex justify-center pt-8">
                <Button
                  variant="secondary"
                  onClick={() => {
                    void products.fetchNextPage();
                  }}
                  disabled={products.isFetchingNextPage}
                  className="rounded-sm uppercase tracking-widest text-xs font-semibold px-6 py-3"
                >
                  {products.isFetchingNextPage ? "Memuat Kreasi..." : "Muat Sajian Lainnya"}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
      <CartBar />
    </div>
  );
}

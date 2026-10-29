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
      : "Gagal memuat katalog. Coba lagi.";

  return (
    <div className="pb-28 md:pb-24">
      <div className="flex flex-col gap-4">
        <header className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-foreground">Katalog</h1>
          <p className="text-sm text-muted-foreground">
            Cari produk yang tersedia di kantin kampus.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SearchBox value={search} onChange={setSearch} />
          <StallFilter value={stallId} onChange={setStallId} />
        </div>

        {products.isPending ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <div
                key={index}
                className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4"
              >
                <Skeleton className="aspect-[4/3] w-full" />
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
            title="Produk tidak ditemukan"
            description="Coba ubah kata kunci pencarian atau pilih stan lain."
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            {products.hasNextPage ? (
              <div className="flex justify-center">
                <Button
                  variant="secondary"
                  onClick={() => {
                    void products.fetchNextPage();
                  }}
                  disabled={products.isFetchingNextPage}
                >
                  {products.isFetchingNextPage ? "Memuat..." : "Muat lagi"}
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

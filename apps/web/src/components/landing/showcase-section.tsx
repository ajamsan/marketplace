"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, X } from "lucide-react";

import { listProducts } from "@/features/catalog/api";
import { ProductCard } from "@/features/catalog/product-card";
import { SearchBox } from "@/features/catalog/search-box";
import { StallFilter } from "@/features/catalog/stall-filter";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";

const FEATURED_LIMIT = 6;

export function ShowcaseSection() {
  const [search, setSearch] = useState("");
  const [stallId, setStallId] = useState("");

  const productsQuery = useQuery({
    queryKey: ["products", { limit: FEATURED_LIMIT, stall_id: stallId, q: search }],
    queryFn: () => listProducts({ limit: FEATURED_LIMIT, stall_id: stallId || undefined, q: search || undefined }),
  });

  const items = useMemo(
    () => (productsQuery.data?.items ?? []).slice(0, FEATURED_LIMIT),
    [productsQuery.data],
  );

  const clearFilters = () => {
    setSearch("");
    setStallId("");
  };

  const hasActiveFilters = search || stallId;

  return (
    <section id="koleksi" className="border-b border-border bg-background py-20 md:py-28">
      <div className="reveal mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between mb-10">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="h-px w-8 bg-foreground/40" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Menu hari ini
              </p>
            </div>
            <h2 className="mt-5 font-serif text-3xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Yang sedang dijual di stan kampus
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
              Daftar ini dibaca langsung dari data stan. Kalau sebuah produk habis, statusnya
              berubah dan tombol pesan dinonaktifkan.
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full md:w-auto md:flex-row md:items-end md:justify-end">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 w-full md:w-[360px] bg-surface p-4 rounded-md border border-border shadow-2xs">
              <SearchBox value={search} onChange={setSearch} />
              <StallFilter value={stallId} onChange={setStallId} />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-sm border border-border bg-surface px-3 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground/40 hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Hapus filter</span>
                </button>
              )}
              <Link
                href="/catalog"
                className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-sm border border-border bg-surface px-4 text-sm font-semibold text-foreground transition-colors hover:border-foreground/40 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Buka katalog lengkap
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </header>

        <div className="mt-6">
          {productsQuery.isPending ? (
            <div
              className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3"
              aria-busy="true"
              aria-live="polite"
            >
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="reveal" style={{ animationDelay: `${index * 100}ms` }}>
                  <Skeleton className="aspect-[4/3] w-full rounded-sm" />
                  <div className="space-y-3 pt-4 px-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-5 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : productsQuery.isError ? (
            <ErrorState
              message="Daftar produk belum bisa dimuat. Periksa koneksi lalu coba lagi."
              onRetry={() => void productsQuery.refetch()}
            />
          ) : items.length === 0 ? (
            <EmptyState
              title={stallId ? "Stan ini belum memiliki produk" : search ? "Tidak ada produk yang cocok" : "Belum ada produk yang tayang"}
              description={stallId
                ? "Stan yang dipilih belum mengunggah menu, atau semua produk sedang tidak tersedia."
                : search
                  ? "Coba kata kunci lain atau hapus filter pencarian."
                  : "Stan belum mengunggah menu, atau semua produk sedang tidak tersedia. Coba muat ulang sebentar lagi."}
              action={
                <button
                  type="button"
                  onClick={() => void productsQuery.refetch()}
                  className="mt-2 min-h-11 rounded-sm border border-border bg-surface px-5 text-sm font-semibold text-foreground transition-colors hover:border-foreground/40 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  Muat ulang menu
                </button>
              }
            />
          ) : (
            <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((product, index) => (
                <li key={product.id} className="reveal" style={{ animationDelay: `${index * 80}ms` }}>
                  <ProductCard product={product} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
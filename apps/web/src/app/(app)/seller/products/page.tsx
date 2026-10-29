"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { ApiError } from "@/lib/api/client";
import { RequireRole } from "@/features/auth/guards";
import { listSellerProducts, listSellerStalls } from "@/features/seller/api";
import { ProductList } from "@/features/seller/product-list";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { Field, Select } from "@/components/ui/form";

export default function SellerProductsPage() {
  return (
    <RequireRole roles={["seller"]}>
      <SellerProductsView />
    </RequireRole>
  );
}

function SellerProductsView() {
  const [stallId, setStallId] = useState("");

  const stallsQuery = useQuery({ queryKey: ["seller", "stalls"], queryFn: listSellerStalls });
  const productsQuery = useQuery({
    queryKey: ["seller", "products", stallId || "all"],
    queryFn: () => listSellerProducts(stallId || undefined),
  });

  const stalls = stallsQuery.data?.stalls ?? [];
  const products = productsQuery.data?.products ?? [];
  const errorMessage = productsQuery.error
    ? productsQuery.error instanceof ApiError
      ? productsQuery.error.message
      : "Daftar produk gagal dimuat."
    : null;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-foreground">Produk</h1>
          <p className="text-sm text-muted-foreground">
            Kelola produk pada stan yang Anda manages.
          </p>
        </div>
        <Link
          href="/seller/products/new"
          className="inline-flex items-center justify-center rounded-lg border border-transparent bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:opacity-90"
        >
          Tambah produk
        </Link>
      </header>

      <Card>
        <CardHeader
          title="Filter stan"
          description="Tampilkan produk pada satu stan atau seluruh stan Anda."
        />
        <div className="max-w-xs">
          <Field label="Stan" htmlFor="seller-product-stall-filter">
            <Select
              id="seller-product-stall-filter"
              value={stallId}
              onChange={(event) => setStallId(event.target.value)}
            >
              <option value="">Semua stan</option>
              {stalls.map((stall) => (
                <option key={stall.id} value={stall.id}>
                  {stall.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Daftar produk"
          description="Produk yang diarsipkan tidak tampil di katalog dan tidak dapat diubah."
        />
        {productsQuery.isLoading ? (
          <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
            <span className="sr-only">Memuat daftar produk...</span>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : errorMessage ? (
          <ErrorState
            message={errorMessage}
            onRetry={() => void productsQuery.refetch()}
          />
        ) : products.length === 0 ? (
          <EmptyState
            title="Belum ada produk"
            description="Tambahkan produk pertama pada stan Anda."
            action={
              <Link
                href="/seller/products/new"
                className="inline-flex items-center justify-center rounded-lg border border-transparent bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:opacity-90"
              >
                Tambah produk
              </Link>
            }
          />
        ) : (
          <ProductList products={products} />
        )}
      </Card>
    </div>
  );
}

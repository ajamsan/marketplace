"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ApiError } from "@/lib/api/client";
import { RequireRole } from "@/features/auth/guards";
import { listSellerStalls } from "@/features/seller/api";
import { ProductForm } from "@/features/seller/product-form";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";

// Memastikan halaman pembuatan produk hanya diakses oleh penjual.
export default function NewProductPage() {
  return (
    <RequireRole roles={["seller"]}>
      <NewProductView />
    </RequireRole>
  );
}

// Memuat stan penjual sebelum membuka formulir produk baru.
function NewProductView() {
  const router = useRouter();
  const query = useQuery({ queryKey: ["seller", "stalls"], queryFn: listSellerStalls });

  const stalls = query.data?.stalls ?? [];
  const errorMessage = query.error
    ? query.error instanceof ApiError
      ? query.error.message
      : "Daftar stan gagal dimuat."
    : null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <header>
        <h1 className="text-lg font-bold text-foreground">Tambah produk</h1>
        <p className="text-sm text-muted-foreground">
          Produk baru dibuat pada stan milik Anda.
        </p>
      </header>

      <Card>
        <CardHeader title="Formulir produk" />
        {query.isLoading ? (
          <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
            <span className="sr-only">Memuat daftar stan...</span>
            <Skeleton className="h-40 w-full" />
          </div>
        ) : errorMessage ? (
          <ErrorState message={errorMessage} onRetry={() => void query.refetch()} />
        ) : stalls.length === 0 ? (
          <EmptyState
            title="Belum ada stan"
            description="Buat stan terlebih dahulu sebelum menambahkan produk."
            action={
              <Link
                href="/seller/stall"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-transparent bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:opacity-90"
              >
                Ke halaman stan
              </Link>
            }
          />
        ) : (
          <ProductForm
            stalls={stalls}
            onSaved={() => router.push("/seller/products")}
            onCancel={() => router.push("/seller/products")}
          />
        )}
      </Card>
    </div>
  );
}

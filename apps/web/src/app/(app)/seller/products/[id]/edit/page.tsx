"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { ApiError } from "@/lib/api/client";
import { RequireRole } from "@/features/auth/guards";
import { listSellerProducts } from "@/features/seller/api";
import { ProductForm } from "@/features/seller/product-form";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";

export default function EditProductPage() {
  return (
    <RequireRole roles={["seller"]}>
      <EditProductView />
    </RequireRole>
  );
}

function EditProductView() {
  const router = useRouter();
  const params = useParams<{ id: string | string[] }>();
  const productId = Array.isArray(params.id) ? params.id[0] : params.id;

  const query = useQuery({
    queryKey: ["seller", "products", "all"],
    queryFn: () => listSellerProducts(),
  });

  const product = query.data?.products.find((item) => item.id === productId) ?? null;
  const errorMessage = query.error
    ? query.error instanceof ApiError
      ? query.error.message
      : "Produk gagal dimuat."
    : null;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-lg font-bold text-foreground">Ubah produk</h1>
        <p className="text-sm text-muted-foreground">
          Perubahan harga dan ketersediaan tidak memengaruhi pesanan yang sudah dibuat.
        </p>
      </header>

      <Card>
        <CardHeader title="Formulir produk" />
        {query.isLoading ? (
          <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
            <span className="sr-only">Memuat produk...</span>
            <Skeleton className="h-40 w-full" />
          </div>
        ) : errorMessage ? (
          <ErrorState message={errorMessage} onRetry={() => void query.refetch()} />
        ) : !product ? (
          <EmptyState
            title="Produk tidak ditemukan"
            description="Produk tidak ada di stan yang Anda kelola atau sudah tidak tersedia."
            action={
              <Link
                href="/seller/products"
                className="inline-flex items-center justify-center rounded-lg border border-transparent bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:opacity-90"
              >
                Kembali ke daftar produk
              </Link>
            }
          />
        ) : (
          <ProductForm
            stalls={[]}
            product={product}
            onSaved={() => router.push("/seller/products")}
            onCancel={() => router.push("/seller/products")}
          />
        )}
      </Card>
    </div>
  );
}

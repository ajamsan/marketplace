"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { ApiError } from "@/lib/api/client";
import type { Product } from "@/lib/api/types";
import { AVAILABILITY_LABEL, formatIDR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { archiveProduct } from "./api";
import { ProductImageInput } from "./product-image-input";

export function ProductList({ products }: { products: Product[] }) {
  const queryClient = useQueryClient();
  const [archiveTarget, setArchiveTarget] = useState<Product | null>(null);
  const [imageTarget, setImageTarget] = useState<Product | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  const archiveMutation = useMutation({
    mutationFn: (id: string) => archiveProduct(id),
    onSuccess: () => {
      setArchiveTarget(null);
      setArchiveError(null);
      void queryClient.invalidateQueries({ queryKey: ["seller", "products"] });
    },
    onError: (error) => {
      setArchiveError(
        error instanceof ApiError ? error.message : "Produk gagal diarsipkan. Coba lagi.",
      );
    },
  });

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {products.map((product) => {
          const archived = Boolean(product.archived_at);
          return (
            <li key={product.id} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{product.name}</p>
                  <p className="text-sm text-muted-foreground">{product.stall_name}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={product.availability_status === "available" ? "success" : "neutral"}>
                    {AVAILABILITY_LABEL[product.availability_status] ?? product.availability_status}
                  </Badge>
                  {archived ? <Badge tone="warning">Diarsipkan</Badge> : null}
                </div>
              </div>

              <p className="mt-2 text-sm font-semibold text-foreground">
                {formatIDR(product.price_minor)}
              </p>
              {product.description ? (
                <p className="mt-1 text-sm text-muted-foreground">{product.description}</p>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {!archived ? (
                  <Link
                    href={`/seller/products/${encodeURIComponent(product.id)}/edit`}
                    className="inline-flex items-center justify-center rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-surface-muted"
                  >
                    Ubah
                  </Link>
                ) : null}
                {!archived ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setArchiveError(null);
                      setArchiveTarget(product);
                    }}
                  >
                    Arsipkan
                  </Button>
                ) : null}
                <Button size="sm" variant="ghost" onClick={() => setImageTarget(product)}>
                  Unggah foto
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      <Dialog
        open={archiveTarget !== null}
        title="Arsipkan produk"
        description="Produk yang diarsipkan tidak lagi tampil di katalog dan tidak dapat diubah. Tindakan ini tidak dapat dibatalkan."
        onClose={() => {
          if (!archiveMutation.isPending) setArchiveTarget(null);
        }}
      >
        <p className="text-sm text-foreground">
          Arsipkan <span className="font-semibold">{archiveTarget?.name}</span>?
        </p>
        {archiveError ? (
          <p role="alert" className="text-sm font-medium text-danger">
            {archiveError}
          </p>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => setArchiveTarget(null)}
            disabled={archiveMutation.isPending}
          >
            Batal
          </Button>
          <Button
            variant="danger"
            disabled={archiveMutation.isPending}
            onClick={() => {
              if (archiveTarget) archiveMutation.mutate(archiveTarget.id);
            }}
          >
            {archiveMutation.isPending ? "Mengarsipkan..." : "Ya, arsipkan"}
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={imageTarget !== null}
        title="Unggah foto produk"
        description="Foto disimpan di server dan menggantikan foto sebelumnya bila ada."
        onClose={() => setImageTarget(null)}
      >
        {imageTarget ? <ProductImageInput product={imageTarget} /> : null}
      </Dialog>
    </div>
  );
}

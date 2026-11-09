"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { ApiError } from "@/lib/api/client";
import type { Product } from "@/lib/api/types";
import { AVAILABILITY_LABEL, formatIDR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { archiveProduct, unarchiveProduct } from "./api";
import { ProductImageInput } from "./product-image-input";
import { cn } from "@/lib/utils";

// Menyajikan produk penjual dengan aksi ubah, arsip, dan unggah foto.
export function ProductList({ products }: { products: Product[] }) {
  const queryClient = useQueryClient();
  const [archiveTarget, setArchiveTarget] = useState<Product | null>(null);
  const [imageTarget, setImageTarget] = useState<Product | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [unarchiveError, setUnarchiveError] = useState<string | null>(null);

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

  const unarchiveMutation = useMutation({
    mutationFn: (id: string) => unarchiveProduct(id),
    onSuccess: () => {
      setUnarchiveError(null);
      void queryClient.invalidateQueries({ queryKey: ["seller", "products"] });
    },
    onError: (error) => {
      setUnarchiveError(
        error instanceof ApiError ? error.message : "Produk gagal diaktifkan kembali. Coba lagi.",
      );
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => {
          const archived = Boolean(product.archived_at);
          return (
            <li key={product.id}>
              <Card className={cn("flex flex-col h-full transition-shadow hover:shadow-md", archived && "opacity-60")}>
                <Link
                  href={`/seller/products/${encodeURIComponent(product.id)}/edit`}
                  className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-t-lg"
                  aria-label={archived ? `Lihat produk terarsipkan ${product.name}` : `Ubah produk ${product.name}`}
                >
                  {product.image_url ? (
                    <Image
                      src={product.image_url}
                      alt={`Foto ${product.name}`}
                      width={400}
                      height={300}
                      className="aspect-[4/3] w-full object-cover"
                    />
                  ) : (
                    <div className="aspect-[4/3] w-full flex items-center justify-center bg-surface-muted border-b border-border">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="h-10 w-10 text-muted-foreground/40"
                        aria-hidden="true"
                      >
                        <path d="M3 7a2 2 0 0 1 2-2h2l1.5-2h7L17 5h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
                        <circle cx="12" cy="12" r="3.5" />
                      </svg>
                    </div>
                  )}
                </Link>

                <div className="flex flex-1 flex-col p-4 gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{product.stall_name}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        tone={product.availability_status === "available" ? "success" : "neutral"}
                        className="text-[10px] py-0.5"
                      >
                        {AVAILABILITY_LABEL[product.availability_status] ?? product.availability_status}
                      </Badge>
                      {archived && (
                        <Badge tone="warning" className="text-[10px] py-0.5">
                          Diarsipkan
                        </Badge>
                      )}
                    </div>
                  </div>

                  <p className="text-lg font-semibold text-foreground">{formatIDR(product.price_minor)}</p>
                  {product.description ? (
                    <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                  ) : null}

                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
                    {!archived ? (
                      <Link
                        href={`/seller/products/${encodeURIComponent(product.id)}/edit`}
                        className="flex-1 sm:flex-none inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-surface px-3 text-xs font-semibold text-foreground transition-colors hover:bg-surface-muted"
                      >
                        Ubah
                      </Link>
                    ) : (
                      <span className="flex-1 sm:flex-none" />
                    )}
                    {!archived ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="flex-1 sm:flex-none"
                        onClick={() => {
                          setArchiveError(null);
                          setArchiveTarget(product);
                        }}
                      >
                        Arsipkan
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="flex-1 sm:flex-none"
                        disabled={unarchiveMutation.isPending}
                        onClick={() => {
                          setUnarchiveError(null);
                          unarchiveMutation.mutate(product.id);
                        }}
                      >
                        {unarchiveMutation.isPending ? "Mengaktifkan..." : "Aktifkan"}
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="flex-1 sm:flex-none" onClick={() => setImageTarget(product)}>
                      Foto
                    </Button>
                  </div>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>

      {unarchiveError && (
        <p role="alert" className="text-sm font-medium text-danger">{unarchiveError}</p>
      )}

      <Dialog
        open={archiveTarget !== null}
        title="Arsipkan produk"
        description="Produk yang diarsipkan disembunyikan dari katalog dan tidak dapat diubah. Produk tetap dapat diaktifkan kembali kapan saja."
        onClose={() => {
          if (!archiveMutation.isPending) setArchiveTarget(null);
        }}
      >
        <p className="text-sm text-foreground">
          Arsipkan <span className="font-semibold">{archiveTarget?.name}</span>?
        </p>
        {archiveError && (
          <p role="alert" className="text-sm font-medium text-danger">{archiveError}</p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={() => setArchiveTarget(null)} disabled={archiveMutation.isPending}>
            Batal
          </Button>
          <Button variant="danger" disabled={archiveMutation.isPending} onClick={() => {
            if (archiveTarget) archiveMutation.mutate(archiveTarget.id);
          }}>
            {archiveMutation.isPending ? "Mengarsipkan..." : "Ya, arsipkan"}
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={imageTarget !== null}
        title="Unggah foto produk"
        description="Foto disimpan di server dan menggantikan foto sebelumnya bila ada. Format: PNG/JPG, maksimal 2 MB."
        onClose={() => setImageTarget(null)}
      >
        {imageTarget ? (
          <ProductImageInput product={imageTarget} onUploaded={() => setImageTarget(null)} />
        ) : null}
      </Dialog>
    </div>
  );
}
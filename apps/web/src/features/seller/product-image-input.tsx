"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

import { ApiError } from "@/lib/api/client";
import type { Product } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { uploadProductImage } from "./api";

const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg"];

// Memeriksa berkas gambar, menampilkan pratinjau, dan mengunggahnya untuk produk.
export function ProductImageInput({
  product,
  onUploaded,
}: {
  product: Product;
  onUploaded?: () => void;
}) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  const mutation = useMutation({
    // Mengirim berkas pilihan ke layanan gambar produk.
    mutationFn: (selected: File) => uploadProductImage(product.id, selected),
    // Membersihkan pratinjau dan memuat ulang daftar setelah unggahan berhasil.
    onSuccess: () => {
      setFile(null);
      setError(null);
      replacePreview(null);
      if (inputRef.current) inputRef.current.value = "";
      void queryClient.invalidateQueries({ queryKey: ["seller", "products"] });
      onUploaded?.();
    },
    // Menyajikan alasan kegagalan unggah tanpa menutup formulir.
    onError: (mutationError) => {
      if (mutationError instanceof ApiError) {
        setError(mutationError.message);
        return;
      }
      setError("Foto gagal diunggah. Coba lagi.");
    },
  });

  // Mencabut URL objek lama sebelum mengganti pratinjau agar memori dapat dilepas.
  function replacePreview(next: string | null) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = next;
    setPreview(next);
  }

  // Memvalidasi tipe dan ukuran berkas sebelum membuat pratinjau lokal.
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setError(null);
    if (!selected) {
      setFile(null);
      replacePreview(null);
      return;
    }
    if (!ACCEPTED_TYPES.includes(selected.type)) {
      setFile(null);
      replacePreview(null);
      event.target.value = "";
      setError("Format foto harus PNG atau JPG.");
      return;
    }
    if (selected.size > MAX_BYTES) {
      setFile(null);
      replacePreview(null);
      event.target.value = "";
      setError("Ukuran foto maksimal 2 MB.");
      return;
    }
    setFile(selected);
    replacePreview(URL.createObjectURL(selected));
  }

  const shownImage = preview ?? product.image_url;

  return (
    <div className="flex flex-col gap-2">
      <Field
        label="Foto produk"
        htmlFor={`product-image-${product.id}`}
        hint="PNG atau JPG, maksimal 2 MB."
      >
        <Input
          id={`product-image-${product.id}`}
          type="file"
          accept="image/png,image/jpeg"
          onChange={handleChange}
          disabled={mutation.isPending}
        />
      </Field>

      {shownImage ? (
        <Image
          src={shownImage}
          alt={`Foto produk ${product.name}`}
          width={96}
          height={96}
          unoptimized
          className="h-24 w-24 rounded-lg border border-border object-cover"
        />
      ) : (
        <p className="text-xs text-muted-foreground">Belum ada foto produk.</p>
      )}

      {error ? (
        <p role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}

      <div>
        <Button
          size="sm"
          onClick={() => {
            if (file) mutation.mutate(file);
          }}
          disabled={!file || mutation.isPending}
        >
          {mutation.isPending ? "Mengunggah..." : "Unggah foto"}
        </Button>
      </div>
    </div>
  );
}

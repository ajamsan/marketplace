"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { Camera } from "lucide-react";
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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
    setPreviewUrl(next);
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

  const shownImage = previewUrl ?? product.image_url;

  return (
    <div className="flex flex-col gap-4">
      <div className="max-w-xs self-center">
        {shownImage ? (
          <Image
            src={shownImage}
            alt={`Foto produk ${product.name}`}
            width={320}
            height={240}
            unoptimized
            className="h-40 w-full rounded-lg border border-border object-cover"
          />
        ) : (
          <div className="flex h-40 w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-surface-muted p-4 text-center">
            <Camera className="h-7 w-7 text-muted-foreground/60" aria-hidden="true" />
            <p className="text-xs font-semibold text-foreground">Belum ada foto</p>
            <p className="max-w-44 text-[11px] leading-snug text-muted-foreground">
              Foto membuat produk lebih mudah dikenali.
            </p>
          </div>
        )}
      </div>

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
          className="file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-4 file:py-1.5 file:text-xs file:font-semibold file:text-accent-foreground"
        />
      </Field>

      {file && !mutation.isPending && (
        <p className="truncate text-xs text-muted-foreground" title={file.name}>
          Dipilih: {file.name}
        </p>
      )}

      {error ? (
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger-soft p-3 text-xs font-medium text-foreground">
          {error}
        </p>
      ) : null}

      <div className="flex w-full gap-2">
        <Button
          size="sm"
          onClick={() => {
            if (file) mutation.mutate(file);
          }}
          disabled={!file || mutation.isPending}
          className="flex-1"
        >
          {mutation.isPending ? "Mengunggah..." : "Unggah foto"}
        </Button>
        {file && !mutation.isPending && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setFile(null);
              setError(null);
              replacePreview(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="flex-1"
          >
            Batal
          </Button>
        )}
      </div>
    </div>
  );
}

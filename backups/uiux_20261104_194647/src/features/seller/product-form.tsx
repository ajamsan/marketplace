"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { z } from "zod";

import { ApiError } from "@/lib/api/client";
import type { Product, Stall } from "@/lib/api/types";
import { formatIDR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { createProduct, updateProduct } from "./api";

const MAX_PRICE_MINOR = 10_000_000_000;

const productSchema = z.object({
  name: z
    .string()
    .min(3, "Nama produk minimal 3 karakter")
    .max(100, "Nama produk maksimal 100 karakter"),
  description: z.string().max(500, "Deskripsi maksimal 500 karakter"),
  price_rupiah: z
    .number()
    .min(0, "Harga tidak boleh negatif")
    .max(MAX_PRICE_MINOR / 100, "Harga maksimal Rp 100.000.000"),
  availability_status: z.enum(["available", "unavailable"]),
  stall_id: z.string().min(1, "Pilih stan"),
});

export interface ProductFormProps {
  stalls: Stall[];
  product?: Product;
  defaultStallId?: string;
  onSaved?: (product: Product) => void;
  onCancel?: () => void;
}

// Mengelola pembuatan atau perubahan produk dengan validasi harga dan stan.
export function ProductForm({
  stalls,
  product,
  defaultStallId,
  onSaved,
  onCancel,
}: ProductFormProps) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(product);
  const [stallId, setStallId] = useState(
    product?.stall_id ?? defaultStallId ?? (stalls[0]?.id ?? ""),
  );
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [priceRupiah, setPriceRupiah] = useState(
    product ? String(product.price_minor / 100) : "",
  );
  const [availability, setAvailability] = useState(
    product?.availability_status === "unavailable" ? "unavailable" : "available",
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    // Memilih endpoint pembuatan atau perubahan sesuai mode formulir.
    mutationFn: (payload: {
      name: string;
      description: string;
      price_minor: number;
      availability_status: string;
    }) =>
      isEdit
        ? updateProduct(product!.id, payload)
        : createProduct(stallId, payload),
    // Menyegarkan daftar produk setelah perubahan berhasil disimpan.
    onSuccess: (saved) => {
      setFieldErrors({});
      setFormError(null);
      void queryClient.invalidateQueries({ queryKey: ["seller", "products"] });
      onSaved?.(saved);
    },
    // Menampilkan galat API dan memetakan kesalahan harga ke kolom rupiah.
    onError: (error) => {
      if (error instanceof ApiError) {
        setFormError(error.message);
        const next: Record<string, string> = {};
        for (const [key, value] of Object.entries(error.fields ?? {})) {
          next[key === "price_minor" ? "price_rupiah" : key] = value;
        }
        setFieldErrors(next);
        return;
      }
      setFormError("Terjadi kesalahan saat menyimpan produk. Coba lagi.");
    },
  });

  const priceNumber = Number(priceRupiah.trim());
  const priceMinor = Number.isFinite(priceNumber) ? Math.round(priceNumber * 100) : 0;

  // Mengubah harga rupiah ke satuan minor dan memvalidasi payload sebelum dikirim.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!priceRupiah.trim() || !Number.isFinite(priceNumber)) {
      setFieldErrors({ price_rupiah: "Harga harus berupa angka rupiah yang valid" });
      setFormError(null);
      return;
    }
    const payload = {
      name: name.trim(),
      description: description.trim(),
      price_rupiah: priceNumber,
      availability_status: availability,
      stall_id: stallId,
    };
    const parsed = productSchema.safeParse(payload);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!next[key]) next[key] = issue.message;
      }
      setFieldErrors(next);
      setFormError(null);
      return;
    }
    setFieldErrors({});
    setFormError(null);
    mutation.mutate({
      name: payload.name,
      description: payload.description,
      price_minor: priceMinor,
      availability_status: payload.availability_status,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {isEdit ? (
        <Field label="Stan" htmlFor="product-stall-readonly" hint="Produk tidak dapat dipindahkan antar stan.">
          <Input
            id="product-stall-readonly"
            value={product?.stall_name ?? ""}
            readOnly
            className="bg-surface-muted"
          />
        </Field>
      ) : (
        <Field label="Stan" htmlFor="product-stall" error={fieldErrors.stall_id}>
          <Select
            id="product-stall"
            name="stall_id"
            value={stallId}
            onChange={(event) => setStallId(event.target.value)}
            aria-invalid={fieldErrors.stall_id ? true : undefined}
            aria-describedby={fieldErrors.stall_id ? "product-stall-error" : undefined}
          >
            <option value="">Pilih stan</option>
            {stalls.map((stall) => (
              <option key={stall.id} value={stall.id}>
                {stall.name}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <Field
        label="Nama produk"
        htmlFor="product-name"
        error={fieldErrors.name}
        hint="3-100 karakter."
      >
        <Input
          id="product-name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={100}
          aria-invalid={fieldErrors.name ? true : undefined}
          aria-describedby={fieldErrors.name ? "product-name-error" : undefined}
        />
      </Field>

      <Field
        label="Deskripsi"
        htmlFor="product-description"
        error={fieldErrors.description}
        hint="Opsional, maksimal 500 karakter."
      >
        <Textarea
          id="product-description"
          name="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={500}
          aria-invalid={fieldErrors.description ? true : undefined}
          aria-describedby={fieldErrors.description ? "product-description-error" : undefined}
        />
      </Field>

      <Field
        label="Harga (rupiah)"
        htmlFor="product-price"
        error={fieldErrors.price_rupiah}
        hint={
          priceRupiah.trim() && Number.isFinite(priceNumber)
            ? `Dikirim ke server sebagai ${formatIDR(priceMinor)}.`
            : "Masukkan harga dalam rupiah, contoh 15000."
        }
      >
        <Input
          id="product-price"
          name="price"
          type="number"
          inputMode="numeric"
          min={0}
          max={MAX_PRICE_MINOR / 100}
          step="1"
          value={priceRupiah}
          onChange={(event) => setPriceRupiah(event.target.value)}
          aria-invalid={fieldErrors.price_rupiah ? true : undefined}
          aria-describedby={fieldErrors.price_rupiah ? "product-price-error" : undefined}
        />
      </Field>

      <Field
        label="Status ketersediaan"
        htmlFor="product-availability"
        error={fieldErrors.availability_status}
      >
        <Select
          id="product-availability"
          name="availability_status"
          value={availability}
          onChange={(event) => setAvailability(event.target.value)}
          aria-invalid={fieldErrors.availability_status ? true : undefined}
          aria-describedby={
            fieldErrors.availability_status ? "product-availability-error" : undefined
          }
        >
          <option value="available">Tersedia</option>
          <option value="unavailable">Tidak tersedia</option>
        </Select>
      </Field>

      {formError ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {formError}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending
            ? "Menyimpan..."
            : isEdit
              ? "Simpan perubahan produk"
              : "Simpan produk"}
        </Button>
        {onCancel ? (
          <Button type="button" variant="secondary" disabled={mutation.isPending} onClick={onCancel}>
            Batal
          </Button>
        ) : null}
      </div>
    </form>
  );
}

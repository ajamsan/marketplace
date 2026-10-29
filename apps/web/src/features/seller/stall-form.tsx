"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { z } from "zod";

import { ApiError } from "@/lib/api/client";
import type { Stall } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { createStall, updateStall } from "./api";

const stallSchema = z.object({
  name: z
    .string()
    .min(3, "Nama stan minimal 3 karakter")
    .max(80, "Nama stan maksimal 80 karakter"),
  description: z.string().max(500, "Deskripsi maksimal 500 karakter"),
  location_label: z.string().max(120, "Lokasi maksimal 120 karakter"),
});

export interface StallFormProps {
  stall?: Stall;
  onSaved?: (stall: Stall) => void;
}

export function StallForm({ stall, onSaved }: StallFormProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(stall?.name ?? "");
  const [description, setDescription] = useState(stall?.description ?? "");
  const [locationLabel, setLocationLabel] = useState(stall?.location_label ?? "");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: { name: string; description: string; location_label: string }) =>
      stall ? updateStall(stall.id, payload) : createStall(payload),
    onSuccess: (saved) => {
      setFieldErrors({});
      setFormError(null);
      void queryClient.invalidateQueries({ queryKey: ["seller", "stalls"] });
      onSaved?.(saved);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setFormError(error.message);
        setFieldErrors(error.fields ?? {});
        return;
      }
      setFormError("Terjadi kesalahan saat menyimpan stan. Coba lagi.");
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      name: name.trim(),
      description: description.trim(),
      location_label: locationLabel.trim(),
    };
    const parsed = stallSchema.safeParse(payload);
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
    mutation.mutate(payload);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <p className="rounded-lg border border-info/40 bg-info-soft p-3 text-xs text-foreground">
        Stan baru dikirim ke admin untuk persetujuan dan berstatus Menunggu persetujuan
        admin. Seller tidak dapat mengubah status stan sendiri; keputusan aktif atau
        nonaktif dibuat oleh admin.
      </p>

      <Field
        label="Nama stan"
        htmlFor="stall-name"
        error={fieldErrors.name}
        hint="3-80 karakter."
      >
        <Input
          id="stall-name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={80}
          autoComplete="organization"
          aria-invalid={fieldErrors.name ? true : undefined}
          aria-describedby={fieldErrors.name ? "stall-name-error" : undefined}
        />
      </Field>

      <Field
        label="Deskripsi"
        htmlFor="stall-description"
        error={fieldErrors.description}
        hint="Opsional, maksimal 500 karakter."
      >
        <Textarea
          id="stall-description"
          name="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={500}
          aria-invalid={fieldErrors.description ? true : undefined}
          aria-describedby={fieldErrors.description ? "stall-description-error" : undefined}
        />
      </Field>

      <Field
        label="Label lokasi"
        htmlFor="stall-location"
        error={fieldErrors.location_label}
        hint="Opsional, maksimal 120 karakter. Contoh: Depan Biblioteca."
      >
        <Input
          id="stall-location"
          name="location_label"
          value={locationLabel}
          onChange={(event) => setLocationLabel(event.target.value)}
          maxLength={120}
          aria-invalid={fieldErrors.location_label ? true : undefined}
          aria-describedby={fieldErrors.location_label ? "stall-location-error" : undefined}
        />
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
            : stall
              ? "Simpan perubahan stan"
              : "Ajukan stan baru"}
        </Button>
      </div>
    </form>
  );
}

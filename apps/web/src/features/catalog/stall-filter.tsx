"use client";

import { useQuery } from "@tanstack/react-query";

import { listStalls } from "./api";
import { Field, Select } from "@/components/ui/form";

export function StallFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { data: stalls, isPending, isError } = useQuery({
    queryKey: ["stalls"],
    queryFn: listStalls,
    staleTime: 300_000,
  });

  return (
    <Field
      label="Stan"
      htmlFor="stall-filter"
      error={isError ? "Gagal memuat daftar stan." : undefined}
    >
      <Select
        id="stall-filter"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={isPending}
      >
        <option value="">Semua stan</option>
        {(stalls ?? []).map((stall) => (
          <option key={stall.id} value={stall.id}>
            {stall.name}
          </option>
        ))}
      </Select>
    </Field>
  );
}

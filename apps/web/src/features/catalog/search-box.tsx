"use client";

import { useEffect, useRef, useState } from "react";

import { Field, Input } from "@/components/ui/form";

// Menunda pembaruan pencarian agar perubahan cepat tidak memicu permintaan berulang.
export function SearchBox({
  value,
  onChange,
  label = "Cari produk",
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  const [draft, setDraft] = useState(value);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (draft !== valueRef.current) onChangeRef.current(draft);
    }, 300);
    return () => clearTimeout(timer);
  }, [draft]);

  return (
    <Field label={label} htmlFor="catalog-search" hint="Pencarian ditunda 0,3 detik.">
      <Input
        id="catalog-search"
        type="search"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Nama produk"
        autoComplete="off"
      />
    </Field>
  );
}

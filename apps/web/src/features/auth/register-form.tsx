"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

import { authApi } from "./api";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";

type RegisterValues = {
  username: string;
  email: string;
  password: string;
  role: "buyer" | "seller";
};

type FieldKey = keyof RegisterValues;

const USERNAME_PATTERN = /^[\p{L}][\p{L}' ]{1,28}[\p{L}']$/u;

const ROLE_OPTIONS: { id: "buyer" | "seller"; label: string; description: string }[] = [
  {
    id: "buyer",
    label: "Buyer",
    description: "Beli makanan di kantinampus dan pantau pesananmu.",
  },
  {
    id: "seller",
    label: "Seller",
    description: "Kelola stan, produk, dan pesanan yang masuk.",
  },
];

const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Username minimal 3 karakter.")
    .max(30, "Username maksimal 30 karakter.")
    .regex(USERNAME_PATTERN, "Gunakan huruf, spasi, dan apostrof (nama asli).").refine((v) => !v.includes("  "), "Tidak boleh ada spasi ganda"),
  email: z.email("Format email tidak valid.").regex(/^[^@\s]+@([A-Za-z0-9-]+\.)+[A-Za-z]{2,6}$/, "Domain email tidak valid."),
  password: z
    .string()
    .min(10, "Password minimal 10 karakter.")
    .max(128, "Password maksimal 128 karakter."),
  role: z.enum(["buyer", "seller"], { error: "Pilih peran akun." }),
});

// Mengubah daftar masalah validasi menjadi pesan per kolom formulir.
function issuesToFieldErrors(error: z.ZodError): Partial<Record<FieldKey, string>> {
  const result: Partial<Record<FieldKey, string>> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "") as FieldKey;
    if (key in registerSchema.shape && !result[key]) result[key] = issue.message;
  }
  return result;
}

// Mengelola pendaftaran akun dan meneruskan pengguna ke langkah verifikasi email.
export function RegisterForm() {
  const router = useRouter();
  const [values, setValues] = useState<RegisterValues>({
    username: "",
    email: "",
    password: "",
    role: "buyer",
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Memperbarui satu nilai formulir sekaligus membersihkan pesan terkait.
  function update<K extends FieldKey>(key: K, value: RegisterValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setFormError(null);
  }

  // Menormalisasi data, memvalidasinya, lalu mengirim permintaan pendaftaran.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const payload = {
      username: values.username.trim(),
      email: values.email.trim().toLowerCase(),
      password: values.password.trim(),
      role: values.role,
    };
    const parsed = registerSchema.safeParse(payload);
    if (!parsed.success) {
      setFieldErrors(issuesToFieldErrors(parsed.error));
      return;
    }

    setFieldErrors({});
    setPending(true);
    try {
      await authApi.register(parsed.data);
      router.push(`/verify?mode=register&email=${encodeURIComponent(parsed.data.email)}`);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.fields?.username) setFieldErrors({ username: error.fields.username });
        setFormError(
          error.status === 429
            ? "Terlalu banyak permintaan. Coba lagi dalam beberapa saat."
            : error.message,
        );
      } else {
        setFormError("Terjadi kesalahan jaringan. Coba lagi sebentar.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Daftar akun" description="Buat akun untuk memesan di kantin kampus." />
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Field
          label="Username"
          htmlFor="username"
          error={fieldErrors.username}
          hint="3-30 karakter: huruf, spasi, dan apostrof."
        >
          <Input
            id="username"
            name="username"
            value={values.username}
            onChange={(event) => update("username", event.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={30}
            aria-invalid={fieldErrors.username ? true : undefined}
            aria-describedby={fieldErrors.username ? "username-error" : undefined}
          />
        </Field>

        <Field
          label="Email"
          htmlFor="email"
          error={fieldErrors.email}
          hint="Kode OTP dikirim ke email ini."
        >
          <Input
            id="email"
            name="email"
            type="email"
            value={values.email}
            onChange={(event) => update("email", event.target.value)}
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={254}
            aria-invalid={fieldErrors.email ? true : undefined}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
          />
        </Field>

        <Field
          label="Password"
          htmlFor="password"
          error={fieldErrors.password}
          hint="Panjang 10-128 karakter."
        >
          <Input
            id="password"
            name="password"
            type="password"
            value={values.password}
            onChange={(event) => update("password", event.target.value)}
            autoComplete="new-password"
            maxLength={128}
            aria-invalid={fieldErrors.password ? true : undefined}
            aria-describedby={fieldErrors.password ? "password-error" : undefined}
          />
        </Field>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-foreground">Peran akun</legend>
          {ROLE_OPTIONS.map((option) => (
            <label
              key={option.id}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-surface p-3 has-[:checked]:border-accent"
            >
              <input
                type="radio"
                name="role"
                value={option.id}
                checked={values.role === option.id}
                onChange={() => update("role", option.id)}
                className="mt-1 h-4 w-4 accent-accent"
              />
              <span>
                <span className="block text-sm font-medium text-foreground">{option.label}</span>
                <span className="block text-xs text-muted-foreground">{option.description}</span>
              </span>
            </label>
          ))}
          {fieldErrors.role ? (
            <p role="alert" className="text-xs font-medium text-danger">
              {fieldErrors.role}
            </p>
          ) : null}
        </fieldset>

        {formError ? (
          <p role="alert" className="rounded-lg border border-danger/40 bg-danger-soft p-3 text-sm text-foreground">
            {formError}
          </p>
        ) : null}

        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Mengirim..." : "Daftar"}
        </Button>
      </form>
    </Card>
  );
}

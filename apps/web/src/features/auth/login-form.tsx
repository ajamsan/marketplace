"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";

import { authApi } from "./api";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";

const loginSchema = z.object({
  email: z.email("Format email tidak valid.").regex(/^[^@\s]+@([A-Za-z0-9-]+\.)+[A-Za-z]{2,6}$/, "Domain email tidak valid."),
  password: z.string().min(1, "Password wajib diisi."),
});

// Menolak tujuan redirect eksternal agar parameter setelah login tetap di situs ini.
export function safeNextPath(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

// Mengumpulkan kredensial, menangani hasil autentikasi, lalu melanjutkan ke verifikasi OTP.
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Memvalidasi kredensial dan menampilkan kegagalan tanpa mengirim formulir ulang.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = loginSchema.safeParse({ email: email.trim().toLowerCase(), password: password.trim() });
    if (!parsed.success) {
      setFieldErrors({
        email: parsed.error.issues.find((issue) => issue.path[0] === "email")?.message,
        password: parsed.error.issues.find((issue) => issue.path[0] === "password")?.message,
      });
      return;
    }

    setFieldErrors({});
    setPending(true);
    try {
      const result = await authApi.login(parsed.data);
      const query = new URLSearchParams({
        mode: "login",
        pre_auth_token: result.pre_auth_token,
        email: parsed.data.email,
      });
      if (next) query.set("next", next);
      router.push(`/verify?${query.toString()}`);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          setFormError("Email atau password salah");
        } else if (error.status === 429) {
          setFormError("Terlalu banyak percobaan. Coba lagi dalam beberapa saat.");
        } else {
          setFormError(error.message);
        }
      } else {
        setFormError("Terjadi kesalahan jaringan. Coba lagi sebentar.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="rounded-md border border-border bg-surface p-6 sm:p-8 shadow-md">
      <div className="mb-6">
        <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground block">
          Autentikasi Akun
        </span>
        <h1 className="mt-1 font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Masuk ke akun
        </h1>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Masuk untuk memesan dari stan kampus dan memantau status pesanan.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Field label="Email" htmlFor="email" error={fieldErrors.email}>
          <Input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setFieldErrors((current) => ({ ...current, email: undefined }));
            }}
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={254}
            aria-invalid={fieldErrors.email ? true : undefined}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
          />
        </Field>

        <Field label="Password" htmlFor="password" error={fieldErrors.password}>
          <Input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setFieldErrors((current) => ({ ...current, password: undefined }));
            }}
            autoComplete="current-password"
            maxLength={128}
            aria-invalid={fieldErrors.password ? true : undefined}
            aria-describedby={fieldErrors.password ? "password-error" : undefined}
          />
        </Field>

        {formError ? (
          <p role="alert" className="rounded-sm border border-danger/40 bg-danger-soft p-3 text-xs text-foreground">
            {formError}
          </p>
        ) : null}

        <Button type="submit" size="lg" disabled={pending} className="mt-2 uppercase tracking-widest text-xs font-semibold">
          {pending ? "Memproses..." : "Masuk ke Akun"}
        </Button>
        <p className="text-center text-[11px] text-muted-foreground">
          Kode verifikasi OTP aman akan dikirimkan ke alamat email Anda.
        </p>
      </form>
    </Card>
  );
}

"use client";

import Link from "next/link";
import { Suspense } from "react";

import { RegisterForm } from "@/features/auth/register-form";
import { RedirectIfAuthenticated } from "@/features/auth/guards";

// Menampilkan formulir pendaftaran dan tautan ke halaman masuk.
export default function RegisterPage() {
  return (
    <RedirectIfAuthenticated>
      <div className="flex flex-col gap-4">
        <Suspense fallback={null}>
          <RegisterForm />
        </Suspense>
        <p className="text-center text-sm text-muted-foreground">
          Sudah punya akun?{" "}
          <Link
            href="/login"
            className="font-semibold text-foreground underline underline-offset-4"
          >
            Masuk
          </Link>
        </p>
      </div>
    </RedirectIfAuthenticated>
  );
}

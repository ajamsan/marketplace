"use client";

import { Suspense } from "react";
import Link from "next/link";

import { LoginForm } from "@/features/auth/login-form";
import { RedirectIfAuthenticated } from "@/features/auth/guards";
import { FullPageLoader } from "@/components/ui/feedback";

// Menampilkan formulir login dan jalur menuju pendaftaran akun.
export default function LoginPage() {
  return (
    <RedirectIfAuthenticated>
      <div className="flex flex-col gap-4">
        <Suspense fallback={<FullPageLoader label="Memuat formulir..." />}>
          <LoginForm />
        </Suspense>
        <p className="text-center text-sm text-muted-foreground">
          Belum punya akun?{" "}
          <Link
            href="/register"
            className="font-semibold text-foreground underline underline-offset-4"
          >
            Daftar
          </Link>
        </p>
      </div>
    </RedirectIfAuthenticated>
  );
}

"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { safeNextPath } from "@/features/auth/login-form";
import { OtpForm } from "@/features/auth/otp-form";
import { Card, CardHeader } from "@/components/ui/card";
import { FullPageLoader } from "@/components/ui/feedback";

// Memilih keadaan verifikasi berdasarkan parameter pendaftaran atau login.
function VerifyContent() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") === "login" ? "login" : "register";
  const email = searchParams.get("email") ?? "";
  const preAuthToken = searchParams.get("pre_auth_token");
  const next = safeNextPath(searchParams.get("next"));


  if (mode === "login" && !preAuthToken) {
    return (
      <Card>
        <CardHeader title="Verifikasi login tidak lengkap" />
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Silakan ulangi login untuk meminta kode OTP baru.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground"
          >
            Kembali ke login
          </Link>
        </div>
      </Card>
    );
  }

  if (mode === "register" && !email) {
    return (
      <Card>
        <CardHeader title="Permintaan verifikasi tidak lengkap" />
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Silakan ulangi pendaftaran untuk meminta kode OTP baru.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground"
          >
            Kembali ke pendaftaran
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {mode === "register" ? (
        <p
          aria-live="polite"
          className="rounded-lg border border-border bg-surface-muted p-3 text-sm text-foreground"
        >
          Jika email valid, kode OTP telah dikirim.
        </p>
      ) : null}
      <OtpForm
        purpose={mode}
        email={email}
        preAuthToken={preAuthToken ?? undefined}
        next={next}
      />
    </div>
  );
}

// Membungkus konten verifikasi dengan fallback selama parameter dimuat.
export default function VerifyPage() {
  return (
    <Suspense fallback={<FullPageLoader label="Memuat verifikasi..." />}>
      <VerifyContent />
    </Suspense>
  );
}

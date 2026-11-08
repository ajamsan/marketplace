"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { safeNextPath } from "./login-form";
import { authApi } from "./api";
import { homePathForRole, useAuthStore } from "./auth-store";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";

const RESEND_COOLDOWN_SECONDS = 60;

export type OtpPurpose = "register" | "login";

// Menangani verifikasi pendaftaran atau login serta pengiriman ulang kode.
export function OtpForm({
  purpose,
  email,
  preAuthToken,
  next,
}: {
  purpose: OtpPurpose;
  email: string;
  preAuthToken?: string;
  next?: string | null;
}) {
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [resendPending, setResendPending] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setTimeout(() => setResendSeconds((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  // Memvalidasi kode lalu mengaktifkan akun atau menyelesaikan sesi login.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setOtpError(null);

    if (!/^\d{6}$/.test(otp)) {
      setOtpError("Masukkan 6 digit angka kode OTP.");
      return;
    }
    if (purpose === "login" && !preAuthToken) {
      setFormError("Sesi verifikasi login kedaluwarsa. Silakan ulangi proses masuk.");
      return;
    }

    setPending(true);
    try {
      if (purpose === "register") {
        const tokens = await authApi.verifyRegister({ email, otp });
        useAuthStore.getState().signIn(tokens);
        router.replace(homePathForRole(tokens.user.role));
        return;
      }

      const tokens = await authApi.verifyLogin({ pre_auth_token: preAuthToken ?? "", otp });
      useAuthStore.getState().signIn(tokens);
      router.replace(safeNextPath(next ?? null) ?? homePathForRole(tokens.user.role));
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === "OTP_INVALID_OR_EXPIRED" || error.status === 400) {
          setOtpError(error.message);
        } else if (error.status === 401) {
          setFormError("Verifikasi login kedaluwarsa. Silakan ulangi proses masuk.");
        } else if (error.status === 429) {
          setFormError(`${error.message} Tunggu sebentar sebelum mencoba lagi.`);
        } else {
          setFormError(error.message);
        }
      } else {
        setFormError("Terjadi kendala jaringan. Coba lagi sebentar.");
      }
    } finally {
      setPending(false);
    }
  }

  // Meminta kode baru dan menerapkan jeda agar pengiriman tidak berulang terlalu cepat.
  async function handleResend() {
    setFormError(null);
    setStatus(null);
    setResendPending(true);
    try {
      await authApi.resendOtp({ email, purpose });
      setResendSeconds(RESEND_COOLDOWN_SECONDS);
      setStatus("Jika alamat email terdaftar, kode OTP baru telah dikirimkan.");
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 429) {
          setResendSeconds(RESEND_COOLDOWN_SECONDS);
          setFormError(`${error.message} Tunggu sebentar sebelum mencoba lagi.`);
        } else {
          setFormError(error.message);
        }
      } else {
        setFormError("Gagal mengirim ulang kode. Coba lagi sebentar.");
      }
    } finally {
      setResendPending(false);
    }
  }

  const resendLabel =
    resendSeconds > 0 ? `Kirim ulang kode (${resendSeconds} detik)` : "Kirim ulang kode OTP";

  return (
    <Card className="rounded-md border border-border bg-surface p-6 sm:p-8 shadow-md">
      <div className="mb-6">
        <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground block">
          Verifikasi Dua Langkah
        </span>
        <h1 className="mt-1 font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Konfirmasi Kode Keamanan
        </h1>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Masukkan 6 digit kode OTP yang kami kirimkan ke <strong>{email || "email Anda"}</strong>.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Field
          label="Kode OTP 6 Digit"
          htmlFor="otp"
          error={otpError ?? undefined}
          hint="Kode berlaku terbatas beberapa menit untuk keamanan akun Anda."
        >
          <Input
            id="otp"
            name="otp"
            value={otp}
            onChange={(event) => {
              setOtp(event.target.value.replace(/\D/g, "").slice(0, 6));
              setOtpError(null);
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="000000"
            className="text-center font-mono text-xl tracking-[0.5em] font-semibold py-3"
            aria-invalid={otpError ? true : undefined}
            aria-describedby={otpError ? "otp-error" : undefined}
          />
        </Field>

        {formError ? (
          <p role="alert" className="rounded-sm border border-danger/40 bg-danger-soft p-3 text-xs text-foreground">
            {formError}
          </p>
        ) : null}

        {status ? (
          <p aria-live="polite" className="text-xs text-success font-medium">
            {status}
          </p>
        ) : null}

        <Button type="submit" size="lg" disabled={pending} className="mt-2 uppercase tracking-widest text-xs font-semibold">
          {pending ? "Memverifikasi..." : "Verifikasi & Lanjutkan"}
        </Button>

        <Button
          type="button"
          variant="secondary"
          onClick={handleResend}
          disabled={resendPending || resendSeconds > 0}
          className="uppercase tracking-wider text-xs"
        >
          {resendPending ? "Mengirim Ulang..." : resendLabel}
        </Button>
      </form>
    </Card>
  );
}

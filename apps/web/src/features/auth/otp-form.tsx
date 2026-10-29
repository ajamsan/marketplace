"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { safeNextPath } from "./login-form";
import { authApi } from "./api";
import { homePathForRole, useAuthStore } from "./auth-store";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";

const RESEND_COOLDOWN_SECONDS = 60;

export type OtpPurpose = "register" | "login";

export function OtpForm({
  purpose,
  email,
  preAuthToken,
  next,
  onVerified,
}: {
  purpose: OtpPurpose;
  email: string;
  preAuthToken?: string;
  next?: string | null;
  onVerified?: () => void;
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setOtpError(null);

    if (!/^\d{6}$/.test(otp)) {
      setOtpError("Masukkan 6 digit kode OTP.");
      return;
    }
    if (purpose === "login" && !preAuthToken) {
      setFormError("Verifikasi login tidak lengkap. Silakan ulangi login.");
      return;
    }

    setPending(true);
    try {
      if (purpose === "register") {
        await authApi.verifyRegister({ email, otp });
        setStatus("Kode OTP terverifikasi.");
        onVerified?.();
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
          setFormError("Verifikasi login kedaluwarsa. Silakan ulangi login.");
        } else if (error.status === 429) {
          setFormError(`${error.message} Tunggu sebentar sebelum mencoba lagi.`);
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

  async function handleResend() {
    setFormError(null);
    setStatus(null);
    setResendPending(true);
    try {
      await authApi.resendOtp({ email, purpose });
      setResendSeconds(RESEND_COOLDOWN_SECONDS);
      setStatus("Jika alamat email valid, kode OTP baru telah dikirim.");
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
    resendSeconds > 0 ? `Kirim ulang kode (${resendSeconds}d)` : "Kirim ulang kode";

  return (
    <Card>
      <CardHeader
        title="Masukkan kode OTP"
        description={`Kode 6 digit dikirim ke ${email || "emailmu"}.`}
      />
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Field
          label="Kode OTP"
          htmlFor="otp"
          error={otpError ?? undefined}
          hint="Kode hanya berlaku sekali dan berakhir setelah beberapa menit."
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
            className="text-center text-lg tracking-[0.4em]"
            aria-invalid={otpError ? true : undefined}
            aria-describedby={otpError ? "otp-error" : undefined}
          />
        </Field>

        {formError ? (
          <p role="alert" className="rounded-lg border border-danger/40 bg-danger-soft p-3 text-sm text-foreground">
            {formError}
          </p>
        ) : null}

        <p aria-live="polite" className="text-sm text-muted-foreground">
          {status}
        </p>

        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Memverifikasi..." : "Verifikasi"}
        </Button>

        <Button
          type="button"
          variant="secondary"
          onClick={handleResend}
          disabled={resendPending || resendSeconds > 0}
        >
          {resendPending ? "Mengirim..." : resendLabel}
        </Button>
      </form>
    </Card>
  );
}

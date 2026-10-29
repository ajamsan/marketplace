"use client";

import { useState } from "react";

import { authApi } from "@/features/auth/api";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

export function RevokeSessionButton({
  sessionId,
  sessionLabel,
  onRevoked,
}: {
  sessionId: string;
  sessionLabel?: string;
  onRevoked?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmRevoke() {
    setPending(true);
    setError(null);
    try {
      await authApi.revokeSession(sessionId);
      setOpen(false);
      onRevoked?.();
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
      } else {
        setError("Gagal mencabut sesi. Coba lagi sebentar.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="danger"
        size="sm"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        Cabut
      </Button>
      <Dialog
        open={open}
        title="Cabut sesi ini?"
        description={
          sessionLabel
            ? `Sesi ${sessionLabel} akan dikeluarkan dan perlu login ulang di perangkat tersebut.`
            : "Sesi ini akan dikeluarkan dan perlu login ulang di perangkat tersebut."
        }
        onClose={() => {
          if (!pending) setOpen(false);
        }}
      >
        {error ? (
          <p role="alert" className="rounded-lg border border-danger/40 bg-danger-soft p-3 text-sm text-foreground">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
            Batal
          </Button>
          <Button type="button" variant="danger" onClick={confirmRevoke} disabled={pending}>
            {pending ? "Mencabut..." : "Cabut sesi"}
          </Button>
        </div>
      </Dialog>
    </>
  );
}

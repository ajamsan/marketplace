"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { ApiError } from "@/lib/api/client";
import type { AdminStall } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import { StallStatusBadge } from "@/features/seller/stall-status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { Field, Select } from "@/components/ui/form";
import {
  activateStall,
  approveStall,
  deactivateStall,
  rejectStall,
  type AdminStallStatus,
} from "./api";

type StallAction = "approve" | "reject" | "deactivate" | "activate";

const ACTION_COPY: Record<
  StallAction,
  { title: string; description: string; confirm: string; question: string }
> = {
  approve: {
    title: "Setujui stan",
    description: "Stan akan tampil di katalog dan dapat menerima pesanan.",
    confirm: "Ya, setujui stan",
    question: "Setujui stan ini?",
  },
  reject: {
    title: "Tolak stan",
    description:
      "Stan tidak akan tampil di katalog. Seller tidak dapat mengubah status stan sendiri.",
    confirm: "Ya, tolak stan",
    question: "Tolak stan ini?",
  },
  deactivate: {
    title: "Nonaktifkan stan",
    description: "Stan akan disembunyikan dari katalog sampai diaktifkan kembali.",
    confirm: "Ya, nonaktifkan stan",
    question: "Nonaktifkan stan ini?",
  },
  activate: {
    title: "Aktifkan stan",
    description: "Stan akan tampil kembali di katalog.",
    confirm: "Ya, aktifkan stan",
    question: "Aktifkan stan ini?",
  },
};

export interface PendingStallsProps {
  stalls: AdminStall[];
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
  status: AdminStallStatus | "";
  onStatusChange: (status: AdminStallStatus | "") => void;
}

// Menampilkan stan untuk ditinjau admin dan mengonfirmasi tindakan statusnya.
export function PendingStalls({
  stalls,
  isLoading,
  error,
  onRetry,
  status,
  onStatusChange,
}: PendingStallsProps) {
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<{ stall: AdminStall; action: StallAction } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const mutation = useMutation({
    // Menjalankan transisi yang dipilih pada stan sasaran.
    mutationFn: ({ id, action }: { id: string; action: StallAction }) => {
      switch (action) {
        case "approve":
          return approveStall(id);
        case "reject":
          return rejectStall(id);
        case "deactivate":
          return deactivateStall(id);
        default:
          return activateStall(id);
      }
    },
    // Menutup dialog dan menyegarkan daftar setelah tindakan berhasil.
    onSuccess: () => {
      setTarget(null);
      setActionError(null);
      void queryClient.invalidateQueries({ queryKey: ["admin", "stalls"] });
    },
    // Menampilkan galat layanan agar admin mengetahui tindakan yang gagal.
    onError: (mutationError) => {
      setActionError(
        mutationError instanceof ApiError
          ? mutationError.message
          : "Tindakan gagal diproses. Coba lagi.",
      );
    },
  });

  // Menyiapkan sasaran tindakan dan mereset pesan dari percobaan sebelumnya.
  function openAction(stall: AdminStall, action: StallAction) {
    setActionError(null);
    mutation.reset();
    setTarget({ stall, action });
  }

  const copy = target ? ACTION_COPY[target.action] : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="max-w-xs">
        <Field label="Filter status" htmlFor="admin-stall-status">
          <Select
            id="admin-stall-status"
            value={status}
            onChange={(event) =>
              onStatusChange(event.target.value as AdminStallStatus | "")
            }
          >
            <option value="">Semua status</option>
            <option value="pending_review">Menunggu persetujuan admin</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </Select>
        </Field>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
          <span className="sr-only">Memuat daftar stan...</span>
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : stalls.length === 0 ? (
        <EmptyState
          title="Tidak ada stan pada filter ini"
          description="Ubah filter status untuk melihat stan lain."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {stalls.map((stall) => (
            <li key={stall.id}>
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{stall.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Pemilik: {stall.owner_username} ({stall.owner_email})
                    </p>
                  </div>
                  <StallStatusBadge status={stall.status} />
                </div>

                {stall.description ? (
                  <p className="mt-2 text-sm text-foreground">{stall.description}</p>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Deskripsi stan belum diisi.
                  </p>
                )}

                <dl className="mt-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-muted-foreground">Lokasi</dt>
                    <dd className="text-foreground">
                      {stall.location_label || "Tidak dicantumkan"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Dibuat</dt>
                    <dd className="text-foreground">{formatDateTime(stall.created_at)}</dd>
                  </div>
                </dl>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {stall.status === "pending_review" ? (
                    <>
                      <Button size="sm" onClick={() => openAction(stall, "approve")}>
                        Setujui
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => openAction(stall, "reject")}
                      >
                        Tolak
                      </Button>
                    </>
                  ) : stall.status === "active" ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openAction(stall, "deactivate")}
                    >
                      Nonaktifkan
                    </Button>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => openAction(stall, "activate")}>
                      Aktifkan
                    </Button>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={target !== null}
        title={copy?.title ?? ""}
        description={copy?.description}
        onClose={() => {
          if (!mutation.isPending) setTarget(null);
        }}
      >
        <p className="text-sm text-foreground">
          {copy?.question}{" "}
          <span className="font-semibold">{target?.stall.name}</span> (pemilik{" "}
          {target?.stall.owner_username})?
        </p>
        {actionError ? (
          <p role="alert" className="text-sm font-medium text-danger">
            {actionError}
          </p>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="secondary"
            disabled={mutation.isPending}
            onClick={() => setTarget(null)}
          >
            Batal
          </Button>
          <Button
            variant={target?.action === "reject" ? "danger" : "primary"}
            disabled={mutation.isPending}
            onClick={() => {
              if (target && !mutation.isPending) {
                mutation.mutate({ id: target.stall.id, action: target.action });
              }
            }}
          >
            {mutation.isPending ? "Memproses..." : (copy?.confirm ?? "Konfirmasi")}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

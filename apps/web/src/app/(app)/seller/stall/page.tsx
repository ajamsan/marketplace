"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { ApiError } from "@/lib/api/client";
import { formatDateTime } from "@/lib/format";
import { RequireRole } from "@/features/auth/guards";
import { listSellerStalls } from "@/features/seller/api";
import { StallForm } from "@/features/seller/stall-form";
import { StallStatusBadge } from "@/features/seller/stall-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";

// Membatasi pengelolaan stan kepada akun penjual.
export default function SellerStallPage() {
  return (
    <RequireRole roles={["seller"]}>
      <SellerStallView />
    </RequireRole>
  );
}

// Menyajikan stan penjual dan mengatur formulir buat atau ubah.
function SellerStallView() {
  const query = useQuery({ queryKey: ["seller", "stalls"], queryFn: listSellerStalls });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const stalls = query.data?.stalls ?? [];
  const errorMessage = query.error
    ? query.error instanceof ApiError
      ? query.error.message
      : "Daftar stan gagal dimuat."
    : null;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-lg font-bold text-foreground">Stan saya</h1>
        <p className="text-sm text-muted-foreground">
          Kelola profil stan Anda. Status stan ditentukan oleh admin.
        </p>
      </header>

      <Card>
        <CardHeader
          title="Daftar stan"
          description="Stan baru menunggu persetujuan admin sebelum tampil di katalog."
        />
        {query.isLoading ? (
          <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
            <span className="sr-only">Memuat daftar stan...</span>
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : errorMessage ? (
          <ErrorState message={errorMessage} onRetry={() => void query.refetch()} />
        ) : stalls.length === 0 ? (
          <EmptyState
            title="Belum ada stan"
            description="Ajukan stan pertama Anda di bawah ini."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {stalls.map((stall) => (
              <li key={stall.id} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{stall.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {stall.location_label || "Lokasi belum dicantumkan"}
                    </p>
                  </div>
                  <StallStatusBadge status={stall.status} />
                </div>

                {stall.description ? (
                  <p className="mt-2 text-sm text-foreground">{stall.description}</p>
                ) : null}

                <p className="mt-2 text-xs text-muted-foreground">
                  Dibuat: {formatDateTime(stall.created_at)}
                </p>

                {/* Tombol hanya tampil saat form tertutup; menutup form pakai tombol di dalam form itu sendiri. */}
                {editingId === stall.id ? null : (
                  <div className="mt-3">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setCreating(false);
                        setEditingId(stall.id);
                      }}
                      aria-expanded={false}
                    >
                      Ubah stan
                    </Button>
                  </div>
                )}

                {editingId === stall.id ? (
                  <div className="mt-3 border-t border-border pt-3">
                    <StallForm
                      key={stall.id}
                      stall={stall}
                      onSaved={() => setEditingId(null)}
                      onCancel={() => setEditingId(null)}
                    />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {stalls.length === 0 ? (
      <Card>
        <CardHeader
          title="Ajukan stan baru"
          description="Pengajuan stan baru berstatus menunggu persetujuan admin."
          action={
            <Button
              size="sm"
              variant={creating ? "secondary" : "primary"}
              onClick={() => {
                setEditingId(null);
                setCreating((current) => !current);
              }}
              aria-expanded={creating}
            >
              {creating ? "Tutup form" : "Tambah stan"}
            </Button>
          }
        />
        {creating ? (
          <StallForm
            key="new-stall"
            onSaved={() => setCreating(false)}
            onCancel={() => setCreating(false)}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Isi nama stan, deskripsi, dan label lokasi lalu kirim untuk persetujuan.
          </p>
        )}
      </Card>
      ) : null}
    </div>
  );
}

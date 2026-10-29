"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { authApi } from "@/features/auth/api";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ErrorState, Skeleton } from "@/components/ui/feedback";
import { Label } from "@/components/ui/form";

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg"];

function uploadErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 503) {
      return "Penyimpanan foto belum dikonfigurasi pada server ini.";
    }
    if (error.status === 413) {
      return `${error.message} Maksimal 2 MB per foto.`;
    }
    return error.message;
  }
  return "Terjadi kesalahan jaringan. Coba lagi sebentar.";
}

export function PhotoUpload() {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const profileQuery = useQuery({ queryKey: ["me"], queryFn: authApi.me });

  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const upload = useMutation({
    mutationFn: (value: File) => authApi.uploadProfilePhoto(value),
    onSuccess: (profile) => {
      queryClient.setQueryData(["me"], profile);
      setFormError(null);
      setStatus("Foto profil berhasil diperbarui.");
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    },
    onError: (error) => {
      setStatus(null);
      setFormError(uploadErrorMessage(error));
    },
  });

  const remove = useMutation({
    mutationFn: () => authApi.deleteProfilePhoto(),
    onSuccess: (profile) => {
      queryClient.setQueryData(["me"], profile);
      setFormError(null);
      setStatus("Foto profil dihapus.");
    },
    onError: (error) => {
      setStatus(null);
      setFormError(uploadErrorMessage(error));
    },
  });

  function handleSubmit() {
    setFormError(null);
    setStatus(null);
    if (!file) {
      setFormError("Pilih foto terlebih dahulu.");
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setFormError("Hanya file PNG atau JPG yang didukung.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setFormError("Ukuran foto maksimal 2 MB.");
      return;
    }
    upload.mutate(file);
  }

  if (profileQuery.isPending) {
    return (
      <Card>
        <CardHeader title="Foto profil" />
        <Skeleton className="h-24 w-24 rounded-full" />
      </Card>
    );
  }

  if (profileQuery.error || !profileQuery.data) {
    return (
      <Card>
        <CardHeader title="Foto profil" />
        <ErrorState
          message="Foto profil gagal dimuat."
          onRetry={() => void profileQuery.refetch()}
        />
      </Card>
    );
  }

  const profile = profileQuery.data;

  return (
    <Card>
      <CardHeader
        title="Foto profil"
        description="Gunakan foto yang jelas. Format PNG atau JPG, maksimal 2 MB."
      />
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          {profile.profile_image_url ? (
            <Image
              src={profile.profile_image_url}
              alt="Foto profil"
              width={96}
              height={96}
              unoptimized
              className="h-24 w-24 rounded-full border border-border object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full border border-dashed border-border bg-surface-muted text-xs text-muted-foreground">
              Belum ada foto
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="profile-photo">Pilih foto</Label>
          <input
            id="profile-photo"
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setFormError(null);
              setStatus(null);
            }}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground file:mr-3 file:rounded file:border-0 file:bg-surface-muted file:px-3 file:py-1.5 file:text-sm file:font-semibold"
          />
        </div>

        {formError ? (
          <p role="alert" className="rounded-lg border border-danger/40 bg-danger-soft p-3 text-sm text-foreground">
            {formError}
          </p>
        ) : null}

        <p aria-live="polite" className="text-sm text-muted-foreground">
          {status}
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={handleSubmit} disabled={upload.isPending}>
            {upload.isPending ? "Mengunggah..." : "Unggah foto"}
          </Button>
          {profile.profile_image_url ? (
            <Button
              type="button"
              variant="danger"
              onClick={() => remove.mutate()}
              disabled={remove.isPending}
            >
              {remove.isPending ? "Menghapus..." : "Hapus foto"}
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

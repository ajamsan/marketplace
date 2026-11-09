"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { Camera, ImageIcon } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { authApi } from "@/features/auth/api";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ErrorState, Skeleton } from "@/components/ui/feedback";

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg"];

// Memetakan galat unggah ke petunjuk yang dapat ditindaklanjuti pengguna.
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

// Mengelola pemilihan, pengunggahan, dan penghapusan foto profil.
export function PhotoUpload() {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);
  const profileQuery = useQuery({ queryKey: ["me"], queryFn: authApi.me });

  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Mencabut URL objek lama sebelum mengganti pratinjau agar memori dapat dilepas.
  function replacePreview(next: string | null) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = next;
    setPreviewUrl(next);
  }

  // Mencabut URL objek terakhir saat komponen dibongkar.
  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  const upload = useMutation({
    // Mengirim berkas pilihan ke endpoint foto profil.
    mutationFn: (value: File) => authApi.uploadProfilePhoto(value),
    // Memperbarui cache profil dan membersihkan pilihan setelah unggahan berhasil.
    onSuccess: (profile) => {
      queryClient.setQueryData(["me"], profile);
      setFormError(null);
      setStatus("Foto profil berhasil diperbarui.");
      replacePreview(null);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    },
    // Mengubah kegagalan server menjadi pesan formulir yang ringkas.
    onError: (error) => {
      setStatus(null);
      setFormError(uploadErrorMessage(error));
    },
  });

  const remove = useMutation({
    // Menghapus foto aktif dari profil melalui layanan autentikasi.
    mutationFn: () => authApi.deleteProfilePhoto(),
    // Menyelaraskan profil lokal setelah foto dihapus.
    onSuccess: (profile) => {
      queryClient.setQueryData(["me"], profile);
      setFormError(null);
      setStatus("Foto profil dihapus.");
    },
    // Mempertahankan profil dan menampilkan alasan bila penghapusan gagal.
    onError: (error) => {
      setStatus(null);
      setFormError(uploadErrorMessage(error));
    },
  });

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setFormError(null);
    setStatus(null);
    replacePreview(selected ? URL.createObjectURL(selected) : null);
  }

  function clearSelection() {
    replacePreview(null);
    setFile(null);
    setFormError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  // Memastikan berkas sesuai batas sebelum memulai unggahan.
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
        <div className="flex justify-center">
          <Skeleton className="h-44 w-44 rounded-2xl" />
        </div>
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
  const shownImage = previewUrl ?? profile.profile_image_url;
  const hasSavedPhoto = Boolean(profile.profile_image_url);

  return (
    <Card>
      <CardHeader
        title="Foto profil"
        description="Ketuk kotak foto untuk memilih berkas. Format PNG atau JPG, maksimal 2 MB."
      />

      <div className="flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-label={shownImage ? "Ganti foto profil" : "Pilih foto profil"}
          className="group relative h-44 w-44 overflow-hidden rounded-2xl border-2 border-dashed border-border bg-surface-muted transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {shownImage ? (
            <Image
              src={shownImage}
              alt="Foto profil"
              width={176}
              height={176}
              unoptimized
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full flex-col items-center justify-center gap-2 text-center">
              <ImageIcon className="h-9 w-9 text-muted-foreground/60" aria-hidden="true" />
              <span className="px-4 text-xs font-semibold leading-snug text-foreground">
                Belum ada foto
              </span>
              <span className="px-4 text-[11px] leading-snug text-muted-foreground">
                Ketuk untuk memilih
              </span>
            </span>
          )}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/45 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
          >
            <Camera className="h-6 w-6 text-white" />
            <span className="text-xs font-semibold text-white">
              {shownImage ? "Ganti foto" : "Pilih foto"}
            </span>
          </span>
        </button>

        <input
          id="profile-photo"
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg"
          onChange={handleFileChange}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />

        <p className="max-w-64 truncate text-center text-xs text-muted-foreground" title={file?.name}>
          {file ? `Dipilih: ${file.name}` : "PNG atau JPG, maks. 2 MB"}
        </p>

        <div className="flex items-center justify-center gap-2">
          {file ? (
            <Button variant="ghost" size="md" onClick={clearSelection} disabled={upload.isPending}>
              Batal
            </Button>
          ) : null}
          <Button onClick={handleSubmit} disabled={!file || upload.isPending}>
            {upload.isPending ? "Mengunggah..." : "Unggah foto"}
          </Button>
          {hasSavedPhoto && !file ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => remove.mutate()}
              disabled={remove.isPending}
              className="text-danger hover:bg-danger-soft"
            >
              {remove.isPending ? "Menghapus..." : "Hapus foto"}
            </Button>
          ) : null}
        </div>
      </div>

      {formError ? (
        <p role="alert" className="mt-4 rounded-lg border border-danger/40 bg-danger-soft p-3 text-sm text-foreground">
          {formError}
        </p>
      ) : null}

      <p aria-live="polite" className="mt-3 text-center text-sm text-muted-foreground">
        {status}
      </p>
    </Card>
  );
}

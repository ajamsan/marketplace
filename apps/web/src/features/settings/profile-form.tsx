"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { authApi } from "@/features/auth/api";
import { useAuthStore } from "@/features/auth/auth-store";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ErrorState, Skeleton } from "@/components/ui/feedback";
import { Field, Input, Label } from "@/components/ui/form";

const ROLE_LABEL: Record<string, string> = {
  buyer: "Buyer (pembeli)",
  seller: "Seller (pedagang)",
  admin: "Admin",
};

export function ProfileForm() {
  const queryClient = useQueryClient();
  const profileQuery = useQuery({ queryKey: ["me"], queryFn: authApi.me });

  const [draft, setDraft] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (value: string) => authApi.updateMe({ username: value }),
    onSuccess: (profile) => {
      queryClient.setQueryData(["me"], profile);
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        useAuthStore
          .getState()
          .setUser({ ...currentUser, username: profile.username });
      }
      setDraft(null);
      setUsernameError(null);
      setFormError(null);
      setStatus("Profil berhasil diperbarui.");
    },
    onError: (error) => {
      setStatus(null);
      if (error instanceof ApiError) {
        if (error.fields?.username) {
          setUsernameError(error.fields.username);
          return;
        }
        if (error.status === 409) {
          setUsernameError(error.message);
          return;
        }
        setFormError(error.message);
        return;
      }
      setFormError("Terjadi kesalahan jaringan. Coba lagi sebentar.");
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setStatus(null);
    setUsernameError(null);

    const value = (draft ?? profileQuery.data?.username ?? "").trim();
    if (value.length < 3 || value.length > 30) {
      setUsernameError("Username 3-30 karakter.");
      return;
    }
    mutation.mutate(value);
  }

  if (profileQuery.isPending) {
    return (
      <Card>
        <CardHeader title="Profil" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-32" />
        </div>
      </Card>
    );
  }

  if (profileQuery.error || !profileQuery.data) {
    return (
      <Card>
        <CardHeader title="Profil" />
        <ErrorState
          message="Profil gagal dimuat."
          onRetry={() => void profileQuery.refetch()}
        />
      </Card>
    );
  }

  const profile = profileQuery.data;

  return (
    <Card>
      <CardHeader title="Profil" description="Data yang dipakai untuk identifikasi akunmu." />
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Field label="Username" htmlFor="profile-username" error={usernameError ?? undefined}>
          <Input
            id="profile-username"
            name="username"
            value={draft ?? profile.username}
            onChange={(event) => {
              setDraft(event.target.value.toLowerCase());
              setUsernameError(null);
            }}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={30}
            aria-invalid={usernameError ? true : undefined}
            aria-describedby={usernameError ? "profile-username-error" : undefined}
          />
        </Field>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="profile-email">Email</Label>
          <Input id="profile-email" value={profile.email} readOnly aria-readonly="true" />
          <p className="text-xs text-muted-foreground">
            Email belum dapat diubah pada versi ini.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="profile-role">Peran</Label>
          <Input
            id="profile-role"
            value={ROLE_LABEL[profile.role] ?? profile.role}
            readOnly
            aria-readonly="true"
          />
          <p className="text-xs text-muted-foreground">
            Peran akun tidak dapat diubah setelah pendaftaran.
          </p>
        </div>

        {formError ? (
          <p role="alert" className="rounded-lg border border-danger/40 bg-danger-soft p-3 text-sm text-foreground">
            {formError}
          </p>
        ) : null}

        <p aria-live="polite" className="text-sm text-muted-foreground">
          {status}
        </p>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Menyimpan..." : "Simpan perubahan"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setDraft(null);
              setUsernameError(null);
            }}
            disabled={mutation.isPending}
          >
            Batalkan
          </Button>
        </div>
      </form>
    </Card>
  );
}

"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { RevokeSessionButton } from "./revoke-session-button";
import { authApi } from "@/features/auth/api";
import { formatDateTime } from "@/lib/format";
import { Badge, Card, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";

// Menampilkan sesi akun dengan kondisi muat, gagal, kosong, dan aksi pencabutan.
export function SessionsList() {
  const queryClient = useQueryClient();
  const sessionsQuery = useQuery({
    queryKey: ["sessions"],
    // Mengambil daftar sesi dari respons API untuk query cache.
    queryFn: async () => (await authApi.sessions()).sessions,
  });

  // Meminta ulang daftar setelah sebuah sesi berhasil dicabut.
  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["sessions"] });
  }

  return (
    <Card>
      <CardHeader
        title="Sesi aktif"
        description="Daftar perangkat yang sedang masuk ke akunmu."
      />

      {sessionsQuery.isPending ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : null}

      {sessionsQuery.error ? (
        <ErrorState
          message="Daftar sesi gagal dimuat."
          onRetry={() => void sessionsQuery.refetch()}
        />
      ) : null}

      {sessionsQuery.data && sessionsQuery.data.length === 0 ? (
        <EmptyState
          title="Belum ada sesi"
          description="Sesi yang masuk ke akunmu akan muncul di sini."
        />
      ) : null}

      {sessionsQuery.data && sessionsQuery.data.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {sessionsQuery.data.map((session) => (
            <li
              key={session.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-surface-muted p-3"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{session.label}</p>
                  {session.is_current ? <Badge tone="accent">Sesi ini</Badge> : null}
                </div>
                <p className="text-xs text-muted-foreground">{session.platform}</p>
                <p className="text-xs text-muted-foreground">IP: {session.ip_masked}</p>
                <p className="text-xs text-muted-foreground">
                  Masuk: {formatDateTime(session.created_at)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Terakhir aktif: {formatDateTime(session.last_seen_at)}
                </p>
              </div>
              {session.is_current ? null : (
                <RevokeSessionButton
                  sessionId={session.id}
                  sessionLabel={session.label}
                  onRevoked={refresh}
                />
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

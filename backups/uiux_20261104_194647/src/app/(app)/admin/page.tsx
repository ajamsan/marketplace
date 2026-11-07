"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { ApiError } from "@/lib/api/client";
import { RequireRole } from "@/features/auth/guards";
import { listAdminStalls, type AdminStallStatus } from "@/features/admin/api";
import { PendingStalls } from "@/features/admin/pending-stalls";

// Membatasi halaman administrasi untuk peran admin.
export default function AdminPage() {
  return (
    <RequireRole roles={["admin"]}>
      <AdminStallsView />
    </RequireRole>
  );
}

// Memuat dan memfilter stan yang menunggu keputusan administrasi.
function AdminStallsView() {
  const [status, setStatus] = useState<AdminStallStatus | "">("");

  const query = useQuery({
    queryKey: ["admin", "stalls", status || "all"],
    // Menyesuaikan daftar stan dengan filter status terkini.
    queryFn: () => listAdminStalls(status),
  });

  const stalls = query.data?.stalls ?? [];
  const errorMessage = query.error
    ? query.error instanceof ApiError
      ? query.error.message
      : "Daftar stan gagal dimuat."
    : null;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-lg font-bold text-foreground">Persetujuan stan</h1>
        <p className="text-sm text-muted-foreground">
          Tinjau pengajuan stan baru dan atur status stan yang dikelola kampus.
        </p>
      </header>

      <PendingStalls
        stalls={stalls}
        isLoading={query.isLoading}
        error={errorMessage}
        onRetry={() => void query.refetch()}
        status={status}
        onStatusChange={setStatus}
      />
    </div>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ClipboardCheck, History } from "lucide-react";

import { ApiError } from "@/lib/api/client";
import { RequireRole } from "@/features/auth/guards";
import { listAdminStalls, type AdminStallStatus } from "@/features/admin/api";
import { PendingStalls } from "@/features/admin/pending-stalls";
import { AdminOrdersHistory } from "@/features/admin/admin-orders";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "antrian", label: "Riwayat antrian", icon: History, description: "Semua pesanan stan" },
  { id: "persetujuan", label: "Persetujuan stan", icon: ClipboardCheck, description: "Tinjau pengajuan" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// Membatasi halaman administrasi untuk peran admin.
export default function AdminPage() {
  const [active, setActive] = useState<TabId>("antrian");

  return (
    <RequireRole roles={["admin"]}>
      <div className="flex flex-col gap-4">
        <header className="flex flex-col gap-1">
          <h1 className="text-lg font-bold text-foreground">Ruang admin</h1>
          <p className="text-sm text-muted-foreground">
            Laporan antrian seluruh stan dan persetujuan stan yang diajukan.
          </p>
        </header>

        <div
          role="tablist"
          aria-label="Bagian admin"
          className="grid grid-cols-1 gap-2 sm:grid-cols-2"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const selected = active === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`admin-tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`admin-panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(tab.id)}
                className={cn(
                  "flex min-h-11 flex-col items-start gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  selected
                    ? "border-accent bg-accent-soft text-foreground"
                    : "border-border bg-surface text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                )}
              >
                <span className="flex items-center gap-2">
                  <Icon
                    className={cn("h-4 w-4", selected ? "text-accent" : "text-muted-foreground")}
                    aria-hidden="true"
                  />
                  <span className="text-sm font-semibold">{tab.label}</span>
                </span>
                <span className="pl-6 text-[11px] leading-snug text-muted-foreground">
                  {tab.description}
                </span>
              </button>
            );
          })}
        </div>

        <div
          role="tabpanel"
          id={`admin-panel-${active}`}
          aria-labelledby={`admin-tab-${active}`}
          tabIndex={0}
          className="rounded-lg focus-visible:outline-none"
        >
          {active === "antrian" ? <AdminOrdersHistory /> : <AdminStallsView />}
        </div>
      </div>
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
    <PendingStalls
      stalls={stalls}
      isLoading={query.isLoading}
      error={errorMessage}
      onRetry={() => void query.refetch()}
      status={status}
      onStatusChange={setStatus}
    />
  );
}

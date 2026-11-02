import { api } from "@/lib/api/client";
import type { AdminStall, Stall } from "@/lib/api/types";

export type AdminStallStatus = "pending_review" | "active" | "inactive";

export interface AdminStallList {
  stalls: AdminStall[];
}

// Mengamankan identitas stan agar aman ditempatkan pada segmen URL.
function pathId(id: string): string {
  return encodeURIComponent(id);
}

// Memuat daftar stan administrasi dan membatasi hasil berdasarkan status bila dipilih.
export async function listAdminStalls(status?: AdminStallStatus | ""): Promise<AdminStallList> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const data = await api.get<{ stalls?: AdminStall[] | null }>(`/admin/stalls${query}`);
  return { stalls: data?.stalls ?? [] };
}

// Menyetujui stan yang telah melewati pemeriksaan administrasi.
export function approveStall(id: string): Promise<Stall> {
  return api.post<Stall>(`/admin/stalls/${pathId(id)}/approve`, undefined);
}

// Menolak stan yang tidak memenuhi persyaratan peninjauan.
export function rejectStall(id: string): Promise<Stall> {
  return api.post<Stall>(`/admin/stalls/${pathId(id)}/reject`, undefined);
}

// Menonaktifkan stan yang sebelumnya dapat diakses.
export function deactivateStall(id: string): Promise<Stall> {
  return api.post<Stall>(`/admin/stalls/${pathId(id)}/deactivate`, undefined);
}

// Mengaktifkan kembali stan yang telah dinonaktifkan.
export function activateStall(id: string): Promise<Stall> {
  return api.post<Stall>(`/admin/stalls/${pathId(id)}/activate`, undefined);
}

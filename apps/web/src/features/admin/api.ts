import { api } from "@/lib/api/client";
import type { AdminStall, Stall } from "@/lib/api/types";

export type AdminStallStatus = "pending_review" | "active" | "inactive";

export interface AdminStallList {
  stalls: AdminStall[];
}

function pathId(id: string): string {
  return encodeURIComponent(id);
}

export async function listAdminStalls(status?: AdminStallStatus | ""): Promise<AdminStallList> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const data = await api.get<{ stalls?: AdminStall[] | null }>(`/admin/stalls${query}`);
  return { stalls: data?.stalls ?? [] };
}

export function approveStall(id: string): Promise<Stall> {
  return api.post<Stall>(`/admin/stalls/${pathId(id)}/approve`, undefined);
}

export function rejectStall(id: string): Promise<Stall> {
  return api.post<Stall>(`/admin/stalls/${pathId(id)}/reject`, undefined);
}

export function deactivateStall(id: string): Promise<Stall> {
  return api.post<Stall>(`/admin/stalls/${pathId(id)}/deactivate`, undefined);
}

export function activateStall(id: string): Promise<Stall> {
  return api.post<Stall>(`/admin/stalls/${pathId(id)}/activate`, undefined);
}

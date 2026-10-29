import { api } from "@/lib/api/client";
import type { Product, ProductPage, Stall } from "@/lib/api/types";

export interface ProductListParams {
  stall_id?: string;
  q?: string;
  cursor?: string;
  limit?: number;
}

function normalizeCursor(cursor: string | null | undefined): string | null {
  const trimmed = cursor?.trim();
  return trimmed ? trimmed : null;
}

export async function listProducts(params: ProductListParams = {}): Promise<ProductPage> {
  const search = new URLSearchParams();
  if (params.stall_id) search.set("stall_id", params.stall_id);
  if (params.q) search.set("q", params.q);
  if (params.cursor) search.set("cursor", params.cursor);
  if (params.limit) search.set("limit", String(params.limit));

  const query = search.toString();
  const page = await api.get<{
    items?: Product[] | null;
    next_cursor?: string | null;
  } | null>(`/products${query ? `?${query}` : ""}`);

  return {
    items: page?.items ?? [],
    next_cursor: normalizeCursor(page?.next_cursor),
  };
}

export async function listStalls(): Promise<Stall[]> {
  const response = await api.get<{ stalls?: Stall[] | null } | null>("/stalls");
  return response?.stalls ?? [];
}

export async function getProduct(id: string): Promise<Product> {
  return api.get<Product>(`/products/${encodeURIComponent(id)}`);
}

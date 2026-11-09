import { api } from "@/lib/api/client";
import type { OrderDetail, OrderPage, OrderPreview, OrderSummary } from "@/lib/api/types";

export interface OrderItemInput {
  product_id: string;
  quantity: number;
}

// Menyeragamkan cursor kosong sebelum dipakai pada paginasi pesanan.
function normalizeCursor(cursor: string | null | undefined): string | null {
  const trimmed = cursor?.trim();
  return trimmed ? trimmed : null;
}

// Menghitung ringkasan harga dan ketersediaan sebelum pesanan dibuat.
export async function previewOrder(items: OrderItemInput[]): Promise<OrderPreview> {
  return api.post<OrderPreview>("/orders/preview", { items });
}

// Membuat pesanan dengan kunci idempotensi agar pengiriman ulang tidak menggandakan transaksi.
export async function createOrder(
  items: OrderItemInput[],
  paymentMethod: string,
  idempotencyKey: string,
): Promise<OrderDetail> {
  return api.post<OrderDetail>(
    "/orders",
    { payment_method: paymentMethod, items },
    { headers: { "Idempotency-Key": idempotencyKey } },
  );
}

// Memuat pesanan pembeli berikut cursor untuk permintaan halaman berikutnya.
export async function listOrders(params?: { cursor?: string; q?: string; status?: string }): Promise<OrderPage> {
  const searchParams = new URLSearchParams();
  if (params?.cursor) searchParams.set("cursor", params.cursor);
  if (params?.q) searchParams.set("q", params.q);
  if (params?.status) searchParams.set("status", params.status);
  const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const page = await api.get<{
    orders?: OrderSummary[] | null;
    next_cursor?: string | null;
  } | null>(`/orders${query}`);

  return {
    orders: page?.orders ?? [],
    next_cursor: normalizeCursor(page?.next_cursor),
  };
}

// Mengambil rincian satu pesanan untuk ditampilkan kepada pembeli.
export async function getOrder(id: string): Promise<OrderDetail> {
  return api.get<OrderDetail>(`/orders/${encodeURIComponent(id)}`);
}

import { api } from "@/lib/api/client";
import type { OrderDetail, OrderPage, OrderPreview, OrderSummary } from "@/lib/api/types";

export interface OrderItemInput {
  product_id: string;
  quantity: number;
}

function normalizeCursor(cursor: string | null | undefined): string | null {
  const trimmed = cursor?.trim();
  return trimmed ? trimmed : null;
}

export async function previewOrder(items: OrderItemInput[]): Promise<OrderPreview> {
  return api.post<OrderPreview>("/orders/preview", { items });
}

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

export async function listOrders(cursor?: string): Promise<OrderPage> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  const page = await api.get<{
    orders?: OrderSummary[] | null;
    next_cursor?: string | null;
  } | null>(`/orders${query}`);

  return {
    orders: page?.orders ?? [],
    next_cursor: normalizeCursor(page?.next_cursor),
  };
}

export async function getOrder(id: string): Promise<OrderDetail> {
  return api.get<OrderDetail>(`/orders/${encodeURIComponent(id)}`);
}

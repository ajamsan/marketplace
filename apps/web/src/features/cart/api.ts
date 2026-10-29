import { api } from "@/lib/api/client";
import type { Cart } from "@/lib/api/types";

function emptyCart(): Cart {
  return { items: [], subtotal_minor: 0, currency: "IDR" };
}

export async function getCart(): Promise<Cart> {
  const cart = await api.get<Cart | null>("/cart");
  return cart ?? emptyCart();
}

export async function setQuantity(productId: string, quantity: number): Promise<Cart> {
  const cart = await api.put<Cart | null>(
    `/cart/items/${encodeURIComponent(productId)}`,
    { quantity },
  );
  return cart ?? emptyCart();
}

export async function removeItem(productId: string): Promise<Cart> {
  const cart = await api.delete<Cart | null>(
    `/cart/items/${encodeURIComponent(productId)}`,
  );
  return cart ?? emptyCart();
}

import { api } from "@/lib/api/client";
import type { Cart } from "@/lib/api/types";

// Menyediakan bentuk dasar keranjang saat belum ada data dari server.
function emptyCart(): Cart {
  return { items: [], subtotal_minor: 0, currency: "IDR" };
}

// Menormalkan respons kosong agar komponen selalu menerima bentuk keranjang yang sama.
export async function getCart(): Promise<Cart> {
  const cart = await api.get<Cart | null>("/cart");
  return cart ?? emptyCart();
}

// Menyimpan jumlah baru dan menyediakan keranjang kosong bila server belum membuatnya.
export async function setQuantity(productId: string, quantity: number): Promise<Cart> {
  const cart = await api.put<Cart | null>(
    `/cart/items/${encodeURIComponent(productId)}`,
    { quantity },
  );
  return cart ?? emptyCart();
}

// Menghapus produk dari keranjang lalu menjaga bentuk respons tetap konsisten.
export async function removeItem(productId: string): Promise<Cart> {
  const cart = await api.delete<Cart | null>(
    `/cart/items/${encodeURIComponent(productId)}`,
  );
  return cart ?? emptyCart();
}

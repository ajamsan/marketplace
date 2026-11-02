"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getCart, removeItem, setQuantity } from "./api";

export const CART_QUERY_KEY = ["cart"] as const;
export const PRODUCTS_QUERY_KEY = ["products"] as const;
export const ORDERS_QUERY_KEY = ["orders"] as const;

// Menyediakan isi keranjang melalui cache query yang dapat dinonaktifkan per halaman.
export function useCart(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: CART_QUERY_KEY,
    queryFn: getCart,
    enabled: options?.enabled ?? true,
  });
}

// Mengubah jumlah item dan menyelaraskan cache keranjang setelah respons berhasil.
export function useSetCartQuantity() {
  const queryClient = useQueryClient();

  return useMutation({
    // Mengirim perubahan jumlah ke layanan keranjang.
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      setQuantity(productId, quantity),
    // Memperbarui tampilan lokal dan mengambil ulang data agar cache tetap konsisten.
    onSuccess: (cart) => {
      queryClient.setQueryData(CART_QUERY_KEY, cart);
      void queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
    },
  });
}

// Menyediakan aksi hapus item serta memperbarui cache keranjang setelahnya.
export function useRemoveCartItem() {
  const queryClient = useQueryClient();

  return useMutation({
    // Mengirim identitas produk yang akan dikeluarkan dari keranjang.
    mutationFn: (productId: string) => removeItem(productId),
    // Menyegarkan isi keranjang setelah penghapusan berhasil.
    onSuccess: (cart) => {
      queryClient.setQueryData(CART_QUERY_KEY, cart);
      void queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
    },
  });
}

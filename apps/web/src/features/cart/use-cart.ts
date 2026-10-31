"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getCart, removeItem, setQuantity } from "./api";

export const CART_QUERY_KEY = ["cart"] as const;
export const PRODUCTS_QUERY_KEY = ["products"] as const;
export const ORDERS_QUERY_KEY = ["orders"] as const;

export function useCart(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: CART_QUERY_KEY,
    queryFn: getCart,
    enabled: options?.enabled ?? true,
  });
}

export function useSetCartQuantity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      setQuantity(productId, quantity),
    onSuccess: (cart) => {
      queryClient.setQueryData(CART_QUERY_KEY, cart);
      void queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
    },
  });
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => removeItem(productId),
    onSuccess: (cart) => {
      queryClient.setQueryData(CART_QUERY_KEY, cart);
      void queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
    },
  });
}

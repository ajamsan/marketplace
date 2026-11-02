import type { Role } from "@/lib/api/types";

export interface NavItem {
  href: string;
  label: string;
  icon: "catalog" | "cart" | "orders" | "settings" | "stall" | "products" | "admin";
}

export const NAV_ITEMS: Record<Role, NavItem[]> = {
  buyer: [
    { href: "/catalog", label: "Katalog", icon: "catalog" },
    { href: "/cart", label: "Keranjang", icon: "cart" },
    { href: "/orders", label: "Pesanan", icon: "orders" },
    { href: "/settings", label: "Pengaturan", icon: "settings" },
  ],
  seller: [
    { href: "/seller/orders", label: "Pesanan stan", icon: "orders" },
    { href: "/seller/stall", label: "Stan saya", icon: "stall" },
    { href: "/seller/products", label: "Produk", icon: "products" },
    { href: "/settings", label: "Pengaturan", icon: "settings" },
  ],
  admin: [
    { href: "/admin", label: "Persetujuan stan", icon: "admin" },
    { href: "/settings", label: "Pengaturan", icon: "settings" },
  ],
};

// Mengembalikan navigasi yang sesuai peran dan daftar kosong untuk sesi anonim.
export function navItemsForRole(role: Role | null | undefined): NavItem[] {
  if (!role) return [];
  return NAV_ITEMS[role] ?? [];
}

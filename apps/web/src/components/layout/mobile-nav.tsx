"use client";

import {
  LayoutGrid,
  ShoppingCart,
  ReceiptText,
  Settings,
  Store,
  Package,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { navItemsForRole } from "./nav-items";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/api/types";

const icons: Record<string, LucideIcon> = {
  catalog: LayoutGrid,
  cart: ShoppingCart,
  orders: ReceiptText,
  settings: Settings,
  stall: Store,
  products: Package,
  admin: ShieldCheck,
};

/** Navigasi ringkas untuk layar kecil; tetap dapat diakses keyboard (DASH-04). */
export function MobileNav({ role }: { role: Role | null | undefined }) {
  const pathname = usePathname();
  const items = navItemsForRole(role);

  return (
    <nav
      aria-label="Navigasi utama"
      className="flex gap-2 overflow-x-auto border-b border-border bg-surface px-3 py-2 md:hidden"
    >
      {items.map((item) => {
        const Icon = icons[item.icon] ?? LayoutGrid;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium",
              active
                ? "border-accent bg-accent-soft text-foreground"
                : "border-border text-muted-foreground",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

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

/** Navigasi ringkas untuk layar kecil dengan estetika kurasi atelier; tetap dapat diakses keyboard. */
export function MobileNav({ role }: { role: Role | null | undefined }) {
  const pathname = usePathname();
  const items = navItemsForRole(role);

  return (
    <nav
      aria-label="Navigasi seluler"
      className="flex gap-2 overflow-x-auto border-b border-border/80 bg-surface/95 px-3 py-2.5 backdrop-blur-md md:hidden"
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
              "flex shrink-0 items-center gap-2 rounded-sm border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all",
              active
                ? "border-foreground bg-foreground text-background shadow-2xs"
                : "border-border bg-surface text-muted-foreground hover:bg-surface-muted hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

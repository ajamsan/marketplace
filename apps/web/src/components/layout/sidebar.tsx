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

// Menyajikan tautan navigasi peran pada area samping layar lebar.
export function Sidebar({ role }: { role: Role | null | undefined }) {
  const pathname = usePathname();
  const items = navItemsForRole(role);

  return (
    <aside
      aria-label="Navigasi utama"
      className="hidden h-screen w-60 shrink-0 sticky top-0 overflow-y-auto border-r border-border bg-surface md:block"
    >
      <div className="flex h-16 items-center px-5">
        <span className="text-base font-bold text-foreground">Kantin Kampus</span>
      </div>
      <nav className="flex flex-col gap-1 px-3 py-2">
        {items.map((item) => {
          const Icon = icons[item.icon] ?? LayoutGrid;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-accent-soft text-foreground"
                  : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

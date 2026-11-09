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
      className="hidden h-screen w-64 shrink-0 sticky top-0 overflow-y-auto border-r border-border/80 bg-surface md:flex md:flex-col justify-between"
    >
      <div>
        {/* Brand header */}
        <div className="flex flex-col justify-center border-b border-border/80 px-6 h-16">
          <Link
            href="/"
            className="group flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
            aria-label="Kembali ke beranda Kantin Kampus"
          >
            <span className="font-serif text-base font-semibold text-foreground transition-colors group-hover:text-accent">
              Kantin Kampus
            </span>
            <span className="text-[11px] text-muted-foreground">
              Marketplace stan kampus
            </span>
          </Link>
        </div>

        {/* Navigation list */}
        <nav className="flex flex-col gap-1.5 px-3 py-4" aria-label="Menu Aplikasi">
          {items.map((item) => {
            const Icon = icons[item.icon] ?? LayoutGrid;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-sm px-4 text-xs font-semibold uppercase tracking-wider transition-all",
                  active
                    ? "bg-foreground text-background shadow-xs"
                    : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer role mark */}
      <div className="border-t border-border/80 p-4">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>Peran Aktif</span>
          <span className="font-semibold text-foreground">{role || "Tamu"}</span>
        </div>
      </div>
    </aside>
  );
}

"use client";

import { Clock, ShieldCheck, UtensilsCrossed } from "lucide-react";

const VALUES = [
  {
    icon: UtensilsCrossed,
    title: "Bahan Segar, Tanpa Gimmick",
    description:
      "Bahan baku dipilih segar setiap hari. Kami tidak memakai bahan pengawet atau pewarna yang tidak perlu.",
  },
  {
    icon: ShieldCheck,
    title: "Stan Terpercaya",
    description:
      "Setiap stan melewati seleksi kebersihan dan kualitas. Anda tahu dari mana makanan Anda berasal.",
  },
  {
    icon: Clock,
    title: "Hemat Waktu",
    description:
      "Pesan dari HP, lalu ambil di kasir. Tidak perlu mengantre saat istirahat.",
  },
];

export function BrandValuesSection() {
  return (
    <section id="nilai" className="border-b border-border bg-surface-muted/20 py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
            Kenapa Kami
          </span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Alasan memilih Kantin Kampus
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Tiga hal yang selalu kami jaga di setiap stan.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {VALUES.map((value) => {
            const Icon = value.icon;
            return (
              <div
                key={value.title}
                className="rounded-xl border border-border bg-surface p-6 text-center"
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">
                  {value.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {value.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

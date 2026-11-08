"use client";

import Link from "next/link";

interface HeroSectionProps {
  onOpenMembership?: () => void;
}

export function HeroSection({ onOpenMembership }: HeroSectionProps = {}) {
  return (
    <section className="relative overflow-hidden border-b border-border bg-background pt-10 pb-16 md:pt-16 md:pb-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="flex flex-col items-start lg:col-span-7">
            <span className="inline-flex items-center rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              Kantin kampus, sekarang lebih mudah
            </span>

            <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
              Pesan makanan kantin favoritmu, tanpa antre.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Lihat menu semua stan, pesan dari HP, lalu bayar tunai di kasir.
              Cepat, jelas, dan harganya transparan.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/catalog"
                className="inline-flex items-center justify-center rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-sm hover:bg-accent/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Lihat Menu
              </Link>
              <button
                type="button"
                onClick={onOpenMembership}
                className="inline-flex items-center justify-center rounded-lg border border-border bg-surface px-6 py-3 text-sm font-semibold text-foreground hover:bg-surface-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Jadi Member
              </button>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-4 w-full max-w-md">
              <div>
                <div className="text-xl font-bold text-foreground sm:text-2xl">100%</div>
                <div className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                  Bahan segar
                </div>
              </div>
              <div>
                <div className="text-xl font-bold text-foreground sm:text-2xl">20+</div>
                <div className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                  Stan kampus
                </div>
              </div>
              <div>
                <div className="text-xl font-bold text-foreground sm:text-2xl">Tunai</div>
                <div className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                  Bayar di kasir
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1200&auto=format&fit=crop"
                alt="Sajian makanan kantin"
                width={1200}
                height={900}
                fetchPriority="high"
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

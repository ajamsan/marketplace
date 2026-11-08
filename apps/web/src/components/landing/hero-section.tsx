"use client";

interface HeroSectionProps {
  onOpenMembership: () => void;
}

export function HeroSection({ onOpenMembership }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden border-b border-border bg-background pt-12 pb-20 md:pt-20 md:pb-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
          {/* Narrative introduction */}
          <div className="flex flex-col items-start lg:col-span-7">
            <div className="text-xs uppercase tracking-[0.3em] font-medium text-muted-foreground">
              Edisi Kurasi Koleksi Kuliner Kampus
            </div>

            <h1 className="mt-4 font-serif text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:leading-[1.12]">
              Kurasi Gastronomi Kampus Tanpa Kompromi.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg font-normal">
              Menghadirkan harmoni rasa dari dapur artisan pilihan civitas kampus. 
              Setiap sajian diracik dengan integritas bahan segar lokal, teknik presisi koki terkemuka, 
              dan pengalaman bersantap yang mengangkat mutu santap harian menjadi kenikmatan sejati.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href="#koleksi"
                className="inline-flex items-center justify-center rounded-sm bg-foreground px-6 py-3.5 text-xs font-semibold uppercase tracking-widest text-background shadow-xs hover:bg-foreground/85 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Jelajahi Koleksi
              </a>

              <button
                type="button"
                onClick={onOpenMembership}
                className="inline-flex items-center justify-center rounded-sm border border-border bg-surface px-6 py-3.5 text-xs font-semibold uppercase tracking-widest text-foreground hover:bg-surface-muted transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Akses Keanggotaan PrivAc
              </button>
            </div>

            {/* Provenance markers */}
            <div className="mt-12 grid grid-cols-3 gap-6 border-t border-border/80 pt-6 text-left w-full max-w-lg">
              <div>
                <div className="font-serif text-xl font-bold text-foreground sm:text-2xl">
                  100%
                </div>
                <div className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                  Bahan Segar Terpilih
                </div>
              </div>
              <div>
                <div className="font-serif text-xl font-bold text-foreground sm:text-2xl">
                  Artisan
                </div>
                <div className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                  Koki & Stan Terkurasi
                </div>
              </div>
              <div>
                <div className="font-serif text-xl font-bold text-foreground sm:text-2xl">
                  PrivAc
                </div>
                <div className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                  Layanan Meja Prioritas
                </div>
              </div>
            </div>
          </div>

          {/* Visual Showcase Portrait */}
          <div className="lg:col-span-5">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              <div className="overflow-hidden rounded-md border border-border bg-surface shadow-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1200&auto=format&fit=crop"
                  alt="Sajian kuliner haute gastronomy terkurasi di atas piring artisan berkelas"
                  width={1200}
                  height={800}
                  fetchPriority="high"
                  className="aspect-[4/5] w-full object-cover transition-transform duration-700 hover:scale-105"
                />
              </div>

              {/* Caption pill */}
              <div className="mt-3 flex items-center justify-between px-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                <span>Chef&apos;s Signature &bull; Slow-Braised Heritage</span>
                <span>Atelier No. 01</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

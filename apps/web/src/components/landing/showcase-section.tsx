"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, ShoppingBag } from "lucide-react";

import { listProducts } from "@/features/catalog/api";
import { formatIDR } from "@/lib/format";
import { AvailabilityBadge } from "@/features/catalog/availability-badge";
import { QuickViewModal, type CuratedProduct } from "./quick-view-modal";
import { useAuthStore } from "@/features/auth/auth-store";
import { useCart, useSetCartQuantity } from "@/features/cart/use-cart";

const FALLBACK_CURATED_COLLECTION: CuratedProduct[] = [
  {
    id: "curated-01",
    stall_id: "stall-01",
    stall_name: "Atelier Wagyu & Spices",
    name: "Wagyu Rendang Slow-Braised 18 Jam",
    description: "Daging wagyu marmer tinggi dimasak perlahan bersama santan kelapa sawit segar dan 14 rempah Nusantara pilihan.",
    price_minor: 9500000,
    currency: "IDR",
    availability_status: "available",
    image_url: "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=800&auto=format&fit=crop",
    created_at: "2026-01-01T00:00:00Z",
    tasting_notes: ["Rich Umami", "Warm Cinnamon", "Velvety Texture"],
    pairing_suggestion: "Beras Aromatik Pandan Wangi & Teh Melati Dingin.",
    artisan_origin: "Stan Kuliner Nusantara No. 04",
  },
  {
    id: "curated-02",
    stall_id: "stall-02",
    stall_name: "La Truffe Campus Cuisine",
    name: "Risotto Cendawan Liar & Truffle Hitam",
    description: "Beras carnaroli klasik disiram kaldu rempah jamur hutan, keju parmigiano reggiano 24 bulan, dan minyak truffle murni.",
    price_minor: 8800000,
    currency: "IDR",
    availability_status: "available",
    image_url: "https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?q=80&w=800&auto=format&fit=crop",
    created_at: "2026-01-01T00:00:00Z",
    tasting_notes: ["Earthy Truffle", "Creamy Parmesan", "Nutty Finish"],
    pairing_suggestion: "Air Mineral Berkarbonasi Dingin dengan Lemon Segar.",
    artisan_origin: "Pavilion Kuliner Barat No. 02",
  },
  {
    id: "curated-03",
    stall_id: "stall-03",
    stall_name: "Roastery Nusantara & Elixir",
    name: "Cold Brew Geisha Gayo Single-Origin",
    description: "Ekstraksi tetes dingin selama 24 jam dari biji kopi varietas Geisha dataran tinggi Gayo, menghasilkan kejernihan rasa teh bunga.",
    price_minor: 4500000,
    currency: "IDR",
    availability_status: "available",
    image_url: "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?q=80&w=800&auto=format&fit=crop",
    created_at: "2026-01-01T00:00:00Z",
    tasting_notes: ["Jasmine Floral", "Bergamot Citrus", "Honey Sweetness"],
    pairing_suggestion: "Kue Kering Butter Palmier.",
    artisan_origin: "Kios Barista Kampus Selatan",
  },
  {
    id: "curated-04",
    stall_id: "stall-04",
    stall_name: "Atelier Pâtisserie",
    name: "Mille-Feuille Vanilla Madagaskar & Karamel Asin",
    description: "Lapisan puff pastry karamelisasi renyah berseling diplomat cream vanila Madagaskar dan lelehan saus fleur de sel.",
    price_minor: 5200000,
    currency: "IDR",
    availability_status: "available",
    image_url: "https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=800&auto=format&fit=crop",
    created_at: "2026-01-01T00:00:00Z",
    tasting_notes: ["Crisp Flaky Pastry", "Fragrant Vanilla", "Sea Salt Caramel"],
    pairing_suggestion: "Espresso Single Origin Toraja.",
    artisan_origin: "Bakehouse Kampus Pusat",
  },
  {
    id: "curated-05",
    stall_id: "stall-05",
    stall_name: "Salmon & Greens Atelier",
    name: "Norwegian Salmon Panggang Miso Madu",
    description: "Fillet salmon liar dengan glasir miso merah organik, disajikan bersama edamame hangat dan purée kembang kol lembut.",
    price_minor: 11000000,
    currency: "IDR",
    availability_status: "limited",
    image_url: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?q=80&w=800&auto=format&fit=crop",
    created_at: "2026-01-01T00:00:00Z",
    tasting_notes: ["Sweet Savory Miso", "Tender Omega Rich", "Ginger Zing"],
    pairing_suggestion: "Ocha Dingin Panggang Genmaicha.",
    artisan_origin: "Pavilion Kuliner Sehat No. 01",
  },
  {
    id: "curated-06",
    stall_id: "stall-06",
    stall_name: "Herbal Botanical Tonic",
    name: "Elixir Kunyit Asam Madu Hutan Liar",
    description: "Seduhan kunyit segar parut tangan, asam jawa matang pohon, dan sentuhan madu sialang murni dari pedalaman Riau.",
    price_minor: 3800000,
    currency: "IDR",
    availability_status: "available",
    image_url: "https://images.unsplash.com/photo-1556881286-fc6915169721?q=80&w=800&auto=format&fit=crop",
    created_at: "2026-01-01T00:00:00Z",
    tasting_notes: ["Tangy Tamarind", "Earthy Turmeric", "Wild Honey"],
    pairing_suggestion: "Camilan Tempe Crispy Organik.",
    artisan_origin: "Kios Botanical Kampus Timur",
  },
];

type CategoryFilter = "semua" | "signature" | "beverage" | "pastry";

export function ShowcaseSection() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("semua");
  const [quickViewProduct, setQuickViewProduct] = useState<CuratedProduct | null>(null);

  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const isBuyer = status === "authenticated" && user?.role === "buyer";

  const { data: cart } = useCart();
  const setCartQuantity = useSetCartQuantity();

  // Memuat produk aktual dari API backend jika tersedia
  const apiProductsQuery = useQuery({
    queryKey: ["products", { limit: 12 }],
    queryFn: () => listProducts({ limit: 12 }),
  });

  // Menggabungkan data produk backend dengan profil kurasi sensorik
  const displayItems = useMemo<CuratedProduct[]>(() => {
    const apiItems = apiProductsQuery.data?.items;
    if (apiItems && apiItems.length > 0) {
      return apiItems.map((item, index) => {
        const fallback = FALLBACK_CURATED_COLLECTION[index % FALLBACK_CURATED_COLLECTION.length];
        return {
          ...item,
          tasting_notes: fallback.tasting_notes,
          pairing_suggestion: fallback.pairing_suggestion,
          artisan_origin: item.stall_name,
        };
      });
    }
    return FALLBACK_CURATED_COLLECTION;
  }, [apiProductsQuery.data]);

  // Penyaringan kategori
  const filteredItems = useMemo(() => {
    if (selectedCategory === "semua") return displayItems;
    if (selectedCategory === "beverage") {
      return displayItems.filter(
        (item) =>
          item.name.toLowerCase().includes("kopi") ||
          item.name.toLowerCase().includes("brew") ||
          item.name.toLowerCase().includes("elixir") ||
          item.name.toLowerCase().includes("teh"),
      );
    }
    if (selectedCategory === "pastry") {
      return displayItems.filter(
        (item) =>
          item.name.toLowerCase().includes("mille") ||
          item.name.toLowerCase().includes("pastry") ||
          item.name.toLowerCase().includes("kue") ||
          item.name.toLowerCase().includes("dessert"),
      );
    }
    // signature default: produk dengan harga atau status utama
    return displayItems.slice(0, 4);
  }, [displayItems, selectedCategory]);

  const handleQuickAdd = (product: CuratedProduct) => {
    if (!isBuyer || product.availability_status !== "available") return;
    const current = cart?.items?.find((i) => i.product_id === product.id)?.quantity ?? 0;
    setCartQuantity.mutate({
      productId: product.id,
      quantity: Math.min(current + 1, 99),
    });
  };

  return (
    <section id="koleksi" className="border-b border-border bg-surface-muted/30 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="max-w-2xl">
            <span className="text-xs uppercase tracking-[0.25em] font-semibold text-muted-foreground">
              Etalase Produk Kelas Atas
            </span>
            <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              Kurasi Kreasi Kuliner Terbaik
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Setiap sajian dipilih melalui seleksi cita rasa ketat, dipersiapkan segar harian oleh para koki berbakat di setiap atelier kampus.
            </p>
          </div>

          {/* Interactive filter tabs */}
          <div className="flex flex-wrap items-center gap-1.5 border border-border bg-surface p-1 rounded-sm">
            {(
              [
                { id: "semua", label: "Semua Kreasi" },
                { id: "signature", label: "Chef's Reserve" },
                { id: "beverage", label: "Minuman Artisanal" },
                { id: "pastry", label: "Pâtisserie Halus" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategory(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  selectedCategory === tab.id
                    ? "bg-foreground text-background shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((product) => {
            const inCartCount = cart?.items?.find((i) => i.product_id === product.id)?.quantity ?? 0;
            const isAvailable = product.availability_status === "available";

            return (
              <article
                key={product.id}
                className="group flex flex-col justify-between overflow-hidden rounded-md border border-border bg-surface transition-all duration-300 hover:border-foreground/30 hover:shadow-lg"
              >
                {/* Visual Image container */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-muted">
                  {product.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.image_url}
                      alt={`Sajian kuliner ${product.name}`}
                      width={600}
                      height={450}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-widest text-muted-foreground">
                      Portofolio Visual
                    </div>
                  )}

                  <div className="absolute top-3 left-3">
                    <AvailabilityBadge status={product.availability_status} />
                  </div>

                  {/* Quick View trigger on hover / focus */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 backdrop-blur-2xs transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    <button
                      type="button"
                      onClick={() => setQuickViewProduct(product)}
                      className="inline-flex items-center gap-1.5 rounded-sm bg-surface px-4 py-2 text-xs font-semibold uppercase tracking-wider text-foreground shadow-md hover:bg-surface-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Tilik Rincian</span>
                    </button>
                  </div>
                </div>

                {/* Content details */}
                <div className="flex flex-1 flex-col justify-between p-6">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        {product.artisan_origin ?? product.stall_name}
                      </span>
                    </div>

                    <h3 className="mt-2 font-serif text-lg font-bold tracking-tight text-foreground transition-colors group-hover:text-accent">
                      {product.name}
                    </h3>

                    {product.description ? (
                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {product.description}
                      </p>
                    ) : null}

                    {/* Sensorik tags preview */}
                    {product.tasting_notes && product.tasting_notes.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {product.tasting_notes.slice(0, 2).map((note) => (
                          <span
                            key={note}
                            className="rounded-xs border border-border/60 bg-surface-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground font-medium"
                          >
                            {note}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {/* Price & Action row */}
                  <div className="mt-6 flex items-center justify-between border-t border-border/80 pt-4">
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-muted-foreground block font-medium">
                        Investasi Rasa
                      </span>
                      <span className="text-base font-semibold text-foreground">
                        {formatIDR(product.price_minor)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQuickViewProduct(product)}
                        aria-label={`Rincian lengkap ${product.name}`}
                        className="rounded-sm border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        Detail
                      </button>

                      {isBuyer ? (
                        <button
                          type="button"
                          onClick={() => handleQuickAdd(product)}
                          disabled={!isAvailable || setCartQuantity.isPending}
                          aria-label={`Pesan ${product.name}`}
                          className="inline-flex items-center gap-1 rounded-sm bg-foreground px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-background hover:bg-foreground/85 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        >
                          <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{inCartCount > 0 ? `+${inCartCount}` : "Pesan"}</span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Bottom Catalog Jump */}
        <div className="mt-14 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-md border border-border bg-surface p-6">
          <div>
            <h4 className="font-serif text-lg font-bold text-foreground">
              Ingin Menjelajahi Seluruh Menu Stan Kampus?
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              Buka katalog interaktif lengkap dengan fungsi filter nama stan dan pencarian real-time.
            </p>
          </div>
          <a
            href="/catalog"
            className="inline-flex shrink-0 items-center justify-center rounded-sm bg-foreground px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-background hover:bg-foreground/85 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Buka Katalog Lengkap
          </a>
        </div>
      </div>

      {/* Quick View Modal */}
      <QuickViewModal
        product={quickViewProduct}
        open={!!quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />
    </section>
  );
}

"use client";

import { useState } from "react";
import { Award, Compass, ShieldCheck } from "lucide-react";

interface Pillar {
  id: string;
  icon: typeof Award;
  title: string;
  subtitle: string;
  manifesto: string;
  commitments: string[];
}

const PILLARS: Pillar[] = [
  {
    id: "integritas",
    icon: Award,
    title: "Integritas Bahan Alam",
    subtitle: "Kemurnian 100% dari Sumber Terpercaya",
    manifesto:
      "Kami percaya bahwa fondasi kenikmatan kuliner terletak pada kejujuran bahan mentah. Seluruh stan diwajibkan menggunakan bahan baku segar lokal, telur bebas kandang baterai, dan minyak nabati berkualitas tinggi tanpa daur ulang.",
    commitments: [
      "Sayuran organik dan bumbu segar dikirim harian",
      "Daging sapi dan unggas bersertifikasi halal dengan rantai dingin terjaga",
      "Pemanis alami gula kelapa dan madu hutan murni",
    ],
  },
  {
    id: "keahlian",
    icon: Compass,
    title: "Ketelitian & Presisi Kuliner",
    subtitle: "Keahlian Tangan Berdedikasi Tinggi",
    manifesto:
      "Memasak bukan sekadar rutinitas komersial, melainkan sebuah disiplin keahlian. Setiap resep dikembangkan dengan penimbangan rasio rasa terukur dan uji sensorik berkala agar konsistensi mutu selalu terjaga di setiap piring.",
    commitments: [
      "Pelatihan berkala standar gastronomi bagi seluruh juru masak stan",
      "Pengendalian higienitas dapur dengan audit berkala",
      "Eksplorasi resep musiman yang terus diperbarui",
    ],
  },
  {
    id: "waktu",
    icon: ShieldCheck,
    title: "Penghargaan Atas Waktu Anda",
    subtitle: "Pemesanan Cepat, Layanan Beradab",
    manifesto:
      "Kami menghormati jadwal padat para mahasiswa, dosen, dan peneliti kampus. Sistem pemesanan dirancang tanpa jeda yang membingungkan, memungkinkan Anda memesan terlebih dahulu dan menikmati hidangan tepat waktu tanpa stres mengantre panjang.",
    commitments: [
      "Pelacakan status persiapan pesanan secara langsung",
      "Jalur cepat konfirmasi pembayaran tunai di kasir stan",
      "Area santap bersih, tenang, dan kondusif untuk berdiskusi",
    ],
  },
];

export function BrandValuesSection() {
  const [activePillarId, setActivePillarId] = useState<string>("integritas");

  const currentPillar = PILLARS.find((p) => p.id === activePillarId) ?? PILLARS[0];

  return (
    <section id="nilai" className="border-b border-border bg-surface-muted/20 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section title */}
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs uppercase tracking-[0.25em] font-semibold text-muted-foreground">
            Standar & Nilai Keunggulan
          </span>
          <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Tiga Komitmen Tak Tergoyahkan
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Komitmen nyata yang mendasari setiap keputusan operasional dan kurasi makanan di Maison Kantin.
          </p>
        </div>

        {/* Interactive Selector Pillars */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          {PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            const isSelected = pillar.id === activePillarId;

            return (
              <button
                key={pillar.id}
                type="button"
                onClick={() => setActivePillarId(pillar.id)}
                className={`flex flex-col text-left p-6 sm:p-8 rounded-md border transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  isSelected
                    ? "border-foreground bg-surface shadow-md ring-1 ring-foreground/10"
                    : "border-border bg-surface/70 hover:border-border/80 hover:bg-surface"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div
                    className={`p-2.5 rounded-sm ${
                      isSelected
                        ? "bg-foreground text-background"
                        : "bg-surface-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Pilar {PILLARS.indexOf(pillar) + 1}
                  </span>
                </div>

                <h3 className="mt-5 font-serif text-xl font-bold text-foreground">
                  {pillar.title}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground font-medium">
                  {pillar.subtitle}
                </p>
              </button>
            );
          })}
        </div>

        {/* Detailed Active Manifesto Card */}
        <div className="mt-8 rounded-md border border-border bg-surface p-8 sm:p-10 shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7">
              <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-muted-foreground">
                Manifesto Keunggulan
              </span>
              <h4 className="mt-2 font-serif text-2xl font-bold text-foreground">
                {currentPillar.title}
              </h4>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {currentPillar.manifesto}
              </p>
            </div>

            <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-border pt-6 lg:pt-0 lg:pl-8">
              <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-foreground block mb-3">
                Bukti Penerapan Nyata:
              </span>
              <ul className="space-y-2.5">
                {currentPillar.commitments.map((commitment, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" aria-hidden="true" />
                    <span>{commitment}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

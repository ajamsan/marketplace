"use client";

import { useEffect, useId, useState } from "react";
import { Check, Shield, X } from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";

type Tier = "noir" | "gold";

interface MembershipSectionProps {
  modalOpen: boolean;
  onOpenModal: () => void;
  onCloseModal: () => void;
}

export function MembershipSection({ modalOpen, onOpenModal, onCloseModal }: MembershipSectionProps) {
  const user = useAuthStore((state) => state.user);
  const [tier, setTier] = useState<Tier>("gold");
  const [cardHolder, setCardHolder] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [dietaryPref, setDietaryPref] = useState("omnivore");
  const [submitted, setSubmitted] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const nameInputId = useId();
  const emailInputId = useId();
  const tierSelectId = useId();
  const dietarySelectId = useId();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const joined = localStorage.getItem("maison.member.joined") === "true";
        if (joined) {
          setIsJoined(true);
          const savedName = localStorage.getItem("maison.member.name") ?? "";
          setCardHolder(savedName);
          const savedTier = localStorage.getItem("maison.member.tier");
          if (savedTier === "gold" || savedTier === "noir") {
            setTier(savedTier as Tier);
          }
        }
      } catch {
        // Abaikan jika localStorage tidak dapat diakses
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardHolder.trim() || !emailInput.trim()) return;

    if (typeof window !== "undefined") {
      localStorage.setItem("maison.member.joined", "true");
      localStorage.setItem("maison.member.name", cardHolder.trim());
      localStorage.setItem("maison.member.tier", tier);
    }
    setSubmitted(true);
    setIsJoined(true);
  };

  const memberCode = tier === "noir" ? "MK-NOIR-7704" : "MK-GOLD-9912";

  return (
    <section id="keanggotaan" className="border-b border-border bg-background py-20 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Narrative & Invitation CTA */}
          <div className="lg:col-span-6">
            <span className="text-xs uppercase tracking-[0.3em] font-semibold text-muted-foreground">
              Akses Eksklusif &bull; The Connoisseur Guild
            </span>
            <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              Keanggotaan PrivAc Maison Kantin
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Menjadi bagian dari lingkaran terbatas penikmat gastronomi kampus. 
              Nikmati kenyamanan layanan prioritas, undangan mencicipi kreasi rahasia koki sebelum diluncurkan ke publik, 
              serta perlakuan istimewa di setiap kunjungan bersantap.
            </p>

            {/* Privileges checklist */}
            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                  <Check className="h-3 w-3" aria-hidden="true" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    Jalur Layanan Prioritas & Reservasi Meja
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Tanpa perlu antre panjang pada jam makan siang padat di lingkungan kampus.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                  <Check className="h-3 w-3" aria-hidden="true" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    Sesi Secret Tasting Menu Musiman
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Undangan eksklusif mencicipi kreasi eksperimental para koki artisan setiap semester.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                  <Check className="h-3 w-3" aria-hidden="true" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    Kartu Digital Member Personal Beridentitas Unik
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Kartu akses yang dapat diverifikasi langsung di kasir stan kampus.
                  </div>
                </div>
              </div>
            </div>

            {/* CTA action */}
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={onOpenModal}
                className="inline-flex items-center justify-center rounded-sm bg-foreground px-6 py-3.5 text-xs font-semibold uppercase tracking-widest text-background shadow-md hover:bg-foreground/85 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {isJoined ? "Buka Kartu Akses Saya" : "Ajukan Keanggotaan PrivAc"}
              </button>
            </div>
          </div>

          {/* Interactive Card Preview */}
          <div className="lg:col-span-6">
            <div className="mx-auto max-w-md">
              <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground uppercase tracking-widest font-medium">
                <span>Pratinjau Kartu Digital Anggota</span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTier("noir")}
                    aria-pressed={tier === "noir"}
                    className={`px-2 py-0.5 rounded-xs text-[10px] font-semibold uppercase tracking-wider transition-all ${
                      tier === "noir"
                        ? "bg-foreground text-background"
                        : "bg-surface-muted text-muted-foreground"
                    }`}
                  >
                    Noir Edition
                  </button>
                  <button
                    type="button"
                    onClick={() => setTier("gold")}
                    aria-pressed={tier === "gold"}
                    className={`px-2 py-0.5 rounded-xs text-[10px] font-semibold uppercase tracking-wider transition-all ${
                      tier === "gold"
                        ? "bg-foreground text-background"
                        : "bg-surface-muted text-muted-foreground"
                    }`}
                  >
                    Gold Edition
                  </button>
                </div>
              </div>

              {/* The Physical Card Simulation */}
              <div
                className={`relative aspect-[1.586/1] w-full overflow-hidden rounded-xl border p-6 sm:p-8 shadow-2xl transition-all duration-500 ${
                  tier === "noir"
                    ? "border-neutral-800 bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 text-neutral-100"
                    : "border-amber-900/40 bg-gradient-to-br from-neutral-900 via-amber-950/70 to-neutral-950 text-amber-50"
                }`}
              >
                {/* Metallic watermark pattern */}
                <div className="absolute right-[-20px] top-[-20px] h-48 w-48 rounded-full border border-white/5 opacity-50" />
                <div className="absolute right-[-40px] top-[-40px] h-64 w-64 rounded-full border border-white/5 opacity-30" />

                <div className="relative flex h-full flex-col justify-between">
                  {/* Top line */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-serif text-sm tracking-[0.25em] font-semibold uppercase">
                        MAISON KANTIN
                      </span>
                      <span className="block text-[8px] uppercase tracking-[0.3em] opacity-60">
                        The Connoisseur Guild
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-xs border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] uppercase tracking-widest font-medium">
                      <Shield className="h-3 w-3 text-amber-400" aria-hidden="true" />
                      <span>{tier === "noir" ? "PrivAc Noir" : "PrivAc Gold"}</span>
                    </div>
                  </div>

                  {/* Chip & Emblem */}
                  <div className="flex items-center gap-3 my-auto py-2">
                    <div className="h-8 w-11 rounded-xs border border-amber-400/40 bg-amber-400/10 flex items-center justify-center">
                      <div className="h-4 w-7 border-y border-amber-400/30" />
                    </div>
                    <span className="text-[10px] tracking-[0.25em] font-mono opacity-80">
                      {memberCode}
                    </span>
                  </div>

                  {/* Bottom line: Cardholder name & validity */}
                  <div className="flex items-end justify-between border-t border-white/10 pt-3">
                    <div>
                      <span className="block text-[8px] uppercase tracking-widest opacity-60">
                        Nama Pemegang Kartu
                      </span>
                      <span className="font-serif text-sm font-semibold tracking-wider uppercase">
                        {cardHolder || "Tamu Kehormatan"}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[8px] uppercase tracking-widest opacity-60">
                        Masa Berlaku
                      </span>
                      <span className="text-xs font-mono font-medium tracking-wider">
                        2026/2027
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status pill under card */}
              <div className="mt-4 text-center">
                <span className="text-xs text-muted-foreground">
                  {isJoined ? (
                    <span className="text-success font-semibold inline-flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      Status Anda: Anggota Aktif ({cardHolder})
                    </span>
                  ) : (
                    "Daftar sekarang untuk aktivasi nomor kartu digital Anda."
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Membership Registration Modal */}
      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          role="presentation"
        >
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={onCloseModal}
            aria-hidden="true"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="member-modal-title"
            tabIndex={-1}
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-md border border-border bg-surface p-6 sm:p-8 shadow-2xl outline-none"
          >
            <button
              type="button"
              onClick={onCloseModal}
              aria-label="Tutup jendela pendaftaran"
              className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-sm text-foreground hover:bg-surface-muted"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>

            {submitted ? (
              <div className="text-center py-6">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-success">
                  <Check className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3
                  id="member-modal-title"
                  className="mt-4 font-serif text-2xl font-bold text-foreground"
                >
                  Selamat Datang di Connoisseur Guild
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Keanggotaan Anda atas nama <strong>{cardHolder}</strong> dengan kode{" "}
                  <strong>{memberCode}</strong> telah diaktifkan secara lokal. 
                  Gunakan kartu digital ini di stan partisipan untuk menikmati perlakuan prioritas.
                </p>
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(false);
                      onCloseModal();
                    }}
                    className="rounded-sm bg-foreground px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-background hover:bg-foreground/85"
                  >
                    Tutup & Lihat Kartu
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Pendaftaran Guild Eksklusif
                </span>
                <h3
                  id="member-modal-title"
                  className="mt-1 font-serif text-2xl font-bold text-foreground"
                >
                  Permohonan Akses PrivAc
                </h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  Lengkapi identitas Anda untuk mengonfirmasi penerbitan kartu digital keanggotaan Maison Kantin.
                </p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <div>
                    <label
                      htmlFor={nameInputId}
                      className="block text-xs font-semibold uppercase tracking-wider text-foreground mb-1"
                    >
                      Nama Pemegang Kartu
                    </label>
                    <input
                      id={nameInputId}
                      type="text"
                      required
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      placeholder="Masukkan nama lengkap Anda"
                      className="w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={emailInputId}
                      className="block text-xs font-semibold uppercase tracking-wider text-foreground mb-1"
                    >
                      Email Kampus / Kontak
                    </label>
                    <input
                      id={emailInputId}
                      type="email"
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="nama@kampus.ac.id"
                      className="w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor={tierSelectId}
                        className="block text-xs font-semibold uppercase tracking-wider text-foreground mb-1"
                      >
                        Pilihan Edisi
                      </label>
                      <select
                        id={tierSelectId}
                        value={tier}
                        onChange={(e) => setTier(e.target.value as Tier)}
                        className="w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        <option value="noir">Noir Edition (VIP)</option>
                        <option value="gold">Gold Edition (Artisan)</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor={dietarySelectId}
                        className="block text-xs font-semibold uppercase tracking-wider text-foreground mb-1"
                      >
                        Preferensi Selera
                      </label>
                      <select
                        id={dietarySelectId}
                        value={dietaryPref}
                        onChange={(e) => setDietaryPref(e.target.value)}
                        className="w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        <option value="omnivore">Koleksi Lengkap</option>
                        <option value="halal-certified">Halal Artisan</option>
                        <option value="pescatarian">Seafood & Sayuran</option>
                        <option value="vegetarian">Vegetarian Organik</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <button
                      type="submit"
                      className="w-full rounded-sm bg-foreground py-3 text-xs font-semibold uppercase tracking-widest text-background hover:bg-foreground/85 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      Terbitkan Kartu Keanggotaan Saya
                    </button>
                    <p className="mt-2 text-[10px] text-center text-muted-foreground">
                      Keanggotaan ini gratis untuk civitas kampus terpilih dan berlaku untuk tahun akademik berjalan.
                    </p>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

"use client";

import { useEffect, useId, useState } from "react";
import { Check, Shield, X } from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";

type Tier = "gold" | "vip";

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
  const [dietaryPref, setDietaryPref] = useState("semua");
  const [submitted, setSubmitted] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const nameInputId = useId();
  const emailInputId = useId();
  const tierSelectId = useId();
  const dietarySelectId = useId();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const joined = localStorage.getItem("kantin.member.joined") === "true";
        if (joined) {
          setIsJoined(true);
          const savedName = localStorage.getItem("kantin.member.name") ?? "";
          setCardHolder(savedName);
          const savedTier = localStorage.getItem("kantin.member.tier");
          if (savedTier === "gold" || savedTier === "vip") {
            setTier(savedTier);
          }
        }
      } catch {
        // Abaikan jika localStorage tidak tersedia
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardHolder.trim() || !emailInput.trim()) return;

    if (typeof window !== "undefined") {
      localStorage.setItem("kantin.member.joined", "true");
      localStorage.setItem("kantin.member.name", cardHolder.trim());
      localStorage.setItem("kantin.member.tier", tier);
    }
    setSubmitted(true);
    setIsJoined(true);
  };

  const memberCode = tier === "vip" ? "KNT-VIP-7704" : "KNT-MBR-9912";

  return (
    <section id="member" className="border-b border-border bg-background py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
              Kartu Member
            </span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Daftar jadi member, dapat keuntungan
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Member kampus mendapat prioritas antre dan promo khusus di stan-stan pilihan.
            </p>

            <ul className="mt-6 space-y-3">
              {[
                "Prioritas antre di jam sibuk",
                "Promo member di stan tertentu",
                "Kartu digital diisi nama kamu",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={onOpenModal}
              className="mt-8 inline-flex items-center justify-center rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground hover:bg-accent/90 transition-colors"
            >
              {isJoined ? "Lihat Kartu Saya" : "Daftar Member"}
            </button>
          </div>

          <div className="mx-auto w-full max-w-md">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Pratinjau kartu</span>
              <div className="flex gap-1">
                {(["gold", "vip"] as Tier[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTier(t)}
                    aria-pressed={tier === t}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                      tier === t
                        ? "bg-foreground text-background"
                        : "bg-surface-muted text-muted-foreground"
                    }`}
                  >
                    {t === "vip" ? "VIP" : "Member"}
                  </button>
                ))}
              </div>
            </div>

            <div
              className={`relative aspect-[1.586/1] w-full overflow-hidden rounded-xl border p-6 shadow-xl ${
                tier === "vip"
                  ? "border-neutral-800 bg-gradient-to-br from-neutral-900 to-neutral-800 text-neutral-100"
                  : "border-amber-900/40 bg-gradient-to-br from-amber-100 to-amber-200 text-amber-950"
              }`}
            >
              <div className="flex h-full flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold tracking-tight">Kantin Kampus</span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-current/20 px-2 py-0.5 text-[9px] uppercase tracking-widest font-semibold">
                    <Shield className="h-3 w-3" aria-hidden="true" />
                    {tier === "vip" ? "VIP" : "Member"}
                  </span>
                </div>
                <div className="text-xs font-mono tracking-wider opacity-80">{memberCode}</div>
                <div className="flex items-end justify-between border-t border-current/20 pt-3">
                  <div>
                    <span className="block text-[8px] uppercase tracking-widest opacity-70">
                      Nama
                    </span>
                    <span className="text-sm font-semibold uppercase">{cardHolder || "Nama Kamu"}</span>
                  </div>
                  <span className="text-[10px] opacity-70">2026/2027</span>
                </div>
              </div>
            </div>

            <p className="mt-3 text-center text-xs text-muted-foreground">
              {isJoined ? (
                <span className="text-success font-medium">
                  Member aktif atas nama {cardHolder || "Anda"}
                </span>
              ) : (
                "Daftar sekarang untuk mendapatkan kartu member."
              )}
            </p>
          </div>
        </div>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
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
            className="relative z-10 w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-2xl outline-none"
          >
            <button
              type="button"
              onClick={onCloseModal}
              aria-label="Tutup"
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-foreground hover:bg-surface-muted"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>

            {submitted ? (
              <div className="py-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-success">
                  <Check className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 id="member-modal-title" className="mt-4 text-xl font-bold text-foreground">
                  Selamat datang!
                </h3>
                <p className="mt-2 text-xs text-muted-foreground">
                  Kartu member atas nama <strong>{cardHolder}</strong> telah aktif. Tunjukkan kartu ini di kasir.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    onCloseModal();
                  }}
                  className="mt-6 rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-accent-foreground hover:bg-accent/90"
                >
                  Lihat Kartu
                </button>
              </div>
            ) : (
              <div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Pendaftaran Member
                </span>
                <h3 id="member-modal-title" className="mt-1 text-xl font-bold text-foreground">
                  Daftar Kartu Member
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Isi data singkat di bawah ini.
                </p>

                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                  <div>
                    <label htmlFor={nameInputId} className="mb-1 block text-xs font-medium text-foreground">
                      Nama
                    </label>
                    <input
                      id={nameInputId}
                      type="text"
                      required
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      placeholder="Nama kamu"
                      className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    />
                  </div>
                  <div>
                    <label htmlFor={emailInputId} className="mb-1 block text-xs font-medium text-foreground">
                      Email
                    </label>
                    <input
                      id={emailInputId}
                      type="email"
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="nama@email.com"
                      className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor={tierSelectId} className="mb-1 block text-xs font-medium text-foreground">
                        Edisi
                      </label>
                      <select
                        id={tierSelectId}
                        value={tier}
                        onChange={(e) => setTier(e.target.value as Tier)}
                        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        <option value="gold">Member</option>
                        <option value="vip">VIP</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor={dietarySelectId} className="mb-1 block text-xs font-medium text-foreground">
                        Preferensi
                      </label>
                      <select
                        id={dietarySelectId}
                        value={dietaryPref}
                        onChange={(e) => setDietaryPref(e.target.value)}
                        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        <option value="semua">Semua menu</option>
                        <option value="halal">Halal</option>
                        <option value="mie">Mi & nasi</option>
                        <option value="minuman">Minuman</option>
                      </select>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    <button
                      type="submit"
                      className="w-full rounded-lg bg-accent py-3 text-sm font-semibold text-accent-foreground hover:bg-accent/90 transition-colors"
                    >
                      Buat Kartu Member
                    </button>
                    <p className="mt-2 text-center text-[10px] text-muted-foreground">
                      Gratis untuk civitas kampus.
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

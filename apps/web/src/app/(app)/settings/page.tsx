"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { ImageIcon, MonitorSmartphone, Palette, User } from "lucide-react";

import { PhotoUpload } from "@/features/settings/photo-upload";
import { ProfileForm } from "@/features/settings/profile-form";
import { SessionsList } from "@/features/settings/sessions-list";
import { ThemeSection } from "@/features/settings/theme-section";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "profil", label: "Profil", icon: User, description: "Nama dan identitas akun" },
  { id: "foto", label: "Foto", icon: ImageIcon, description: "Foto profil kamu" },
  { id: "sesi", label: "Sesi", icon: MonitorSmartphone, description: "Perangkat yang masuk" },
  { id: "tampilan", label: "Tampilan", icon: Palette, description: "Tema dan warna aksen" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// Menukar panel pengaturan dan mendukung perpindahan tab dengan keyboard.
export default function SettingsPage() {
  const [active, setActive] = useState<TabId>("profil");
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({
    profil: null,
    foto: null,
    sesi: null,
    tampilan: null,
  });

  // Mengelola tombol panah, Home, dan End pada daftar tab aksesibel.
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = TABS.findIndex((tab) => tab.id === active);
    let nextIndex = index;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % TABS.length;
    else if (event.key === "ArrowLeft") nextIndex = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = TABS.length - 1;
    else return;

    event.preventDefault();
    const nextTab = TABS[nextIndex];
    setActive(nextTab.id);
    tabRefs.current[nextTab.id]?.focus();
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2 border-b border-border pb-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          Ruang pribadi
        </p>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Pengaturan
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Kelola profil, foto, sesi perangkat, dan tampilan aplikasi. Perubahan profil dan foto
          tersimpan di akunmu; tema juga tersimpan di perangkat ini.
        </p>
      </header>

      <div
        role="tablist"
        aria-label="Bagian pengaturan"
        onKeyDown={handleKeyDown}
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const selected = active === tab.id;
          return (
            <button
              key={tab.id}
              ref={(node) => {
                tabRefs.current[tab.id] = node;
              }}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab.id)}
              className={cn(
                "flex min-h-11 flex-col items-start gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                selected
                  ? "border-accent bg-accent-soft text-foreground"
                  : "border-border bg-surface text-muted-foreground hover:border-foreground/30 hover:text-foreground",
              )}
            >
              <span className="flex items-center gap-2">
                <Icon
                  className={cn("h-4 w-4", selected ? "text-accent" : "text-muted-foreground")}
                  aria-hidden="true"
                />
                <span className="text-sm font-semibold">{tab.label}</span>
              </span>
              <span className="pl-6 text-[11px] leading-snug text-muted-foreground">
                {tab.description}
              </span>
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`panel-${active}`}
        aria-labelledby={`tab-${active}`}
        tabIndex={0}
        className="rounded-lg focus-visible:outline-none"
      >
        {active === "profil" ? <ProfileForm /> : null}
        {active === "foto" ? <PhotoUpload /> : null}
        {active === "sesi" ? <SessionsList /> : null}
        {active === "tampilan" ? <ThemeSection /> : null}
      </div>
    </div>
  );
}

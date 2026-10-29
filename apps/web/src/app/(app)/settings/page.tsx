"use client";

import { useRef, useState, type KeyboardEvent } from "react";

import { PhotoUpload } from "@/features/settings/photo-upload";
import { ProfileForm } from "@/features/settings/profile-form";
import { SessionsList } from "@/features/settings/sessions-list";
import { ThemeSection } from "@/features/settings/theme-section";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "profil", label: "Profil" },
  { id: "foto", label: "Foto" },
  { id: "sesi", label: "Sesi" },
  { id: "tampilan", label: "Tampilan" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function SettingsPage() {
  const [active, setActive] = useState<TabId>("profil");
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({
    profil: null,
    foto: null,
    sesi: null,
    tampilan: null,
  });

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
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Pengaturan</h1>
        <p className="text-sm text-muted-foreground">
          Kelola profil, foto profil, sesi aktif, dan tampilan aplikasi.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Bagian pengaturan"
        onKeyDown={handleKeyDown}
        className="flex flex-wrap gap-1 border-b border-border"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            ref={(node) => {
              tabRefs.current[tab.id] = node;
            }}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={active === tab.id}
            aria-controls={`panel-${tab.id}`}
            tabIndex={active === tab.id ? 0 : -1}
            onClick={() => setActive(tab.id)}
            className={cn(
              "rounded-t-lg border-b-2 border-transparent px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors",
              active === tab.id
                ? "border-accent text-foreground"
                : "hover:bg-surface-muted hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
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

import type { Metadata } from "next";

import { AuthBootstrap } from "@/components/landing/auth-bootstrap";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";
import { RolesSection } from "@/components/landing/roles-section";

export const metadata: Metadata = {
  title: "Peran pembeli, penjual, dan admin | Kantin Kampus",
  description:
    "Siapa mengerjakan apa di Kantin Kampus: pembeli memesan, penjual menyiapkan pesanan, admin menjaga kualitas stan.",
};

export default function PeranPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground antialiased">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-background"
      >
        Lewati ke konten utama
      </a>
      <AuthBootstrap />
      <LandingHeader />
      <main id="main" className="flex-1">
        <RolesSection titleAs="h1" />
      </main>
      <LandingFooter />
    </div>
  );
}

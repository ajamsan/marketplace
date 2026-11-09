import type { Metadata } from "next";

import { AuthBootstrap } from "@/components/landing/auth-bootstrap";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";
import { ScopeSection } from "@/components/landing/scope-section";

export const metadata: Metadata = {
  title: "Cakupan pilot | Kantin Kampus",
  description:
    "Apa yang sudah bisa dipakai di Kantin Kampus sekarang, dan apa yang belum: pembayaran tunai di kasir, verifikasi OTP email, batas build pilot lokal.",
};

export default function CakupanPage() {
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
        <ScopeSection titleAs="h1" />
      </main>
      <LandingFooter />
    </div>
  );
}

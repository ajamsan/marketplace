import type { Metadata } from "next";

import { AuthBootstrap } from "@/components/landing/auth-bootstrap";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";
import { CTASection } from "@/components/landing/cta-section";
import { StorytellingSection } from "@/components/landing/storytelling-section";
import { ValuesSection } from "@/components/landing/values-section";

export const metadata: Metadata = {
  title: "Tentang | Kantin Kampus",
  description:
    "Mengapa Kantin Kampus ada: cara kerja pre-order dari stan kampus, nilai yang dipegang, dan siapa yang menjalankan pilot ini.",
};

export default function AboutPage() {
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
        <StorytellingSection titleAs="h1" />
        <ValuesSection />
        <CTASection />
      </main>
      <LandingFooter />
    </div>
  );
}

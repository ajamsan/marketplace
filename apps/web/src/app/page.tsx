"use client";

import { useEffect } from "react";

import { useAuthStore } from "@/features/auth/auth-store";
import { LandingHeader } from "@/components/landing/landing-header";
import { HeroSection } from "@/components/landing/hero-section";
import { ShowcaseSection } from "@/components/landing/showcase-section";
import { LandingFooter } from "@/components/landing/landing-footer";

export default function HomePage() {
  const status = useAuthStore((state) => state.status);
  const bootstrap = useAuthStore((state) => state.bootstrap);

  useEffect(() => {
    if (status === "idle") {
      void bootstrap();
    }
  }, [status, bootstrap]);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground antialiased">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-background"
      >
        Lewati ke konten utama
      </a>
      <LandingHeader />
      <main id="main" className="flex-1">
        <HeroSection />
        <ShowcaseSection />
      </main>
      <LandingFooter />
    </div>
  );
}
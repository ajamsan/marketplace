"use client";

import { useEffect, useState } from "react";

import { useAuthStore } from "@/features/auth/auth-store";
import { LandingHeader } from "@/components/landing/landing-header";
import { HeroSection } from "@/components/landing/hero-section";
import { ShowcaseSection } from "@/components/landing/showcase-section";
import { StorytellingSection } from "@/components/landing/storytelling-section";
import { BrandValuesSection } from "@/components/landing/brand-values-section";
import { MembershipSection } from "@/components/landing/membership-section";
import { LandingFooter } from "@/components/landing/landing-footer";

export default function HomePage() {
  const status = useAuthStore((state) => state.status);
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const [membershipModalOpen, setMembershipModalOpen] = useState(false);

  // Memulihkan sesi pengguna di latar belakang saat halaman dimuat
  useEffect(() => {
    if (status === "idle") {
      void bootstrap();
    }
  }, [status, bootstrap]);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground antialiased selection:bg-foreground selection:text-background">
      <LandingHeader />
      <main className="flex-1">
        <HeroSection onOpenMembership={() => setMembershipModalOpen(true)} />
        <ShowcaseSection />
        <StorytellingSection />
        <BrandValuesSection />
        <MembershipSection
          modalOpen={membershipModalOpen}
          onOpenModal={() => setMembershipModalOpen(true)}
          onCloseModal={() => setMembershipModalOpen(false)}
        />
      </main>
      <LandingFooter />
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { homePathForRole, useAuthStore } from "@/features/auth/auth-store";
import { FullPageLoader } from "@/components/ui/feedback";

export default function HomePage() {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const bootstrap = useAuthStore((state) => state.bootstrap);

  useEffect(() => {
    if (status === "idle") void bootstrap();
  }, [status, bootstrap]);

  useEffect(() => {
    if (status === "anonymous") {
      router.replace("/login");
    } else if (status === "authenticated" && user) {
      router.replace(homePathForRole(user.role));
    }
  }, [status, user, router]);

  return <FullPageLoader label="Menyiapkan aplikasi..." />;
}

"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";

import { ApiError } from "@/lib/api/client";
import { onSessionLost } from "@/lib/api/token-store";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import { useAuthStore } from "@/features/auth/auth-store";

// Menyediakan cache query, tema, dan pengelolaan sesi untuk seluruh aplikasi.
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            // Menghindari retry untuk galat klien dan membatasi pengulangan server.
            retry: (failureCount, error) => {
              if (error instanceof ApiError && error.status < 500) return false;
              return failureCount < 2;
            },
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  const markAnonymous = useAuthStore((state) => state.markAnonymous);

  useEffect(() => {
    onSessionLost(() => markAnonymous());
  }, [markAnonymous]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}

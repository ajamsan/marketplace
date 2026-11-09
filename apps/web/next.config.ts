import type { NextConfig } from "next";

/**
 * Proxy rewrite /api/v1/* -> API Go (D9).
 * Cookie refresh token tetap first-party sehingga tidak butuh CORS di dev.
 */
const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  cacheComponents: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "wdzietccktaxovvxbymu.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
  async rewrites() {
    return [
      { source: "/api/v1/:path*", destination: `${apiBaseUrl}/api/v1/:path*` },
    ];
  },
};

export default nextConfig;

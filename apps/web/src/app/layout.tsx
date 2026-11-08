import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";

import "./globals.css";
import { Providers } from "@/components/providers";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Maison Kantin | Haute Gastronomy & Artisanal Campus Marketplace",
  description: "Kurasi kuliner mewah, sajian artisanal dari koki terkemuka kampus, dan pengalaman bersantap tanpa kompromi.",
};

const themeBootstrap = `
(function () {
  try {
    var theme = localStorage.getItem("kantin.theme");
    if (theme !== "light" && theme !== "dark") {
      theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    var accent = localStorage.getItem("kantin.accent");
    if (["red","yellow","green","blue","purple"].indexOf(accent) === -1) accent = "blue";
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.accent = accent;
  } catch (e) {
    document.documentElement.dataset.theme = "light";
    document.documentElement.dataset.accent = "blue";
  }
})();
`;

// Menyediakan dokumen HTML bahasa Indonesia, provider, dan pemulihan tema awal.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <Script id="theme-bootstrap" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

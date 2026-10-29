import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kantin Kampus",
  description: "Temukan makanan di stan kantin kampus, pesan dan bayar tunai di kasir.",
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

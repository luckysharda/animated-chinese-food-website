import type { Metadata, Viewport } from "next";
import { Anton, Noto_Sans_JP, Shippori_Mincho, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-anton", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono-jb", display: "swap" });
// JP faces are large — do not preload them; they swap in after first paint.
const notoJp = Noto_Sans_JP({ weight: ["700", "900"], subsets: ["latin"], variable: "--font-noto-jp", display: "swap", preload: false });
const mincho = Shippori_Mincho({ weight: ["700", "800"], subsets: ["latin"], variable: "--font-mincho", display: "swap", preload: false });

export const metadata: Metadata = {
  title: "UMAMI // 拉麵 — Born From Two Worlds",
  description:
    "A Chinese-Japanese fusion ramen shop in Yokohama. Sixty-hour broth, nine hand-selected components, one bowl.",
  openGraph: {
    title: "UMAMI // 拉麵 — Born From Two Worlds",
    description: "Sixty-hour broth, nine hand-selected components, one bowl. Yokohama, since 1910.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#07090C",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${anton.variable} ${mono.variable} ${notoJp.variable} ${mincho.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-ink-800 text-text-mid antialiased">{children}</body>
    </html>
  );
}

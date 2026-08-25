import type { Metadata, Viewport } from "next";
import { Anton, Noto_Sans_JP, Shippori_Mincho, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-anton", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono-jb", display: "swap" });
// JP faces are large — do not preload them; they swap in after first paint.
const notoJp = Noto_Sans_JP({ weight: ["700", "900"], subsets: ["latin"], variable: "--font-noto-jp", display: "swap", preload: false });
const mincho = Shippori_Mincho({ weight: ["700", "800"], subsets: ["latin"], variable: "--font-mincho", display: "swap", preload: false });

export const metadata: Metadata = {
  title: "UMAMI // RAMEN — Born From Two Worlds",
  description:
    "A Chinese-Japanese fusion ramen shop in Yokohama. Sixty-hour broth, nine hand-selected components, one bowl.",
  openGraph: {
    title: "UMAMI // RAMEN — Born From Two Worlds",
    description: "Sixty-hour broth, nine hand-selected components, one bowl. Yokohama, since 1910.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#07090C",
  colorScheme: "dark",
};

/**
 * This layout stays a SERVER component, and the route stays ○ (Static).
 *
 * It is also hydration-safe by construction. The provider holds no state and
 * renders nothing of its own — it returns a context whose value is a module-level
 *
 * There is deliberately NO flags provider. src/lib/flags.ts is hook-only — useFlag()
 * reads through useSyncExternalStore with a getServerSnapshot pinned to the registry
 * default, so it needs no context and nothing to mount. Wrapping it in an invented
 * provider would add a boundary that buys nothing. Consumers import useFlag/getFlag
 * directly.
 *
 * Nothing above or below reads headers(), cookies() or searchParams — those are the
 * calls that would force this route dynamic.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${anton.variable} ${mono.variable} ${notoJp.variable} ${mincho.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-ink-800 text-text-mid antialiased">
        {children}
      </body>
    </html>
  );
}

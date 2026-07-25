import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { Toaster } from "@/components/ui/Toast";
import { WebVitals } from "@/components/pwa/WebVitals";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/**
 * Tabular monospace for hero numerals — genuine tabular figures that align at a
 * glance and read instantly, replacing the dot-matrix display face (whose
 * glyphs, e.g. the colon, were ambiguous). The CSS var name is kept so the
 * `--font-dot` / `font-dot` token continues to resolve without churn.
 */
const numerals = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-doto",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Cashflow", template: "%s · Cashflow" },
  description: "Group expenses and personal finance, settled beautifully.",
  applicationName: "Cashflow",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Cashflow",
  },
};

export const viewport: Viewport = {
  themeColor: "#050506",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${numerals.variable} h-full`}>
      <body className="min-h-full">
        <AuroraBackground />
        <div className="flex min-h-dvh flex-col">{children}</div>
        <Toaster />
        <WebVitals />
      </body>
    </html>
  );
}

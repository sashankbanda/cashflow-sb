import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { Toaster } from "@/components/ui/Toast";
import { WebVitals } from "@/components/pwa/WebVitals";
import "./globals.css";

/** One typeface for everything — UI and numbers alike (tabular-nums via CSS). */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Cashflow", template: "%s · Cashflow" },
  description: "Group expenses and personal finance, made simple.",
  applicationName: "Cashflow",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Cashflow",
  },
};

/**
 * Applies the saved / `?theme=` theme to <html> before first paint (no flash).
 * `?theme=base` clears it. Only vetted themes are applied.
 */
const THEME_INIT = `(function(){try{var A={dusk:1,statement:1,grid:1};var k='cashflow:theme';var p=new URLSearchParams(location.search).get('theme');if(p==='base'){localStorage.removeItem(k);document.documentElement.removeAttribute('data-theme');return;}var t=p||localStorage.getItem(k);if(t&&A[t]){document.documentElement.setAttribute('data-theme',t);localStorage.setItem(k,t);}}catch(e){}})();`;

export const viewport: Viewport = {
  themeColor: "#f5f6f8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full">
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        <AuroraBackground />
        <div className="flex min-h-dvh flex-col">{children}</div>
        <Toaster />
        <WebVitals />
      </body>
    </html>
  );
}

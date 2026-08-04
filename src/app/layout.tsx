import type { Metadata, Viewport } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { Toaster } from "@/components/ui/Toast";
import { WebVitals } from "@/components/pwa/WebVitals";
import "./globals.css";

/** Friendly rounded-geometric UI face — listed FIRST in the stack so it
 *  actually renders on iOS (with -apple-system first, iPhones showed SF). */
const ui = Manrope({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap",
});

/** Characterful display face for money amounts and screen titles. */
const displayFace = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
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
  themeColor: "#faf7f2",
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
    <html lang="en" className={`${ui.variable} ${displayFace.variable} h-full`}>
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

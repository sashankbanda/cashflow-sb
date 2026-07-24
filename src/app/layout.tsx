import type { Metadata, Viewport } from "next";
import { Doto, Inter } from "next/font/google";
import { AuroraBackground } from "@/components/ui/AuroraBackground";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/** Dot-matrix display font, reserved for hero numerals. */
const doto = Doto({
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
    <html lang="en" className={`${inter.variable} ${doto.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <AuroraBackground />
        {children}
      </body>
    </html>
  );
}

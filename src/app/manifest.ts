import type { MetadataRoute } from "next";

/** PWA manifest — installable, light theme, maskable icons. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cashflow",
    short_name: "Cashflow",
    description: "Split expenses with friends and track your money — simply.",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f5f6f8",
    theme_color: "#f5f6f8",
    icons: [
      { src: "/manifest-icon?size=192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/manifest-icon?size=512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/manifest-icon?size=512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

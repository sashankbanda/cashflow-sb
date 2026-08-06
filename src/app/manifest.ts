import type { MetadataRoute } from "next";

/**
 * PWA manifest — installable, light theme, maskable icons, and a share target:
 * sharing a UPI receipt / bank SMS into Cashflow opens /add with the text, so
 * the amount and payee prefill (Android; iOS Safari has no share-target
 * support — its path is the Paste button on /add).
 */
export default function manifest(): MetadataRoute.Manifest {
  const shareTarget = {
    share_target: {
      action: "/add",
      method: "GET",
      params: { title: "title", text: "text", url: "url" },
    },
  };
  return {
    ...(shareTarget as Partial<MetadataRoute.Manifest>),
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
    // Long-press the installed app icon → jump straight to Quick add (Android).
    shortcuts: [
      {
        name: "Quick add",
        short_name: "Quick add",
        description: "Log a payment fast",
        url: "/add",
        icons: [{ src: "/manifest-icon?size=192", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}

"use client";

import { Download, Share2 } from "lucide-react";
import { useHaptics } from "@/hooks/useHaptics";

/**
 * Report export actions. "Share summary card" invokes the OS share sheet via
 * the Web Share API (with the rendered PNG as a file) instead of dumping the
 * user into a new browser tab — the native way to hand a file to another app.
 * Falls back to opening the image where Web Share isn't available.
 */
export function ReportActions({
  csvHref,
  cardHref,
  monthLabel,
}: {
  csvHref: string;
  cardHref: string;
  monthLabel: string;
}) {
  const haptics = useHaptics();

  const shareCard = async () => {
    haptics.tap();
    try {
      const response = await fetch(cardHref);
      if (!response.ok) throw new Error("Card unavailable");
      const blob = await response.blob();
      const file = new File(
        [blob],
        `cashflow-${monthLabel.replace(/\s+/g, "-").toLowerCase()}.png`,
        { type: blob.type || "image/png" },
      );
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Cashflow · ${monthLabel}` });
        return;
      }
      window.open(cardHref, "_blank", "noopener,noreferrer");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return; // sheet dismissed
      window.open(cardHref, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="space-y-2">
      <a
        href={csvHref}
        download
        onClick={() => haptics.tap()}
        className="ease-out flex h-12 items-center justify-center gap-2 rounded-full glass text-body text-fg-1 transition-transform duration-150 active:scale-[0.98]"
      >
        <Download className="size-4" /> Download CSV
      </a>
      <button
        type="button"
        onClick={shareCard}
        className="ease-out flex h-12 w-full items-center justify-center gap-2 rounded-full glass-soft text-body text-fg-2 transition-transform duration-150 active:scale-[0.98]"
      >
        <Share2 className="size-4" /> Share summary card
      </button>
    </div>
  );
}

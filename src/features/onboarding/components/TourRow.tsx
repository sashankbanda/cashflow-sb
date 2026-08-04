"use client";

import { useState } from "react";
import { ChevronRight, Sparkles } from "lucide-react";
import { AppTour } from "./AppTour";

/** Profile row that replays the guided tour on demand. */
export function TourRow() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ease-out flex w-full items-center gap-3 p-4 text-left transition-colors duration-150 active:bg-glass"
      >
        <Sparkles className="size-5 text-fg-2" />
        <p className="flex-1 text-body">How Cashflow works</p>
        <ChevronRight className="size-4 text-fg-3" />
      </button>
      <AppTour open={open} onClose={() => setOpen(false)} />
    </>
  );
}

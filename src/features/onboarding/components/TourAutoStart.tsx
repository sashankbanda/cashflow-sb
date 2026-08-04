"use client";

import { useEffect, useState } from "react";
import { AppTour } from "./AppTour";

const SEEN_KEY = "cashflow:tour-seen";

/**
 * Shows the tour automatically the first time someone opens the app, then
 * never again (localStorage). A short delay lets the screen paint first.
 * The tour stays replayable from Profile → "How Cashflow works".
 */
export function TourAutoStart() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        if (!window.localStorage.getItem(SEEN_KEY)) setOpen(true);
      } catch {
        /* storage unavailable — skip the auto-tour */
      }
    }, 700);
    return () => window.clearTimeout(id);
  }, []);

  const close = () => {
    setOpen(false);
    try {
      window.localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  return <AppTour open={open} onClose={close} />;
}

"use client";

import { useEffect, useState } from "react";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

const KEY = "cashflow:theme";

/**
 * Light / Dark switch. Applies the complete "dusk" dark token set via
 * [data-theme] and persists through the same key the pre-paint init script
 * reads, so the choice sticks across launches with no flash.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<"base" | "dusk">("base");

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        setTheme(window.localStorage.getItem(KEY) === "dusk" ? "dusk" : "base");
      } catch {
        /* storage unavailable — stay on light */
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const apply = (next: "base" | "dusk") => {
    setTheme(next);
    try {
      if (next === "dusk") {
        document.documentElement.setAttribute("data-theme", "dusk");
        window.localStorage.setItem(KEY, "dusk");
      } else {
        document.documentElement.removeAttribute("data-theme");
        window.localStorage.removeItem(KEY);
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <SegmentedControl
      aria-label="Appearance"
      value={theme}
      onChange={apply}
      options={[
        { value: "base", label: "Light" },
        { value: "dusk", label: "Dark" },
      ]}
    />
  );
}

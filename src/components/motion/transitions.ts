import type { Transition, Variants } from "motion/react";

/**
 * Motion tokens from docs/02-DESIGN-SYSTEM.md §2 — the only transition values
 * used in the app. Physics, not durations.
 */

/** Press feedback, chips, toggles, toasts. */
export const springSnappy: Transition = { type: "spring", stiffness: 420, damping: 30 };

/** Cards entering, sheet open, stack expand. */
export const springSmooth: Transition = { type: "spring", stiffness: 260, damping: 26 };

/** Fades, color, small layout shifts. */
export const easeStandard: Transition = { duration: 0.25, ease: [0.32, 0.72, 0, 1] };

/** Hovers, toggles, icon tints. */
export const easeMicro: Transition = { duration: 0.15, ease: "easeOut" };

export const STAGGER_INTERVAL_S = 0.04;
export const STAGGER_MAX_ITEMS = 8;

/** Entrance variants shared by staggered lists and widget grids. */
export const entranceVariants: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: springSmooth },
};

export const entranceVariantsReduced: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: easeMicro },
};

/** Stagger delay for item `index`, capped so long lists don't crawl. */
export function staggerDelay(index: number): number {
  return Math.min(index, STAGGER_MAX_ITEMS) * STAGGER_INTERVAL_S;
}

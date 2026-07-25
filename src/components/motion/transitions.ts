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

// Stagger sparingly: a long cascade makes a list feel slow even at 60fps. Cap
// at 3 steps of 20ms, then everything lands together.
export const STAGGER_INTERVAL_S = 0.02;
export const STAGGER_MAX_ITEMS = 3;

/** Entrance variants shared by staggered lists and widget grids — fast in. */
export const entranceVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.18, ease: [0.25, 1, 0.5, 1] } },
};

export const entranceVariantsReduced: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: easeMicro },
};

/** Stagger delay for item `index`, capped so long lists don't crawl. */
export function staggerDelay(index: number): number {
  return Math.min(index, STAGGER_MAX_ITEMS) * STAGGER_INTERVAL_S;
}

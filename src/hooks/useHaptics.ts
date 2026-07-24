"use client";

import { useCallback, useMemo } from "react";

function vibrate(pattern: number | number[]): void {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

export interface Haptics {
  /** Light tick for taps and keypad presses. */
  tap: () => void;
  /** Selection change (chips, segments, scrubbing). */
  select: () => void;
  /** Positive completion (expense added, settled up). */
  success: () => void;
  /** Something needs attention. */
  warning: () => void;
}

/** Vibration-API haptics; silently no-ops where unsupported (iOS Safari). */
export function useHaptics(): Haptics {
  const tap = useCallback(() => vibrate(3), []);
  const select = useCallback(() => vibrate(6), []);
  const success = useCallback(() => vibrate([12, 40, 12]), []);
  const warning = useCallback(() => vibrate([24, 60, 24]), []);
  return useMemo(() => ({ tap, select, success, warning }), [tap, select, success, warning]);
}

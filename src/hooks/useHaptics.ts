"use client";

import { useCallback, useMemo } from "react";

/**
 * iOS Safari has no Vibration API, but toggling a native switch control fires
 * the Taptic engine (Safari 17.4+, home-screen apps included). One hidden
 * switch is created lazily and clicked for a single "tick".
 */
let iosSwitch: HTMLInputElement | null = null;
function iosTick(): void {
  if (typeof document === "undefined") return;
  if (!iosSwitch || !iosSwitch.isConnected) {
    iosSwitch = document.createElement("input");
    iosSwitch.type = "checkbox";
    iosSwitch.setAttribute("switch", "");
    iosSwitch.tabIndex = -1;
    iosSwitch.setAttribute("aria-hidden", "true");
    iosSwitch.style.position = "fixed";
    iosSwitch.style.bottom = "0";
    iosSwitch.style.opacity = "0";
    iosSwitch.style.pointerEvents = "none";
    iosSwitch.style.width = "1px";
    iosSwitch.style.height = "1px";
    document.body.appendChild(iosSwitch);
  }
  iosSwitch.click();
}

function vibrate(pattern: number | number[]): void {
  if (typeof navigator === "undefined") return;
  if ("vibrate" in navigator && typeof navigator.vibrate === "function") {
    navigator.vibrate(pattern);
    return;
  }
  iosTick();
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

/** Vibration API on Android; native-switch Taptic tick on iOS. */
export function useHaptics(): Haptics {
  const tap = useCallback(() => vibrate(3), []);
  const select = useCallback(() => vibrate(6), []);
  const success = useCallback(() => vibrate([12, 40, 12]), []);
  const warning = useCallback(() => vibrate([24, 60, 24]), []);
  return useMemo(() => ({ tap, select, success, warning }), [tap, select, success, warning]);
}

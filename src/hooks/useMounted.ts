"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * Returns false during SSR and the first hydration render, true thereafter.
 * Use to gate client-only reads (localStorage, canvas) without hydration
 * mismatches — safer than a setState-in-effect mount flag.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

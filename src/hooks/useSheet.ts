"use client";

import { useCallback, useMemo, useState } from "react";

export interface SheetController {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

/** Convenience controller for a Sheet's open state. */
export function useSheet(initialOpen = false): SheetController {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((value) => !value), []);
  return useMemo(() => ({ isOpen, open, close, toggle }), [isOpen, open, close, toggle]);
}

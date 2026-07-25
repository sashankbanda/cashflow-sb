"use client";

import { useCallback, useEffect, useId, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useDragControls, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { easeStandard, springSmooth } from "@/components/motion/transitions";
import { IconButton } from "./IconButton";

/**
 * Global open-sheet accounting: locks body scroll and flags the document so
 * the app shell (any element with .sheet-scale-target) recedes behind the
 * sheet, iOS-modal style. Count-based to survive stacked sheets.
 */
let openSheets = 0;

function lockDocument(): void {
  openSheets += 1;
  document.documentElement.dataset.sheetOpen = "true";
  document.body.style.overflow = "hidden";
}

function unlockDocument(): void {
  openSheets = Math.max(0, openSheets - 1);
  if (openSheets === 0) {
    delete document.documentElement.dataset.sheetOpen;
    document.body.style.overflow = "";
  }
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** "content" hugs its children (max 85dvh); "full" is a near-fullscreen sheet. */
  detent?: "content" | "full";
  /** Hide the header row (title + close). The grabber stays. */
  hideHeader?: boolean;
  children: ReactNode;
  /** Extra classes for the scrollable content region. */
  contentClassName?: string;
}

/**
 * Bottom sheet: springs up over a scrim, drags to dismiss from the grabber /
 * header (velocity-aware), traps focus, closes on Escape and scrim tap.
 */
export function Sheet({
  open,
  onClose,
  title,
  detent = "content",
  hideHeader = false,
  children,
  contentClassName,
}: SheetProps) {
  // false during SSR/hydration, true once the DOM is available for the portal
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<Element | null>(null);
  const dragControls = useDragControls();
  const reducedMotion = useReducedMotion();
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    lockDocument();
    previousFocus.current = document.activeElement;
    const frame = requestAnimationFrame(() => panelRef.current?.focus({ preventScroll: true }));
    return () => {
      cancelAnimationFrame(frame);
      unlockDocument();
      if (previousFocus.current instanceof HTMLElement) {
        previousFocus.current.focus({ preventScroll: true });
      }
    };
  }, [open]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusables = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === panelRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50" onKeyDown={handleKeyDown}>
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={easeStandard}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title && !hideHeader ? titleId : undefined}
            tabIndex={-1}
            className={cn(
              "absolute inset-x-0 bottom-0 flex flex-col rounded-t-2xl glass-overlay outline-none",
              detent === "full" ? "h-[calc(100dvh-2.5rem)]" : "max-h-[85dvh]",
            )}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={reducedMotion ? { duration: 0.15 } : springSmooth}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.04, bottom: 0.7 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 500) onClose();
            }}
          >
            <div
              className="shrink-0 cursor-grab touch-none pt-2.5 pb-1 active:cursor-grabbing"
              onPointerDown={(event) => dragControls.start(event)}
            >
              <div aria-hidden className="mx-auto h-1.5 w-10 rounded-full bg-handle" />
              {!hideHeader ? (
                <div className="flex items-center justify-between gap-3 px-5 pt-3 pb-2">
                  {title ? (
                    <h2 id={titleId} className="text-title-2">
                      {title}
                    </h2>
                  ) : (
                    <span />
                  )}
                  <IconButton aria-label="Close" size="sm" variant="ghost" onClick={onClose}>
                    <X />
                  </IconButton>
                </div>
              ) : null}
            </div>
            <div
              className={cn(
                "min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8 pb-safe",
                contentClassName,
              )}
            >
              {children}
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

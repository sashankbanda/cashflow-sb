"use client";

import { useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/cn";
import { springSnappy } from "@/components/motion/transitions";

type ToastVariant = "info" | "success" | "error";

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

const DISMISS_AFTER_MS = 4000;
const MAX_VISIBLE = 3;

let nextId = 1;
let items: ReadonlyArray<ToastItem> = [];
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

function dismiss(id: number): void {
  items = items.filter((item) => item.id !== id);
  emit();
}

function push(message: string, variant: ToastVariant): void {
  const item: ToastItem = { id: nextId++, message, variant };
  items = [...items, item].slice(-MAX_VISIBLE);
  emit();
  window.setTimeout(() => dismiss(item.id), DISMISS_AFTER_MS);
}

/** Imperative toast API: `toast.success("Expense added")`. */
export const toast = {
  info: (message: string) => push(message, "info"),
  success: (message: string) => push(message, "success"),
  error: (message: string) => push(message, "error"),
};

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const iconFor: Record<ToastVariant, React.ReactNode> = {
  info: <Info className="size-4 text-fg-2" />,
  success: <CheckCircle2 className="size-4 text-positive" />,
  error: <AlertCircle className="size-4 text-negative" />,
};

/** Mounted once in the root layout; renders the active toast stack. */
export function Toaster() {
  const current = useSyncExternalStore(
    subscribe,
    () => items,
    () => items,
  );

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 px-5 pt-safe"
    >
      <div className="h-3" />
      <AnimatePresence>
        {current.map((item) => (
          <motion.button
            key={item.id}
            type="button"
            onClick={() => dismiss(item.id)}
            initial={{ opacity: 0, y: -16, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            transition={springSnappy}
            className={cn(
              "pointer-events-auto flex max-w-full items-center gap-2 rounded-full glass-floating px-4 py-2.5",
              "text-footnote text-fg-1",
            )}
          >
            {iconFor[item.variant]}
            <span className="truncate">{item.message}</span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}

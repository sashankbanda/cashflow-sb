"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Pencil, Trash2 } from "lucide-react";
import { useHaptics } from "@/hooks/useHaptics";
import { cn } from "@/lib/cn";

/**
 * iOS-style swipe actions for a list row: drag right reveals Edit, drag left
 * reveals Delete; passing the threshold fires the action and the row springs
 * back. Taps pass through untouched. Under reduced motion the row is static
 * (tap still opens the edit sheet, which contains delete).
 */
export function SwipeableRow({
  onEdit,
  onDelete,
  children,
  className,
}: {
  onEdit: () => void;
  onDelete: () => void;
  children: ReactNode;
  className?: string;
}) {
  const haptics = useHaptics();
  const reducedMotion = useReducedMotion();

  if (reducedMotion) return <div className={className}>{children}</div>;

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div aria-hidden className="absolute inset-0 flex items-stretch justify-between">
        <span className="flex w-24 items-center justify-start bg-volt pl-5 text-on-volt">
          <Pencil className="size-5" />
        </span>
        <span className="flex w-24 items-center justify-end bg-negative pr-5 text-white">
          <Trash2 className="size-5" />
        </span>
      </div>
      <motion.div
        drag="x"
        dragConstraints={{ left: -96, right: 96 }}
        dragElastic={0.15}
        dragSnapToOrigin
        onDragEnd={(_, info) => {
          if (info.offset.x <= -72) {
            haptics.select();
            onDelete();
          } else if (info.offset.x >= 72) {
            haptics.select();
            onEdit();
          }
        }}
        className="relative bg-[var(--surface-inset)]"
      >
        {children}
      </motion.div>
    </div>
  );
}

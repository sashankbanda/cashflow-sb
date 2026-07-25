"use client";

import { Children, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";
import { entranceVariants, entranceVariantsReduced, staggerDelay } from "./transitions";

export interface StaggerProps {
  children: ReactNode;
  className?: string;
  /** Extra delay before the whole group starts (seconds). */
  delay?: number;
}

/**
 * Entrance choreography for lists and widget grids: children fade up with a
 * short 20ms cascade (capped at 3 steps) so the list never feels like it's
 * crawling in. Wrap the group; each direct child animates.
 */
export function Stagger({ children, className, delay = 0 }: StaggerProps) {
  const reducedMotion = useReducedMotion();
  const variants = reducedMotion ? entranceVariantsReduced : entranceVariants;

  return (
    <div className={className}>
      {Children.map(children, (child, index) => (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={variants}
          transition={{ delay: delay + staggerDelay(index) }}
          className={cn("min-w-0")}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}

"use client";

import { motion, useReducedMotion } from "motion/react";
import { easeStandard } from "@/components/motion/transitions";

/**
 * Route transition: remounts on navigation, cross-fading the incoming screen
 * with a subtle rise. Tab switches feel like iOS crossfades, not page loads.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={easeStandard}
      className="flex min-h-dvh flex-col"
    >
      {children}
    </motion.div>
  );
}

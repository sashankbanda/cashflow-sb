"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Route transition: a quick crossfade so a navigation reads as continuous, not
 * a page reload. Kept short (140ms, opacity only) so it never delays the moment
 * the screen is readable, and skipped entirely under reduced motion.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const reducedMotion = useReducedMotion();
  if (reducedMotion) {
    return <div className="flex min-h-dvh flex-col">{children}</div>;
  }
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.14, ease: "easeOut" }}
      className="flex min-h-dvh flex-col"
    >
      {children}
    </motion.div>
  );
}

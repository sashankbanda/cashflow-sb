"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/cn";
import { useHaptics } from "@/hooks/useHaptics";
import { springSnappy } from "./transitions";

export interface PressableProps extends HTMLMotionProps<"button"> {
  /** Fire a light haptic tick on press. */
  haptic?: boolean;
}

/**
 * The global press physicality for card-level tappables (widgets, rows,
 * group cards): scale to 0.97 with a snappy spring. Renders an unstyled
 * button — bring your own surface classes.
 */
export function Pressable({
  haptic = true,
  className,
  children,
  onTapStart,
  type = "button",
  ...props
}: PressableProps) {
  const reducedMotion = useReducedMotion();
  const haptics = useHaptics();

  return (
    <motion.button
      type={type}
      whileTap={reducedMotion ? undefined : { scale: 0.97 }}
      transition={springSnappy}
      onTapStart={(event, info) => {
        if (haptic) haptics.tap();
        onTapStart?.(event, info);
      }}
      className={cn("block w-full text-left select-none", className)}
      {...props}
    >
      {children}
    </motion.button>
  );
}

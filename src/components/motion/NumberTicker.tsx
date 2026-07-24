"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";
import { springSmooth } from "./transitions";

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

function DigitColumn({ digit }: { digit: number }) {
  return (
    <span aria-hidden className="inline-block h-[1em] overflow-hidden">
      <motion.span
        className="block"
        animate={{ y: `${-digit}em` }}
        transition={springSmooth}
        initial={false}
      >
        {DIGITS.map((d) => (
          <span key={d} className="block h-[1em]">
            {d}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

export interface NumberTickerProps {
  /** Pre-formatted value, e.g. from formatMoney — digits roll, symbols stay. */
  value: string;
  className?: string;
}

/**
 * Odometer: each digit rolls vertically to its new value on change.
 * Requires leading-none context (applied here) to keep columns exactly 1em.
 */
export function NumberTicker({ value, className }: NumberTickerProps) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <span className={cn("tabular-nums", className)}>{value}</span>;
  }

  return (
    <span
      className={cn("inline-flex items-baseline leading-none tabular-nums", className)}
      aria-label={value}
      role="text"
    >
      {[...value].map((char, index) =>
        /\d/.test(char) ? (
          <DigitColumn key={`d-${index}`} digit={Number(char)} />
        ) : (
          <span key={`c-${index}`} aria-hidden className="inline-block">
            {char}
          </span>
        ),
      )}
    </span>
  );
}

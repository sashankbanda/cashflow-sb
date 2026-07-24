"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";
import { formatMoney, type FormatMoneyOptions } from "@/lib/format";

type DotMatrixSize = "display" | "title";

const sizeClasses: Record<DotMatrixSize, { symbol: string; digits: string }> = {
  display: { symbol: "text-title-2", digits: "text-display" },
  title: { symbol: "text-headline", digits: "text-title-2" },
};

/** Split "−₹1,234.50" into its sign+symbol prefix and the numeric rest. */
function splitFormatted(formatted: string): { prefix: string; digits: string } {
  const match = /^([−+]?₹)(.*)$/.exec(formatted);
  if (!match) return { prefix: "", digits: formatted };
  return { prefix: match[1] ?? "", digits: match[2] ?? "" };
}

function Digits({
  minor,
  finalMinor,
  options,
  size,
  className,
}: {
  minor: number;
  finalMinor: number;
  options?: FormatMoneyOptions;
  size: DotMatrixSize;
  className?: string;
}) {
  const { prefix, digits } = splitFormatted(formatMoney(minor, options));
  return (
    <span
      className={cn("inline-flex items-baseline gap-1.5", className)}
      aria-label={formatMoney(finalMinor, options)}
      role="text"
    >
      <span
        aria-hidden
        className={cn("font-sans font-semibold text-fg-2", sizeClasses[size].symbol)}
      >
        {prefix}
      </span>
      <span
        aria-hidden
        className={cn("font-dot font-black tabular-nums", sizeClasses[size].digits)}
      >
        {digits}
      </span>
    </span>
  );
}

function AnimatedDigits(props: {
  amountMinor: number;
  options?: FormatMoneyOptions;
  size: DotMatrixSize;
  className?: string;
}) {
  const { amountMinor } = props;
  const [displayMinor, setDisplayMinor] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const controls = animate(fromRef.current, amountMinor, {
      duration: 0.8,
      ease: [0.25, 1, 0.5, 1],
      onUpdate: (latest) => setDisplayMinor(Math.round(latest)),
    });
    fromRef.current = amountMinor;
    return () => controls.stop();
  }, [amountMinor]);

  return (
    <Digits
      minor={displayMinor}
      finalMinor={amountMinor}
      options={props.options}
      size={props.size}
      className={props.className}
    />
  );
}

export interface DotMatrixAmountProps {
  amountMinor: number;
  options?: FormatMoneyOptions;
  size?: DotMatrixSize;
  /** Count up from zero when the component mounts. */
  countUp?: boolean;
  className?: string;
}

/**
 * The signature hero numeral: dot-matrix digits (Doto) with the rupee sign in
 * the sans face, counting up on mount. Reserved for one hero number a screen.
 */
export function DotMatrixAmount({
  amountMinor,
  options,
  size = "display",
  countUp = true,
  className,
}: DotMatrixAmountProps) {
  const reducedMotion = useReducedMotion();

  if (!countUp || reducedMotion) {
    return (
      <Digits
        minor={amountMinor}
        finalMinor={amountMinor}
        options={options}
        size={size}
        className={className}
      />
    );
  }

  return (
    <AnimatedDigits amountMinor={amountMinor} options={options} size={size} className={className} />
  );
}

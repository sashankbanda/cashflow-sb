"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";
import { useHaptics } from "@/hooks/useHaptics";
import { springSmooth, staggerDelay } from "@/components/motion/transitions";
import { ChartTable, type ChartPoint } from "./chart-primitives";

export interface BarPeriodProps {
  data: ReadonlyArray<ChartPoint>;
  height?: number;
  /** Bar color via text-* (currentColor). Defaults to volt. */
  className?: string;
  formatValue?: (value: number) => string;
  caption?: string;
}

/** Rounded period bars that stagger-grow in; tap a bar to read its value. */
export function BarPeriod({
  data,
  height = 160,
  className,
  formatValue = (value) => String(value),
  caption = "Spending by period",
}: BarPeriodProps) {
  const reducedMotion = useReducedMotion();
  const haptics = useHaptics();
  const [active, setActive] = useState<number | null>(null);

  const max = Math.max(...data.map((point) => point.value), 1);

  return (
    <div className={cn("text-volt", className)}>
      <div className="flex items-end justify-between gap-1.5" style={{ height }}>
        {data.map((point, index) => {
          const isActive = active === index;
          const fraction = point.value / max;
          return (
            <button
              key={`${point.label}-${index}`}
              type="button"
              aria-label={`${point.label}: ${formatValue(point.value)}`}
              aria-pressed={isActive}
              onClick={() => {
                haptics.select();
                setActive((current) => (current === index ? null : index));
              }}
              className="ease-out group flex h-full flex-1 flex-col justify-end gap-1 transition-transform duration-150 active:scale-[0.97]"
            >
              <span
                className={cn(
                  "text-center text-micro tabular-nums transition-opacity duration-150",
                  isActive ? "text-fg-1 opacity-100" : "text-fg-3 opacity-0",
                )}
              >
                {formatValue(point.value)}
              </span>
              <motion.span
                className={cn(
                  "block w-full origin-bottom rounded-t-sm bg-current",
                  isActive ? "opacity-100 shadow-glow-volt" : "opacity-70 group-hover:opacity-90",
                )}
                style={{ height: `${Math.max(fraction * 100, 2)}%` }}
                initial={reducedMotion ? false : { scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ ...springSmooth, delay: reducedMotion ? 0 : staggerDelay(index) }}
              />
            </button>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between gap-1.5" aria-hidden>
        {data.map((point, index) => (
          <span
            key={`${point.label}-${index}`}
            className="flex-1 truncate text-center text-micro text-fg-3"
          >
            {point.label}
          </span>
        ))}
      </div>
      <ChartTable caption={caption} rows={data} format={formatValue} />
    </div>
  );
}

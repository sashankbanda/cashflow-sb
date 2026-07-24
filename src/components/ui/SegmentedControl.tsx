"use client";

import { useId, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";
import { springSnappy } from "@/components/motion/transitions";

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
}

export interface SegmentedControlProps<T extends string> {
  options: ReadonlyArray<SegmentOption<T>>;
  value: T;
  onChange: (value: T) => void;
  "aria-label": string;
  className?: string;
}

/** Glass pill slider with a spring-gliding thumb (split types, periods). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  ...props
}: SegmentedControlProps<T>) {
  const layoutId = useId();
  const reducedMotion = useReducedMotion();

  const moveBy = (delta: number) => {
    const index = options.findIndex((option) => option.value === value);
    const next = options[(index + delta + options.length) % options.length];
    if (next) onChange(next.value);
  };

  return (
    <div
      role="radiogroup"
      aria-label={props["aria-label"]}
      className={cn("flex rounded-full glass-soft p-1", className)}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          event.preventDefault();
          moveBy(1);
        } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          event.preventDefault();
          moveBy(-1);
        }
      }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative h-9 flex-1 rounded-full px-3 text-footnote select-none",
              "transition-colors duration-150",
              selected ? "text-fg-1" : "text-fg-3 hover:text-fg-2",
            )}
          >
            {selected ? (
              <motion.span
                layoutId={layoutId}
                aria-hidden
                transition={reducedMotion ? { duration: 0 } : springSnappy}
                className="absolute inset-0 rounded-full border border-glass-border bg-glass"
              />
            ) : null}
            <span className="relative">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

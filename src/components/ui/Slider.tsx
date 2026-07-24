"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";

export interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  "aria-label": string;
  disabled?: boolean;
  className?: string;
}

/** Native range input with a volt fill track and a large touch thumb. */
export function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  disabled,
  className,
  ...props
}: SliderProps) {
  const percent = max === min ? 0 : ((value - min) / (max - min)) * 100;
  return (
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      aria-label={props["aria-label"]}
      onChange={(event) => onChange(Number(event.target.value))}
      className={cn("cf-slider disabled:opacity-40", className)}
      style={{ "--slider-fill": `${percent}%` } as CSSProperties}
    />
  );
}

"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

export interface SparklineProps {
  data: ReadonlyArray<number>;
  /** Sizing via classes (e.g. "h-10 w-28"); color via text-* (currentColor). */
  className?: string;
  /** Fill the area under the line with a fade of the stroke color. */
  area?: boolean;
}

const VIEW_W = 100;
const VIEW_H = 32;
const PAD = 2;

/** Tiny trend line for widgets. Pure presentation — no axes, no interaction. */
export function Sparkline({ data, className, area = true }: SparklineProps) {
  const gradientId = useId();

  if (data.length < 2) {
    return <span className={cn("inline-block", className)} aria-hidden />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = (VIEW_W - PAD * 2) / (data.length - 1);

  const points = data.map((value, index) => {
    const x = PAD + index * stepX;
    const y = PAD + (VIEW_H - PAD * 2) * (1 - (value - min) / range);
    return [x, y] as const;
  });

  const line = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");
  const first = points[0];
  const last = points[points.length - 1];
  const areaPath =
    first && last
      ? `${line} L${last[0].toFixed(2)},${VIEW_H - PAD} L${first[0].toFixed(2)},${VIEW_H - PAD} Z`
      : "";

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="none"
      aria-hidden
      className={cn("block", className)}
    >
      {area ? (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${gradientId})`} />
        </>
      ) : null}
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

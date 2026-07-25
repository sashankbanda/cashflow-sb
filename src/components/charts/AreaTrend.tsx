"use client";

import { useId, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { area, curveMonotoneX, line } from "d3-shape";
import { scaleLinear } from "d3-scale";
import { cn } from "@/lib/cn";
import { useHaptics } from "@/hooks/useHaptics";
import { ChartTable, thinLabels, type ChartPoint } from "./chart-primitives";

const W = 320;
const PAD = { top: 12, right: 8, bottom: 20, left: 8 };

export interface AreaTrendProps {
  data: ReadonlyArray<ChartPoint>;
  /** Plot height in px (viewBox units). */
  height?: number;
  /** Line/fill color via text-* (currentColor). Defaults to volt. */
  className?: string;
  formatValue?: (value: number) => string;
  /** Accessible caption for the data-table fallback. */
  caption?: string;
}

/** Gradient area chart with a glowing line, draw-in, and finger-scrub tooltip. */
export function AreaTrend({
  data,
  height = 160,
  className,
  formatValue = (value) => String(value),
  caption = "Trend over time",
}: AreaTrendProps) {
  const gradientId = useId();
  const reducedMotion = useReducedMotion();
  const haptics = useHaptics();
  const svgRef = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState<number | null>(null);

  if (data.length < 2) {
    return (
      <div
        className={cn("flex items-center justify-center text-footnote text-fg-3", className)}
        style={{ height }}
      >
        Not enough data yet
      </div>
    );
  }

  const H = height;
  const values = data.map((point) => point.value);
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const x = scaleLinear()
    .domain([0, data.length - 1])
    .range([PAD.left, W - PAD.right]);
  const y = scaleLinear()
    .domain([min, max || 1])
    .nice()
    .range([H - PAD.bottom, PAD.top]);

  const points = data.map((point, index) => ({
    ...point,
    px: x(index),
    py: y(point.value),
    xPct: (x(index) / W) * 100,
    yPct: (y(point.value) / H) * 100,
  }));

  const linePath =
    line<(typeof points)[number]>()
      .x((point) => point.px)
      .y((point) => point.py)
      .curve(curveMonotoneX)(points) ?? "";
  const areaPath =
    area<(typeof points)[number]>()
      .x((point) => point.px)
      .y0(H - PAD.bottom)
      .y1((point) => point.py)
      .curve(curveMonotoneX)(points) ?? "";

  const tickIndices = thinLabels(data, 5);

  const scrubTo = (clientX: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const fraction = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const index = Math.round(fraction * (data.length - 1));
    setActive((current) => {
      if (current !== index) haptics.select();
      return index;
    });
  };

  const activePoint = active !== null ? points[active] : undefined;

  return (
    <div className={cn("relative text-volt", className)}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={caption}
        className="block w-full touch-none"
        style={{ height }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          scrubTo(event.clientX);
        }}
        onPointerMove={(event) => {
          if (event.buttons === 0 && event.pointerType === "mouse") return;
          scrubTo(event.clientX);
        }}
        onPointerUp={() => setActive(null)}
        onPointerCancel={() => setActive(null)}
        onPointerLeave={() => setActive(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path
          d={areaPath}
          fill={`url(#${gradientId})`}
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
        <motion.path
          d={linePath}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          style={{ filter: "drop-shadow(0 0 6px currentColor)" }}
          initial={reducedMotion ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, ease: [0.32, 0.72, 0, 1] }}
        />
      </svg>

      {/* Scrub marker + tooltip — HTML overlay so the dot stays circular. */}
      {activePoint ? (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 bottom-5 w-px bg-tint"
            style={{ left: `${activePoint.xPct}%` }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current shadow-glow-volt ring-2 ring-canvas"
            style={{ left: `${activePoint.xPct}%`, top: `${activePoint.yPct}%` }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-sm glass px-2 py-1 text-center whitespace-nowrap"
            style={{
              left: `${Math.min(88, Math.max(12, activePoint.xPct))}%`,
              top: `${activePoint.yPct}%`,
            }}
          >
            <p className="text-caption font-semibold text-fg-1 tabular-nums">
              {formatValue(activePoint.value)}
            </p>
            <p className="text-micro text-fg-3">{activePoint.label}</p>
          </div>
        </>
      ) : null}

      <div className="mt-1 flex justify-between px-1" aria-hidden>
        {tickIndices.map((index) => (
          <span key={index} className="text-micro text-fg-3">
            {data[index]?.label}
          </span>
        ))}
      </div>

      <ChartTable caption={caption} rows={data} format={formatValue} />
    </div>
  );
}

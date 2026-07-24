"use client";

import { useId, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { arc, pie } from "d3-shape";
import { cn } from "@/lib/cn";
import { formatPercent } from "@/lib/format";
import { useHaptics } from "@/hooks/useHaptics";
import { PALETTE_HEX, type Palette } from "@/components/ui/palette";
import { ChartTable } from "./chart-primitives";

export interface DonutDatum {
  label: string;
  value: number;
  palette: Palette;
}

export interface DonutCategoryProps {
  data: ReadonlyArray<DonutDatum>;
  size?: number;
  formatValue?: (value: number) => string;
  centerLabel?: string;
  caption?: string;
}

const SIZE = 200;

/** Donut with gradient arcs and a live center readout; tap a slice to focus it. */
export function DonutCategory({
  data,
  size = SIZE,
  formatValue = (value) => String(value),
  centerLabel = "Total",
  caption = "Spending by category",
}: DonutCategoryProps) {
  const baseId = useId();
  const reducedMotion = useReducedMotion();
  const haptics = useHaptics();
  const [active, setActive] = useState<number | null>(null);

  const total = data.reduce((sum, datum) => sum + datum.value, 0);
  if (total <= 0) {
    return (
      <div
        className="flex items-center justify-center text-footnote text-fg-3"
        style={{ height: size }}
      >
        Nothing to chart yet
      </div>
    );
  }

  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const outer = SIZE / 2 - 6;
  const inner = outer - 26;

  const arcs = pie<DonutDatum>()
    .sort(null)
    .value((datum) => datum.value)(data as DonutDatum[]);

  const arcGen = arc<(typeof arcs)[number]>().innerRadius(inner).cornerRadius(3);

  const focused = active !== null ? data[active] : undefined;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={caption}
          style={{ width: size, height: size }}
          className="block -rotate-90"
        >
          <defs>
            {data.map((datum, index) => {
              const [c0, c1] = PALETTE_HEX[datum.palette];
              return (
                <linearGradient
                  key={`${baseId}-${index}`}
                  id={`${baseId}-${index}`}
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="1"
                >
                  <stop offset="0%" stopColor={c0} />
                  <stop offset="100%" stopColor={c1} />
                </linearGradient>
              );
            })}
          </defs>
          {arcs.map((slice, index) => {
            const isActive = active === index;
            const d = arcGen.outerRadius(isActive ? outer : outer - 4)(slice) ?? "";
            return (
              <motion.path
                key={index}
                d={d}
                fill={`url(#${baseId}-${index})`}
                transform={`translate(${cx}, ${cy})`}
                className="cursor-pointer"
                style={{ opacity: active === null || isActive ? 1 : 0.4 }}
                initial={reducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: active === null || isActive ? 1 : 0.4 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                onClick={() => {
                  haptics.select();
                  setActive((current) => (current === index ? null : index));
                }}
              />
            );
          })}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-caption text-fg-3 uppercase">
            {focused ? focused.label : centerLabel}
          </p>
          <p className="text-title-2 font-semibold text-fg-1 tabular-nums">
            {formatValue(focused ? focused.value : total)}
          </p>
          {focused ? (
            <p className="text-footnote text-fg-3 tabular-nums">
              {formatPercent(focused.value / total)}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex w-full flex-wrap justify-center gap-x-4 gap-y-1.5">
        {data.map((datum, index) => (
          <button
            key={`${datum.label}-${index}`}
            type="button"
            aria-pressed={active === index}
            onClick={() => {
              haptics.select();
              setActive((current) => (current === index ? null : index));
            }}
            className="ease-out flex items-center gap-1.5 transition-opacity duration-150"
            style={{ opacity: active === null || active === index ? 1 : 0.5 }}
          >
            <span
              aria-hidden
              className="size-2.5 rounded-full"
              style={{
                backgroundImage: `linear-gradient(135deg, ${PALETTE_HEX[datum.palette][0]}, ${PALETTE_HEX[datum.palette][1]})`,
              }}
            />
            <span className="text-footnote text-fg-2">{datum.label}</span>
          </button>
        ))}
      </div>

      <ChartTable caption={caption} rows={data} format={formatValue} />
    </div>
  );
}

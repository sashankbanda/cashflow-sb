"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/cn";
import { formatISODate, monthGrid, WEEKDAY_LABELS } from "@/lib/dates";
import { useHaptics } from "@/hooks/useHaptics";
import { ChartTable } from "./chart-primitives";

export interface HeatmapDatum {
  /** yyyy-mm-dd */
  date: string;
  value: number;
}

export interface HeatmapCalendarProps {
  /** The month to render (any day within it). */
  month: Date;
  data: ReadonlyArray<HeatmapDatum>;
  /** Cell color via text-* (currentColor). Defaults to volt. */
  className?: string;
  formatValue?: (value: number) => string;
  caption?: string;
}

/** Month calendar whose cells deepen with spend; tap a day to read its total. */
export function HeatmapCalendar({
  month,
  data,
  className,
  formatValue = (value) => String(value),
  caption = "Daily spending",
}: HeatmapCalendarProps) {
  const haptics = useHaptics();
  const [active, setActive] = useState<string | null>(null);

  const byDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const datum of data) map.set(datum.date, datum.value);
    return map;
  }, [data]);

  const cells = useMemo(() => monthGrid(month), [month]);
  const max = Math.max(...data.map((datum) => datum.value), 1);

  const activeValue = active ? (byDate.get(active) ?? 0) : null;

  return (
    <div className={cn("text-volt", className)}>
      <div className="flex h-5 items-center justify-between px-0.5">
        <p className="text-caption text-fg-3">{format(month, "MMMM yyyy")}</p>
        {active ? (
          <p className="text-caption text-fg-2 tabular-nums">
            {format(parseISO(active), "d MMM")} · {formatValue(activeValue ?? 0)}
          </p>
        ) : null}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1" aria-hidden>
        {WEEKDAY_LABELS.map((label, index) => (
          <span key={index} className="text-center text-micro text-fg-3">
            {label}
          </span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((cell, index) => {
          if (!cell) return <span key={`pad-${index}`} aria-hidden />;
          const key = formatISODate(cell);
          const value = byDate.get(key) ?? 0;
          const intensity = value > 0 ? 0.18 + 0.82 * (value / max) : 0;
          const isActive = active === key;
          return (
            <button
              key={key}
              type="button"
              aria-label={`${format(cell, "d MMMM")}: ${formatValue(value)}`}
              aria-pressed={isActive}
              onClick={() => {
                haptics.select();
                setActive((current) => (current === key ? null : key));
              }}
              className={cn(
                "ease-out relative aspect-square rounded-sm transition-transform duration-150 active:scale-90",
                value > 0 ? "bg-current" : "bg-glass-soft",
                isActive && "ring-2 ring-fg-on-grad-2",
              )}
              style={value > 0 ? { opacity: intensity } : undefined}
            >
              <span className="sr-only">{cell.getDate()}</span>
            </button>
          );
        })}
      </div>

      <ChartTable
        caption={caption}
        rows={data.map((datum) => ({ label: datum.date, value: datum.value }))}
        format={formatValue}
      />
    </div>
  );
}

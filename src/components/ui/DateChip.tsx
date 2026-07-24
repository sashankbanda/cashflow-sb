"use client";

import { useState } from "react";
import { addMonths, format, isAfter, isSameDay, isSameMonth, isToday, startOfDay } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDayLabel, monthGrid, WEEKDAY_LABELS } from "@/lib/dates";
import { useSheet } from "@/hooks/useSheet";
import { Chip } from "./Chip";
import { IconButton } from "./IconButton";
import { Sheet } from "./Sheet";

export interface DateChipProps {
  value: Date;
  onChange: (date: Date) => void;
  /** Latest selectable day (defaults to today — expenses aren't in the future). */
  maxDate?: Date;
  className?: string;
}

/** Chip showing the selected day; opens a calendar sheet. */
export function DateChip({ value, onChange, maxDate, className }: DateChipProps) {
  const sheet = useSheet();
  const [viewMonth, setViewMonth] = useState(() => startOfDay(value));
  const max = maxDate ? startOfDay(maxDate) : startOfDay(new Date());

  const openCalendar = () => {
    setViewMonth(startOfDay(value));
    sheet.open();
  };

  const cells = monthGrid(viewMonth);
  const nextMonthDisabled =
    isAfter(startOfDay(addMonths(viewMonth, 1)), max) && !isSameMonth(addMonths(viewMonth, 1), max);

  return (
    <>
      <Chip
        icon={<CalendarDays />}
        onClick={openCalendar}
        className={className}
        aria-haspopup="dialog"
      >
        {formatDayLabel(value)}
      </Chip>

      <Sheet open={sheet.isOpen} onClose={sheet.close} title="Date">
        <div className="flex items-center justify-between pb-4">
          <IconButton
            aria-label="Previous month"
            size="sm"
            onClick={() => setViewMonth((month) => addMonths(month, -1))}
          >
            <ChevronLeft />
          </IconButton>
          <p className="text-headline">{format(viewMonth, "MMMM yyyy")}</p>
          <IconButton
            aria-label="Next month"
            size="sm"
            disabled={nextMonthDisabled}
            onClick={() => setViewMonth((month) => addMonths(month, 1))}
          >
            <ChevronRight />
          </IconButton>
        </div>

        <div className="grid grid-cols-7 gap-y-1 pb-2" role="grid" aria-label="Calendar">
          {WEEKDAY_LABELS.map((weekday, index) => (
            <span
              key={`${weekday}-${index}`}
              aria-hidden
              className="flex h-8 items-center justify-center text-caption text-fg-3 uppercase"
            >
              {weekday}
            </span>
          ))}
          {cells.map((cell, index) => {
            if (!cell) {
              return <span key={`pad-${index}`} aria-hidden />;
            }
            const selected = isSameDay(cell, value);
            const disabled = isAfter(cell, max);
            return (
              <button
                key={cell.toISOString()}
                type="button"
                disabled={disabled}
                aria-pressed={selected}
                aria-label={format(cell, "d MMMM yyyy")}
                onClick={() => {
                  onChange(cell);
                  sheet.close();
                }}
                className={cn(
                  "mx-auto flex size-10 items-center justify-center rounded-full text-body tabular-nums",
                  "transition-colors duration-150 active:scale-[0.97]",
                  selected
                    ? "bg-volt font-semibold text-on-volt shadow-glow-volt"
                    : isToday(cell)
                      ? "border border-volt/60 text-fg-1"
                      : "text-fg-2 hover:bg-glass-soft",
                  disabled && "pointer-events-none opacity-30",
                )}
              >
                {cell.getDate()}
              </button>
            );
          })}
        </div>
      </Sheet>
    </>
  );
}

"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { endOfMonth, format, formatISO, startOfMonth, startOfYear, subMonths } from "date-fns";
import { CalendarDays, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { TextField } from "@/components/ui/TextField";
import { cn } from "@/lib/cn";
import type { Period } from "@/lib/period";

const day = (date: Date): string => formatISO(date, { representation: "date" });

/**
 * The one time-range control: This month, Last month, any specific month, this
 * year, all time, or a custom from–to. Writes ?from=&to= to the URL so every
 * server component on the screen re-renders for the chosen window and the
 * choice survives refresh and back/forward.
 */
export function PeriodPicker({ period }: { period: Period }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(period.isDefault ? "" : period.from);
  const [customTo, setCustomTo] = useState(period.isDefault ? "" : period.to);

  const apply = (from: string | null, to: string | null) => {
    setOpen(false);
    router.replace(from && to ? `${pathname}?from=${from}&to=${to}` : pathname, { scroll: false });
  };

  const now = new Date();
  const months = Array.from({ length: 12 }, (_, index) => subMonths(now, index));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-footnote font-medium",
          "ease-out transition-transform duration-150 active:scale-[0.97]",
          period.isDefault ? "glass-soft text-fg-2" : "bg-volt text-on-volt shadow-glow-volt",
        )}
      >
        <CalendarDays className="size-4" />
        {period.label}
        <ChevronDown className="size-3.5" />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Show me">
        <div className="space-y-5 pt-1">
          <div className="flex flex-wrap gap-2">
            <Button variant={period.isDefault ? "volt" : "glass"} size="sm" onClick={() => apply(null, null)}>
              This month
            </Button>
            <Button
              variant="glass"
              size="sm"
              onClick={() => {
                const last = subMonths(now, 1);
                apply(day(startOfMonth(last)), day(endOfMonth(last)));
              }}
            >
              Last month
            </Button>
            <Button
              variant="glass"
              size="sm"
              onClick={() => apply(day(startOfMonth(subMonths(now, 2))), day(now))}
            >
              Last 3 months
            </Button>
            <Button variant="glass" size="sm" onClick={() => apply(day(startOfYear(now)), day(now))}>
              This year
            </Button>
            <Button variant="glass" size="sm" onClick={() => apply("1970-01-01", day(now))}>
              All time
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-caption text-fg-3 uppercase">Pick a month</p>
            <div className="flex flex-wrap gap-2">
              {months.map((month) => (
                <Button
                  key={day(month)}
                  variant="glass"
                  size="sm"
                  onClick={() => apply(day(startOfMonth(month)), day(endOfMonth(month)))}
                >
                  {format(month, "MMM yyyy")}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-caption text-fg-3 uppercase">Custom range</p>
            <div className="flex gap-2">
              <TextField
                label="From"
                type="date"
                value={customFrom}
                onChange={(event) => setCustomFrom(event.target.value)}
                className="flex-1"
              />
              <TextField
                label="To"
                type="date"
                value={customTo}
                onChange={(event) => setCustomTo(event.target.value)}
                className="flex-1"
              />
            </div>
            <Button
              variant="volt"
              block
              disabled={customFrom === "" || customTo === "" || customFrom > customTo}
              onClick={() => apply(customFrom, customTo)}
            >
              Show this range
            </Button>
          </div>
        </div>
      </Sheet>
    </>
  );
}

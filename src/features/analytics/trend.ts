import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek } from "date-fns";
import { formatISODate } from "@/lib/dates";

/** Insight period keys and their trailing-window lengths. */
export type InsightPeriod = "week" | "month" | "quarter" | "year";

export interface PeriodDef {
  key: InsightPeriod;
  label: string;
  days: number;
}

export const INSIGHT_PERIODS: readonly PeriodDef[] = [
  { key: "week", label: "W", days: 7 },
  { key: "month", label: "M", days: 30 },
  { key: "quarter", label: "3M", days: 90 },
  { key: "year", label: "Y", days: 365 },
];

export interface TrendPoint {
  label: string;
  value: number;
}

export function periodDays(period: InsightPeriod): number {
  return INSIGHT_PERIODS.find((entry) => entry.key === period)?.days ?? 30;
}

export interface PeriodWindow {
  from: string;
  to: string;
  prevFrom: string;
  prevTo: string;
}

/** The current trailing window and the equal-length window right before it. */
export function periodWindow(today: string, days: number): PeriodWindow {
  const to = today;
  const from = formatISODate(addDays(parseISO(to), -(days - 1)));
  const prevTo = formatISODate(addDays(parseISO(from), -1));
  const prevFrom = formatISODate(addDays(parseISO(from), -days));
  return { from, to, prevFrom, prevTo };
}

/** Fill a range's daily spend densely (zero where no expenses fell). */
export function denseDaily(
  daily: ReadonlyArray<{ date: string; amountMinor: number }>,
  from: string,
  to: string,
): Array<{ date: string; value: number }> {
  const byDate = new Map(daily.map((row) => [row.date, row.amountMinor]));
  const start = parseISO(from);
  const total = differenceInCalendarDays(parseISO(to), start) + 1;
  return Array.from({ length: Math.max(0, total) }, (_, index) => {
    const date = formatISODate(addDays(start, index));
    return { date, value: byDate.get(date) ?? 0 };
  });
}

/** Bucket dense daily spend into a chart-friendly number of trend points. */
export function bucketTrend(
  dense: ReadonlyArray<{ date: string; value: number }>,
  period: InsightPeriod,
): TrendPoint[] {
  if (period === "week" || period === "month") {
    return dense.map((day) => ({
      label: format(parseISO(day.date), period === "week" ? "EEE" : "d"),
      value: day.value,
    }));
  }

  if (period === "quarter") {
    const buckets = new Map<string, number>();
    for (const day of dense) {
      const weekStart = formatISODate(startOfWeek(parseISO(day.date), { weekStartsOn: 1 }));
      buckets.set(weekStart, (buckets.get(weekStart) ?? 0) + day.value);
    }
    return [...buckets.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([week, value]) => ({ label: format(parseISO(week), "d MMM"), value }));
  }

  // year → monthly buckets
  const buckets = new Map<string, number>();
  for (const day of dense) {
    const monthKey = day.date.slice(0, 7);
    buckets.set(monthKey, (buckets.get(monthKey) ?? 0) + day.value);
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, value]) => ({ label: format(parseISO(`${month}-01`), "MMM"), value }));
}

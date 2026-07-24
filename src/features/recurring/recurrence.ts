import { addDays, addWeeks, addYears, parseISO } from "date-fns";
import { formatISODate } from "@/lib/dates";

/** How often a rule repeats. */
export type Frequency = "daily" | "weekly" | "monthly" | "yearly";

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

/** Adverb form for sentences: "Repeats monthly". */
export const FREQUENCY_ADVERB: Record<Frequency, string> = {
  daily: "daily",
  weekly: "weekly",
  monthly: "monthly",
  yearly: "yearly",
};

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * Next occurrence date after `current`. Monthly steps use a stored `anchorDay`
 * so a rule anchored on the 31st clamps to Feb 28 but *recovers* to Mar 31 —
 * it never drifts earlier permanently. daily/weekly/yearly are plain offsets
 * (yearly clamps Feb 29 → Feb 28 in common years).
 */
export function advanceDate(
  current: string,
  frequency: Frequency,
  interval: number,
  anchorDay: number,
): string {
  const date = parseISO(current);
  const step = Math.max(1, Math.trunc(interval));

  switch (frequency) {
    case "daily":
      return formatISODate(addDays(date, step));
    case "weekly":
      return formatISODate(addWeeks(date, step));
    case "yearly":
      return formatISODate(addYears(date, step));
    case "monthly": {
      const total = date.getMonth() + step;
      const targetYear = date.getFullYear() + Math.floor(total / 12);
      const targetMonth = ((total % 12) + 12) % 12;
      const day = Math.min(anchorDay, daysInMonth(targetYear, targetMonth));
      return formatISODate(new Date(targetYear, targetMonth, day));
    }
  }
}

/** The day-of-month a monthly rule should anchor to (from its first run). */
export function anchorDayOf(startsOn: string): number {
  return parseISO(startsOn).getDate();
}

export interface OccurrenceRule {
  nextRunOn: string;
  frequency: Frequency;
  interval: number;
  anchorDay: number;
  endsOn?: string | null;
}

/**
 * The next `count` scheduled dates for a rule, starting at `nextRunOn` and
 * stopping at `endsOn`. Pure — powers the "Upcoming" preview.
 */
export function upcomingDates(rule: OccurrenceRule, count: number): string[] {
  const dates: string[] = [];
  let cursor = rule.nextRunOn;
  for (let i = 0; i < count; i += 1) {
    if (rule.endsOn && cursor > rule.endsOn) break;
    dates.push(cursor);
    cursor = advanceDate(cursor, rule.frequency, rule.interval, rule.anchorDay);
  }
  return dates;
}

/** Whether a rule has run past its end date (no more occurrences). */
export function isEnded(rule: OccurrenceRule): boolean {
  return Boolean(rule.endsOn && rule.nextRunOn > rule.endsOn);
}

import {
  format,
  formatISO,
  getDaysInMonth,
  isSameYear,
  isToday,
  isYesterday,
  startOfMonth,
} from "date-fns";

/** Local-timezone calendar date as yyyy-mm-dd (for date columns). */
export function formatISODate(date: Date): string {
  return formatISO(date, { representation: "date" });
}

/** Time-of-day greeting for the given IANA timezone. */
export function greetingFor(timezone: string, now = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: timezone,
    }).format(now),
  );
  if (hour < 5) return "Late night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

/** Human day label: "Today", "Yesterday", "Sat, 12 Jul" (+ year when not current). */
export function formatDayLabel(date: Date): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return isSameYear(date, new Date()) ? format(date, "EEE, d MMM") : format(date, "d MMM yyyy");
}

/** Section header label for day-grouped lists: "Today", "Yesterday", "12 July". */
export function formatSectionLabel(date: Date): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return isSameYear(date, new Date()) ? format(date, "d MMMM") : format(date, "d MMMM yyyy");
}

/** The current calendar month resolved in a specific IANA timezone. */
export interface MonthWindow {
  /** "2026-07" — stable key for the month in this timezone. */
  monthKey: string;
  /** "July 2026" — display label. */
  monthLabel: string;
  /** First day of the month, "2026-07-01". */
  start: string;
  /** Last day of the month, "2026-07-31". */
  end: string;
  /** Today in this timezone, "2026-07-24". */
  today: string;
  /** 1-based day of the month (1..daysInMonth). */
  dayOfMonth: number;
  daysInMonth: number;
  /** Days left in the month counting today (daysInMonth − dayOfMonth + 1). */
  daysRemaining: number;
}

function dateParts(timezone: string, now: Date): { year: number; month: number; day: number } {
  const format = (tz: string) =>
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = format(timezone);
  } catch {
    parts = format("UTC");
  }
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");
  return { year: get("year"), month: get("month"), day: get("day") };
}

/**
 * Resolve the current month boundary in the user's timezone. All budget and
 * month-spend math derives its window from here so a user in Asia/Kolkata and
 * one in America/New_York roll over on their own local first-of-month.
 */
export function monthWindow(timezone: string, now: Date = new Date()): MonthWindow {
  const { year, month, day } = dateParts(timezone, now);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const mm = String(month).padStart(2, "0");
  const monthKey = `${year}-${mm}`;
  const monthLabel = new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
  return {
    monthKey,
    monthLabel,
    start: `${monthKey}-01`,
    end: `${monthKey}-${String(daysInMonth).padStart(2, "0")}`,
    today: `${monthKey}-${String(day).padStart(2, "0")}`,
    dayOfMonth: day,
    daysInMonth,
    daysRemaining: daysInMonth - day + 1,
  };
}

export const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;

/**
 * Calendar month as a flat cell list (Sunday-first). Leading `null`s pad the
 * first week so cells map 1:1 onto a 7-column grid.
 */
export function monthGrid(monthAnchor: Date): Array<Date | null> {
  const first = startOfMonth(monthAnchor);
  const leading = first.getDay(); // 0 = Sunday
  const total = getDaysInMonth(monthAnchor);
  const cells: Array<Date | null> = Array.from({ length: leading }, () => null);
  for (let day = 1; day <= total; day += 1) {
    cells.push(new Date(first.getFullYear(), first.getMonth(), day));
  }
  return cells;
}

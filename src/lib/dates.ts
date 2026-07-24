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

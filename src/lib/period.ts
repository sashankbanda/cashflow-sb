import { endOfMonth, format, formatISO, parseISO, startOfMonth } from "date-fns";

/** A resolved viewing window for money screens, driven by ?from=&to= params. */
export interface Period {
  from: string;
  to: string;
  /** Human label: "This month", "Jul 2026", "5 Mar – 12 Apr 2026"… */
  label: string;
  /** True when no explicit range was chosen (current month so far). */
  isDefault: boolean;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Parse ?from=&to= into a safe period; anything invalid → this month. */
export function resolvePeriod(params: { from?: string; to?: string }): Period {
  const now = new Date();
  const defaultFrom = formatISO(startOfMonth(now), { representation: "date" });
  const defaultTo = formatISO(now, { representation: "date" });

  const from = params.from && ISO_DAY.test(params.from) ? params.from : null;
  const to = params.to && ISO_DAY.test(params.to) ? params.to : null;
  if (!from || !to || from > to) {
    return { from: defaultFrom, to: defaultTo, label: "This month", isDefault: true };
  }

  const fromDate = parseISO(from);
  const toDate = parseISO(to);
  const isWholeMonth =
    formatISO(startOfMonth(fromDate), { representation: "date" }) === from &&
    formatISO(endOfMonth(fromDate), { representation: "date" }) === to;
  const label = isWholeMonth
    ? format(fromDate, "MMM yyyy")
    : from === "1970-01-01"
      ? "All time"
      : `${format(fromDate, "d MMM")} – ${format(toDate, "d MMM yyyy")}`;

  return { from, to, label, isDefault: false };
}

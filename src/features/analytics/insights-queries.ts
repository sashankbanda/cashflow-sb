import "server-only";
import { and, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { monthWindow } from "@/lib/dates";
import { db } from "@/server/db";
import { expenseSplits, expenses, users } from "@/server/db/schema";
import { asPalette, type Palette } from "@/components/ui/palette";
import { getDailySpend, getPersonalSpendTotal } from "@/features/expenses/personal-queries";
import {
  bucketTrend,
  denseDaily,
  INSIGHT_PERIODS,
  periodDays,
  periodWindow,
  type InsightPeriod,
  type TrendPoint,
} from "./trend";

export { INSIGHT_PERIODS };
export type { InsightPeriod, TrendPoint };

export interface InsightCategory {
  id: string;
  name: string;
  icon: string;
  gradient: string;
  amountMinor: number;
  /** Fraction of the period total. */
  share: number;
  /** Change vs the previous period, or null when there's no prior spend. */
  deltaFraction: number | null;
}

export interface InsightsPayload {
  period: InsightPeriod;
  from: string;
  to: string;
  days: number;
  totalMinor: number;
  prevTotalMinor: number;
  deltaFraction: number | null;
  avgPerDayMinor: number;
  trend: TrendPoint[];
  categories: InsightCategory[];
  donut: Array<{ label: string; value: number; palette: Palette }>;
  biggest: { description: string; amountMinor: number; date: string } | null;
  /** ISO date inside the calendar month the heatmap renders. */
  heatmapMonth: string;
  heatmap: Array<{ date: string; value: number }>;
}

async function userTimezone(userId: string): Promise<string> {
  const row = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { timezone: true },
  });
  return row?.timezone ?? "Asia/Kolkata";
}

interface CategorySpendRow {
  categoryId: string;
  name: string;
  icon: string;
  gradient: string;
  total: number;
}

/** This-user category spend within a date range (personal + group shares). */
async function categorySpendInRange(
  userId: string,
  range: { from: string; to: string },
): Promise<CategorySpendRow[]> {
  const rows = await db
    .select({
      categoryId: expenses.categoryId,
      name: sql<string | null>`cat.name`,
      icon: sql<string | null>`cat.icon`,
      gradient: sql<string | null>`cat.gradient`,
      total: sql<string>`sum(${expenseSplits.amountMinor})`,
    })
    .from(expenseSplits)
    .innerJoin(expenses, eq(expenseSplits.expenseId, expenses.id))
    .leftJoin(sql`categories cat`, sql`cat.id = ${expenses.categoryId}`)
    .where(
      and(
        eq(expenseSplits.userId, userId),
        isNull(expenses.deletedAt),
        gte(expenses.expenseDate, range.from),
        lte(expenses.expenseDate, range.to),
      ),
    )
    .groupBy(expenses.categoryId, sql`cat.name`, sql`cat.icon`, sql`cat.gradient`);

  return rows.map((row) => ({
    categoryId: row.categoryId ?? "uncategorized",
    name: row.name ?? "Other",
    icon: row.icon ?? "shapes",
    gradient: row.gradient ?? "ocean",
    total: Number(row.total),
  }));
}

async function biggestExpenseInRange(
  userId: string,
  range: { from: string; to: string },
): Promise<{ description: string; amountMinor: number; date: string } | null> {
  const [row] = await db
    .select({
      description: expenses.description,
      amountMinor: expenseSplits.amountMinor,
      date: expenses.expenseDate,
    })
    .from(expenseSplits)
    .innerJoin(expenses, eq(expenseSplits.expenseId, expenses.id))
    .where(
      and(
        eq(expenseSplits.userId, userId),
        isNull(expenses.deletedAt),
        gte(expenses.expenseDate, range.from),
        lte(expenses.expenseDate, range.to),
      ),
    )
    .orderBy(desc(expenseSplits.amountMinor))
    .limit(1);
  return row
    ? { description: row.description, amountMinor: row.amountMinor, date: row.date }
    : null;
}

/** Everything the Insights screen needs for one period, in a single pass. */
export async function getSpendingInsights(
  userId: string,
  period: InsightPeriod,
): Promise<InsightsPayload> {
  const timezone = await userTimezone(userId);
  const now = monthWindow(timezone);
  const days = periodDays(period);
  const { from, to, prevFrom, prevTo } = periodWindow(now.today, days);

  const [total, prevTotal, daily, currentCats, prevCats, biggest, monthDaily] = await Promise.all([
    getPersonalSpendTotal(userId, { from, to }),
    getPersonalSpendTotal(userId, { from: prevFrom, to: prevTo }),
    getDailySpend(userId, { from, to }),
    categorySpendInRange(userId, { from, to }),
    categorySpendInRange(userId, { from: prevFrom, to: prevTo }),
    biggestExpenseInRange(userId, { from, to }),
    getDailySpend(userId, { from: now.start, to: now.end }),
  ]);

  const prevByCategory = new Map(prevCats.map((row) => [row.categoryId, row.total]));

  const categories = currentCats
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total)
    .map((row) => {
      const prev = prevByCategory.get(row.categoryId) ?? 0;
      return {
        id: row.categoryId,
        name: row.name,
        icon: row.icon,
        gradient: row.gradient,
        amountMinor: row.total,
        share: total > 0 ? row.total / total : 0,
        deltaFraction: prev > 0 ? (row.total - prev) / prev : null,
      };
    });

  const donutTop = categories.slice(0, 5).map((row) => ({
    label: row.name,
    value: row.amountMinor,
    palette: asPalette(row.gradient),
  }));
  const donutRest = categories.slice(5).reduce((sum, row) => sum + row.amountMinor, 0);
  const donut =
    donutRest > 0
      ? [...donutTop, { label: "Other", value: donutRest, palette: "iris" as Palette }]
      : donutTop;

  return {
    period,
    from,
    to,
    days,
    totalMinor: total,
    prevTotalMinor: prevTotal,
    deltaFraction: prevTotal > 0 ? (total - prevTotal) / prevTotal : null,
    avgPerDayMinor: Math.round(total / days),
    trend: bucketTrend(denseDaily(daily, from, to), period),
    categories,
    donut,
    biggest,
    heatmapMonth: now.start,
    heatmap: monthDaily.map((row) => ({ date: row.date, value: row.amountMinor })),
  };
}

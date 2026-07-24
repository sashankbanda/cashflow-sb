import "server-only";
import { and, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { monthWindow } from "@/lib/dates";
import { rupeesFromMinor } from "@/lib/csv";
import { db } from "@/server/db";
import { expenses } from "@/server/db/schema";
import { categorySpendInRange } from "@/features/analytics/insights-queries";
import { getFriendBalances } from "@/features/balances/queries";
import { assertMember } from "@/features/groups/service";
import { getPersonalLedger, getPersonalSpendTotal } from "@/features/expenses/personal-queries";

async function userTimezone(userId: string): Promise<string> {
  const row = await db.query.users.findFirst({
    where: (users, { eq: equals }) => equals(users.id, userId),
    columns: { timezone: true },
  });
  return row?.timezone ?? "Asia/Kolkata";
}

export interface MonthlyReport {
  monthKey: string;
  monthLabel: string;
  start: string;
  end: string;
  totalMinor: number;
  avgPerDayMinor: number;
  topCategories: Array<{ name: string; amountMinor: number; gradient: string }>;
  netMinor: number;
  owedToYouMinor: number;
  youOweMinor: number;
}

/** Calendar-month summary for the report screen + share card. */
export async function getMonthlyReport(userId: string, monthKey?: string): Promise<MonthlyReport> {
  const timezone = await userTimezone(userId);
  const now = monthWindow(timezone);
  // A specific month can be requested (yyyy-mm); default to the current one.
  const anchor = monthKey ? `${monthKey}-15` : now.today;
  const window = monthWindow(timezone, new Date(`${anchor}T12:00:00Z`));

  const [total, cats, friends] = await Promise.all([
    getPersonalSpendTotal(userId, { from: window.start, to: window.end }),
    categorySpendInRange(userId, { from: window.start, to: window.end }),
    getFriendBalances(userId),
  ]);

  const topCategories = [...cats]
    .filter((category) => category.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)
    .map((category) => ({
      name: category.name,
      amountMinor: category.total,
      gradient: category.gradient,
    }));

  const owedToYouMinor = friends.filter((f) => f.netMinor > 0).reduce((s, f) => s + f.netMinor, 0);
  const youOweMinor = friends.filter((f) => f.netMinor < 0).reduce((s, f) => s + -f.netMinor, 0);
  const daysElapsed = Math.max(1, window.dayOfMonth);

  return {
    monthKey: window.monthKey,
    monthLabel: window.monthLabel,
    start: window.start,
    end: window.end,
    totalMinor: total,
    avgPerDayMinor: Math.round(total / daysElapsed),
    topCategories,
    netMinor: owedToYouMinor - youOweMinor,
    owedToYouMinor,
    youOweMinor,
  };
}

export type ExportRow = ReadonlyArray<string | number>;

export const PERSONAL_EXPORT_HEADERS = [
  "Date",
  "Description",
  "Category",
  "Source",
  "Amount",
  "Currency",
  "Tags",
] as const;

/** Filter-aware personal ledger rows (viewer's share of everything). */
export async function getPersonalExportRows(
  userId: string,
  range?: { from: string; to: string },
): Promise<ExportRow[]> {
  const entries = await getPersonalLedger(userId, range);
  return entries.map((entry) => [
    entry.expenseDate,
    entry.description,
    entry.category?.name ?? "Other",
    entry.source ?? "Personal",
    rupeesFromMinor(entry.amountMinor),
    "INR",
    entry.tags.map((tag) => `#${tag.name}`).join(" "),
  ]);
}

export const GROUP_EXPORT_HEADERS = [
  "Date",
  "Description",
  "Category",
  "Paid by",
  "Amount",
  "Currency",
  "Split ways",
] as const;

/** Filter-aware group expense rows (member-only). */
export async function getGroupExportRows(
  userId: string,
  groupId: string,
  range?: { from: string; to: string },
): Promise<ExportRow[]> {
  await assertMember(db, userId, groupId);
  const rows = await db
    .select({
      description: expenses.description,
      amountMinor: expenses.amountMinor,
      expenseDate: expenses.expenseDate,
      categoryName: sql<string | null>`cat.name`,
      payer: sql<string | null>`(
        select gm.display_name from expense_payers ep
        join group_members gm on gm.id = ep.member_id
        where ep.expense_id = ${expenses.id}
        order by ep.amount_minor desc limit 1
      )`,
      splitCount: sql<number>`(
        select count(*)::int from expense_splits es where es.expense_id = ${expenses.id}
      )`,
    })
    .from(expenses)
    .leftJoin(sql`categories cat`, sql`cat.id = ${expenses.categoryId}`)
    .where(
      and(
        eq(expenses.groupId, groupId),
        isNull(expenses.deletedAt),
        range ? gte(expenses.expenseDate, range.from) : undefined,
        range ? lte(expenses.expenseDate, range.to) : undefined,
      ),
    )
    .orderBy(desc(expenses.expenseDate), desc(expenses.id));

  return rows.map((row) => [
    row.expenseDate,
    row.description,
    row.categoryName ?? "Other",
    row.payer ?? "—",
    rupeesFromMinor(row.amountMinor),
    "INR",
    row.splitCount,
  ]);
}

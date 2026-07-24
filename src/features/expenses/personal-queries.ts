import "server-only";
import { and, desc, eq, gte, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { expenses, expenseSplits } from "@/server/db/schema";

export interface LedgerEntry {
  /** Split id for group shares, expense id for personal — stable per row. */
  id: string;
  expenseId: string;
  description: string;
  /** My spend on this row: full amount if personal, my share if group. */
  amountMinor: number;
  expenseDate: string;
  category: { id: string; icon: string; gradient: string; name: string } | null;
  /** Group name when this is my share of a group expense, else null. */
  source: string | null;
  /** True for standalone personal expenses (deletable from the ledger). */
  isPersonal: boolean;
}

/**
 * The unified personal ledger: standalone personal expenses plus the viewer's
 * *share* of every group expense, via the (user_id, expense_id) split index.
 * One row per spend; group amounts are the viewer's share only, never the
 * full expense — so this never double-counts money the group covered.
 */
export async function getPersonalLedger(
  userId: string,
  range?: { from: string; to: string },
): Promise<LedgerEntry[]> {
  const rows = await db
    .select({
      splitId: expenseSplits.id,
      expenseId: expenses.id,
      description: expenses.description,
      shareMinor: expenseSplits.amountMinor,
      expenseDate: expenses.expenseDate,
      groupId: expenses.groupId,
      categoryId: expenses.categoryId,
      categoryName: sql<string | null>`cat.name`,
      categoryIcon: sql<string | null>`cat.icon`,
      categoryGradient: sql<string | null>`cat.gradient`,
      groupName: sql<string | null>`grp.name`,
    })
    .from(expenseSplits)
    .innerJoin(expenses, eq(expenseSplits.expenseId, expenses.id))
    .leftJoin(sql`categories cat`, sql`cat.id = ${expenses.categoryId}`)
    .leftJoin(sql`groups grp`, sql`grp.id = ${expenses.groupId}`)
    .where(
      and(
        eq(expenseSplits.userId, userId),
        isNull(expenses.deletedAt),
        range ? gte(expenses.expenseDate, range.from) : undefined,
        range ? lte(expenses.expenseDate, range.to) : undefined,
      ),
    )
    .orderBy(desc(expenses.expenseDate), desc(expenses.id))
    .limit(range ? 5000 : 300);

  return rows.map((row) => ({
    id: row.splitId,
    expenseId: row.expenseId,
    description: row.description,
    amountMinor: row.shareMinor,
    expenseDate: row.expenseDate,
    category: row.categoryId
      ? {
          id: row.categoryId,
          icon: row.categoryIcon ?? "shapes",
          gradient: row.categoryGradient ?? "ocean",
          name: row.categoryName ?? "Other",
        }
      : null,
    source: row.groupId ? (row.groupName ?? "Group") : null,
    isPersonal: row.groupId === null,
  }));
}

/** Total of the viewer's spend (personal + group shares) across a range. */
export async function getPersonalSpendTotal(
  userId: string,
  range: { from: string; to: string },
): Promise<number> {
  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${expenseSplits.amountMinor}), 0)` })
    .from(expenseSplits)
    .innerJoin(expenses, eq(expenseSplits.expenseId, expenses.id))
    .where(
      and(
        eq(expenseSplits.userId, userId),
        isNull(expenses.deletedAt),
        gte(expenses.expenseDate, range.from),
        lte(expenses.expenseDate, range.to),
      ),
    );
  return Number(row?.total ?? 0);
}

/** Daily spend totals over a range, for sparklines/trends. */
export async function getDailySpend(
  userId: string,
  range: { from: string; to: string },
): Promise<Array<{ date: string; amountMinor: number }>> {
  const rows = await db
    .select({
      date: expenses.expenseDate,
      total: sql<string>`sum(${expenseSplits.amountMinor})`,
    })
    .from(expenseSplits)
    .innerJoin(expenses, eq(expenseSplits.expenseId, expenses.id))
    .where(
      and(
        eq(expenseSplits.userId, userId),
        isNotNull(expenseSplits.userId),
        isNull(expenses.deletedAt),
        gte(expenses.expenseDate, range.from),
        lte(expenses.expenseDate, range.to),
      ),
    )
    .groupBy(expenses.expenseDate)
    .orderBy(expenses.expenseDate);

  return rows.map((row) => ({ date: row.date, amountMinor: Number(row.total) }));
}

import "server-only";
import { and, desc, eq, gte, inArray, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { expenses, expenseSplits, expenseTags, tags } from "@/server/db/schema";

export interface LedgerTag {
  id: string;
  name: string;
}

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
  /** Group id for navigation when this is a group share, else null. */
  groupId: string | null;
  /** True for standalone personal expenses (deletable from the ledger). */
  isPersonal: boolean;
  /** True when this expense was materialized from a recurring rule. */
  isRecurring: boolean;
  /** True when this row is income (money in), not a spend. */
  isIncome: boolean;
  tags: LedgerTag[];
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
      recurringRuleId: expenses.recurringRuleId,
      isIncome: expenses.isIncome,
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

  // Tags for the returned expenses, in one pass.
  const expenseIds = rows.map((row) => row.expenseId);
  const tagRows =
    expenseIds.length > 0
      ? await db
          .select({
            expenseId: expenseTags.expenseId,
            id: tags.id,
            name: tags.name,
          })
          .from(expenseTags)
          .innerJoin(tags, eq(tags.id, expenseTags.tagId))
          .where(inArray(expenseTags.expenseId, expenseIds))
      : [];
  const tagsByExpense = new Map<string, LedgerTag[]>();
  for (const tag of tagRows) {
    const list = tagsByExpense.get(tag.expenseId) ?? [];
    list.push({ id: tag.id, name: tag.name });
    tagsByExpense.set(tag.expenseId, list);
  }

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
    groupId: row.groupId,
    isPersonal: row.groupId === null,
    isRecurring: row.recurringRuleId !== null,
    isIncome: row.isIncome,
    tags: tagsByExpense.get(row.expenseId) ?? [],
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
        eq(expenses.isIncome, false),
        isNull(expenses.deletedAt),
        gte(expenses.expenseDate, range.from),
        lte(expenses.expenseDate, range.to),
      ),
    );
  return Number(row?.total ?? 0);
}

/** Total personal income recorded across a range. */
export async function getPersonalIncomeTotal(
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
        eq(expenses.isIncome, true),
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
        eq(expenses.isIncome, false),
        isNull(expenses.deletedAt),
        gte(expenses.expenseDate, range.from),
        lte(expenses.expenseDate, range.to),
      ),
    )
    .groupBy(expenses.expenseDate)
    .orderBy(expenses.expenseDate);

  return rows.map((row) => ({ date: row.date, amountMinor: Number(row.total) }));
}

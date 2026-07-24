import "server-only";
import { and, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { monthWindow, type MonthWindow } from "@/lib/dates";
import { db } from "@/server/db";
import { budgets, categories, expenseSplits, expenses, users } from "@/server/db/schema";
import { getCategoriesForUser, type CategoryOption } from "@/features/categories/queries";
import { getPersonalSpendTotal } from "@/features/expenses/personal-queries";
import { computeBudgetPace, type BudgetPace } from "./pace";

export interface BudgetCategory {
  id: string;
  name: string;
  icon: string;
  gradient: string;
}

export interface BudgetLine {
  /** Budget row id, or null for the overall line when unset. */
  budgetId: string | null;
  /** null = the overall budget. */
  category: BudgetCategory | null;
  budgetMinor: number;
  spentMinor: number;
  pace: BudgetPace;
}

export interface BudgetOverview {
  monthKey: string;
  monthLabel: string;
  daysRemaining: number;
  /** Overall budget line when one is set, else null. */
  overall: BudgetLine | null;
  /** Per-category budget lines, ordered by how close to the limit they are. */
  categories: BudgetLine[];
  spentThisMonthMinor: number;
  totalBudgetedMinor: number;
  /** Categories that don't yet have a budget (for the "add" picker). */
  addableCategories: CategoryOption[];
}

async function userTimezone(userId: string): Promise<string> {
  const row = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { timezone: true },
  });
  return row?.timezone ?? "Asia/Kolkata";
}

/** This month's spend per category (viewer's share of group + personal). */
async function categorySpendForMonth(
  userId: string,
  window: MonthWindow,
): Promise<Map<string, number>> {
  const rows = await db
    .select({
      categoryId: expenses.categoryId,
      total: sql<string>`sum(${expenseSplits.amountMinor})`,
    })
    .from(expenseSplits)
    .innerJoin(expenses, eq(expenseSplits.expenseId, expenses.id))
    .where(
      and(
        eq(expenseSplits.userId, userId),
        isNull(expenses.deletedAt),
        gte(expenses.expenseDate, window.start),
        lte(expenses.expenseDate, window.end),
      ),
    )
    .groupBy(expenses.categoryId);

  const map = new Map<string, number>();
  for (const row of rows) {
    if (row.categoryId) map.set(row.categoryId, Number(row.total));
  }
  return map;
}

/** Everything the Budgets screen renders, in one pass. */
export async function getBudgetOverview(userId: string): Promise<BudgetOverview> {
  const window = monthWindow(await userTimezone(userId));

  const [budgetRows, totalSpend, catSpend, allCategories] = await Promise.all([
    db.query.budgets.findMany({
      where: and(eq(budgets.userId, userId), eq(budgets.period, "monthly")),
    }),
    getPersonalSpendTotal(userId, { from: window.start, to: window.end }),
    categorySpendForMonth(userId, window),
    getCategoriesForUser(userId),
  ]);

  const pace = (spentMinor: number, budgetMinor: number): BudgetPace =>
    computeBudgetPace({
      spentMinor,
      budgetMinor,
      dayOfMonth: window.dayOfMonth,
      daysInMonth: window.daysInMonth,
    });

  const overallRow = budgetRows.find((row) => row.categoryId === null);
  const categoryRows = budgetRows.flatMap((row) =>
    row.categoryId === null
      ? []
      : [{ id: row.id, categoryId: row.categoryId, amountMinor: row.amountMinor }],
  );

  // Category metadata — resolve directly so archived-but-budgeted categories
  // still render (getCategoriesForUser hides archived ones).
  const budgetedIds = categoryRows.map((row) => row.categoryId);
  const metaRows =
    budgetedIds.length > 0
      ? await db
          .select({
            id: categories.id,
            name: categories.name,
            icon: categories.icon,
            gradient: categories.gradient,
          })
          .from(categories)
          .where(inArray(categories.id, budgetedIds))
      : [];
  const metaById = new Map(metaRows.map((row) => [row.id, row]));

  const categoryLines: BudgetLine[] = categoryRows
    .map((row) => {
      const meta = metaById.get(row.categoryId);
      const spentMinor = catSpend.get(row.categoryId) ?? 0;
      return {
        budgetId: row.id,
        category: meta
          ? { id: meta.id, name: meta.name, icon: meta.icon, gradient: meta.gradient }
          : { id: row.categoryId, name: "Category", icon: "shapes", gradient: "ocean" },
        budgetMinor: row.amountMinor,
        spentMinor,
        pace: pace(spentMinor, row.amountMinor),
      };
    })
    .sort((a, b) => b.pace.fraction - a.pace.fraction);

  const budgetedCategoryIds = new Set(budgetedIds);
  const addableCategories = allCategories.filter(
    (category) => !budgetedCategoryIds.has(category.id),
  );

  return {
    monthKey: window.monthKey,
    monthLabel: window.monthLabel,
    daysRemaining: window.daysRemaining,
    overall: overallRow
      ? {
          budgetId: overallRow.id,
          category: null,
          budgetMinor: overallRow.amountMinor,
          spentMinor: totalSpend,
          pace: pace(totalSpend, overallRow.amountMinor),
        }
      : null,
    categories: categoryLines,
    spentThisMonthMinor: totalSpend,
    totalBudgetedMinor: budgetRows.reduce((sum, row) => sum + row.amountMinor, 0),
    addableCategories,
  };
}

export interface OverallBudgetSnapshot {
  budgetMinor: number;
  spentMinor: number;
  pace: BudgetPace;
}

/** Light query for the Home budget widget; null when no overall budget is set. */
export async function getOverallBudgetSnapshot(
  userId: string,
): Promise<OverallBudgetSnapshot | null> {
  const window = monthWindow(await userTimezone(userId));
  const overall = await db.query.budgets.findFirst({
    where: and(
      eq(budgets.userId, userId),
      isNull(budgets.categoryId),
      eq(budgets.period, "monthly"),
    ),
  });
  if (!overall) return null;

  const spentMinor = await getPersonalSpendTotal(userId, { from: window.start, to: window.end });
  return {
    budgetMinor: overall.amountMinor,
    spentMinor,
    pace: computeBudgetPace({
      spentMinor,
      budgetMinor: overall.amountMinor,
      dayOfMonth: window.dayOfMonth,
      daysInMonth: window.daysInMonth,
    }),
  };
}

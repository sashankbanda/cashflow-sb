import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { monthWindow } from "@/lib/dates";
import { newId } from "@/lib/ids";
import { db } from "@/server/db";
import { budgets, categories, users } from "@/server/db/schema";
import { forbidden, notFound } from "@/server/errors";
import type { ActionUser } from "@/server/action-core";
import type { SetBudgetInput } from "./schemas";

async function userTimezone(userId: string): Promise<string> {
  const row = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { timezone: true },
  });
  return row?.timezone ?? "Asia/Kolkata";
}

/** The user must own a custom category (system categories are shared and fine). */
async function assertUsableCategory(userId: string, categoryId: string): Promise<void> {
  const category = await db.query.categories.findFirst({ where: eq(categories.id, categoryId) });
  if (!category || category.archivedAt) throw notFound("Category");
  if (category.userId !== null && category.userId !== userId) {
    throw forbidden("That isn't your category.");
  }
}

/**
 * Create or replace a monthly budget. The (user, category, period) unique index
 * (nulls-not-distinct) makes this a true upsert, so re-setting the overall or a
 * category budget just updates the amount.
 */
export async function setBudget(
  user: ActionUser,
  input: SetBudgetInput,
): Promise<{ budgetId: string }> {
  if (input.categoryId) await assertUsableCategory(user.id, input.categoryId);

  const window = monthWindow(await userTimezone(user.id));
  const id = newId();
  const [row] = await db
    .insert(budgets)
    .values({
      id,
      userId: user.id,
      categoryId: input.categoryId,
      amountMinor: input.amountMinor,
      period: "monthly",
      startsOn: window.start,
    })
    .onConflictDoUpdate({
      target: [budgets.userId, budgets.categoryId, budgets.period],
      set: { amountMinor: input.amountMinor, startsOn: window.start },
    })
    .returning({ id: budgets.id });

  return { budgetId: row?.id ?? id };
}

/** Remove a budget the user owns. */
export async function deleteBudget(user: ActionUser, budgetId: string): Promise<void> {
  const budget = await db.query.budgets.findFirst({ where: eq(budgets.id, budgetId) });
  if (!budget) throw notFound("Budget");
  if (budget.userId !== user.id) throw forbidden("That isn't your budget.");
  await db.delete(budgets).where(eq(budgets.id, budgetId));
}

/** Remove the overall (uncategorized) monthly budget, if any. */
export async function clearOverallBudget(user: ActionUser): Promise<void> {
  await db
    .delete(budgets)
    .where(
      and(eq(budgets.userId, user.id), isNull(budgets.categoryId), eq(budgets.period, "monthly")),
    );
}

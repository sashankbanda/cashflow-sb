import "server-only";
import { and, asc, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { categories, expenses } from "@/server/db/schema";

/**
 * Merchant memory + fallback: the category this user last gave the same payee
 * — exact name first, then first-word prefix so "SWIGGY*ORDER123" still finds
 * "Swiggy" — falling back to a kind-matching system category. Null only when
 * no system categories exist at all.
 */
export async function resolveCategoryId(
  userId: string,
  description: string,
  isIncome: boolean,
): Promise<{ categoryId: string; remembered: boolean } | null> {
  const normalized = description.toLowerCase();
  const firstWord =
    normalized
      .replace(/[^a-z0-9 ]+/g, " ")
      .trim()
      .split(/\s+/)[0] ?? "";
  const rememberedWhere = (match: ReturnType<typeof sql>) =>
    and(
      eq(expenses.createdBy, userId),
      isNull(expenses.groupId),
      isNull(expenses.deletedAt),
      isNotNull(expenses.categoryId),
      match,
    );

  let [remembered] = await db
    .select({ categoryId: expenses.categoryId })
    .from(expenses)
    .where(rememberedWhere(sql`lower(${expenses.description}) = ${normalized}`))
    .orderBy(desc(expenses.createdAt))
    .limit(1);
  if (!remembered && firstWord.length >= 4) {
    [remembered] = await db
      .select({ categoryId: expenses.categoryId })
      .from(expenses)
      .where(rememberedWhere(sql`lower(${expenses.description}) like ${`${firstWord}%`}`))
      .orderBy(desc(expenses.createdAt))
      .limit(1);
  }
  if (remembered?.categoryId) return { categoryId: remembered.categoryId, remembered: true };

  const fallback =
    (await db.query.categories.findFirst({
      where: and(isNull(categories.userId), eq(categories.kind, isIncome ? "income" : "expense")),
      orderBy: [asc(categories.name)],
    })) ??
    (await db.query.categories.findFirst({
      where: isNull(categories.userId),
      orderBy: [asc(categories.name)],
    }));
  return fallback ? { categoryId: fallback.id, remembered: false } : null;
}

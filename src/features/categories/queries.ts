import "server-only";
import { and, asc, eq, isNull, or, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { categories } from "@/server/db/schema";

export interface CategoryOption {
  id: string;
  name: string;
  icon: string;
  gradient: string;
  /** "expense" | "income" — pickers show only the matching kind. */
  kind: string;
  isSystem: boolean;
}

/**
 * System categories plus the user's own (unarchived), ranked by the user's
 * recent usage (most-used first) then sort order — so the add-flow chips lead
 * with what they actually pick.
 */
export async function getCategoriesForUser(userId: string): Promise<CategoryOption[]> {
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      icon: categories.icon,
      gradient: categories.gradient,
      kind: categories.kind,
      userId: categories.userId,
      sort: categories.sort,
      usage: sql<number>`(
        select count(*) from expenses e
        where e.category_id = ${categories.id}
          and e.created_by = ${userId}
          and e.deleted_at is null
      )`,
    })
    .from(categories)
    .where(
      and(
        or(isNull(categories.userId), eq(categories.userId, userId)),
        isNull(categories.archivedAt),
      ),
    )
    .orderBy(asc(categories.sort), asc(categories.name));

  return [...rows]
    .sort((a, b) => b.usage - a.usage || a.sort - b.sort || a.name.localeCompare(b.name))
    .map((row) => ({
      id: row.id,
      name: row.name,
      icon: row.icon,
      gradient: row.gradient,
      kind: row.kind,
      isSystem: row.userId === null,
    }));
}

export interface CategoryManagerData {
  system: CategoryOption[];
  custom: CategoryOption[];
}

/** Split view for the category manager: system defaults vs the user's own. */
export async function getCategoryManagerData(userId: string): Promise<CategoryManagerData> {
  const all = await getCategoriesForUser(userId);
  return {
    system: all.filter((category) => category.isSystem),
    custom: all.filter((category) => !category.isSystem),
  };
}

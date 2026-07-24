import "server-only";
import { and, asc, isNull, or, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { categories } from "@/server/db/schema";

export interface CategoryOption {
  id: string;
  name: string;
  icon: string;
  gradient: string;
}

/** System categories plus the user's own, unarchived, in sort order. */
export async function getCategoriesForUser(userId: string): Promise<CategoryOption[]> {
  const rows = await db.query.categories.findMany({
    where: and(
      or(isNull(categories.userId), eq(categories.userId, userId)),
      isNull(categories.archivedAt),
    ),
    orderBy: [asc(categories.sort), asc(categories.name)],
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    icon: row.icon,
    gradient: row.gradient,
  }));
}

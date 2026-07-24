import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { newId } from "@/lib/ids";
import { db } from "@/server/db";
import { categories } from "@/server/db/schema";
import { conflict, forbidden, notFound } from "@/server/errors";
import type { ActionUser } from "@/server/action-core";
import type { CreateCategoryInput, UpdateCategoryInput } from "./schemas";

/** Ensure a custom category belongs to the user before mutating it. */
async function assertOwnCategory(userId: string, categoryId: string) {
  const category = await db.query.categories.findFirst({ where: eq(categories.id, categoryId) });
  if (!category) throw notFound("Category");
  if (category.userId !== userId) throw forbidden("That isn't your category.");
  return category;
}

export async function createCategory(
  user: ActionUser,
  input: CreateCategoryInput,
): Promise<{ categoryId: string }> {
  const clash = await db.query.categories.findFirst({
    where: and(eq(categories.userId, user.id), eq(categories.name, input.name)),
  });
  if (clash) throw conflict(`You already have a "${input.name}" category.`);

  const categoryId = newId();
  await db.insert(categories).values({
    id: categoryId,
    userId: user.id,
    name: input.name,
    icon: input.icon,
    gradient: input.gradient,
    sort: 100,
  });
  return { categoryId };
}

export async function updateCategory(user: ActionUser, input: UpdateCategoryInput): Promise<void> {
  await assertOwnCategory(user.id, input.categoryId);
  await db
    .update(categories)
    .set({ name: input.name, icon: input.icon, gradient: input.gradient })
    .where(eq(categories.id, input.categoryId));
}

export async function archiveCategory(user: ActionUser, categoryId: string): Promise<void> {
  await assertOwnCategory(user.id, categoryId);
  await db
    .update(categories)
    .set({ archivedAt: new Date() })
    .where(and(eq(categories.id, categoryId), isNull(categories.archivedAt)));
}

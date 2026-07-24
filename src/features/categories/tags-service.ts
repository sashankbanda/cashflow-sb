import "server-only";
import { and, eq } from "drizzle-orm";
import { newId } from "@/lib/ids";
import { db } from "@/server/db";
import { tags } from "@/server/db/schema";
import type { ActionUser } from "@/server/action-core";
import type { CreateTagInput } from "./schemas";

export interface TagOption {
  id: string;
  name: string;
}

export async function getTagsForUser(userId: string): Promise<TagOption[]> {
  const rows = await db.query.tags.findMany({
    where: eq(tags.userId, userId),
    orderBy: (table, { asc }) => [asc(table.name)],
  });
  return rows.map((row) => ({ id: row.id, name: row.name }));
}

/** Create a tag, or return the existing one with that name (idempotent). */
export async function createTag(
  user: ActionUser,
  input: CreateTagInput,
): Promise<{ tagId: string; name: string }> {
  const existing = await db.query.tags.findFirst({
    where: and(eq(tags.userId, user.id), eq(tags.name, input.name)),
  });
  if (existing) return { tagId: existing.id, name: existing.name };

  const tagId = newId();
  await db.insert(tags).values({ id: tagId, userId: user.id, name: input.name });
  return { tagId, name: input.name };
}

import "server-only";
import { and, desc, eq, inArray, isNull, lt, or } from "drizzle-orm";
import { db } from "@/server/db";
import { activityLogs, groupMembers, users } from "@/server/db/schema";
import { describeActivity, type ActivityPayload } from "./describe";

export interface FeedItem {
  id: string;
  actorName: string;
  actorImage: string | null;
  text: string;
  amountMinor?: number;
  groupId: string | null;
  createdAt: string;
}

export interface ActivityFeed {
  items: FeedItem[];
  /** Pass as `cursor` for the next page; null when exhausted. */
  nextCursor: string | null;
}

export interface FeedOptions {
  groupId?: string;
  cursor?: string;
  limit?: number;
}

async function myGroupIds(userId: string): Promise<string[]> {
  const memberships = await db.query.groupMembers.findMany({
    where: and(eq(groupMembers.userId, userId), isNull(groupMembers.leftAt)),
    columns: { groupId: true },
  });
  return memberships.map((membership) => membership.groupId);
}

/**
 * Activity visible to the user: all their groups + their own personal actions.
 * UUIDv7 ids are time-ordered, so `id < cursor` gives stable keyset pagination
 * even while new rows arrive. Actor name/image is resolved in one batched query
 * (never per-row), and text comes straight from each row's payload.
 */
export async function getActivityFeed(
  userId: string,
  options: FeedOptions = {},
): Promise<ActivityFeed> {
  const limit = options.limit ?? 30;
  const groupIds = await myGroupIds(userId);

  let scope;
  if (options.groupId) {
    if (!groupIds.includes(options.groupId)) return { items: [], nextCursor: null };
    scope = eq(activityLogs.groupId, options.groupId);
  } else {
    scope =
      groupIds.length > 0
        ? or(inArray(activityLogs.groupId, groupIds), eq(activityLogs.actorUserId, userId))
        : eq(activityLogs.actorUserId, userId);
  }

  const where = options.cursor ? and(scope, lt(activityLogs.id, options.cursor)) : scope;
  const rows = await db.query.activityLogs.findMany({
    where,
    orderBy: [desc(activityLogs.id)],
    limit: limit + 1,
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const actorIds = [...new Set(page.map((row) => row.actorUserId))];
  const actorRows =
    actorIds.length > 0
      ? await db.query.users.findMany({
          where: inArray(users.id, actorIds),
          columns: { id: true, name: true, image: true },
        })
      : [];
  const actorById = new Map(actorRows.map((actor) => [actor.id, actor]));

  const items: FeedItem[] = page.map((row) => {
    const payload = (row.payload ?? {}) as ActivityPayload;
    const described = describeActivity(row.verb, payload);
    const actor = actorById.get(row.actorUserId);
    return {
      id: row.id,
      actorName: actor?.name ?? payload.actorName ?? "Someone",
      actorImage: actor?.image ?? null,
      text: described.text,
      amountMinor: described.amountMinor,
      groupId: row.groupId,
      createdAt: row.createdAt.toISOString(),
    };
  });

  return { items, nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null };
}

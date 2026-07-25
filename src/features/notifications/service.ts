import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { newId } from "@/lib/ids";
import { db, type Transaction } from "@/server/db";
import { notifications, type NotificationType } from "@/server/db/schema";
import type { ActionUser } from "@/server/action-core";

type Db = typeof db | Transaction;

export interface NotifyInput {
  userIds: ReadonlyArray<string>;
  type: NotificationType;
  payload: Record<string, unknown>;
}

/**
 * Fan a notification out to the given users. Pass the mutation's `tx` so the
 * notifications commit atomically with the event that produced them. The actor
 * is never notified about their own action.
 */
export async function notifyUsers(
  client: Db,
  actorUserId: string | null,
  input: NotifyInput,
): Promise<void> {
  const recipients = [...new Set(input.userIds)].filter((id) => id && id !== actorUserId);
  if (recipients.length === 0) return;
  await client.insert(notifications).values(
    recipients.map((userId) => ({
      id: newId(),
      userId,
      type: input.type,
      payload: input.payload,
    })),
  );
}

/** Mark every unread notification read for the user. */
export async function markAllNotificationsRead(user: ActionUser): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));
}

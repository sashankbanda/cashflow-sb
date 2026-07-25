import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { newId } from "@/lib/ids";
import { db } from "@/server/db";
import {
  groupMembers,
  groups,
  notifications,
  pushSubscriptions,
  users,
  type NotificationPrefs,
} from "@/server/db/schema";
import { notFound } from "@/server/errors";
import { sendPushToUser } from "@/server/push";
import type { ActionUser } from "@/server/action-core";
import { assertMember } from "@/features/groups/service";
import { NOTIFICATION_TYPES, type SubscribePushInput } from "./push-schemas";

/** Save (or refresh) a browser push subscription for the user. */
export async function subscribePush(user: ActionUser, input: SubscribePushInput): Promise<void> {
  await db
    .insert(pushSubscriptions)
    .values({
      id: newId(),
      userId: user.id,
      endpoint: input.endpoint,
      keys: input.keys,
      userAgent: input.userAgent ?? null,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { userId: user.id, keys: input.keys, userAgent: input.userAgent ?? null },
    });
}

export async function unsubscribePush(user: ActionUser, endpoint: string): Promise<void> {
  await db
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.endpoint, endpoint), eq(pushSubscriptions.userId, user.id)));
}

export async function updateNotificationPrefs(
  user: ActionUser,
  prefs: NotificationPrefs,
): Promise<void> {
  // Keep only recognized notification types.
  const clean: NotificationPrefs = {};
  for (const type of NOTIFICATION_TYPES) {
    if (typeof prefs[type] === "boolean") clean[type] = prefs[type];
  }
  await db.update(users).set({ notificationPrefs: clean }).where(eq(users.id, user.id));
}

export async function getNotificationPrefs(userId: string): Promise<NotificationPrefs> {
  const row = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { notificationPrefs: true },
  });
  return row?.notificationPrefs ?? {};
}

/** Nudge a fellow group member to settle up — notification + push. */
export async function remindSettlement(
  user: ActionUser,
  groupId: string,
  toUserId: string,
): Promise<void> {
  await assertMember(db, user.id, groupId);
  const target = await db.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, groupId),
      eq(groupMembers.userId, toUserId),
      isNull(groupMembers.leftAt),
    ),
  });
  if (!target) throw notFound("Member");

  const group = await db.query.groups.findFirst({ where: eq(groups.id, groupId) });
  const groupName = group?.name ?? "your group";

  await db.insert(notifications).values({
    id: newId(),
    userId: toUserId,
    type: "settlement_reminder",
    payload: { actorName: user.name, groupName },
  });

  await sendPushToUser(toUserId, "settlement_reminder", {
    title: "Settle up reminder",
    body: `${user.name} is waiting for a payment in ${groupName}`,
    url: `/groups/${groupId}`,
  });
}

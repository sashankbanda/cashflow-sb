import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { newId } from "@/lib/ids";
import { db, type Database, type Transaction } from "@/server/db";
import { activityLogs, groupMembers, groups, type GroupMember } from "@/server/db/schema";
import { forbidden, notFound } from "@/server/errors";
import type { ActionUser } from "@/server/action-core";
import type { CreateGroupInput, UpdateGroupInput } from "./schemas";

export type Db = Database | Transaction;

/**
 * The membership assertion at the top of every group-scoped service: one
 * indexed lookup, throws FORBIDDEN for non-members. Defense in depth — SQL
 * reads also join through membership.
 */
export async function assertMember(dbx: Db, userId: string, groupId: string): Promise<GroupMember> {
  const member = await dbx.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, groupId),
      eq(groupMembers.userId, userId),
      isNull(groupMembers.leftAt),
    ),
  });
  if (!member) {
    throw forbidden("You're not a member of this group.");
  }
  return member;
}

export async function assertOwner(dbx: Db, userId: string, groupId: string): Promise<GroupMember> {
  const member = await assertMember(dbx, userId, groupId);
  if (member.role !== "owner") {
    throw forbidden("Only the group owner can do that.");
  }
  return member;
}

export async function createGroup(
  user: ActionUser,
  input: CreateGroupInput,
): Promise<{ groupId: string }> {
  return db.transaction(async (tx) => {
    const groupId = newId();
    await tx.insert(groups).values({
      id: groupId,
      name: input.name,
      emoji: input.emoji ?? null,
      gradient: input.gradient,
      createdBy: user.id,
    });
    await tx.insert(groupMembers).values({
      id: newId(),
      groupId,
      userId: user.id,
      displayName: user.name,
      role: "owner",
    });
    await tx.insert(activityLogs).values({
      id: newId(),
      groupId,
      actorUserId: user.id,
      verb: "group_created",
      objectType: "group",
      objectId: groupId,
      payload: { name: input.name },
    });
    return { groupId };
  });
}

export async function updateGroup(user: ActionUser, input: UpdateGroupInput): Promise<void> {
  await db.transaction(async (tx) => {
    await assertMember(tx, user.id, input.groupId);
    const existing = await tx.query.groups.findFirst({ where: eq(groups.id, input.groupId) });
    if (!existing) throw notFound("Group");
    await tx
      .update(groups)
      .set({ name: input.name, emoji: input.emoji ?? null, gradient: input.gradient })
      .where(eq(groups.id, input.groupId));
    await tx.insert(activityLogs).values({
      id: newId(),
      groupId: input.groupId,
      actorUserId: user.id,
      verb: "group_updated",
      objectType: "group",
      objectId: input.groupId,
      payload: { name: input.name },
    });
  });
}

export async function archiveGroup(user: ActionUser, groupId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await assertOwner(tx, user.id, groupId);
    const existing = await tx.query.groups.findFirst({ where: eq(groups.id, groupId) });
    if (!existing) throw notFound("Group");
    if (existing.archivedAt) return;
    await tx.update(groups).set({ archivedAt: new Date() }).where(eq(groups.id, groupId));
    await tx.insert(activityLogs).values({
      id: newId(),
      groupId,
      actorUserId: user.id,
      verb: "group_archived",
      objectType: "group",
      objectId: groupId,
      payload: { name: existing.name },
    });
  });
}

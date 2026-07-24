import "server-only";
import { randomBytes } from "node:crypto";
import { addDays } from "date-fns";
import { and, eq, isNull, sql } from "drizzle-orm";
import { newId } from "@/lib/ids";
import { db } from "@/server/db";
import {
  activityLogs,
  expensePayers,
  expenses,
  expenseSplits,
  groupMembers,
  groups,
  invites,
  settlements,
  type Invite,
} from "@/server/db/schema";
import { conflict, forbidden, notFound } from "@/server/errors";
import type { ActionUser } from "@/server/action-core";
import { assertMember, type Db } from "./service";
import type { AddGhostInput, CreateInviteInput } from "./schemas";

const INVITE_VALID_DAYS = 7;

/** Net paise for one member: paid − owed + settlements sent − received. */
export async function memberNetMinor(dbx: Db, memberId: string): Promise<number> {
  const [paidRow] = await dbx
    .select({ total: sql<string>`coalesce(sum(${expensePayers.amountMinor}), 0)` })
    .from(expensePayers)
    .innerJoin(expenses, eq(expensePayers.expenseId, expenses.id))
    .where(and(eq(expensePayers.memberId, memberId), isNull(expenses.deletedAt)));
  const [owedRow] = await dbx
    .select({ total: sql<string>`coalesce(sum(${expenseSplits.amountMinor}), 0)` })
    .from(expenseSplits)
    .innerJoin(expenses, eq(expenseSplits.expenseId, expenses.id))
    .where(and(eq(expenseSplits.memberId, memberId), isNull(expenses.deletedAt)));
  const [sentRow] = await dbx
    .select({ total: sql<string>`coalesce(sum(${settlements.amountMinor}), 0)` })
    .from(settlements)
    .where(and(eq(settlements.fromMemberId, memberId), isNull(settlements.deletedAt)));
  const [receivedRow] = await dbx
    .select({ total: sql<string>`coalesce(sum(${settlements.amountMinor}), 0)` })
    .from(settlements)
    .where(and(eq(settlements.toMemberId, memberId), isNull(settlements.deletedAt)));

  return (
    Number(paidRow?.total ?? 0) -
    Number(owedRow?.total ?? 0) +
    Number(sentRow?.total ?? 0) -
    Number(receivedRow?.total ?? 0)
  );
}

/** Add a name-only member; they claim their history later via invite link. */
export async function addGhostMember(
  user: ActionUser,
  input: AddGhostInput,
): Promise<{ memberId: string }> {
  return db.transaction(async (tx) => {
    await assertMember(tx, user.id, input.groupId);
    const clash = await tx.query.groupMembers.findFirst({
      where: and(
        eq(groupMembers.groupId, input.groupId),
        eq(groupMembers.displayName, input.displayName),
        isNull(groupMembers.leftAt),
      ),
    });
    if (clash) {
      throw conflict(`There's already a member called ${input.displayName}.`);
    }
    const memberId = newId();
    await tx.insert(groupMembers).values({
      id: memberId,
      groupId: input.groupId,
      userId: null,
      displayName: input.displayName,
    });
    await tx.insert(activityLogs).values({
      id: newId(),
      groupId: input.groupId,
      actorUserId: user.id,
      verb: "member_added",
      objectType: "member",
      objectId: memberId,
      payload: { displayName: input.displayName },
    });
    return { memberId };
  });
}

/** Create a shareable invite (group-wide, or claim link for one ghost). */
export async function createInvite(
  user: ActionUser,
  input: CreateInviteInput,
): Promise<{ token: string }> {
  return db.transaction(async (tx) => {
    await assertMember(tx, user.id, input.groupId);
    if (input.memberId) {
      const target = await tx.query.groupMembers.findFirst({
        where: and(
          eq(groupMembers.id, input.memberId),
          eq(groupMembers.groupId, input.groupId),
          isNull(groupMembers.leftAt),
        ),
      });
      if (!target) throw notFound("Member");
      if (target.userId) throw conflict("That member has already joined.");
    }
    const token = randomBytes(16).toString("base64url");
    await tx.insert(invites).values({
      id: newId(),
      token,
      groupId: input.groupId,
      memberId: input.memberId ?? null,
      createdBy: user.id,
      expiresAt: addDays(new Date(), INVITE_VALID_DAYS),
    });
    await tx.insert(activityLogs).values({
      id: newId(),
      groupId: input.groupId,
      actorUserId: user.id,
      verb: "invite_created",
      objectType: "invite",
      objectId: token,
      payload: { targetMemberId: input.memberId ?? null },
    });
    return { token };
  });
}

export interface PublicInvite {
  token: string;
  group: { id: string; name: string; emoji: string | null; gradient: string; memberCount: number };
  /** Ghost this invite claims, when member-specific. */
  claimTarget: { id: string; displayName: string } | null;
  /** Ghosts available to claim via a generic invite. */
  ghosts: Array<{ id: string; displayName: string }>;
}

function assertInviteUsable(invite: Invite): void {
  if (invite.revokedAt) throw notFound("Invite");
  if (invite.expiresAt.getTime() < Date.now()) throw notFound("Invite");
  if (invite.maxUses !== null && invite.useCount >= invite.maxUses) throw notFound("Invite");
}

/** Public token lookup for the /join landing. Throws NOT_FOUND when unusable. */
export async function getInviteByToken(token: string): Promise<PublicInvite> {
  const invite = await db.query.invites.findFirst({ where: eq(invites.token, token) });
  if (!invite) throw notFound("Invite");
  assertInviteUsable(invite);

  const group = await db.query.groups.findFirst({
    where: eq(groups.id, invite.groupId),
    with: { members: { where: isNull(groupMembers.leftAt) } },
  });
  if (!group || group.archivedAt) throw notFound("Invite");

  const ghosts = group.members
    .filter((member) => member.userId === null)
    .map((member) => ({ id: member.id, displayName: member.displayName }));
  const claimTarget = invite.memberId
    ? (ghosts.find((ghost) => ghost.id === invite.memberId) ?? null)
    : null;
  if (invite.memberId && !claimTarget) throw notFound("Invite");

  return {
    token,
    group: {
      id: group.id,
      name: group.name,
      emoji: group.emoji,
      gradient: group.gradient,
      memberCount: group.members.length,
    },
    claimTarget,
    ghosts,
  };
}

/** Join a group via a generic invite as a brand-new member. Idempotent. */
export async function joinViaInvite(user: ActionUser, token: string): Promise<{ groupId: string }> {
  return db.transaction(async (tx) => {
    const invite = await tx.query.invites.findFirst({ where: eq(invites.token, token) });
    if (!invite) throw notFound("Invite");
    assertInviteUsable(invite);
    if (invite.memberId) {
      throw conflict("This link claims a specific member — pick your name instead.");
    }

    const existing = await tx.query.groupMembers.findFirst({
      where: and(
        eq(groupMembers.groupId, invite.groupId),
        eq(groupMembers.userId, user.id),
        isNull(groupMembers.leftAt),
      ),
    });
    if (existing) return { groupId: invite.groupId };

    const memberId = newId();
    await tx.insert(groupMembers).values({
      id: memberId,
      groupId: invite.groupId,
      userId: user.id,
      displayName: user.name,
    });
    await tx
      .update(invites)
      .set({ useCount: sql`${invites.useCount} + 1` })
      .where(eq(invites.id, invite.id));
    await tx.insert(activityLogs).values({
      id: newId(),
      groupId: invite.groupId,
      actorUserId: user.id,
      verb: "member_joined",
      objectType: "member",
      objectId: memberId,
      payload: { displayName: user.name },
    });
    return { groupId: invite.groupId };
  });
}

/**
 * Claim a ghost member: atomically attach the user to the member row and
 * backfill the denormalized user links on their entire money history.
 */
export async function claimGhost(
  user: ActionUser,
  token: string,
  memberId: string,
): Promise<{ groupId: string }> {
  return db.transaction(async (tx) => {
    const invite = await tx.query.invites.findFirst({ where: eq(invites.token, token) });
    if (!invite) throw notFound("Invite");
    assertInviteUsable(invite);
    if (invite.memberId && invite.memberId !== memberId) {
      throw forbidden("This link is for a different member.");
    }

    const alreadyMember = await tx.query.groupMembers.findFirst({
      where: and(
        eq(groupMembers.groupId, invite.groupId),
        eq(groupMembers.userId, user.id),
        isNull(groupMembers.leftAt),
      ),
    });
    if (alreadyMember) {
      throw conflict("You're already in this group, so you can't also claim another member.");
    }

    // Atomic claim: only succeeds while the member is still a ghost.
    const claimed = await tx
      .update(groupMembers)
      .set({ userId: user.id })
      .where(
        and(
          eq(groupMembers.id, memberId),
          eq(groupMembers.groupId, invite.groupId),
          isNull(groupMembers.userId),
          isNull(groupMembers.leftAt),
        ),
      )
      .returning({ id: groupMembers.id });
    if (claimed.length === 0) {
      throw conflict("That member was already claimed.");
    }

    await tx
      .update(expenseSplits)
      .set({ userId: user.id })
      .where(eq(expenseSplits.memberId, memberId));
    await tx
      .update(expensePayers)
      .set({ userId: user.id })
      .where(eq(expensePayers.memberId, memberId));
    await tx
      .update(invites)
      .set({ useCount: sql`${invites.useCount} + 1` })
      .where(eq(invites.id, invite.id));
    await tx.insert(activityLogs).values({
      id: newId(),
      groupId: invite.groupId,
      actorUserId: user.id,
      verb: "member_claimed",
      objectType: "member",
      objectId: memberId,
      payload: { claimedBy: user.name },
    });
    return { groupId: invite.groupId };
  });
}

/** Leave a group — only at exactly zero balance; owners archive instead. */
export async function leaveGroup(user: ActionUser, groupId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const member = await assertMember(tx, user.id, groupId);
    if (member.role === "owner") {
      throw conflict("Owners can't leave — archive the group instead.");
    }
    const net = await memberNetMinor(tx, member.id);
    if (net !== 0) {
      throw conflict("Settle up first — your balance in this group isn't zero.");
    }
    await tx.update(groupMembers).set({ leftAt: new Date() }).where(eq(groupMembers.id, member.id));
    await tx.insert(activityLogs).values({
      id: newId(),
      groupId,
      actorUserId: user.id,
      verb: "member_left",
      objectType: "member",
      objectId: member.id,
      payload: { displayName: member.displayName },
    });
  });
}

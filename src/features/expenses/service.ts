import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { newId } from "@/lib/ids";
import { computeSplits, SplitError, validatePayers, type SplitShare } from "@/lib/split";
import { db, type Transaction } from "@/server/db";
import {
  activityLogs,
  categories,
  expensePayers,
  expenses,
  expenseSplits,
  expenseTags,
  groupMembers,
  groups,
  tags,
  type GroupMember,
} from "@/server/db/schema";
import { forbidden, notFound, validationError } from "@/server/errors";
import type { ActionUser } from "@/server/action-core";
import { assertMember, createGroup } from "@/features/groups/service";
import { addGhostMember } from "@/features/groups/members-service";
import { notifyUsers } from "@/features/notifications/service";
import { canModifyExpense } from "./authz";
import type {
  CreateExpenseInput,
  CreatePersonalExpenseInput,
  UpdateExpenseInput,
  UpdatePersonalExpenseInput,
} from "./schemas";

interface PreparedExpense {
  group: { id: string; name: string; currency: string };
  memberById: Map<string, GroupMember>;
  shares: SplitShare[];
  payerNames: string[];
}

/** Shared validation for create/update: membership, engine math, payers. */
async function prepare(
  tx: Transaction,
  user: ActionUser,
  input: CreateExpenseInput | UpdateExpenseInput,
): Promise<PreparedExpense> {
  await assertMember(tx, user.id, input.groupId);

  const group = await tx.query.groups.findFirst({
    where: eq(groups.id, input.groupId),
    with: { members: { where: isNull(groupMembers.leftAt) } },
  });
  if (!group || group.archivedAt) throw notFound("Group");

  const category = await tx.query.categories.findFirst({
    where: eq(categories.id, input.categoryId),
  });
  if (!category) throw notFound("Category");

  const memberById = new Map(group.members.map((member) => [member.id, member]));
  for (const payer of input.payers) {
    if (!memberById.has(payer.memberId)) {
      throw validationError("A payer isn't a member of this group.", {
        payers: ["Everyone paying must be in the group."],
      });
    }
  }
  for (const participant of input.participants) {
    if (!memberById.has(participant.memberId)) {
      throw validationError("A participant isn't a member of this group.", {
        participants: ["Everyone in the split must be in the group."],
      });
    }
  }

  try {
    validatePayers(input.amountMinor, input.payers);
    const shares = computeSplits({
      amountMinor: input.amountMinor,
      type: input.splitType,
      participants: input.participants,
    });
    return {
      group: { id: group.id, name: group.name, currency: group.currency },
      memberById,
      shares,
      payerNames: input.payers.map(
        (payer) => memberById.get(payer.memberId)?.displayName ?? "Someone",
      ),
    };
  } catch (error) {
    if (error instanceof SplitError) {
      throw validationError(error.message, { participants: [error.message] });
    }
    throw error;
  }
}

async function insertMoneyRows(
  tx: Transaction,
  expenseId: string,
  input: CreateExpenseInput | UpdateExpenseInput,
  prepared: PreparedExpense,
): Promise<void> {
  await tx.insert(expensePayers).values(
    input.payers.map((payer) => ({
      id: newId(),
      expenseId,
      memberId: payer.memberId,
      userId: prepared.memberById.get(payer.memberId)?.userId ?? null,
      amountMinor: payer.amountMinor,
    })),
  );
  await tx.insert(expenseSplits).values(
    prepared.shares.map((share) => ({
      id: newId(),
      expenseId,
      memberId: share.memberId,
      userId: prepared.memberById.get(share.memberId)?.userId ?? null,
      amountMinor: share.amountMinor,
      weight: share.weight,
    })),
  );
}

/** Attach the user's own tags to an expense (ignores ids that aren't theirs). */
async function attachTags(
  tx: Transaction,
  userId: string,
  expenseId: string,
  tagIds: ReadonlyArray<string> | undefined,
): Promise<void> {
  if (!tagIds || tagIds.length === 0) return;
  const owned = await tx
    .select({ id: tags.id })
    .from(tags)
    .where(and(eq(tags.userId, userId), inArray(tags.id, [...tagIds])));
  if (owned.length === 0) return;
  await tx.insert(expenseTags).values(owned.map((tag) => ({ expenseId, tagId: tag.id })));
}

/**
 * Create a group expense (any split type, one or many payers) in a single
 * transaction. Idempotent on the client key — retries return the original.
 */
export async function createExpense(
  user: ActionUser,
  input: CreateExpenseInput,
  options?: { recurringRuleId?: string },
): Promise<{ expenseId: string; participantUserIds: string[] }> {
  return db.transaction(async (tx) => {
    const prepared = await prepare(tx, user, input);

    const expenseId = newId();
    const inserted = await tx
      .insert(expenses)
      .values({
        id: expenseId,
        groupId: input.groupId,
        description: input.description,
        amountMinor: input.amountMinor,
        currency: prepared.group.currency,
        categoryId: input.categoryId,
        splitType: input.splitType,
        expenseDate: input.expenseDate,
        createdBy: user.id,
        recurringRuleId: options?.recurringRuleId ?? null,
        idempotencyKey: input.idempotencyKey,
      })
      .onConflictDoNothing({ target: expenses.idempotencyKey })
      .returning({ id: expenses.id });

    if (inserted.length === 0) {
      const existing = await tx.query.expenses.findFirst({
        where: eq(expenses.idempotencyKey, input.idempotencyKey),
        columns: { id: true },
      });
      if (!existing) throw notFound("Expense");
      // Retry of an already-recorded expense — no new spend to evaluate.
      return { expenseId: existing.id, participantUserIds: [] };
    }

    await insertMoneyRows(tx, expenseId, input, prepared);
    await attachTags(tx, user.id, expenseId, input.tagIds);
    await tx.insert(activityLogs).values({
      id: newId(),
      groupId: input.groupId,
      actorUserId: user.id,
      verb: "expense_added",
      objectType: "expense",
      objectId: expenseId,
      payload: {
        description: input.description,
        amountMinor: input.amountMinor,
        groupName: prepared.group.name,
        payerName: prepared.payerNames[0] ?? "Someone",
      },
    });

    // Members whose personal budgets this expense counts toward (claimed users).
    const participantUserIds = [
      ...new Set(
        prepared.shares
          .map((share) => prepared.memberById.get(share.memberId)?.userId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    // Notify everyone in the split except whoever added it (same transaction).
    await notifyUsers(tx, user.id, {
      userIds: participantUserIds,
      type: "expense_added",
      payload: {
        description: input.description,
        amountMinor: input.amountMinor,
        groupName: prepared.group.name,
        actorName: user.name,
      },
    });

    return { expenseId, participantUserIds };
  });
}

/** Only the creator, a payer, or the group owner may modify an expense. */
async function assertCanModify(
  tx: Transaction,
  user: ActionUser,
  expenseId: string,
  groupId: string,
): Promise<void> {
  const expense = await tx.query.expenses.findFirst({
    where: eq(expenses.id, expenseId),
    with: { payers: { columns: { userId: true } } },
  });
  if (!expense || expense.deletedAt || expense.groupId !== groupId) throw notFound("Expense");

  const member = await assertMember(tx, user.id, groupId);
  const allowed = canModifyExpense({
    isCreator: expense.createdBy === user.id,
    isPayer: expense.payers.some((payer) => payer.userId === user.id),
    isOwner: member.role === "owner",
  });
  if (!allowed) {
    throw forbidden("Only the person who added or paid this expense can change it.");
  }
}

/**
 * Create a personal expense (no group): the owner is the sole payer and sole
 * participant, so it flows straight into their personal ledger. Idempotent.
 */
export async function createPersonalExpense(
  user: ActionUser,
  input: CreatePersonalExpenseInput,
  options?: { recurringRuleId?: string },
): Promise<{ expenseId: string }> {
  return db.transaction(async (tx) => {
    const category = await tx.query.categories.findFirst({
      where: eq(categories.id, input.categoryId),
    });
    if (!category) throw notFound("Category");

    const expenseId = newId();
    const inserted = await tx
      .insert(expenses)
      .values({
        id: expenseId,
        groupId: null,
        description: input.description,
        amountMinor: input.amountMinor,
        currency: "INR",
        isIncome: input.isIncome ?? false,
        categoryId: input.categoryId,
        splitType: "equal",
        expenseDate: input.expenseDate,
        createdBy: user.id,
        recurringRuleId: options?.recurringRuleId ?? null,
        idempotencyKey: input.idempotencyKey,
      })
      .onConflictDoNothing({ target: expenses.idempotencyKey })
      .returning({ id: expenses.id });

    if (inserted.length === 0) {
      const existing = await tx.query.expenses.findFirst({
        where: eq(expenses.idempotencyKey, input.idempotencyKey),
        columns: { id: true },
      });
      if (!existing) throw notFound("Expense");
      return { expenseId: existing.id };
    }

    await tx.insert(expensePayers).values({
      id: newId(),
      expenseId,
      memberId: null,
      userId: user.id,
      amountMinor: input.amountMinor,
    });
    await tx.insert(expenseSplits).values({
      id: newId(),
      expenseId,
      memberId: null,
      userId: user.id,
      amountMinor: input.amountMinor,
      weight: null,
    });
    await attachTags(tx, user.id, expenseId, input.tagIds);

    return { expenseId };
  });
}

/**
 * Split a personal expense with people who may not use the app: converts it
 * into an equal group expense in the owner's auto-managed "Splits" group,
 * adding each name as a ghost member (reused if it already exists — ghosts can
 * claim their history later via invite links). The owner is the sole payer;
 * their share flows back into the personal ledger, and the original personal
 * row is soft-deleted so nothing double-counts.
 */
export interface SplitByNamesInput {
  description: string;
  amountMinor: number;
  categoryId: string;
  expenseDate: string;
  names: ReadonlyArray<string>;
  /** Pass a deterministic key for webhook retries; defaults to a fresh UUID. */
  idempotencyKey?: string;
}

/**
 * Create an equal split with named people directly (no pre-existing personal
 * row needed) — the one engine behind add-and-split and edit-and-split.
 */
export async function createSplitExpense(
  user: ActionUser,
  input: SplitByNamesInput,
): Promise<{ groupId: string; expenseId: string }> {
  // Find or create the owner's "Splits" group.
  const existing = await db.query.groups.findFirst({
    where: and(eq(groups.createdBy, user.id), eq(groups.name, "Splits"), isNull(groups.archivedAt)),
  });
  const groupId = existing ? existing.id : (await createGroup(user, { name: "Splits", emoji: "🧾", gradient: "ocean" })).groupId;

  // Resolve each name to an active member, reusing matches case-insensitively.
  const members = await db.query.groupMembers.findMany({
    where: and(eq(groupMembers.groupId, groupId), isNull(groupMembers.leftAt)),
  });
  const viewerMember = members.find((member) => member.userId === user.id);
  if (!viewerMember) throw forbidden("You aren't in your Splits group.");

  const wanted = [...new Set(input.names.map((name) => name.trim()).filter(Boolean))];
  const participantIds = [viewerMember.id];
  for (const name of wanted) {
    const match = members.find(
      (member) => member.displayName.toLowerCase() === name.toLowerCase(),
    );
    if (match) {
      if (match.id !== viewerMember.id) participantIds.push(match.id);
    } else {
      const { memberId } = await addGhostMember(user, { groupId, displayName: name });
      participantIds.push(memberId);
    }
  }
  if (participantIds.length < 2) throw validationError("Add at least one other person.", {});

  const { expenseId } = await createExpense(user, {
    groupId,
    description: input.description,
    amountMinor: input.amountMinor,
    categoryId: input.categoryId,
    expenseDate: input.expenseDate,
    splitType: "equal",
    participants: participantIds.map((memberId) => ({ memberId })),
    payers: [{ memberId: viewerMember.id, amountMinor: input.amountMinor }],
    idempotencyKey: input.idempotencyKey ?? randomUUID(),
    tagIds: [],
  });

  return { groupId, expenseId };
}

/** Convert an existing personal expense into a split (edit-sheet path). */
export async function splitPersonalExpense(
  user: ActionUser,
  input: { expenseId: string; names: ReadonlyArray<string> },
): Promise<{ groupId: string; expenseId: string }> {
  const expense = await db.query.expenses.findFirst({ where: eq(expenses.id, input.expenseId) });
  if (!expense || expense.deletedAt || expense.groupId !== null) throw notFound("Expense");
  if (expense.createdBy !== user.id) throw forbidden("That isn't your expense.");
  if (expense.isIncome) throw validationError("Income can't be split.", {});
  if (!expense.categoryId) throw validationError("Set a category before splitting.", {});

  const result = await createSplitExpense(user, {
    description: expense.description,
    amountMinor: expense.amountMinor,
    categoryId: expense.categoryId,
    expenseDate: expense.expenseDate,
    names: input.names,
  });
  await deletePersonalExpense(user, input.expenseId);
  return result;
}

/**
 * Edit a personal entry (owner only): amount, description, category, date and
 * direction. The single payer + split rows are kept in lockstep with the
 * amount so ledger and analytics stay exact.
 */
export async function updatePersonalExpense(
  user: ActionUser,
  input: UpdatePersonalExpenseInput,
): Promise<{ expenseId: string }> {
  return db.transaction(async (tx) => {
    const expense = await tx.query.expenses.findFirst({ where: eq(expenses.id, input.expenseId) });
    if (!expense || expense.deletedAt || expense.groupId !== null) throw notFound("Expense");
    if (expense.createdBy !== user.id) throw forbidden("That isn't your expense.");

    const category = await tx.query.categories.findFirst({
      where: eq(categories.id, input.categoryId),
    });
    if (!category) throw notFound("Category");

    await tx
      .update(expenses)
      .set({
        description: input.description,
        amountMinor: input.amountMinor,
        categoryId: input.categoryId,
        expenseDate: input.expenseDate,
        isIncome: input.isIncome ?? false,
      })
      .where(eq(expenses.id, input.expenseId));
    await tx
      .update(expensePayers)
      .set({ amountMinor: input.amountMinor })
      .where(eq(expensePayers.expenseId, input.expenseId));
    await tx
      .update(expenseSplits)
      .set({ amountMinor: input.amountMinor })
      .where(eq(expenseSplits.expenseId, input.expenseId));

    return { expenseId: input.expenseId };
  });
}

/** Undo a personal soft-delete (owner only) — the 5-second regret window. */
export async function restorePersonalExpense(user: ActionUser, expenseId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const expense = await tx.query.expenses.findFirst({ where: eq(expenses.id, expenseId) });
    if (!expense || !expense.deletedAt || expense.groupId !== null) throw notFound("Expense");
    if (expense.createdBy !== user.id) throw forbidden("That isn't your expense.");
    await tx.update(expenses).set({ deletedAt: null }).where(eq(expenses.id, expenseId));
  });
}

/** Soft-delete a personal expense (owner only). */
export async function deletePersonalExpense(user: ActionUser, expenseId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const expense = await tx.query.expenses.findFirst({ where: eq(expenses.id, expenseId) });
    if (!expense || expense.deletedAt || expense.groupId !== null) throw notFound("Expense");
    if (expense.createdBy !== user.id) throw forbidden("That isn't your expense.");
    await tx.update(expenses).set({ deletedAt: new Date() }).where(eq(expenses.id, expenseId));
  });
}

/** Soft-delete an expense; balances recompute exactly without it. */
export async function deleteExpense(
  user: ActionUser,
  expenseId: string,
  groupId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    await assertCanModify(tx, user, expenseId, groupId);
    const expense = await tx.query.expenses.findFirst({
      where: eq(expenses.id, expenseId),
      columns: { description: true, amountMinor: true },
    });
    if (!expense) throw notFound("Expense");
    await tx.update(expenses).set({ deletedAt: new Date() }).where(eq(expenses.id, expenseId));
    await tx.insert(activityLogs).values({
      id: newId(),
      groupId,
      actorUserId: user.id,
      verb: "expense_deleted",
      objectType: "expense",
      objectId: expenseId,
      payload: { description: expense.description, amountMinor: expense.amountMinor },
    });
  });
}

/**
 * Rewrite an expense: replaces payers/splits atomically with re-validated
 * engine output; original input weights are preserved for the next edit.
 */
export async function updateExpense(
  user: ActionUser,
  input: UpdateExpenseInput,
): Promise<{ expenseId: string }> {
  return db.transaction(async (tx) => {
    await assertCanModify(tx, user, input.expenseId, input.groupId);
    const prepared = await prepare(tx, user, input);

    await tx
      .update(expenses)
      .set({
        description: input.description,
        amountMinor: input.amountMinor,
        categoryId: input.categoryId,
        splitType: input.splitType,
        expenseDate: input.expenseDate,
      })
      .where(eq(expenses.id, input.expenseId));
    await tx.delete(expensePayers).where(eq(expensePayers.expenseId, input.expenseId));
    await tx.delete(expenseSplits).where(eq(expenseSplits.expenseId, input.expenseId));
    await insertMoneyRows(tx, input.expenseId, input, prepared);

    await tx.insert(activityLogs).values({
      id: newId(),
      groupId: input.groupId,
      actorUserId: user.id,
      verb: "expense_updated",
      objectType: "expense",
      objectId: input.expenseId,
      payload: {
        description: input.description,
        amountMinor: input.amountMinor,
        groupName: prepared.group.name,
      },
    });

    return { expenseId: input.expenseId };
  });
}

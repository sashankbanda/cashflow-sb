import "server-only";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/server/db";
import {
  budgets,
  categories,
  expenses,
  groupMembers,
  groups,
  recurringRules,
  settlements,
  tags,
  users,
} from "@/server/db/schema";

/**
 * Everything the user owns or shares, as one plain-JSON document — the
 * "your data stays yours" promise. Live rows only; money stays in paise
 * (integers) with the field names saying so.
 */
export async function getFullExport(userId: string): Promise<Record<string, unknown>> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      name: true,
      email: true,
      defaultCurrency: true,
      timezone: true,
      upiId: true,
      openingBalanceMinor: true,
      openingBalanceSetOn: true,
      createdAt: true,
    },
  });

  const memberships = await db.query.groupMembers.findMany({
    where: eq(groupMembers.userId, userId),
  });
  const groupIds = memberships.map((membership) => membership.groupId);

  const [
    visibleCategories,
    ownTags,
    personalRows,
    groupRows,
    groupExpenseRows,
    settlementRows,
    budgetRows,
    recurringRows,
  ] = await Promise.all([
    db.query.categories.findMany({
      where: or(isNull(categories.userId), eq(categories.userId, userId)),
    }),
    db.query.tags.findMany({ where: eq(tags.userId, userId) }),
    db.query.expenses.findMany({
      where: and(
        eq(expenses.createdBy, userId),
        isNull(expenses.groupId),
        isNull(expenses.deletedAt),
      ),
      with: { expenseTags: { with: { tag: true } } },
    }),
    groupIds.length > 0
      ? db.query.groups.findMany({
          where: inArray(groups.id, groupIds),
          with: { members: true },
        })
      : Promise.resolve([]),
    groupIds.length > 0
      ? db.query.expenses.findMany({
          where: and(inArray(expenses.groupId, groupIds), isNull(expenses.deletedAt)),
          with: { payers: true, splits: true },
        })
      : Promise.resolve([]),
    groupIds.length > 0
      ? db.query.settlements.findMany({
          where: and(inArray(settlements.groupId, groupIds), isNull(settlements.deletedAt)),
        })
      : Promise.resolve([]),
    db.query.budgets.findMany({ where: eq(budgets.userId, userId) }),
    db.query.recurringRules.findMany({ where: eq(recurringRules.userId, userId) }),
  ]);

  const categoryName = new Map(visibleCategories.map((category) => [category.id, category.name]));
  const memberName = new Map(
    groupRows.flatMap((group) => group.members.map((member) => [member.id, member.displayName])),
  );

  return {
    app: "Cashflow",
    exportedAt: new Date().toISOString(),
    profile: user ?? {},
    categories: visibleCategories.map((category) => ({
      name: category.name,
      kind: category.kind,
      icon: category.icon,
      system: category.userId === null,
      archived: category.archivedAt !== null,
    })),
    tags: ownTags.map((tag) => tag.name),
    personalEntries: personalRows.map((row) => ({
      date: row.expenseDate,
      description: row.description,
      amountMinor: row.amountMinor,
      currency: row.currency,
      direction: row.isIncome ? "income" : "expense",
      category: row.categoryId ? (categoryName.get(row.categoryId) ?? null) : null,
      tags: row.expenseTags.map((expenseTag) => expenseTag.tag.name),
    })),
    groups: groupRows.map((group) => ({
      name: group.name,
      emoji: group.emoji,
      archived: group.archivedAt !== null,
      members: group.members.map((member) => ({
        name: member.displayName,
        you: member.userId === userId,
        ghost: member.userId === null,
        left: member.leftAt !== null,
      })),
      expenses: groupExpenseRows
        .filter((row) => row.groupId === group.id)
        .map((row) => ({
          date: row.expenseDate,
          description: row.description,
          amountMinor: row.amountMinor,
          currency: row.currency,
          category: row.categoryId ? (categoryName.get(row.categoryId) ?? null) : null,
          splitType: row.splitType,
          paidBy: row.payers.map((payer) => ({
            name: payer.memberId
              ? (memberName.get(payer.memberId) ?? "Unknown")
              : payer.userId === userId
                ? "You"
                : "Unknown",
            amountMinor: payer.amountMinor,
          })),
          shares: row.splits.map((split) => ({
            name: split.memberId
              ? (memberName.get(split.memberId) ?? "Unknown")
              : split.userId === userId
                ? "You"
                : "Unknown",
            amountMinor: split.amountMinor,
          })),
        })),
      settlements: settlementRows
        .filter((row) => row.groupId === group.id)
        .map((row) => ({
          from: memberName.get(row.fromMemberId) ?? "Unknown",
          to: memberName.get(row.toMemberId) ?? "Unknown",
          amountMinor: row.amountMinor,
          method: row.method,
          note: row.note,
          settledAt: row.settledAt,
        })),
    })),
    budgets: budgetRows.map((row) => ({
      category: row.categoryId ? (categoryName.get(row.categoryId) ?? null) : "overall",
      amountMinor: row.amountMinor,
      period: row.period,
      startsOn: row.startsOn,
      endsOn: row.endsOn,
      rollover: row.rollover,
    })),
    recurringRules: recurringRows.map((row) => ({
      frequency: row.frequency,
      interval: row.interval,
      nextRunOn: row.nextRunOn,
      paused: row.pausedAt !== null,
      template: row.template,
    })),
  };
}

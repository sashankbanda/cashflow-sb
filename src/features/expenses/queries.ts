import "server-only";
import { formatISO } from "date-fns";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import type { SplitType } from "@/lib/split";
import { db } from "@/server/db";
import { activityLogs, expenses, settlements } from "@/server/db/schema";
import { assertMember } from "@/features/groups/service";

export interface ExpenseTrailEntry {
  verb: "expense_added" | "expense_updated" | "expense_deleted";
  actorName: string;
  /** ISO datetime. */
  at: string;
}

export interface ExpensePartyLine {
  memberId: string;
  displayName: string;
  image: string | null;
  amountMinor: number;
  /** Original input weight (exact paise / percent / shares); null for equal. */
  weight: number | null;
  isViewer: boolean;
}

export interface TimelineExpense {
  id: string;
  description: string;
  amountMinor: number;
  /** ISO date (yyyy-mm-dd), the user-chosen expense day. */
  expenseDate: string;
  splitType: SplitType;
  categoryId: string | null;
  category: { icon: string; gradient: string; name: string } | null;
  /** "You" when the viewer paid; "Asha +1" for multi-payer. */
  payerLabel: string;
  /** The viewer's computed share; 0 when not a participant. */
  myShareMinor: number;
  participantCount: number;
  createdByUserId: string;
  /** True when this row was materialized from a recurring rule. */
  isRecurring: boolean;
  payers: ExpensePartyLine[];
  splits: ExpensePartyLine[];
  trail: ExpenseTrailEntry[];
}

export interface TimelineSettlement {
  id: string;
  amountMinor: number;
  /** ISO date (yyyy-mm-dd) of the settlement. */
  date: string;
  fromMemberId: string;
  toMemberId: string;
  fromLabel: string;
  toLabel: string;
  method: "cash" | "upi" | "bank" | "other";
  note: string | null;
  involvesViewer: boolean;
}

export type TimelineItem =
  ({ kind: "expense" } & TimelineExpense) | ({ kind: "settlement" } & TimelineSettlement);

/** Day-ordered group timeline: expenses + settlements, viewer-aware. */
export async function getGroupTimeline(userId: string, groupId: string): Promise<TimelineItem[]> {
  const myMember = await assertMember(db, userId, groupId);

  const rows = await db.query.expenses.findMany({
    where: and(eq(expenses.groupId, groupId), isNull(expenses.deletedAt)),
    orderBy: [desc(expenses.expenseDate), desc(expenses.id)],
    with: {
      category: { columns: { icon: true, gradient: true, name: true } },
      payers: {
        with: {
          member: {
            columns: { id: true, displayName: true },
            with: { user: { columns: { image: true } } },
          },
        },
      },
      splits: {
        with: {
          member: {
            columns: { id: true, displayName: true },
            with: { user: { columns: { image: true } } },
          },
        },
      },
    },
    limit: 200,
  });

  const settlementRows = await db.query.settlements.findMany({
    where: and(eq(settlements.groupId, groupId), isNull(settlements.deletedAt)),
    orderBy: [desc(settlements.settledAt)],
    with: {
      fromMember: { columns: { id: true, displayName: true } },
      toMember: { columns: { id: true, displayName: true } },
    },
    limit: 100,
  });

  const settlementItems: TimelineItem[] = settlementRows.map((row) => ({
    kind: "settlement",
    id: row.id,
    amountMinor: row.amountMinor,
    date: formatISO(row.settledAt, { representation: "date" }),
    fromMemberId: row.fromMemberId,
    toMemberId: row.toMemberId,
    fromLabel:
      row.fromMember?.id === myMember.id ? "You" : (row.fromMember?.displayName ?? "Someone"),
    toLabel: row.toMember?.id === myMember.id ? "you" : (row.toMember?.displayName ?? "Someone"),
    method: row.method,
    note: row.note,
    involvesViewer: row.fromMember?.id === myMember.id || row.toMember?.id === myMember.id,
  }));

  const trailRows = await db.query.activityLogs.findMany({
    where: and(eq(activityLogs.groupId, groupId), eq(activityLogs.objectType, "expense")),
    orderBy: [asc(activityLogs.id)],
    columns: { objectId: true, verb: true, createdAt: true },
    with: { actor: { columns: { name: true } } },
  });
  const trailByExpense = new Map<string, ExpenseTrailEntry[]>();
  for (const row of trailRows) {
    if (
      row.verb !== "expense_added" &&
      row.verb !== "expense_updated" &&
      row.verb !== "expense_deleted"
    ) {
      continue;
    }
    const list = trailByExpense.get(row.objectId) ?? [];
    list.push({
      verb: row.verb,
      actorName: row.actor?.name ?? "Someone",
      at: row.createdAt.toISOString(),
    });
    trailByExpense.set(row.objectId, list);
  }

  const expenseItems: TimelineItem[] = rows.map((row) => {
    const toLine = (entry: {
      member: { id: string; displayName: string; user: { image: string | null } | null } | null;
      amountMinor: number;
      weight?: number | null;
    }): ExpensePartyLine => ({
      memberId: entry.member?.id ?? "",
      displayName: entry.member?.displayName ?? "Someone",
      image: entry.member?.user?.image ?? null,
      amountMinor: entry.amountMinor,
      weight: entry.weight ?? null,
      isViewer: entry.member?.id === myMember.id,
    });

    const payers = row.payers.map(toLine);
    const splits = row.splits.map(toLine);
    const firstPayer = payers[0];
    const firstPayerName = firstPayer?.isViewer ? "You" : (firstPayer?.displayName ?? "Someone");
    const payerLabel =
      payers.length > 1 ? `${firstPayerName} +${payers.length - 1}` : firstPayerName;

    return {
      kind: "expense" as const,
      id: row.id,
      description: row.description,
      amountMinor: row.amountMinor,
      expenseDate: row.expenseDate,
      splitType: row.splitType,
      categoryId: row.categoryId,
      category: row.category
        ? { icon: row.category.icon, gradient: row.category.gradient, name: row.category.name }
        : null,
      payerLabel,
      myShareMinor: splits.find((split) => split.isViewer)?.amountMinor ?? 0,
      participantCount: splits.length,
      createdByUserId: row.createdBy,
      isRecurring: row.recurringRuleId !== null,
      payers,
      splits,
      trail: trailByExpense.get(row.id) ?? [],
    };
  });

  const dateOf = (item: TimelineItem) => (item.kind === "expense" ? item.expenseDate : item.date);
  return [...expenseItems, ...settlementItems].sort((a, b) => {
    const byDate = dateOf(b).localeCompare(dateOf(a));
    return byDate !== 0 ? byDate : b.id.localeCompare(a.id);
  });
}

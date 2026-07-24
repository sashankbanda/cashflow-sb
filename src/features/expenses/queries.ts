import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import type { SplitType } from "@/lib/split";
import { db } from "@/server/db";
import { expenses } from "@/server/db/schema";
import { assertMember } from "@/features/groups/service";

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
  payers: ExpensePartyLine[];
  splits: ExpensePartyLine[];
}

/** Day-ordered expense timeline for a group with full per-member breakdowns. */
export async function getGroupTimeline(
  userId: string,
  groupId: string,
): Promise<TimelineExpense[]> {
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

  return rows.map((row) => {
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
      payers,
      splits,
    };
  });
}

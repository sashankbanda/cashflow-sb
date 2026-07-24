import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import { expenses } from "@/server/db/schema";
import { assertMember } from "@/features/groups/service";

export interface TimelineExpense {
  id: string;
  description: string;
  amountMinor: number;
  /** ISO date (yyyy-mm-dd), the user-chosen expense day. */
  expenseDate: string;
  category: { icon: string; gradient: string; name: string } | null;
  /** "You" when the viewer paid. */
  payerLabel: string;
  /** The viewer's computed share; 0 when not a participant. */
  myShareMinor: number;
  participantCount: number;
}

/** Day-ordered expense timeline for a group, viewer-aware. */
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
      payers: { with: { member: { columns: { id: true, displayName: true } } } },
      splits: { columns: { memberId: true, amountMinor: true } },
    },
    limit: 200,
  });

  return rows.map((row) => {
    const payerNames = row.payers.map((payer) =>
      payer.member?.id === myMember.id ? "You" : (payer.member?.displayName ?? "Someone"),
    );
    const payerLabel =
      payerNames.length > 1
        ? `${payerNames[0]} +${payerNames.length - 1}`
        : (payerNames[0] ?? "Someone");
    const myShare = row.splits.find((split) => split.memberId === myMember.id)?.amountMinor ?? 0;
    return {
      id: row.id,
      description: row.description,
      amountMinor: row.amountMinor,
      expenseDate: row.expenseDate,
      category: row.category
        ? { icon: row.category.icon, gradient: row.category.gradient, name: row.category.name }
        : null,
      payerLabel,
      myShareMinor: myShare,
      participantCount: row.splits.length,
    };
  });
}

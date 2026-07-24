import "server-only";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { newId } from "@/lib/ids";
import { db } from "@/server/db";
import { activityLogs, groupMembers, groups, settlements } from "@/server/db/schema";
import { notFound, validationError } from "@/server/errors";
import type { ActionUser } from "@/server/action-core";
import { assertMember } from "@/features/groups/service";
import type { RecordSettlementInput } from "./schemas";

/**
 * Record a payment between two members — a first-class settlement row with
 * its own activity entry, all in one transaction. Partial amounts welcome.
 */
export async function recordSettlement(
  user: ActionUser,
  input: RecordSettlementInput,
): Promise<{ settlementId: string }> {
  return db.transaction(async (tx) => {
    await assertMember(tx, user.id, input.groupId);

    const group = await tx.query.groups.findFirst({ where: eq(groups.id, input.groupId) });
    if (!group || group.archivedAt) throw notFound("Group");

    if (input.fromMemberId === input.toMemberId) {
      throw validationError("Payer and receiver must be different people.", {
        toMemberId: ["Pick someone else."],
      });
    }
    const parties = await tx.query.groupMembers.findMany({
      where: and(
        inArray(groupMembers.id, [input.fromMemberId, input.toMemberId]),
        eq(groupMembers.groupId, input.groupId),
        isNull(groupMembers.leftAt),
      ),
    });
    if (parties.length !== 2) {
      throw validationError("Both people must be members of this group.", {
        fromMemberId: ["Pick group members."],
      });
    }

    const settlementId = newId();
    await tx.insert(settlements).values({
      id: settlementId,
      groupId: input.groupId,
      fromMemberId: input.fromMemberId,
      toMemberId: input.toMemberId,
      amountMinor: input.amountMinor,
      method: input.method,
      note: input.note ?? null,
      createdBy: user.id,
    });

    const fromName = parties.find((member) => member.id === input.fromMemberId)?.displayName;
    const toName = parties.find((member) => member.id === input.toMemberId)?.displayName;
    await tx.insert(activityLogs).values({
      id: newId(),
      groupId: input.groupId,
      actorUserId: user.id,
      verb: "settlement_recorded",
      objectType: "settlement",
      objectId: settlementId,
      payload: {
        amountMinor: input.amountMinor,
        method: input.method,
        fromName: fromName ?? "Someone",
        toName: toName ?? "Someone",
        groupName: group.name,
      },
    });

    return { settlementId };
  });
}

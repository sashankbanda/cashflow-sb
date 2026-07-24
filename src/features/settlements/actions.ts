"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { authedAction } from "@/server/action";
import { groupBalancesTag } from "@/features/balances/queries";
import { recordSettlementSchema } from "./schemas";
import { recordSettlement } from "./service";

export const recordSettlementAction = authedAction({
  name: "settlements.record",
  schema: recordSettlementSchema,
  handler: async ({ input, ctx }) => {
    const { settlementId } = await recordSettlement(ctx.user, input);
    revalidateTag(groupBalancesTag(input.groupId), "max");
    revalidatePath(`/groups/${input.groupId}`);
    revalidatePath("/groups");
    revalidatePath("/home");
    return { settlementId };
  },
});

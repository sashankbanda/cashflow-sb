"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { authedAction } from "@/server/action";
import { groupBalancesTag } from "@/features/balances/queries";
import {
  createRecurringRuleSchema,
  deleteRecurringRuleSchema,
  updateRecurringRuleSchema,
} from "./schemas";
import { createRecurringRule, deleteRule, endRule, pauseRule, resumeRule } from "./service";

const revalidateRecurringSurfaces = () => {
  revalidatePath("/recurring");
  revalidatePath("/expenses");
  revalidatePath("/home");
  revalidatePath("/budgets");
};

export const createRecurringRuleAction = authedAction({
  name: "recurring.create",
  schema: createRecurringRuleSchema,
  handler: async ({ input, ctx }) => {
    const result = await createRecurringRule(ctx.user, input);
    revalidateRecurringSurfaces();
    if (input.template.kind === "group") {
      revalidateTag(groupBalancesTag(input.template.groupId), "max");
      revalidatePath(`/groups/${input.template.groupId}`);
      revalidatePath("/groups");
    }
    return result;
  },
});

export const updateRecurringRuleAction = authedAction({
  name: "recurring.update",
  schema: updateRecurringRuleSchema,
  handler: async ({ input, ctx }) => {
    if (input.action === "pause") await pauseRule(ctx.user, input.ruleId);
    else if (input.action === "resume") await resumeRule(ctx.user, input.ruleId);
    else await endRule(ctx.user, input.ruleId);
    revalidateRecurringSurfaces();
    return { ruleId: input.ruleId };
  },
});

export const deleteRecurringRuleAction = authedAction({
  name: "recurring.delete",
  schema: deleteRecurringRuleSchema,
  handler: async ({ input, ctx }) => {
    await deleteRule(ctx.user, input.ruleId);
    revalidateRecurringSurfaces();
    return { ruleId: input.ruleId };
  },
});

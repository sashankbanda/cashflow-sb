"use server";

import { z } from "zod";
import { authedAction } from "@/server/action";
import { getActivityFeed } from "./queries";

export const loadActivityAction = authedAction({
  name: "activity.load",
  schema: z.object({
    groupId: z.string().min(1).optional(),
    cursor: z.string().min(1).optional(),
  }),
  handler: async ({ input, ctx }) =>
    getActivityFeed(ctx.user.id, { groupId: input.groupId, cursor: input.cursor }),
});

"use server";

import { authedAction } from "@/server/action";
import { searchAll } from "./queries";
import { searchInputSchema } from "./schemas";

export const searchAction = authedAction({
  name: "search.run",
  schema: searchInputSchema,
  handler: async ({ input, ctx }) => searchAll(ctx.user.id, input),
});

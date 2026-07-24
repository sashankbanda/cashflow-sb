"use server";

import { z } from "zod";
import { authedAction } from "@/server/action";
import { getSpendingInsights } from "./insights-queries";

/** Read-only period fetch for the Insights screen's chip switcher. */
export const fetchInsightsAction = authedAction({
  name: "insights.fetch",
  schema: z.object({ period: z.enum(["week", "month", "quarter", "year"]) }),
  handler: async ({ input, ctx }) => getSpendingInsights(ctx.user.id, input.period),
});

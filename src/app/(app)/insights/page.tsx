import type { Metadata } from "next";
import { requireUser } from "@/features/auth/session";
import { InsightsScreen } from "@/features/analytics/components/InsightsScreen";
import { getSpendingInsights } from "@/features/analytics/insights-queries";

export const metadata: Metadata = { title: "Insights" };

export default async function InsightsPage() {
  const user = await requireUser();
  const initial = await getSpendingInsights(user.id, "month");
  return <InsightsScreen initial={initial} />;
}

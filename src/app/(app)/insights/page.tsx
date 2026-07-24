import type { Metadata } from "next";
import { requireUser } from "@/features/auth/session";
import { InsightsScreen } from "@/features/analytics/components/InsightsScreen";
import { getInsightsBundle } from "@/features/analytics/insights-queries";

export const metadata: Metadata = { title: "Insights" };

export default async function InsightsPage() {
  const user = await requireUser();
  const { spending, cashflow, cards } = await getInsightsBundle(user.id);
  return <InsightsScreen initial={spending} cashflow={cashflow} cards={cards} />;
}

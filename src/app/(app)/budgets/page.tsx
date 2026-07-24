import type { Metadata } from "next";
import { requireUser } from "@/features/auth/session";
import { BudgetsScreen } from "@/features/budgets/components/BudgetsScreen";
import { getBudgetOverview } from "@/features/budgets/queries";

export const metadata: Metadata = { title: "Budgets" };

export default async function BudgetsPage() {
  const user = await requireUser();
  const overview = await getBudgetOverview(user.id);
  return <BudgetsScreen overview={overview} />;
}

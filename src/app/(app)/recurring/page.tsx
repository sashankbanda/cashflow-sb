import type { Metadata } from "next";
import { requireUser } from "@/features/auth/session";
import { RecurringManager } from "@/features/recurring/components/RecurringManager";
import { getRecurringRules, getUpcomingOccurrences } from "@/features/recurring/queries";

export const metadata: Metadata = { title: "Recurring" };

export default async function RecurringPage() {
  const user = await requireUser();
  const [rules, upcoming] = await Promise.all([
    getRecurringRules(user.id),
    getUpcomingOccurrences(user.id, 5),
  ]);
  return <RecurringManager rules={rules} upcoming={upcoming} />;
}

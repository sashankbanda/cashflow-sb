import type { Metadata } from "next";
import { requireUser } from "@/features/auth/session";
import { getCategoriesForUser } from "@/features/categories/queries";
import { QuickAddScreen } from "@/features/expenses/components/QuickAddScreen";
import { parseUpiText } from "@/lib/upi-parse";

export const metadata: Metadata = { title: "Quick add" };

/**
 * Share-target destination: sharing a UPI receipt / bank SMS into Cashflow
 * lands here with the text in the query, so the entry prefills. Also usable
 * directly (Money → Quick add) with the Paste button on any platform.
 */
export default async function QuickAddPage({
  searchParams,
}: {
  searchParams: Promise<{ title?: string; text?: string; url?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const shared = [params.title, params.text, params.url].filter(Boolean).join(" ");
  const [categories] = await Promise.all([getCategoriesForUser(user.id)]);

  return <QuickAddScreen categories={categories} initial={parseUpiText(shared)} />;
}

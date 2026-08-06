import type { Metadata } from "next";
import { cookies } from "next/headers";
import { formatISO } from "date-fns";
import { requireUser } from "@/features/auth/session";
import { getCategoriesForUser } from "@/features/categories/queries";
import { QuickAddScreen } from "@/features/expenses/components/QuickAddScreen";
import { getSplitSuggestions } from "@/features/expenses/personal-queries";
import { defaultEntryDate, PERIOD_COOKIE, parsePeriodCookie, resolvePeriod } from "@/lib/period";
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
  const [categories, splitSuggestions] = await Promise.all([
    getCategoriesForUser(user.id),
    getSplitSuggestions(user.id),
  ]);
  const entryDate = defaultEntryDate(
    resolvePeriod(parsePeriodCookie((await cookies()).get(PERIOD_COOKIE)?.value)),
    formatISO(new Date(), { representation: "date" }),
  );

  return (
    <QuickAddScreen
      categories={categories}
      initial={parseUpiText(shared)}
      defaultDate={entryDate}
      splitSuggestions={splitSuggestions}
    />
  );
}

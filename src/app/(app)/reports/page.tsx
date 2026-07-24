import type { Metadata } from "next";
import { monthWindow } from "@/lib/dates";
import { requireDbUser } from "@/features/auth/session";
import { ReportsView } from "@/features/reports/components/ReportsView";
import { getMonthlyReport } from "@/features/reports/queries";

export const metadata: Metadata = { title: "Reports" };

const MONTH = /^\d{4}-\d{2}$/;

function shiftMonth(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split("-").map(Number);
  const total = (year ?? 0) * 12 + ((month ?? 1) - 1) + delta;
  const nextYear = Math.floor(total / 12);
  const nextMonth = (total % 12) + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await requireDbUser();
  const { month } = await searchParams;
  const requested = month && MONTH.test(month) ? month : undefined;
  const report = await getMonthlyReport(user.id, requested);
  const currentKey = monthWindow(user.timezone).monthKey;
  const nextKey = shiftMonth(report.monthKey, 1);

  return (
    <ReportsView
      report={report}
      prevHref={`/reports?month=${shiftMonth(report.monthKey, -1)}`}
      nextHref={report.monthKey < currentKey ? `/reports?month=${nextKey}` : null}
    />
  );
}

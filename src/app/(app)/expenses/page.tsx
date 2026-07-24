import type { Metadata } from "next";
import Link from "next/link";
import { formatISO, parseISO, startOfMonth } from "date-fns";
import { CalendarClock, ChevronRight, Wallet } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientPanel } from "@/components/ui/GradientPanel";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { formatDayLabel } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { requireUser } from "@/features/auth/session";
import { PersonalLedger } from "@/features/expenses/components/PersonalLedger";
import { getPersonalLedger, getPersonalSpendTotal } from "@/features/expenses/personal-queries";
import { getUpcomingOccurrences } from "@/features/recurring/queries";

export const metadata: Metadata = { title: "Spending" };

export default async function ExpensesPage() {
  const user = await requireUser();
  const now = new Date();
  const monthStart = formatISO(startOfMonth(now), { representation: "date" });
  const today = formatISO(now, { representation: "date" });

  const [entries, monthTotal, upcoming] = await Promise.all([
    getPersonalLedger(user.id),
    getPersonalSpendTotal(user.id, { from: monthStart, to: today }),
    getUpcomingOccurrences(user.id, 3),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader title="Spending" eyebrow="Everything you spend" />
      <div className="space-y-5 px-5">
        <GradientPanel palette="ember" className="p-6">
          <p className="text-caption text-white/70 uppercase">This month</p>
          <p className="mt-2 font-dot text-display font-black text-white tabular-nums">
            {formatMoney(monthTotal, { compact: monthTotal >= 10_000_00 })}
          </p>
          <p className="mt-1 text-footnote text-white/70">
            Personal spends plus your share of group expenses
          </p>
        </GradientPanel>

        {upcoming.length > 0 ? (
          <Link href="/recurring" className="block">
            <GlassCard elevation="inset" className="p-4">
              <div className="flex items-center justify-between pb-2">
                <span className="flex items-center gap-2 text-caption text-fg-3 uppercase">
                  <CalendarClock className="size-3.5" /> Upcoming
                </span>
                <ChevronRight className="size-4 text-fg-3" />
              </div>
              <div className="space-y-1.5">
                {upcoming.map((item) => (
                  <div
                    key={`${item.ruleId}-${item.date}`}
                    className="flex items-center justify-between gap-3"
                  >
                    <p className="min-w-0 flex-1 truncate text-footnote text-fg-2">
                      {item.description}
                      <span className="text-fg-3"> · {formatDayLabel(parseISO(item.date))}</span>
                    </p>
                    <p className="shrink-0 text-footnote text-fg-2 tabular-nums">
                      {formatMoney(item.amountMinor)}
                    </p>
                  </div>
                ))}
              </div>
            </GlassCard>
          </Link>
        ) : null}

        {entries.length === 0 ? (
          <GlassCard elevation="inset">
            <EmptyState
              icon={<Wallet />}
              palette="ember"
              title="Nothing tracked yet"
              description="Add a personal expense with the volt button, or add one to a group — your share lands here automatically."
            />
          </GlassCard>
        ) : (
          <PersonalLedger entries={entries} />
        )}
      </div>
    </div>
  );
}

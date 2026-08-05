import type { Metadata } from "next";
import Link from "next/link";
import { formatISO, parseISO, startOfMonth } from "date-fns";
import { CalendarClock, ChevronRight, Search, Wallet, Zap } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientPanel } from "@/components/ui/GradientPanel";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { formatDayLabel } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { requireUser } from "@/features/auth/session";
import { getCategoriesForUser } from "@/features/categories/queries";
import { PendingExpenses } from "@/features/expenses/components/PendingExpenses";
import { PersonalLedger } from "@/features/expenses/components/PersonalLedger";
import {
  getPersonalIncomeTotal,
  getPersonalLedger,
  getPersonalSpendTotal,
} from "@/features/expenses/personal-queries";
import { getUpcomingOccurrences } from "@/features/recurring/queries";

export const metadata: Metadata = { title: "Spending" };

export default async function ExpensesPage() {
  const user = await requireUser();
  const now = new Date();
  const monthStart = formatISO(startOfMonth(now), { representation: "date" });
  const today = formatISO(now, { representation: "date" });

  const [entries, monthTotal, monthIncome, upcoming, categories] = await Promise.all([
    getPersonalLedger(user.id),
    getPersonalSpendTotal(user.id, { from: monthStart, to: today }),
    getPersonalIncomeTotal(user.id, { from: monthStart, to: today }),
    getUpcomingOccurrences(user.id, 3),
    getCategoriesForUser(user.id),
  ]);
  const net = monthIncome - monthTotal;

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader
        title="Money"
        eyebrow="This month's cashflow"
        trailing={
          <Link
            href="/search"
            aria-label="Search"
            className="ease-out inline-flex size-9 items-center justify-center rounded-full glass text-fg-2 transition-transform duration-150 active:scale-[0.97] [&_svg]:size-4"
          >
            <Search />
          </Link>
        }
      />
      <div className="space-y-5 px-5">
        <GradientPanel palette="aurora" className="p-6">
          <p className="text-caption text-fg-on-grad uppercase">Net this month</p>
          <p className="mt-2 font-dot text-display font-black text-white tabular-nums">
            {formatMoney(net, { sign: "always", compact: Math.abs(net) >= 10_000_00 })}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-footnote text-fg-on-grad">
            <span>
              <span aria-hidden>↑ </span>Income{" "}
              {formatMoney(monthIncome, { compact: monthIncome >= 10_000_00 })}
            </span>
            <span>
              <span aria-hidden>↓ </span>Spent{" "}
              {formatMoney(monthTotal, { compact: monthTotal >= 10_000_00 })}
            </span>
          </div>
        </GradientPanel>

        <Link
          href="/add"
          className="ease-out flex items-center gap-3 rounded-lg glass p-4 transition-transform duration-150 active:scale-[0.99]"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-volt text-on-volt">
            <Zap className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-body font-medium text-fg-1">Quick add from a UPI message</span>
            <span className="block text-footnote text-fg-3">
              Share a receipt to Cashflow, or paste the payment SMS
            </span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-fg-3" />
        </Link>

        <PendingExpenses />

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
              description="Tap the + button to add a spend or income, or add an expense to a group — your share lands here automatically."
            />
          </GlassCard>
        ) : (
          <PersonalLedger entries={entries} categories={categories} />
        )}
      </div>
    </div>
  );
}

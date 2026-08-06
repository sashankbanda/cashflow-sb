import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { formatISO } from "date-fns";
import { Search } from "lucide-react";
import { Stagger } from "@/components/motion/Stagger";
import { GlassCard } from "@/components/ui/GlassCard";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { ActivityRow } from "@/components/widgets/ActivityRow";
import { BudgetWidget } from "@/components/widgets/BudgetWidget";
import { InsightCard } from "@/components/widgets/InsightCard";
import { MonthSpendWidget } from "@/components/widgets/MonthSpendWidget";
import { NetBalanceWidget } from "@/components/widgets/NetBalanceWidget";
import { OwedWidget } from "@/components/widgets/OwedWidget";
import { WidgetGrid } from "@/components/widgets/Widget";
import { greetingFor } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { requireDbUser } from "@/features/auth/session";
import { getHomeSummary } from "@/features/analytics/queries";
import {
  getCashTotals,
  getPersonalIncomeTotal,
  getPersonalSpendTotal,
} from "@/features/expenses/personal-queries";
import { cookies } from "next/headers";
import { PeriodPicker } from "@/components/ui/PeriodPicker";
import { PERIOD_COOKIE, parsePeriodCookie, resolvePeriod, type Period } from "@/lib/period";
import { getTopInsights } from "@/features/analytics/insights-queries";
import { getOverallBudgetSnapshot } from "@/features/budgets/queries";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import { getUnreadCount } from "@/features/notifications/queries";

export const metadata: Metadata = { title: "Home" };

function peopleLabel(count: number, verb: string): string {
  if (count === 0) return "no one";
  return `${verb} ${count} ${count === 1 ? "person" : "people"}`;
}

async function HomeWidgets({
  userId,
  openingBalanceMinor,
  period,
}: {
  userId: string;
  openingBalanceMinor: number | null;
  period: Period;
}) {
  const today = formatISO(new Date(), { representation: "date" });
  const range = { from: period.from, to: period.to };
  const allTime = { from: "1970-01-01", to: today };
  const noCash = { paidOutMinor: 0, settleInMinor: 0, settleOutMinor: 0 };
  const [summary, budget, topInsights, periodIncome, periodSpendRaw, allIncome, cash] =
    await Promise.all([
      getHomeSummary(userId),
      getOverallBudgetSnapshot(userId),
      getTopInsights(userId, 1),
      getPersonalIncomeTotal(userId, range),
      period.isDefault ? Promise.resolve(null) : getPersonalSpendTotal(userId, range),
      openingBalanceMinor !== null ? getPersonalIncomeTotal(userId, allTime) : Promise.resolve(0),
      openingBalanceMinor !== null ? getCashTotals(userId) : Promise.resolve(noCash),
    ]);
  const periodSpend = periodSpendRaw ?? summary.monthSpendMinor;
  const monthIncome = periodIncome;
  // With a starting balance set, the DEFAULT hero is a CASH-TRUE account
  // balance (split bills at the full paid amount; friends' shares enter only
  // when settled). Picking any explicit period switches the hero to that
  // window's income-minus-spending so the whole screen follows the picker;
  // "This month" brings the account balance back.
  const accountMode = openingBalanceMinor !== null && period.isDefault;
  const heroMinor = accountMode
    ? openingBalanceMinor + allIncome + cash.settleInMinor - cash.paidOutMinor - cash.settleOutMinor
    : monthIncome - periodSpend;

  const topInsight = topInsights[0];
  const insight =
    topInsight?.text ??
    (summary.owedToYouMinor > 0
      ? `You get ${formatMoney(summary.owedToYouMinor)} back from ${summary.owedFromCount} ${summary.owedFromCount === 1 ? "friend" : "friends"}.`
      : summary.youOweMinor > 0
        ? `You give ${formatMoney(summary.youOweMinor)} — settle up to clear it.`
        : "You're all square with everyone. Nice.");

  return (
    <Stagger className="space-y-3">
      <NetBalanceWidget
        netMinor={heroMinor}
        context={accountMode ? "Cash in − cash out since your start" : "Income minus spending"}
        label={
          accountMode
            ? "Account balance"
            : period.isDefault
              ? undefined
              : `Balance · ${period.label}`
        }
        summaryText={
          accountMode ? "Money friends still have to give isn't counted until settled" : undefined
        }
        monthInMinor={monthIncome}
        monthOutMinor={periodSpend}
      />

      <WidgetGrid>
        <OwedWidget
          direction="in"
          amountMinor={summary.owedToYouMinor}
          context={peopleLabel(summary.owedFromCount, "from")}
        />
        <OwedWidget
          direction="out"
          amountMinor={summary.youOweMinor}
          context={peopleLabel(summary.oweToCount, "to")}
        />
      </WidgetGrid>

      <Link href="/expenses" className="block">
        <MonthSpendWidget
          label={period.isDefault ? "This month" : period.label}
          amountMinor={periodSpend}
          trend={summary.trend}
          deltaFraction={period.isDefault ? summary.monthDeltaFraction : null}
        />
      </Link>

      {budget ? (
        <Link href="/budgets" className="block">
          <BudgetWidget
            spentMinor={budget.spentMinor}
            budgetMinor={budget.budgetMinor}
            pace={budget.pace}
          />
        </Link>
      ) : null}

      <InsightCard
        text={insight}
        palette={
          topInsight?.palette ?? (summary.youOweMinor > summary.owedToYouMinor ? "ember" : "mint")
        }
      />

      <section className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-caption text-fg-3 uppercase">Recent activity</h2>
          <Link
            href="/activity"
            className="ease-out -mr-2 rounded-full px-2 py-1 text-footnote text-fg-3 transition-colors duration-150 hover:text-fg-2 active:bg-glass active:text-fg-1"
          >
            See all
          </Link>
        </div>
        {summary.activity.length === 0 ? (
          <GlassCard elevation="inset" className="p-5">
            <p className="text-footnote text-fg-3">
              Nothing yet — add an expense and it&apos;ll show up here.
            </p>
          </GlassCard>
        ) : (
          <GlassCard elevation="inset" className="divide-y divide-hairline">
            {summary.activity.map((item) => (
              <ActivityRow
                key={item.id}
                actorName={item.actorName}
                actorImage={item.actorImage}
                text={item.text}
                when=""
                amountMinor={item.amountMinor}
              />
            ))}
          </GlassCard>
        )}
      </section>
    </Stagger>
  );
}

function HomeSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-52 rounded-lg" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-42 rounded-lg" />
        <Skeleton className="h-42 rounded-lg" />
      </div>
      <Skeleton className="h-28 rounded-lg" />
      <Skeleton className="h-40 rounded-lg" />
    </div>
  );
}

export default async function HomePage() {
  // The app-wide period lives in a cookie — picked here, applied everywhere.
  const period = resolvePeriod(parsePeriodCookie((await cookies()).get(PERIOD_COOKIE)?.value));
  const user = await requireDbUser();
  const greeting = greetingFor(user.timezone);
  const firstName = user.name.split(" ")[0] ?? user.name;
  const unread = await getUnreadCount(user.id);

  return (
    <div className="flex flex-col gap-5">
      <ScreenHeader
        title={firstName}
        eyebrow={greeting}
        trailing={
          <>
            <Link
              href="/search"
              aria-label="Search"
              className="ease-out inline-flex size-9 items-center justify-center rounded-full glass text-fg-2 transition-[transform,filter] duration-150 hover:text-fg-1 active:scale-[0.97] [&_svg]:size-4"
            >
              <Search />
            </Link>
            <NotificationBell unread={unread} />
          </>
        }
      />
      <div className="space-y-4 px-5">
        <PeriodPicker period={period} />
        <Suspense fallback={<HomeSkeleton />}>
          <HomeWidgets
            userId={user.id}
            openingBalanceMinor={user.openingBalanceMinor}
            period={period}
          />
        </Suspense>
      </div>
    </div>
  );
}

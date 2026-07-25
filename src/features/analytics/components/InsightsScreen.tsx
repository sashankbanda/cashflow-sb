"use client";

import { useState } from "react";
import { parseISO } from "date-fns";
import { TrendingDown, TrendingUp } from "lucide-react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { AreaTrend } from "@/components/charts/AreaTrend";
import { DonutCategory } from "@/components/charts/DonutCategory";
import { HeatmapCalendar } from "@/components/charts/HeatmapCalendar";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { GlassCard } from "@/components/ui/GlassCard";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { InsightCard } from "@/components/widgets/InsightCard";
import { NumberTicker } from "@/components/motion/NumberTicker";
import { cn } from "@/lib/cn";
import { formatMoney, formatPercent } from "@/lib/format";
import { useAction } from "@/hooks/useAction";
import { CategoryBadge } from "@/features/categories/icons";
import { fetchInsightsAction } from "../actions";
import type { Cashflow, InsightsPayload } from "../insights-queries";
import type { Insight } from "../insights";
import { INSIGHT_PERIODS, type InsightPeriod } from "../trend";

const PREVIOUS_LABEL: Record<InsightPeriod, string> = {
  week: "last week",
  month: "prior 30 days",
  quarter: "prior 3 months",
  year: "prior year",
};

const moneyCompact = (value: number) => formatMoney(value, { compact: true });

function CategoryRow({ category }: { category: InsightsPayload["categories"][number] }) {
  const delta = category.deltaFraction;
  return (
    <div className="flex items-center gap-3 p-4">
      <CategoryBadge icon={category.icon} gradient={category.gradient} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-body text-fg-1">{category.name}</p>
        <p className="text-footnote text-fg-3 tabular-nums">{formatPercent(category.share)}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-body text-fg-1 tabular-nums">{formatMoney(category.amountMinor)}</p>
        {delta !== null ? (
          <p
            className={cn(
              "text-caption tabular-nums",
              delta > 0 ? "text-warning" : "text-positive",
            )}
          >
            {delta > 0 ? "↑" : "↓"} {formatPercent(Math.abs(delta))}
          </p>
        ) : (
          <p className="text-caption text-fg-3">new</p>
        )}
      </div>
    </div>
  );
}

function CashflowCard({ cashflow }: { cashflow: Cashflow }) {
  const surplus = cashflow.netFlowMinor >= 0;
  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-caption text-fg-3 uppercase">Cash flow · {cashflow.monthLabel}</p>
        <p
          className={cn(
            "text-body font-semibold tabular-nums",
            surplus ? "text-positive" : "text-warning",
          )}
        >
          {formatMoney(cashflow.netFlowMinor, { sign: "always" })}
        </p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-md glass-soft p-3">
          <p className="flex items-center gap-1 text-caption text-fg-3">
            <ArrowDownLeft className="size-3.5 text-positive" /> In
          </p>
          <p className="mt-1 text-headline text-fg-1 tabular-nums">
            {formatMoney(cashflow.inflowMinor, { compact: cashflow.inflowMinor >= 1_000_00 })}
          </p>
          <p className="text-caption text-fg-3">settlements received</p>
        </div>
        <div className="rounded-md glass-soft p-3">
          <p className="flex items-center gap-1 text-caption text-fg-3">
            <ArrowUpRight className="size-3.5 text-negative" /> Out
          </p>
          <p className="mt-1 text-headline text-fg-1 tabular-nums">
            {formatMoney(cashflow.outflowMinor, { compact: cashflow.outflowMinor >= 1_000_00 })}
          </p>
          <p className="text-caption text-fg-3">spend + settlements paid</p>
        </div>
      </div>
      {cashflow.owedToYouMinor > 0 || cashflow.youOweMinor > 0 ? (
        <p className="mt-3 text-footnote text-fg-3">
          {cashflow.owedToYouMinor > 0 ? `Owed to you ${formatMoney(cashflow.owedToYouMinor)}` : ""}
          {cashflow.owedToYouMinor > 0 && cashflow.youOweMinor > 0 ? " · " : ""}
          {cashflow.youOweMinor > 0 ? `You owe ${formatMoney(cashflow.youOweMinor)}` : ""}
        </p>
      ) : null}
    </GlassCard>
  );
}

export function InsightsScreen({
  initial,
  cashflow,
  cards,
}: {
  initial: InsightsPayload;
  cashflow: Cashflow;
  cards: ReadonlyArray<Insight>;
}) {
  const [active, setActive] = useState<InsightPeriod>(initial.period);
  const [cache, setCache] = useState<Partial<Record<InsightPeriod, InsightsPayload>>>({
    [initial.period]: initial,
  });
  const [shown, setShown] = useState<InsightsPayload>(initial);

  const fetchPeriod = useAction(fetchInsightsAction, {
    optimistic: false, // read, not a mutation
    onSuccess: (payload) => {
      setCache((current) => ({ ...current, [payload.period]: payload }));
      setShown(payload);
    },
  });

  const select = (period: InsightPeriod) => {
    if (period === active) return;
    setActive(period);
    const cached = cache[period];
    if (cached) {
      setShown(cached);
    } else {
      void fetchPeriod.execute({ period });
    }
  };

  const data = shown;
  const empty = data.totalMinor === 0;
  const down = data.deltaFraction !== null && data.deltaFraction <= 0;

  return (
    <div className="flex flex-col gap-5">
      <ScreenHeader title="Insights" eyebrow="Where your money goes" />

      <div className="space-y-5 px-5">
        {cards.length > 0 ? (
          <div className="space-y-3">
            {cards.slice(0, 3).map((card) => (
              <InsightCard key={card.key} text={card.text} palette={card.palette} />
            ))}
          </div>
        ) : null}

        <CashflowCard cashflow={cashflow} />

        <div className="-mx-1 flex gap-2 px-1">
          {INSIGHT_PERIODS.map((period) => (
            <Chip
              key={period.key}
              selected={active === period.key}
              onClick={() => select(period.key)}
              className="flex-1 justify-center"
            >
              {period.label}
            </Chip>
          ))}
        </div>

        <div
          className={cn(
            "space-y-5 transition-opacity duration-200",
            fetchPeriod.pending && "opacity-50",
          )}
          aria-busy={fetchPeriod.pending}
        >
          <GlassCard gradient="iris" glow className="p-6">
            <p className="text-caption text-fg-on-grad uppercase">Total spend</p>
            <p className="mt-2 font-dot text-display font-black text-white tabular-nums">
              <NumberTicker
                value={formatMoney(data.totalMinor, { compact: data.totalMinor >= 1_000_00 })}
              />
            </p>
            {data.deltaFraction !== null ? (
              <p className="mt-1 flex items-center gap-1 text-footnote text-fg-on-grad-2">
                {down ? <TrendingDown className="size-3.5" /> : <TrendingUp className="size-3.5" />}
                {formatPercent(Math.abs(data.deltaFraction))} vs {PREVIOUS_LABEL[data.period]}
              </p>
            ) : (
              <p className="mt-1 text-footnote text-fg-on-grad">
                No spend in the {PREVIOUS_LABEL[data.period]}
              </p>
            )}
          </GlassCard>

          {empty ? (
            <GlassCard elevation="inset">
              <EmptyState
                palette="iris"
                title="Nothing to analyze yet"
                description="Add a few expenses and your spending patterns will show up here."
              />
            </GlassCard>
          ) : (
            <>
              <GlassCard elevation="inset" className="p-4">
                <p className="pb-2 text-caption text-fg-3 uppercase">Spend trend</p>
                <AreaTrend
                  data={data.trend}
                  formatValue={moneyCompact}
                  caption="Spend trend over the period"
                />
              </GlassCard>

              <div className="grid grid-cols-2 gap-3">
                <GlassCard elevation="inset" className="p-4">
                  <p className="text-caption text-fg-3 uppercase">Avg / day</p>
                  <p className="mt-2 text-title-2 text-fg-1 tabular-nums">
                    {formatMoney(data.avgPerDayMinor, { compact: data.avgPerDayMinor >= 1_000_00 })}
                  </p>
                </GlassCard>
                <GlassCard elevation="inset" className="p-4">
                  <p className="text-caption text-fg-3 uppercase">Biggest</p>
                  {data.biggest ? (
                    <>
                      <p className="mt-2 truncate text-title-2 text-fg-1 tabular-nums">
                        {formatMoney(data.biggest.amountMinor, {
                          compact: data.biggest.amountMinor >= 1_000_00,
                        })}
                      </p>
                      <p className="truncate text-caption text-fg-3">{data.biggest.description}</p>
                    </>
                  ) : (
                    <p className="mt-2 text-title-2 text-fg-3">—</p>
                  )}
                </GlassCard>
              </div>

              <GlassCard elevation="inset" className="p-5">
                <p className="pb-3 text-caption text-fg-3 uppercase">By category</p>
                <DonutCategory
                  data={data.donut}
                  formatValue={moneyCompact}
                  centerLabel="Total"
                  caption="Spending by category"
                />
              </GlassCard>

              <GlassCard elevation="inset" className="divide-y divide-hairline">
                {data.categories.slice(0, 8).map((category) => (
                  <CategoryRow key={category.id} category={category} />
                ))}
              </GlassCard>

              <GlassCard elevation="inset" className="p-4">
                <p className="pb-2 text-caption text-fg-3 uppercase">Daily activity</p>
                <HeatmapCalendar
                  month={parseISO(data.heatmapMonth)}
                  data={data.heatmap}
                  formatValue={moneyCompact}
                />
              </GlassCard>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

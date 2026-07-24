import type { Metadata } from "next";
import Link from "next/link";
import { Bell, Search } from "lucide-react";
import { Stagger } from "@/components/motion/Stagger";
import { GlassCard } from "@/components/ui/GlassCard";
import { IconButton } from "@/components/ui/IconButton";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { ActivityRow } from "@/components/widgets/ActivityRow";
import { BudgetRingWidget } from "@/components/widgets/BudgetRingWidget";
import { InsightCard } from "@/components/widgets/InsightCard";
import { MonthSpendWidget } from "@/components/widgets/MonthSpendWidget";
import { NetBalanceWidget } from "@/components/widgets/NetBalanceWidget";
import { OwedWidget } from "@/components/widgets/OwedWidget";
import { WidgetGrid } from "@/components/widgets/Widget";

export const metadata: Metadata = { title: "Home" };

/**
 * Widget-phase Home with product-shaped mock data. The dashboard phase wires
 * these widgets to live queries without changing this composition.
 */
const mock = {
  netMinor: 234000,
  owedInMinor: 359000,
  owedOutMinor: 125000,
  monthSpendMinor: 1684000,
  monthTrend: [420, 980, 310, 1250, 640, 890, 400, 1580, 720, 510, 1120, 940, 380, 1490],
  monthDeltaFraction: -0.12,
  budgetSpentMinor: 840000,
  budgetMinor: 1200000,
  insight: "You're owed ₹3,590 across 2 groups — one tap to remind.",
  activity: [
    {
      actorName: "Rohit Verma",
      text: "added Dinner at Farzi Café in Goa trip",
      when: "2h ago",
      amountMinor: -50000,
    },
    { actorName: "Asha Iyer", text: "settled up with you", when: "Yesterday", amountMinor: 125000 },
    {
      actorName: "Meera Nair",
      text: "added Petrol in Flat 402",
      when: "Tuesday",
      amountMinor: -30000,
    },
  ],
} as const;

export default function HomePage() {
  return (
    <div className="flex flex-col gap-5">
      <ScreenHeader
        title="Home"
        eyebrow="Welcome back"
        trailing={
          <>
            <IconButton aria-label="Search" size="sm">
              <Search />
            </IconButton>
            <IconButton aria-label="Notifications" size="sm">
              <Bell />
            </IconButton>
          </>
        }
      />

      <Stagger className="space-y-3 px-5">
        <NetBalanceWidget netMinor={mock.netMinor} context="Across 3 groups and 8 friends" />

        <WidgetGrid>
          <OwedWidget direction="in" amountMinor={mock.owedInMinor} context="from 3 people" />
          <OwedWidget direction="out" amountMinor={mock.owedOutMinor} context="to 2 people" />
        </WidgetGrid>

        <MonthSpendWidget
          label="July spend"
          amountMinor={mock.monthSpendMinor}
          trend={mock.monthTrend}
          deltaFraction={mock.monthDeltaFraction}
        />

        <WidgetGrid>
          <BudgetRingWidget spentMinor={mock.budgetSpentMinor} budgetMinor={mock.budgetMinor} />
          <InsightCard
            text="Food is up 32% vs last month."
            palette="solar"
            className="col-span-1 min-h-42"
          />
        </WidgetGrid>

        <InsightCard text={mock.insight} />

        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-caption text-fg-3 uppercase">Recent activity</h2>
            <Link href="/activity" className="text-footnote text-fg-3 hover:text-fg-2">
              See all
            </Link>
          </div>
          <GlassCard elevation="inset" className="divide-y divide-white/6">
            {mock.activity.map((item) => (
              <ActivityRow key={`${item.actorName}-${item.when}`} {...item} />
            ))}
          </GlassCard>
        </section>
      </Stagger>
    </div>
  );
}

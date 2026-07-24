import type { Metadata } from "next";
import { GlassCard } from "@/components/ui/GlassCard";
import { ScreenHeader } from "@/components/ui/ScreenHeader";

export const metadata: Metadata = { title: "Insights" };

const mockCategories = [
  { name: "Food & Drinks", amount: "₹6,420", share: "38%" },
  { name: "Travel", amount: "₹4,150", share: "25%" },
  { name: "Groceries", amount: "₹2,890", share: "17%" },
] as const;

/** Shell-phase Insights; charts arrive with the chart kit phase. */
export default function InsightsPage() {
  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader title="Insights" />
      <div className="space-y-3 px-5">
        <GlassCard gradient="iris" glow className="p-6">
          <p className="text-caption text-white/70 uppercase">This month</p>
          <p className="mt-2 font-dot text-display font-black tabular-nums">16,840</p>
          <p className="mt-1 text-footnote text-white/70">12% less than June</p>
        </GlassCard>
        <GlassCard className="p-5">
          <p className="text-caption text-fg-3 uppercase">Top categories</p>
          <ul className="mt-3 space-y-3">
            {mockCategories.map((category) => (
              <li key={category.name} className="flex items-center justify-between gap-3">
                <p className="text-body">{category.name}</p>
                <p className="text-footnote text-fg-2 tabular-nums">
                  {category.amount} · {category.share}
                </p>
              </li>
            ))}
          </ul>
        </GlassCard>
      </div>
    </div>
  );
}

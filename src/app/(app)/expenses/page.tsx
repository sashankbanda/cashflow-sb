import type { Metadata } from "next";
import { formatISO, startOfMonth } from "date-fns";
import { Wallet } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientPanel } from "@/components/ui/GradientPanel";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { formatMoney } from "@/lib/format";
import { requireUser } from "@/features/auth/session";
import { PersonalLedger } from "@/features/expenses/components/PersonalLedger";
import { getPersonalLedger, getPersonalSpendTotal } from "@/features/expenses/personal-queries";

export const metadata: Metadata = { title: "Spending" };

export default async function ExpensesPage() {
  const user = await requireUser();
  const now = new Date();
  const monthStart = formatISO(startOfMonth(now), { representation: "date" });
  const today = formatISO(now, { representation: "date" });

  const [entries, monthTotal] = await Promise.all([
    getPersonalLedger(user.id),
    getPersonalSpendTotal(user.id, { from: monthStart, to: today }),
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

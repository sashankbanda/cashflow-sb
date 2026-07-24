import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import { BudgetRing } from "@/features/budgets/components/BudgetRing";
import { budgetToneClass, type BudgetPace } from "@/features/budgets/pace";
import { Widget } from "./Widget";

export interface BudgetWidgetProps {
  spentMinor: number;
  budgetMinor: number;
  pace: BudgetPace;
}

/** Home overall-budget tile: pace ring + the day's safe-spend line. */
export function BudgetWidget({ spentMinor, budgetMinor, pace }: BudgetWidgetProps) {
  return (
    <Widget size="md" label="Monthly budget">
      <div className="flex items-center gap-4">
        <BudgetRing pace={pace} size={60} strokeWidth={7} />
        <div className="min-w-0 flex-1">
          <p className="text-title-2 text-fg-1 tabular-nums">
            {formatMoney(spentMinor, { compact: true })}
            <span className="text-body text-fg-3">
              {" "}
              of {formatMoney(budgetMinor, { compact: true })}
            </span>
          </p>
          <p className={cn("mt-1 text-footnote", budgetToneClass(pace.level))}>{pace.message}</p>
        </div>
      </div>
    </Widget>
  );
}

import { ProgressRing } from "@/components/charts/ProgressRing";
import { cn } from "@/lib/cn";
import { formatMoney, formatPercent } from "@/lib/format";
import { Widget } from "./Widget";

export interface BudgetRingWidgetProps {
  spentMinor: number;
  budgetMinor: number;
}

/** Overall budget ring: volt on pace, solar past 80%, ember when over. */
export function BudgetRingWidget({ spentMinor, budgetMinor }: BudgetRingWidgetProps) {
  const fraction = budgetMinor > 0 ? spentMinor / budgetMinor : 0;
  const tone = fraction > 1 ? "text-negative" : fraction > 0.8 ? "text-warning" : "text-volt";

  return (
    <Widget size="sm" label="Budget">
      <div className="flex items-center gap-3">
        <ProgressRing
          progress={fraction}
          size={56}
          strokeWidth={6}
          className={cn(tone)}
          aria-label={`Budget used: ${formatPercent(Math.min(fraction, 9.99))}`}
        >
          <span className="text-caption font-semibold text-fg-1 tabular-nums">
            {formatPercent(fraction)}
          </span>
        </ProgressRing>
        <div className="min-w-0">
          <p className="text-footnote text-fg-1 tabular-nums">
            {formatMoney(spentMinor, { compact: true })}
          </p>
          <p className="text-caption text-fg-3 tabular-nums">
            of {formatMoney(budgetMinor, { compact: true })}
          </p>
        </div>
      </div>
    </Widget>
  );
}

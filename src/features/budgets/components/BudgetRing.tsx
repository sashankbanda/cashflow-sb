import { ProgressRing } from "@/components/charts/ProgressRing";
import { cn } from "@/lib/cn";
import { formatPercent } from "@/lib/format";
import { budgetToneClass, type BudgetPace } from "../pace";

export interface BudgetRingProps {
  pace: BudgetPace;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

/** Progress ring tinted by budget level, with the used-percent in the middle. */
export function BudgetRing({ pace, size = 56, strokeWidth = 6, className }: BudgetRingProps) {
  return (
    <ProgressRing
      progress={pace.fraction}
      size={size}
      strokeWidth={strokeWidth}
      className={cn(budgetToneClass(pace.level), className)}
      aria-label={`${formatPercent(Math.min(pace.fraction, 9.99))} of budget used`}
    >
      <span className="text-caption font-semibold text-fg-1 tabular-nums">
        {formatPercent(pace.fraction)}
      </span>
    </ProgressRing>
  );
}

import { Sparkline } from "@/components/charts/Sparkline";
import { NumberTicker } from "@/components/motion/NumberTicker";
import { cn } from "@/lib/cn";
import { formatMoney, formatPercent } from "@/lib/format";
import { Widget } from "./Widget";

export interface MonthSpendWidgetProps {
  label: string;
  amountMinor: number;
  /** Daily totals for the sparkline. */
  trend: ReadonlyArray<number>;
  /** Change vs the previous period, as a fraction (-0.12 = down 12%). */
  deltaFraction: number | null;
}

/** Month spend with trend sparkline; quiet glass so gradients stay rationed. */
export function MonthSpendWidget({
  label,
  amountMinor,
  trend,
  deltaFraction,
}: MonthSpendWidgetProps) {
  const down = deltaFraction !== null && deltaFraction <= 0;
  return (
    <Widget size="md" label={label}>
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-title-2">
            <NumberTicker value={formatMoney(amountMinor)} />
          </p>
          {deltaFraction !== null ? (
            <p className={cn("mt-1 text-footnote", down ? "text-positive" : "text-warning")}>
              {down ? "↓" : "↑"} {formatPercent(Math.abs(deltaFraction))} vs last month
            </p>
          ) : (
            <p className="mt-1 text-footnote text-fg-3">First month tracked</p>
          )}
        </div>
        <Sparkline data={trend} className="h-10 w-28 shrink-0 text-volt" />
      </div>
    </Widget>
  );
}

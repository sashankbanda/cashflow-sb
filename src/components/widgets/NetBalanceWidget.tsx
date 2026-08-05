import { DotMatrixAmount } from "@/components/motion/DotMatrixAmount";
import { formatMoney } from "@/lib/format";
import { Widget } from "./Widget";

export interface NetBalanceWidgetProps {
  /** Positive = the world owes you; negative = you owe the world. */
  netMinor: number;
  /** e.g. "Across 3 groups and 8 friends". */
  context: string;
  /** This month's cashflow, for the in/out row. */
  monthInMinor?: number;
  monthOutMinor?: number;
  /** Override the caption (e.g. "Account balance"). */
  label?: string;
  /** Override the derived summary line. */
  summaryText?: string;
}

/** The Home hero: your balance, plus this month's money in / out at a glance. */
export function NetBalanceWidget({
  netMinor,
  context,
  monthInMinor,
  monthOutMinor,
  label,
  summaryText,
}: NetBalanceWidgetProps) {
  const summary =
    summaryText ??
    (netMinor > 0
      ? "You're ahead — more came in than went out"
      : netMinor < 0
        ? "You spent more than came in"
        : "Break even");

  return (
    <Widget size="lg" gradient="aurora" glow label={label ?? "This month's balance"}>
      <div aria-live="polite" aria-atomic="true">
        <DotMatrixAmount
          amountMinor={netMinor}
          options={{ sign: "always", compact: Math.abs(netMinor) >= 10_000_00 }}
        />
        <p className="mt-2 text-footnote text-fg-on-grad">
          {summary} · {context}
        </p>
        {typeof monthInMinor === "number" && typeof monthOutMinor === "number" ? (
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-handle pt-3 text-footnote text-fg-on-grad-2 tabular-nums">
            <span>
              <span aria-hidden>↑ </span>In this month{" "}
              {formatMoney(monthInMinor, { compact: monthInMinor >= 10_000_00 })}
            </span>
            <span>
              <span aria-hidden>↓ </span>Out{" "}
              {formatMoney(monthOutMinor, { compact: monthOutMinor >= 10_000_00 })}
            </span>
          </div>
        ) : null}
      </div>
    </Widget>
  );
}

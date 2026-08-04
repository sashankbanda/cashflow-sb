import { DotMatrixAmount } from "@/components/motion/DotMatrixAmount";
import { Widget } from "./Widget";

export interface NetBalanceWidgetProps {
  /** Positive = the world owes you; negative = you owe the world. */
  netMinor: number;
  /** e.g. "Across 3 groups and 8 friends". */
  context: string;
}

/** The Home hero: net position in dot-matrix numerals on the aurora panel. */
export function NetBalanceWidget({ netMinor, context }: NetBalanceWidgetProps) {
  const summary =
    netMinor > 0
      ? "You're owed more than you owe"
      : netMinor < 0
        ? "You owe more than you're owed"
        : "All square";

  return (
    <Widget size="lg" gradient="aurora" glow label="Net position">
      <div aria-live="polite" aria-atomic="true">
        <DotMatrixAmount
          amountMinor={netMinor}
          options={{ sign: "always", compact: Math.abs(netMinor) >= 10_000_00 }}
        />
        <p className="mt-2 text-footnote text-fg-on-grad">
          {summary} · {context}
        </p>
      </div>
    </Widget>
  );
}

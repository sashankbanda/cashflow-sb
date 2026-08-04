import { NumberTicker } from "@/components/motion/NumberTicker";
import { formatMoney } from "@/lib/format";
import { Widget } from "./Widget";

export interface OwedWidgetProps {
  direction: "in" | "out";
  amountMinor: number;
  /** e.g. "from 3 people" / "to 2 people". */
  context: string;
}

/** Small paired widgets: mint "Owed to you" and ember "You owe". */
export function OwedWidget({ direction, amountMinor, context }: OwedWidgetProps) {
  const inbound = direction === "in";
  return (
    <Widget
      size="sm"
      gradient={inbound ? "mint" : "ember"}
      glow
      label={inbound ? "Owed to you" : "You owe"}
    >
      <p className="text-title-2 text-white">
        <NumberTicker value={formatMoney(amountMinor, { compact: amountMinor >= 10_000_00 })} />
      </p>
      <p className="mt-1 text-footnote text-fg-on-grad">{context}</p>
    </Widget>
  );
}

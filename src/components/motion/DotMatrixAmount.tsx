import { cn } from "@/lib/cn";
import { formatMoney, type FormatMoneyOptions } from "@/lib/format";

type DotMatrixSize = "display" | "title";

const sizeClasses: Record<DotMatrixSize, { symbol: string; digits: string }> = {
  display: { symbol: "text-title-2", digits: "text-display" },
  title: { symbol: "text-headline", digits: "text-title-2" },
};

/** Split "−₹1,234.50" into its sign+symbol prefix and the numeric rest. */
function splitFormatted(formatted: string): { prefix: string; digits: string } {
  const match = /^([−+]?₹)(.*)$/.exec(formatted);
  if (!match) return { prefix: "", digits: formatted };
  return { prefix: match[1] ?? "", digits: match[2] ?? "" };
}

export interface DotMatrixAmountProps {
  amountMinor: number;
  options?: FormatMoneyOptions;
  size?: DotMatrixSize;
  className?: string;
}

/**
 * The signature hero numeral: dot-matrix digits (Doto) with the rupee sign in
 * the sans face. Rendered statically and readable at first paint — a hero
 * number the user came to read must never animate on mount.
 */
export function DotMatrixAmount({ amountMinor, options, size = "display", className }: DotMatrixAmountProps) {
  const { prefix, digits } = splitFormatted(formatMoney(amountMinor, options));
  return (
    <span
      className={cn("inline-flex items-baseline gap-1.5", className)}
      aria-label={formatMoney(amountMinor, options)}
      role="text"
    >
      <span aria-hidden className={cn("font-sans font-semibold text-fg-2", sizeClasses[size].symbol)}>
        {prefix}
      </span>
      <span aria-hidden className={cn("font-dot font-black tabular-nums", sizeClasses[size].digits)}>
        {digits}
      </span>
    </span>
  );
}

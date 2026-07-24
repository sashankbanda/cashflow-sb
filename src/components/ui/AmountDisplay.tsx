import { cn } from "@/lib/cn";

/** Group the integer part with en-IN separators while typing. */
function formatDraft(value: string): string {
  if (value === "") return "";
  const [intPart = "", decPart] = value.split(".");
  const grouped =
    intPart === "" ? "0" : new Intl.NumberFormat("en-IN").format(Number.parseInt(intPart, 10));
  return decPart === undefined ? grouped : `${grouped}.${decPart}`;
}

export interface AmountDisplayProps {
  /** Draft string from the keypad model (see lib/amount-input). */
  value: string;
  className?: string;
}

/**
 * Hero amount readout above the keypad: rupee symbol in sans, digits in the
 * dot-matrix display face, live en-IN grouping.
 */
export function AmountDisplay({ value, className }: AmountDisplayProps) {
  const formatted = formatDraft(value);
  const empty = formatted === "";

  return (
    <div
      aria-live="polite"
      aria-label={`Amount: ${empty ? "0" : formatted} rupees`}
      className={cn("flex items-baseline justify-center gap-2", className)}
    >
      <span className={cn("font-sans text-title-2", empty ? "text-fg-3" : "text-fg-2")}>₹</span>
      <span
        className={cn(
          "font-dot text-display font-black tabular-nums",
          empty ? "text-fg-3" : "text-fg-1",
        )}
      >
        {empty ? "0" : formatted}
      </span>
    </div>
  );
}

/**
 * Display formatting for money and numbers. All money amounts flow through the
 * app as integer minor units (paise); these helpers are the only place they
 * become strings. Locale is en-IN (₹2,50,000 digit grouping) per product spec.
 */

const MINUS = "−"; // typographic minus, per design language

export interface FormatMoneyOptions {
  /**
   * "auto" (default) hides paise when they are zero, "always" shows two
   * decimals, "never" truncates to whole rupees.
   */
  paise?: "auto" | "always" | "never";
  /** "auto" (default) signs negatives only; "always" also prefixes "+". */
  sign?: "auto" | "always";
  /** Compact Indian notation: ₹1.2K, ₹1.2L, ₹1.2Cr. Ignores paise. */
  compact?: boolean;
}

function assertMinor(amountMinor: number): void {
  if (!Number.isSafeInteger(amountMinor)) {
    throw new TypeError(`Money must be a safe integer of minor units, got: ${amountMinor}`);
  }
}

function groupINR(rupees: number, fractionDigits: number): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(rupees);
}

/** Trim a fixed decimal like "1.0" → "1", keep "1.2". */
function trimmedFixed(value: number, digits: number): string {
  const fixed = value.toFixed(digits);
  return fixed.replace(/\.0+$/, "");
}

function compactINR(absMinor: number): string {
  const rupees = absMinor / 100;
  if (rupees >= 1_00_00_000) return `${trimmedFixed(rupees / 1_00_00_000, 1)}Cr`;
  if (rupees >= 1_00_000) return `${trimmedFixed(rupees / 1_00_000, 1)}L`;
  if (rupees >= 1_000) return `${trimmedFixed(rupees / 1_000, 1)}K`;
  return groupINR(Math.round(rupees), 0);
}

/** Format integer paise as an Indian-rupee string: 12345650 → "₹1,23,456.50". */
export function formatMoney(amountMinor: number, options: FormatMoneyOptions = {}): string {
  assertMinor(amountMinor);
  const { paise = "auto", sign = "auto", compact = false } = options;

  const negative = amountMinor < 0;
  const abs = Math.abs(amountMinor);
  const prefix = negative ? MINUS : sign === "always" && amountMinor > 0 ? "+" : "";

  if (compact) {
    return `${prefix}₹${compactINR(abs)}`;
  }

  const wholeRupees = Math.trunc(abs / 100);
  const paiseRemainder = abs % 100;
  const showPaise = paise === "always" || (paise === "auto" && paiseRemainder !== 0);

  const body = showPaise ? groupINR(abs / 100, 2) : groupINR(wholeRupees, 0);
  return `${prefix}₹${body}`;
}

/** Format a plain number with en-IN grouping. */
export function formatNumber(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/** Format a fraction as a percentage: 0.325 → "33%", (0.325, 1) → "32.5%". */
export function formatPercent(fraction: number, fractionDigits = 0): string {
  return `${formatNumber(fraction * 100, fractionDigits)}%`;
}

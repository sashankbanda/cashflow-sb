import { formatMoney } from "@/lib/format";

export type BalanceTone = "positive" | "negative" | "settled";

export interface BalanceLabel {
  text: string;
  tone: BalanceTone;
}

/** Viewer-perspective balance line, in plain words: get money / give money. */
export function myBalanceLabel(netMinor: number): BalanceLabel {
  if (netMinor > 0) return { text: `You get ${formatMoney(netMinor)}`, tone: "positive" };
  if (netMinor < 0) return { text: `You give ${formatMoney(-netMinor)}`, tone: "negative" };
  return { text: "All settled", tone: "settled" };
}

/** Third-person balance line: "gets ₹300" / "gives ₹120" / "settled". */
export function memberBalanceLabel(netMinor: number): BalanceLabel {
  if (netMinor > 0) return { text: `gets ${formatMoney(netMinor)}`, tone: "positive" };
  if (netMinor < 0) return { text: `gives ${formatMoney(-netMinor)}`, tone: "negative" };
  return { text: "settled", tone: "settled" };
}

export const toneTextClass: Record<BalanceTone, string> = {
  positive: "text-positive",
  negative: "text-negative",
  settled: "text-fg-3",
};

/** Tones for text sitting on gradient panels (white-based). */
export const toneOnGradientClass: Record<BalanceTone, string> = {
  positive: "text-white",
  negative: "text-white",
  settled: "text-fg-on-grad",
};

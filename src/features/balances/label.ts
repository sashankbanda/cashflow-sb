import { formatMoney } from "@/lib/format";

export type BalanceTone = "positive" | "negative" | "settled";

export interface BalanceLabel {
  text: string;
  tone: BalanceTone;
}

/** Viewer-perspective balance line: "You are owed ₹1,250" / "You owe ₹850". */
export function myBalanceLabel(netMinor: number): BalanceLabel {
  if (netMinor > 0) return { text: `You are owed ${formatMoney(netMinor)}`, tone: "positive" };
  if (netMinor < 0) return { text: `You owe ${formatMoney(-netMinor)}`, tone: "negative" };
  return { text: "Settled up", tone: "settled" };
}

/** Third-person balance line: "gets back ₹300" / "owes ₹120" / "settled". */
export function memberBalanceLabel(netMinor: number): BalanceLabel {
  if (netMinor > 0) return { text: `gets back ${formatMoney(netMinor)}`, tone: "positive" };
  if (netMinor < 0) return { text: `owes ${formatMoney(-netMinor)}`, tone: "negative" };
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

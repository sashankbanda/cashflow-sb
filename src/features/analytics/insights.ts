import { differenceInCalendarDays, parseISO } from "date-fns";
import { formatMoney, formatNumber, formatPercent } from "@/lib/format";
import type { Palette } from "@/components/ui/palette";

/**
 * Pure, rule-based insight generator. Turns a plain monthly snapshot into a
 * ranked list of one-line insight cards. No I/O, no dates-from-now — every
 * input is passed in, so the rules are exhaustively unit-testable.
 */

export interface InsightCategoryInput {
  name: string;
  amountMinor: number;
  prevAmountMinor: number;
}

export interface InsightBudgetInput {
  /** null = the overall budget. */
  name: string | null;
  level: "ok" | "warn" | "over";
  /** Paise over budget (0 unless level is "over"). */
  overByMinor: number;
}

export interface InsightInput {
  categories: ReadonlyArray<InsightCategoryInput>;
  budgets: ReadonlyArray<InsightBudgetInput>;
  owedToYouMinor: number;
  owedFromCount: number;
  youOweMinor: number;
  oweToCount: number;
  biggest: { description: string; amountMinor: number } | null;
  weekdayAvgMinor: number;
  weekendAvgMinor: number;
}

export interface Insight {
  /** Stable identity for cooldown dedupe. */
  key: string;
  text: string;
  palette: Palette;
  /** Higher shows first. */
  priority: number;
  /** Days this insight stays quiet after being shown. */
  cooldownDays: number;
}

const SPIKE_THRESHOLD = 1.3; // +30%
const SPIKE_FLOOR_MINOR = 50_000; // ₹500 — ignore noise on tiny categories
const WEEKEND_RATIO = 1.5;
const BIGGEST_FLOOR_MINOR = 100_000; // ₹1,000

/** Generate insights from a snapshot, ranked most-important first. */
export function generateInsights(input: InsightInput): Insight[] {
  const insights: Insight[] = [];

  // Budget — surface only the single most severe.
  const over = [...input.budgets]
    .filter((budget) => budget.level === "over")
    .sort((a, b) => b.overByMinor - a.overByMinor)[0];
  const warn = input.budgets.find((budget) => budget.level === "warn");
  if (over) {
    const label = over.name ?? "overall";
    insights.push({
      key: `budget-over:${over.name ?? "overall"}`,
      text: `You're ${formatMoney(over.overByMinor)} over your ${label} budget.`,
      palette: "ember",
      priority: 100,
      cooldownDays: 3,
    });
  } else if (warn) {
    const label = warn.name ?? "overall";
    insights.push({
      key: `budget-warn:${warn.name ?? "overall"}`,
      text: `You're pacing close to your ${label} budget.`,
      palette: "solar",
      priority: 80,
      cooldownDays: 3,
    });
  }

  // Category spike ≥30% — the biggest absolute jump.
  const spike = [...input.categories]
    .filter(
      (category) =>
        category.prevAmountMinor > 0 &&
        category.amountMinor >= category.prevAmountMinor * SPIKE_THRESHOLD &&
        category.amountMinor >= SPIKE_FLOOR_MINOR,
    )
    .sort((a, b) => b.amountMinor - b.prevAmountMinor - (a.amountMinor - a.prevAmountMinor))[0];
  if (spike) {
    const pct = (spike.amountMinor - spike.prevAmountMinor) / spike.prevAmountMinor;
    insights.push({
      key: `spike:${spike.name}`,
      text: `${spike.name} is up ${formatPercent(pct)} vs last period.`,
      palette: "iris",
      priority: 70,
      cooldownDays: 7,
    });
  }

  // Owed to you across friends.
  if (input.owedToYouMinor > 0) {
    insights.push({
      key: "owed",
      text: `You get ${formatMoney(input.owedToYouMinor)} back across ${input.owedFromCount} ${
        input.owedFromCount === 1 ? "friend" : "friends"
      }.`,
      palette: "mint",
      priority: 55,
      cooldownDays: 2,
    });
  } else if (input.youOweMinor > 0) {
    insights.push({
      key: "owe",
      text: `You give ${formatMoney(input.youOweMinor)} across ${input.oweToCount} ${
        input.oweToCount === 1 ? "friend" : "friends"
      } — settle up to clear it.`,
      palette: "ember",
      priority: 50,
      cooldownDays: 2,
    });
  }

  // Weekend vs weekday spending pattern.
  if (input.weekdayAvgMinor > 0 && input.weekendAvgMinor >= input.weekdayAvgMinor * WEEKEND_RATIO) {
    const ratio = input.weekendAvgMinor / input.weekdayAvgMinor;
    insights.push({
      key: "weekend",
      text: `You spend ${formatNumber(ratio, 1)}× more on weekends than weekdays.`,
      palette: "solar",
      priority: 40,
      cooldownDays: 14,
    });
  }

  // Largest expense callout.
  if (input.biggest && input.biggest.amountMinor >= BIGGEST_FLOOR_MINOR) {
    insights.push({
      key: `biggest:${input.biggest.description}`,
      text: `Your biggest spend was ${formatMoney(input.biggest.amountMinor)} on ${input.biggest.description}.`,
      palette: "ocean",
      priority: 30,
      cooldownDays: 7,
    });
  }

  return insights.sort((a, b) => b.priority - a.priority);
}

/**
 * Drop insights still within their cooldown. `lastShown` maps an insight key to
 * the ISO date it was last surfaced; `today` is an ISO date. Pure.
 */
export function filterByCooldown(
  insights: ReadonlyArray<Insight>,
  lastShown: Readonly<Record<string, string>>,
  today: string,
): Insight[] {
  const now = parseISO(today);
  return insights.filter((insight) => {
    const shownOn = lastShown[insight.key];
    if (!shownOn) return true;
    return differenceInCalendarDays(now, parseISO(shownOn)) >= insight.cooldownDays;
  });
}

import { formatMoney } from "@/lib/format";

/**
 * Budget pace math. Everything is integer paise; the ring tone and the pace
 * line ("₹412/day keeps you on budget") are both derived here so the screen,
 * the Home widget, and the threshold notifier all agree exactly.
 */

export type BudgetLevel = "ok" | "warn" | "over";

/** Ring turns solar at 80% of budget, ember once over. */
export const BUDGET_WARN_FRACTION = 0.8;

export interface BudgetPace {
  spentMinor: number;
  budgetMinor: number;
  /** budget − spent; negative once over budget. */
  remainingMinor: number;
  /** spent / budget, in [0, ∞); 0 when no budget is set. */
  fraction: number;
  level: BudgetLevel;
  /** Safe daily spend across the rest of the month to stay on budget (≥ 0). */
  perDayMinor: number;
  /** Straight-line month-end projection at the current daily rate. */
  projectedMinor: number;
  /** True when the projection lands at or under budget. */
  onPace: boolean;
  /** Human pace line for the current state. */
  message: string;
}

export interface BudgetPaceInput {
  spentMinor: number;
  budgetMinor: number;
  /** 1-based day of the month. */
  dayOfMonth: number;
  daysInMonth: number;
}

/** Derive ring tone + pace line from spend, budget, and where we are in the month. */
export function computeBudgetPace(input: BudgetPaceInput): BudgetPace {
  const spentMinor = Math.max(0, Math.round(input.spentMinor));
  const budgetMinor = Math.max(0, Math.round(input.budgetMinor));
  const daysInMonth = Math.max(1, Math.round(input.daysInMonth));
  const dayOfMonth = Math.min(Math.max(1, Math.round(input.dayOfMonth)), daysInMonth);

  const remainingMinor = budgetMinor - spentMinor;
  const fraction = budgetMinor > 0 ? spentMinor / budgetMinor : 0;
  const level: BudgetLevel =
    fraction > 1 ? "over" : fraction > BUDGET_WARN_FRACTION ? "warn" : "ok";

  // Include today as a spendable day so the allowance doesn't jump at midnight.
  const daysLeftInclusive = daysInMonth - dayOfMonth + 1;
  const perDayMinor = remainingMinor > 0 ? Math.floor(remainingMinor / daysLeftInclusive) : 0;
  const projectedMinor = Math.round((spentMinor * daysInMonth) / dayOfMonth);
  const onPace = projectedMinor <= budgetMinor;

  let message: string;
  if (budgetMinor === 0) {
    message = "Set a budget to track your pace.";
  } else if (remainingMinor < 0) {
    message = `Over by ${formatMoney(-remainingMinor)}`;
  } else if (remainingMinor === 0) {
    message = "Right on your budget.";
  } else {
    message = `${formatMoney(perDayMinor)}/day keeps you on budget`;
  }

  return {
    spentMinor,
    budgetMinor,
    remainingMinor,
    fraction,
    level,
    perDayMinor,
    projectedMinor,
    onPace,
    message,
  };
}

/** Tailwind text-color class for a level (ring stroke uses currentColor). */
export function budgetToneClass(level: BudgetLevel): string {
  return level === "over" ? "text-negative" : level === "warn" ? "text-warning" : "text-volt";
}

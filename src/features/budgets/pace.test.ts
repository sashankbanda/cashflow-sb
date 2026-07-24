import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { MAX_AMOUNT_MINOR } from "@/lib/money";
import { BUDGET_WARN_FRACTION, computeBudgetPace } from "./pace";

describe("computeBudgetPace · levels", () => {
  it("is on pace (volt) well under budget", () => {
    const pace = computeBudgetPace({
      spentMinor: 20_000,
      budgetMinor: 100_000,
      dayOfMonth: 10,
      daysInMonth: 30,
    });
    expect(pace.level).toBe("ok");
    expect(pace.remainingMinor).toBe(80_000);
  });

  it("warns once past 80% of budget", () => {
    const pace = computeBudgetPace({
      spentMinor: 85_000,
      budgetMinor: 100_000,
      dayOfMonth: 20,
      daysInMonth: 30,
    });
    expect(pace.level).toBe("warn");
  });

  it("goes over only above 100%", () => {
    expect(
      computeBudgetPace({
        spentMinor: 100_000,
        budgetMinor: 100_000,
        dayOfMonth: 30,
        daysInMonth: 30,
      }).level,
    ).toBe("warn");
    expect(
      computeBudgetPace({
        spentMinor: 100_001,
        budgetMinor: 100_000,
        dayOfMonth: 30,
        daysInMonth: 30,
      }).level,
    ).toBe("over");
  });

  it("exactly at the warn boundary stays ok (strictly greater than 80%)", () => {
    const pace = computeBudgetPace({
      spentMinor: 80_000,
      budgetMinor: 100_000,
      dayOfMonth: 15,
      daysInMonth: 30,
    });
    expect(pace.fraction).toBe(BUDGET_WARN_FRACTION);
    expect(pace.level).toBe("ok");
  });
});

describe("computeBudgetPace · pace line", () => {
  it("spreads the remaining budget across the days left, including today", () => {
    // ₹1000 budget, ₹520 spent, day 21 of 30 → 10 days left, ₹480 / 10 = ₹48/day.
    const pace = computeBudgetPace({
      spentMinor: 52_000,
      budgetMinor: 100_000,
      dayOfMonth: 21,
      daysInMonth: 30,
    });
    expect(pace.perDayMinor).toBe(4_800);
    expect(pace.message).toContain("₹48/day");
  });

  it("reports the overage when over budget", () => {
    const pace = computeBudgetPace({
      spentMinor: 120_000,
      budgetMinor: 100_000,
      dayOfMonth: 25,
      daysInMonth: 30,
    });
    expect(pace.perDayMinor).toBe(0);
    expect(pace.message).toContain("Over by");
    expect(pace.message).toContain("₹200");
  });

  it("prompts when no budget is set", () => {
    const pace = computeBudgetPace({
      spentMinor: 5_000,
      budgetMinor: 0,
      dayOfMonth: 5,
      daysInMonth: 31,
    });
    expect(pace.fraction).toBe(0);
    expect(pace.level).toBe("ok");
    expect(pace.message).toContain("Set a budget");
  });

  it("projects month-end spend at the current daily rate", () => {
    // ₹300 by day 10 of 30 → projected ₹900.
    const pace = computeBudgetPace({
      spentMinor: 30_000,
      budgetMinor: 100_000,
      dayOfMonth: 10,
      daysInMonth: 30,
    });
    expect(pace.projectedMinor).toBe(90_000);
    expect(pace.onPace).toBe(true);
  });
});

describe("computeBudgetPace · invariants", () => {
  it("never returns a negative per-day allowance and stays integer", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: MAX_AMOUNT_MINOR }),
        fc.integer({ min: 1, max: MAX_AMOUNT_MINOR }),
        fc.integer({ min: 1, max: 31 }),
        fc.integer({ min: 1, max: 31 }),
        (spentMinor, budgetMinor, day, days) => {
          const daysInMonth = Math.max(day, days);
          const pace = computeBudgetPace({
            spentMinor,
            budgetMinor,
            dayOfMonth: day,
            daysInMonth,
          });
          expect(pace.perDayMinor).toBeGreaterThanOrEqual(0);
          expect(Number.isInteger(pace.perDayMinor)).toBe(true);
          expect(Number.isInteger(pace.projectedMinor)).toBe(true);
          expect(pace.remainingMinor).toBe(budgetMinor - spentMinor);
          if (spentMinor > budgetMinor) expect(pace.level).toBe("over");
        },
      ),
    );
  });
});

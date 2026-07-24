import { describe, expect, it } from "vitest";
import { filterByCooldown, generateInsights, type InsightInput } from "./insights";

const base: InsightInput = {
  categories: [],
  budgets: [],
  owedToYouMinor: 0,
  owedFromCount: 0,
  youOweMinor: 0,
  oweToCount: 0,
  biggest: null,
  weekdayAvgMinor: 0,
  weekendAvgMinor: 0,
};

describe("generateInsights · budgets", () => {
  it("surfaces the worst over-budget first", () => {
    const insights = generateInsights({
      ...base,
      budgets: [
        { name: "Food", level: "over", overByMinor: 20_000 },
        { name: null, level: "over", overByMinor: 80_000 },
      ],
    });
    expect(insights[0]?.key).toBe("budget-over:overall");
    expect(insights[0]?.text).toContain("₹800");
    expect(insights[0]?.priority).toBe(100);
  });

  it("falls back to a warn when nothing is over", () => {
    const insights = generateInsights({
      ...base,
      budgets: [{ name: "Travel", level: "warn", overByMinor: 0 }],
    });
    expect(insights[0]?.key).toBe("budget-warn:Travel");
  });
});

describe("generateInsights · category spike", () => {
  it("flags the biggest ≥30% jump", () => {
    const insights = generateInsights({
      ...base,
      categories: [
        { name: "Food", amountMinor: 130_000, prevAmountMinor: 100_000 }, // +30%
        { name: "Fuel", amountMinor: 300_000, prevAmountMinor: 100_000 }, // +200%, bigger abs
      ],
    });
    const spike = insights.find((insight) => insight.key.startsWith("spike:"));
    expect(spike?.key).toBe("spike:Fuel");
    expect(spike?.text).toContain("200%");
  });

  it("ignores sub-30% moves and tiny categories", () => {
    const insights = generateInsights({
      ...base,
      categories: [
        { name: "Food", amountMinor: 110_000, prevAmountMinor: 100_000 }, // +10%
        { name: "Gum", amountMinor: 40_000, prevAmountMinor: 1_000 }, // huge % but below floor
      ],
    });
    expect(insights.some((insight) => insight.key.startsWith("spike:"))).toBe(false);
  });
});

describe("generateInsights · balances, weekend, biggest", () => {
  it("reports owed, weekend pattern, and biggest, ranked", () => {
    const insights = generateInsights({
      ...base,
      owedToYouMinor: 125_000,
      owedFromCount: 3,
      weekdayAvgMinor: 20_000,
      weekendAvgMinor: 50_000, // 2.5×
      biggest: { description: "Flight to Leh", amountMinor: 450_000 },
    });
    const keys = insights.map((insight) => insight.key);
    expect(keys).toEqual(["owed", "weekend", "biggest:Flight to Leh"]);
    expect(insights.find((i) => i.key === "weekend")?.text).toContain("2.5×");
  });

  it("prefers 'owe' when nothing is owed to you", () => {
    const insights = generateInsights({ ...base, youOweMinor: 90_000, oweToCount: 2 });
    expect(insights[0]?.key).toBe("owe");
  });
});

describe("filterByCooldown", () => {
  const insights = generateInsights({ ...base, owedToYouMinor: 1000, owedFromCount: 1 });

  it("hides an insight still within its cooldown", () => {
    const filtered = filterByCooldown(insights, { owed: "2026-07-23" }, "2026-07-24");
    expect(filtered.some((i) => i.key === "owed")).toBe(false); // cooldown 2 days
  });

  it("re-shows once the cooldown elapses", () => {
    const filtered = filterByCooldown(insights, { owed: "2026-07-20" }, "2026-07-24");
    expect(filtered.some((i) => i.key === "owed")).toBe(true);
  });

  it("shows insights never seen before", () => {
    expect(filterByCooldown(insights, {}, "2026-07-24")).toHaveLength(insights.length);
  });
});

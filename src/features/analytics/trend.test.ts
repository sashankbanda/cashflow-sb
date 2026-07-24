import { describe, expect, it } from "vitest";
import { bucketTrend, denseDaily, periodDays, periodWindow } from "./trend";

describe("periodWindow", () => {
  it("builds a trailing window and the equal window right before it", () => {
    expect(periodWindow("2026-07-24", 7)).toEqual({
      from: "2026-07-18",
      to: "2026-07-24",
      prevFrom: "2026-07-11",
      prevTo: "2026-07-17",
    });
  });

  it("spans a 30-day month window", () => {
    const window = periodWindow("2026-07-24", 30);
    expect(window.from).toBe("2026-06-25");
    expect(window.to).toBe("2026-07-24");
    expect(window.prevTo).toBe("2026-06-24");
    expect(window.prevFrom).toBe("2026-05-26");
  });
});

describe("periodDays", () => {
  it("maps period keys to lengths", () => {
    expect(periodDays("week")).toBe(7);
    expect(periodDays("month")).toBe(30);
    expect(periodDays("quarter")).toBe(90);
    expect(periodDays("year")).toBe(365);
  });
});

describe("denseDaily", () => {
  it("fills every day in the range, zero where no spend", () => {
    const dense = denseDaily(
      [{ date: "2026-07-20", amountMinor: 500 }],
      "2026-07-18",
      "2026-07-21",
    );
    expect(dense).toEqual([
      { date: "2026-07-18", value: 0 },
      { date: "2026-07-19", value: 0 },
      { date: "2026-07-20", value: 500 },
      { date: "2026-07-21", value: 0 },
    ]);
  });
});

describe("bucketTrend", () => {
  it("keeps daily granularity for week and month", () => {
    const days = denseDaily([], "2026-07-18", "2026-07-24");
    expect(bucketTrend(days, "week")).toHaveLength(7);
    expect(bucketTrend(days, "month")).toHaveLength(7);
  });

  it("preserves the total when bucketing to months (year)", () => {
    const yearDense = denseDaily(
      [
        { date: "2026-01-10", amountMinor: 300 },
        { date: "2026-01-20", amountMinor: 200 },
        { date: "2026-03-05", amountMinor: 400 },
      ],
      "2026-01-01",
      "2026-03-31",
    );
    const buckets = bucketTrend(yearDense, "year");
    const total = buckets.reduce((sum, point) => sum + point.value, 0);
    expect(total).toBe(900);
    expect(buckets.map((point) => point.label)).toEqual(["Jan", "Feb", "Mar"]);
    expect(buckets[0]?.value).toBe(500);
    expect(buckets[1]?.value).toBe(0);
    expect(buckets[2]?.value).toBe(400);
  });

  it("preserves the total when bucketing to weeks (quarter)", () => {
    const quarterDense = denseDaily(
      Array.from({ length: 90 }, (_, index) => ({
        date: `2026-04-${String((index % 28) + 1).padStart(2, "0")}`,
        amountMinor: 10,
      })),
      "2026-04-01",
      "2026-06-29",
    );
    const beforeTotal = quarterDense.reduce((sum, day) => sum + day.value, 0);
    const buckets = bucketTrend(quarterDense, "quarter");
    const afterTotal = buckets.reduce((sum, point) => sum + point.value, 0);
    expect(afterTotal).toBe(beforeTotal);
  });
});

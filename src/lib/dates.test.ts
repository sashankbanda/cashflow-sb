import { describe, expect, it } from "vitest";
import { monthWindow } from "./dates";

describe("monthWindow", () => {
  it("resolves the current month in the given timezone", () => {
    const window = monthWindow("Asia/Kolkata", new Date("2026-07-24T09:00:00Z"));
    expect(window).toMatchObject({
      monthKey: "2026-07",
      monthLabel: "July 2026",
      start: "2026-07-01",
      end: "2026-07-31",
      today: "2026-07-24",
      dayOfMonth: 24,
      daysInMonth: 31,
      daysRemaining: 8, // 31 - 24 + 1
    });
  });

  it("rolls the month over on the local boundary, not UTC", () => {
    // 2026-07-31T20:00Z is already Aug 1 in Kolkata (+5:30) but still Jul 31 in New York (−4).
    const instant = new Date("2026-07-31T20:00:00Z");
    const kolkata = monthWindow("Asia/Kolkata", instant);
    const newYork = monthWindow("America/New_York", instant);
    expect(kolkata.monthKey).toBe("2026-08");
    expect(kolkata.dayOfMonth).toBe(1);
    expect(newYork.monthKey).toBe("2026-07");
    expect(newYork.dayOfMonth).toBe(31);
  });

  it("handles leap and non-leap February", () => {
    expect(monthWindow("UTC", new Date("2024-02-15T12:00:00Z")).daysInMonth).toBe(29);
    expect(monthWindow("UTC", new Date("2025-02-15T12:00:00Z")).daysInMonth).toBe(28);
  });

  it("falls back to UTC for an unknown timezone", () => {
    const window = monthWindow("Not/AZone", new Date("2026-03-05T00:00:00Z"));
    expect(window.monthKey).toBe("2026-03");
    expect(window.dayOfMonth).toBe(5);
  });
});

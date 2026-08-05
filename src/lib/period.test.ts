import { describe, expect, it } from "vitest";
import { defaultEntryDate, parsePeriodCookie, resolvePeriod } from "./period";

describe("period", () => {
  it("parses a cookie value and round-trips through resolvePeriod", () => {
    const period = resolvePeriod(parsePeriodCookie("2026-07-01|2026-07-31"));
    expect(period.isDefault).toBe(false);
    expect(period.label).toBe("Jul 2026");
  });

  it("falls back to the default period on garbage", () => {
    expect(resolvePeriod(parsePeriodCookie("nonsense")).isDefault).toBe(true);
    expect(resolvePeriod(parsePeriodCookie(undefined)).isDefault).toBe(true);
    expect(resolvePeriod({ from: "2026-09-09", to: "2026-01-01" }).isDefault).toBe(true);
  });

  it("defaults new-entry dates into a picked past month, today otherwise", () => {
    const july = resolvePeriod({ from: "2026-07-01", to: "2026-07-31" });
    expect(defaultEntryDate(july, "2026-08-06")).toBe("2026-07-31");
    const allTime = resolvePeriod({ from: "1970-01-01", to: "2026-08-06" });
    expect(defaultEntryDate(allTime, "2026-08-06")).toBe("2026-08-06");
    const thisMonth = resolvePeriod({});
    expect(defaultEntryDate(thisMonth, "2026-08-06")).toBe("2026-08-06");
  });
});

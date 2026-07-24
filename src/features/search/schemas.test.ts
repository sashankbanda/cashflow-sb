import { describe, expect, it } from "vitest";
import { activeFilterCount, hasSearchCriteria } from "./schemas";

describe("hasSearchCriteria", () => {
  it("is false for an empty query and no filters", () => {
    expect(hasSearchCriteria({ query: "  ", filters: {} })).toBe(false);
  });

  it("is true with a query term", () => {
    expect(hasSearchCriteria({ query: "coffee", filters: {} })).toBe(true);
  });

  it("is true with any active filter", () => {
    expect(hasSearchCriteria({ query: "", filters: { categoryIds: ["c1"] } })).toBe(true);
    expect(hasSearchCriteria({ query: "", filters: { amountMinMinor: 0 } })).toBe(true);
    expect(hasSearchCriteria({ query: "", filters: { dateFrom: "2026-07-01" } })).toBe(true);
  });
});

describe("activeFilterCount", () => {
  it("counts each active filter group once", () => {
    expect(activeFilterCount({})).toBe(0);
    expect(
      activeFilterCount({
        categoryIds: ["c1", "c2"],
        groupIds: ["g1"],
        amountMinMinor: 1000,
        dateFrom: "2026-07-01",
        dateTo: "2026-07-31",
      }),
    ).toBe(4); // categories + groups + amount(range) + date(range)
  });

  it("treats amount and date as single groups", () => {
    expect(activeFilterCount({ amountMinMinor: 1, amountMaxMinor: 9 })).toBe(1);
    expect(activeFilterCount({ tagIds: ["t"], memberUserIds: ["u"] })).toBe(2);
  });
});

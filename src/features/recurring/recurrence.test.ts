import { describe, expect, it } from "vitest";
import { advanceDate, anchorDayOf, isEnded, upcomingDates } from "./recurrence";

describe("advanceDate · monthly", () => {
  it("clamps Jan 31 → Feb 28 in a common year", () => {
    expect(advanceDate("2026-01-31", "monthly", 1, 31)).toBe("2026-02-28");
  });

  it("clamps Jan 31 → Feb 29 in a leap year", () => {
    expect(advanceDate("2024-01-31", "monthly", 1, 31)).toBe("2024-02-29");
  });

  it("recovers to the 31st after a short month (no permanent drift)", () => {
    const feb = advanceDate("2026-01-31", "monthly", 1, 31); // 2026-02-28
    const mar = advanceDate(feb, "monthly", 1, 31);
    expect(mar).toBe("2026-03-31");
  });

  it("rolls the year over in December", () => {
    expect(advanceDate("2026-12-15", "monthly", 1, 15)).toBe("2027-01-15");
  });

  it("honours a multi-month interval", () => {
    expect(advanceDate("2026-01-15", "monthly", 3, 15)).toBe("2026-04-15");
  });
});

describe("advanceDate · other frequencies", () => {
  it("adds days and weeks", () => {
    expect(advanceDate("2026-07-24", "daily", 1, 24)).toBe("2026-07-25");
    expect(advanceDate("2026-07-24", "weekly", 2, 24)).toBe("2026-08-07");
  });

  it("adds a year", () => {
    expect(advanceDate("2026-07-24", "yearly", 1, 24)).toBe("2027-07-24");
  });
});

describe("anchorDayOf", () => {
  it("reads the day of month from the start date", () => {
    expect(anchorDayOf("2026-01-31")).toBe(31);
    expect(anchorDayOf("2026-02-01")).toBe(1);
  });
});

describe("upcomingDates", () => {
  it("lists the next N monthly dates", () => {
    expect(
      upcomingDates(
        { nextRunOn: "2026-01-31", frequency: "monthly", interval: 1, anchorDay: 31 },
        3,
      ),
    ).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"]);
  });

  it("stops at the end date", () => {
    expect(
      upcomingDates(
        {
          nextRunOn: "2026-01-15",
          frequency: "monthly",
          interval: 1,
          anchorDay: 15,
          endsOn: "2026-02-28",
        },
        5,
      ),
    ).toEqual(["2026-01-15", "2026-02-15"]);
  });
});

describe("isEnded", () => {
  it("is true once the cursor passes the end date", () => {
    expect(
      isEnded({
        nextRunOn: "2026-03-01",
        frequency: "monthly",
        interval: 1,
        anchorDay: 1,
        endsOn: "2026-02-28",
      }),
    ).toBe(true);
    expect(
      isEnded({
        nextRunOn: "2026-02-01",
        frequency: "monthly",
        interval: 1,
        anchorDay: 1,
        endsOn: "2026-02-28",
      }),
    ).toBe(false);
  });
});

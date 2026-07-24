import { describe, expect, it } from "vitest";
import { describeActivity, describeNotification } from "./describe";

describe("describeActivity", () => {
  it("renders an expense line from payload, no joins", () => {
    const result = describeActivity("expense_added", {
      description: "Dinner",
      amountMinor: 50_000,
      groupName: "Goa trip",
    });
    expect(result.text).toBe("added Dinner in Goa trip");
    expect(result.amountMinor).toBe(50_000);
  });

  it("handles settlements, members, and unknown verbs", () => {
    expect(describeActivity("settlement_recorded", { groupName: "Flat" }).text).toBe(
      "recorded a payment in Flat",
    );
    expect(describeActivity("member_joined", { groupName: "Flat" }).text).toBe("joined Flat");
    expect(describeActivity("mystery", {}).text).toBe("updated the group");
  });

  it("degrades gracefully with an empty payload", () => {
    expect(describeActivity("expense_added", {}).text).toBe("added an expense");
  });
});

describe("describeNotification", () => {
  it("names the actor for social events", () => {
    expect(
      describeNotification("expense_added", {
        actorName: "Rohit",
        description: "Fuel",
        groupName: "Ride",
      }),
    ).toBe("Rohit added Fuel in Ride");
    expect(describeNotification("settlement_recorded", { actorName: "Asha" })).toBe(
      "Asha recorded a payment to you",
    );
  });

  it("frames budget thresholds in the second person", () => {
    expect(describeNotification("budget_threshold", { level: "over", categoryName: "Food" })).toBe(
      "You're over your Food budget",
    );
    expect(describeNotification("budget_threshold", { level: "warn", categoryName: null })).toBe(
      "You're close to your overall budget",
    );
  });
});

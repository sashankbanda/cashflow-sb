import { describe, expect, it } from "vitest";
import { bumpAttempt, ordered, remove, upsert, type OutboxExpense } from "./outbox-model";

const make = (id: string, createdAt: number): OutboxExpense => ({
  id,
  createdAt,
  attempts: 0,
  payload: {
    description: "x",
    amountMinor: 100,
    categoryId: "c",
    expenseDate: "2026-07-25",
    tagIds: [],
    categoryName: "Other",
    categoryIcon: "shapes",
    categoryGradient: "ocean",
  },
});

describe("outbox model", () => {
  it("upsert dedupes by id (idempotency key)", () => {
    const a = make("k1", 1);
    const a2 = { ...a, payload: { ...a.payload, amountMinor: 999 } };
    const result = upsert(upsert([], a), a2);
    expect(result).toHaveLength(1);
    expect(result[0]?.payload.amountMinor).toBe(999);
  });

  it("remove drops by id", () => {
    const items = upsert(upsert([], make("k1", 1)), make("k2", 2));
    expect(remove(items, "k1").map((i) => i.id)).toEqual(["k2"]);
  });

  it("bumpAttempt increments only the matching item", () => {
    const items = upsert(upsert([], make("k1", 1)), make("k2", 2));
    const bumped = bumpAttempt(items, "k1");
    expect(bumped.find((i) => i.id === "k1")?.attempts).toBe(1);
    expect(bumped.find((i) => i.id === "k2")?.attempts).toBe(0);
  });

  it("ordered replays oldest first", () => {
    const items = [make("k2", 20), make("k1", 10), make("k3", 30)];
    expect(ordered(items).map((i) => i.id)).toEqual(["k1", "k2", "k3"]);
  });
});

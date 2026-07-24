import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { MAX_AMOUNT_MINOR } from "./money";
import {
  computeSplits,
  exactRemainder,
  SplitError,
  validatePayers,
  type SplitParticipant,
} from "./split";

const members = (count: number): SplitParticipant[] =>
  Array.from({ length: count }, (_, index) => ({ memberId: `m${String(index).padStart(2, "0")}` }));

function total(shares: ReadonlyArray<{ amountMinor: number }>): number {
  return shares.reduce((sum, share) => sum + share.amountMinor, 0);
}

describe("computeSplits · equal", () => {
  it("splits ₹100 across 3 exactly (largest remainder, id tie-break)", () => {
    const shares = computeSplits({ amountMinor: 10000, type: "equal", participants: members(3) });
    expect(shares.map((share) => share.amountMinor)).toEqual([3334, 3333, 3333]);
    expect(total(shares)).toBe(10000);
  });

  it("handles 1 paisa among 50 members", () => {
    const shares = computeSplits({ amountMinor: 1, type: "equal", participants: members(50) });
    expect(total(shares)).toBe(1);
    expect(shares.filter((share) => share.amountMinor === 1)).toHaveLength(1);
  });

  it("is independent of participant order", () => {
    const forward = computeSplits({ amountMinor: 10001, type: "equal", participants: members(3) });
    const reversed = computeSplits({
      amountMinor: 10001,
      type: "equal",
      participants: [...members(3)].reverse(),
    });
    for (const share of forward) {
      const match = reversed.find((other) => other.memberId === share.memberId);
      expect(match?.amountMinor).toBe(share.amountMinor);
    }
  });

  it("handles the maximum amount", () => {
    const shares = computeSplits({
      amountMinor: MAX_AMOUNT_MINOR,
      type: "equal",
      participants: members(7),
    });
    expect(total(shares)).toBe(MAX_AMOUNT_MINOR);
  });
});

describe("computeSplits · exact", () => {
  it("passes through exact paise", () => {
    const shares = computeSplits({
      amountMinor: 10000,
      type: "exact",
      participants: [
        { memberId: "a", weight: 7000 },
        { memberId: "b", weight: 3000 },
      ],
    });
    expect(shares.map((share) => share.amountMinor)).toEqual([7000, 3000]);
  });

  it("allows zero shares", () => {
    const shares = computeSplits({
      amountMinor: 500,
      type: "exact",
      participants: [
        { memberId: "a", weight: 500 },
        { memberId: "b", weight: 0 },
      ],
    });
    expect(shares[1]?.amountMinor).toBe(0);
  });

  it("throws on mismatched totals", () => {
    expect(() =>
      computeSplits({
        amountMinor: 10000,
        type: "exact",
        participants: [
          { memberId: "a", weight: 7000 },
          { memberId: "b", weight: 2000 },
        ],
      }),
    ).toThrowError(SplitError);
  });

  it("throws on fractional or missing weights", () => {
    expect(() =>
      computeSplits({
        amountMinor: 100,
        type: "exact",
        participants: [
          { memberId: "a", weight: 99.5 },
          { memberId: "b", weight: 0.5 },
        ],
      }),
    ).toThrowError(SplitError);
    expect(() =>
      computeSplits({ amountMinor: 100, type: "exact", participants: [{ memberId: "a" }] }),
    ).toThrowError(SplitError);
  });
});

describe("computeSplits · percent", () => {
  it("distributes 33.33/33.33/33.34 exactly", () => {
    const shares = computeSplits({
      amountMinor: 10000,
      type: "percent",
      participants: [
        { memberId: "a", weight: 33.33 },
        { memberId: "b", weight: 33.33 },
        { memberId: "c", weight: 33.34 },
      ],
    });
    expect(total(shares)).toBe(10000);
    expect(shares[2]?.amountMinor).toBeGreaterThanOrEqual(shares[0]?.amountMinor ?? 0);
  });

  it("throws when percentages do not sum to 100", () => {
    expect(() =>
      computeSplits({
        amountMinor: 10000,
        type: "percent",
        participants: [
          { memberId: "a", weight: 60 },
          { memberId: "b", weight: 30 },
        ],
      }),
    ).toThrowError(SplitError);
  });

  it("throws on negative, missing, or non-finite percentages", () => {
    expect(() =>
      computeSplits({
        amountMinor: 10000,
        type: "percent",
        participants: [
          { memberId: "a", weight: 150 },
          { memberId: "b", weight: -50 },
        ],
      }),
    ).toThrowError(SplitError);
    expect(() =>
      computeSplits({ amountMinor: 10000, type: "percent", participants: [{ memberId: "a" }] }),
    ).toThrowError(SplitError);
    expect(() =>
      computeSplits({
        amountMinor: 10000,
        type: "percent",
        participants: [{ memberId: "a", weight: Number.POSITIVE_INFINITY }],
      }),
    ).toThrowError(SplitError);
  });
});

describe("computeSplits · shares", () => {
  it("splits 2x/1x/1x", () => {
    const shares = computeSplits({
      amountMinor: 10000,
      type: "shares",
      participants: [
        { memberId: "a", weight: 2 },
        { memberId: "b", weight: 1 },
        { memberId: "c", weight: 1 },
      ],
    });
    expect(shares.map((share) => share.amountMinor)).toEqual([5000, 2500, 2500]);
  });

  it("allows zero-share members", () => {
    const shares = computeSplits({
      amountMinor: 999,
      type: "shares",
      participants: [
        { memberId: "a", weight: 1 },
        { memberId: "b", weight: 0 },
      ],
    });
    expect(shares[1]?.amountMinor).toBe(0);
    expect(total(shares)).toBe(999);
  });

  it("throws when all shares are zero", () => {
    expect(() =>
      computeSplits({
        amountMinor: 100,
        type: "shares",
        participants: [
          { memberId: "a", weight: 0 },
          { memberId: "b", weight: 0 },
        ],
      }),
    ).toThrowError(SplitError);
  });

  it("throws on missing, NaN, or negative share weights", () => {
    expect(() =>
      computeSplits({ amountMinor: 100, type: "shares", participants: [{ memberId: "a" }] }),
    ).toThrowError(SplitError);
    expect(() =>
      computeSplits({
        amountMinor: 100,
        type: "shares",
        participants: [{ memberId: "a", weight: Number.NaN }],
      }),
    ).toThrowError(SplitError);
    expect(() =>
      computeSplits({
        amountMinor: 100,
        type: "shares",
        participants: [
          { memberId: "a", weight: 2 },
          { memberId: "b", weight: -1 },
        ],
      }),
    ).toThrowError(SplitError);
  });
});

describe("computeSplits · shared validation", () => {
  it("rejects invalid amounts", () => {
    expect(() =>
      computeSplits({ amountMinor: 0, type: "equal", participants: members(2) }),
    ).toThrowError(SplitError);
    expect(() =>
      computeSplits({ amountMinor: -5, type: "equal", participants: members(2) }),
    ).toThrowError(SplitError);
    expect(() =>
      computeSplits({ amountMinor: 10.5, type: "equal", participants: members(2) }),
    ).toThrowError(SplitError);
  });

  it("rejects empty participants and duplicates", () => {
    expect(() => computeSplits({ amountMinor: 100, type: "equal", participants: [] })).toThrowError(
      SplitError,
    );
    expect(() =>
      computeSplits({
        amountMinor: 100,
        type: "equal",
        participants: [{ memberId: "a" }, { memberId: "a" }],
      }),
    ).toThrowError(SplitError);
  });
});

describe("property: Σ shares === amount", () => {
  const amountArb = fc.integer({ min: 1, max: MAX_AMOUNT_MINOR });
  const idsArb = fc
    .uniqueArray(fc.integer({ min: 0, max: 1_000_000 }), { minLength: 1, maxLength: 50 })
    .map((numbers) => numbers.map((number) => `m${number}`));

  it("equal splits", () => {
    fc.assert(
      fc.property(amountArb, idsArb, (amount, ids) => {
        const shares = computeSplits({
          amountMinor: amount,
          type: "equal",
          participants: ids.map((memberId) => ({ memberId })),
        });
        expect(total(shares)).toBe(amount);
        // fairness: shares differ by at most one paisa
        const amounts = shares.map((share) => share.amountMinor);
        expect(Math.max(...amounts) - Math.min(...amounts)).toBeLessThanOrEqual(1);
      }),
      { numRuns: 3000 },
    );
  });

  it("percent splits", () => {
    fc.assert(
      fc.property(
        amountArb,
        fc.array(fc.integer({ min: 0, max: 10000 }), { minLength: 1, maxLength: 30 }),
        (amount, rawWeights) => {
          const totalRaw = rawWeights.reduce((sum, weight) => sum + weight, 0);
          fc.pre(totalRaw > 0);
          // normalize integer weights to percentages summing exactly to 100
          const percents = rawWeights.map((weight) => (weight * 100) / totalRaw);
          const shares = computeSplits({
            amountMinor: amount,
            type: "percent",
            participants: percents.map((weight, index) => ({
              memberId: `m${String(index).padStart(2, "0")}`,
              weight,
            })),
          });
          expect(total(shares)).toBe(amount);
        },
      ),
      { numRuns: 3000 },
    );
  });

  it("share splits", () => {
    fc.assert(
      fc.property(
        amountArb,
        fc.array(fc.integer({ min: 0, max: 99 }), { minLength: 1, maxLength: 50 }),
        (amount, weights) => {
          fc.pre(weights.some((weight) => weight > 0));
          const shares = computeSplits({
            amountMinor: amount,
            type: "shares",
            participants: weights.map((weight, index) => ({
              memberId: `m${String(index).padStart(2, "0")}`,
              weight,
            })),
          });
          expect(total(shares)).toBe(amount);
        },
      ),
      { numRuns: 3000 },
    );
  });

  it("determinism: identical input yields identical output", () => {
    fc.assert(
      fc.property(amountArb, idsArb, (amount, ids) => {
        const input = {
          amountMinor: amount,
          type: "equal" as const,
          participants: ids.map((memberId) => ({ memberId })),
        };
        expect(computeSplits(input)).toEqual(computeSplits(input));
      }),
      { numRuns: 500 },
    );
  });

  it("order-independence: per-member amounts survive permutation", () => {
    fc.assert(
      fc.property(amountArb, idsArb, (amount, ids) => {
        const forward = computeSplits({
          amountMinor: amount,
          type: "equal",
          participants: ids.map((memberId) => ({ memberId })),
        });
        const reversed = computeSplits({
          amountMinor: amount,
          type: "equal",
          participants: [...ids].reverse().map((memberId) => ({ memberId })),
        });
        const byId = new Map(reversed.map((share) => [share.memberId, share.amountMinor]));
        for (const share of forward) {
          expect(byId.get(share.memberId)).toBe(share.amountMinor);
        }
      }),
      { numRuns: 1000 },
    );
  });
});

describe("exactRemainder", () => {
  it("reports paise left to assign", () => {
    expect(exactRemainder(10000, [3000, 4000])).toBe(3000);
    expect(exactRemainder(10000, [10000])).toBe(0);
    expect(exactRemainder(10000, [12000])).toBe(-2000);
  });
});

describe("validatePayers", () => {
  it("accepts a single full payer", () => {
    expect(() => validatePayers(10000, [{ memberId: "a", amountMinor: 10000 }])).not.toThrow();
  });

  it("accepts multiple payers summing exactly", () => {
    expect(() =>
      validatePayers(10000, [
        { memberId: "a", amountMinor: 6000 },
        { memberId: "b", amountMinor: 4000 },
      ]),
    ).not.toThrow();
  });

  it("rejects empty, duplicate, non-positive, and mismatched payers", () => {
    expect(() => validatePayers(100, [])).toThrowError(SplitError);
    expect(() =>
      validatePayers(100, [
        { memberId: "a", amountMinor: 50 },
        { memberId: "a", amountMinor: 50 },
      ]),
    ).toThrowError(SplitError);
    expect(() => validatePayers(100, [{ memberId: "a", amountMinor: 0 }])).toThrowError(SplitError);
    expect(() =>
      validatePayers(100, [
        { memberId: "a", amountMinor: 60 },
        { memberId: "b", amountMinor: 60 },
      ]),
    ).toThrowError(SplitError);
  });
});

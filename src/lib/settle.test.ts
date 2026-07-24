import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { MoneyError } from "./money";
import { applyTransfers, simplifyDebts, type NetBalance } from "./settle";

/** Random integer nets over n members that sum to exactly zero. */
const zeroSumNetsArb = fc
  .array(fc.integer({ min: -5_000_000, max: 5_000_000 }), { minLength: 1, maxLength: 24 })
  .map((values) => {
    const nets: NetBalance[] = values.map((value, index) => ({
      memberId: `m${String(index).padStart(2, "0")}`,
      netMinor: value,
    }));
    const sum = values.reduce((total, value) => total + value, 0);
    nets.push({ memberId: `m${String(values.length).padStart(2, "0")}`, netMinor: -sum });
    return nets;
  });

describe("simplifyDebts", () => {
  it("settles the canonical trip scenario", () => {
    // A paid 2500, B 1200, C 900, D 8000; equal 4-way split of 12600 = 3150.
    const nets: NetBalance[] = [
      { memberId: "a", netMinor: -65000 },
      { memberId: "b", netMinor: -195000 },
      { memberId: "c", netMinor: -225000 },
      { memberId: "d", netMinor: 485000 },
    ];
    const transfers = simplifyDebts(nets);
    expect(transfers.length).toBeLessThanOrEqual(3);
    expect(applyTransfers(nets, transfers).every((n) => n.netMinor === 0)).toBe(true);
  });

  it("returns nothing when everyone is settled", () => {
    expect(simplifyDebts([{ memberId: "a", netMinor: 0 }])).toEqual([]);
  });

  it("rejects nets that don't sum to zero or aren't integers", () => {
    expect(() => simplifyDebts([{ memberId: "a", netMinor: 5 }])).toThrow(MoneyError);
    expect(() =>
      simplifyDebts([
        { memberId: "a", netMinor: 0.5 },
        { memberId: "b", netMinor: -0.5 },
      ]),
    ).toThrow(MoneyError);
  });

  it(
    "property: zeroes all balances with ≤ n−1 positive transfers, deterministically",
    { timeout: 60_000 },
    () => {
      fc.assert(
        fc.property(zeroSumNetsArb, (nets) => {
          const transfers = simplifyDebts(nets);

          // ≤ n−1 transfers
          expect(transfers.length).toBeLessThanOrEqual(Math.max(0, nets.length - 1));
          // every transfer is positive and between distinct members
          for (const transfer of transfers) {
            expect(transfer.amountMinor).toBeGreaterThan(0);
            expect(transfer.fromMemberId).not.toBe(transfer.toMemberId);
          }
          // applying transfers zeroes everyone
          expect(applyTransfers(nets, transfers).every((n) => n.netMinor === 0)).toBe(true);
          // deterministic
          expect(simplifyDebts(nets)).toEqual(transfers);
          // debtors only pay, creditors only receive
          const netOf = new Map(nets.map((n) => [n.memberId, n.netMinor]));
          for (const transfer of transfers) {
            expect(netOf.get(transfer.fromMemberId) ?? 0).toBeLessThan(0);
            expect(netOf.get(transfer.toMemberId) ?? 0).toBeGreaterThan(0);
          }
        }),
        { numRuns: 10000 },
      );
    },
  );
});

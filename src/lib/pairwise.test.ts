import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { computeSplits } from "./split";
import {
  buildDebtLedger,
  ledgerNet,
  pairNet,
  type PairwiseExpense,
  type PairwiseSettlement,
} from "./pairwise";

describe("buildDebtLedger", () => {
  it("attributes a single-payer expense to the payer", () => {
    const ledger = buildDebtLedger(
      [
        {
          payers: [{ memberId: "a", amountMinor: 9000 }],
          splits: [
            { memberId: "a", amountMinor: 3000 },
            { memberId: "b", amountMinor: 3000 },
            { memberId: "c", amountMinor: 3000 },
          ],
        },
      ],
      [],
    );
    expect(pairNet(ledger, "a", "b")).toBe(3000);
    expect(pairNet(ledger, "a", "c")).toBe(3000);
    expect(pairNet(ledger, "b", "c")).toBe(0);
  });

  it("splits debt across multiple payers proportionally and exactly", () => {
    const ledger = buildDebtLedger(
      [
        {
          payers: [
            { memberId: "a", amountMinor: 6000 },
            { memberId: "b", amountMinor: 3000 },
          ],
          splits: [
            { memberId: "a", amountMinor: 3000 },
            { memberId: "b", amountMinor: 3000 },
            { memberId: "c", amountMinor: 3000 },
          ],
        },
      ],
      [],
    );
    // c owes 2000 to a and 1000 to b (2:1 payer ratio), exactly.
    expect(pairNet(ledger, "a", "c")).toBe(2000);
    expect(pairNet(ledger, "b", "c")).toBe(1000);
    // b's own share attributed to a: 2000 (b→a); a's share to b: 1000 (a→b) → net 1000.
    expect(pairNet(ledger, "a", "b")).toBe(1000);
  });

  it("settlements reduce debts in the paid direction", () => {
    const expenses: PairwiseExpense[] = [
      {
        payers: [{ memberId: "a", amountMinor: 1000 }],
        splits: [
          { memberId: "a", amountMinor: 500 },
          { memberId: "b", amountMinor: 500 },
        ],
      },
    ];
    const settlements: PairwiseSettlement[] = [
      { fromMemberId: "b", toMemberId: "a", amountMinor: 500 },
    ];
    const ledger = buildDebtLedger(expenses, settlements);
    expect(pairNet(ledger, "a", "b")).toBe(0);
  });

  it("property: ledger nets equal paid − share ± settlements for every member", () => {
    const memberIds = ["m0", "m1", "m2", "m3", "m4"];
    const expenseArb = fc
      .record({
        amount: fc.integer({ min: 5, max: 5_000_00 }),
        payerCount: fc.integer({ min: 1, max: 3 }),
        participantCount: fc.integer({ min: 1, max: 5 }),
        seed: fc.integer({ min: 0, max: 1000 }),
      })
      .map(({ amount, payerCount, participantCount, seed }) => {
        const participants = memberIds.slice(0, participantCount);
        const payerIds = memberIds.slice(seed % 3, (seed % 3) + payerCount);
        const shares = computeSplits({
          amountMinor: amount,
          type: "equal",
          participants: participants.map((memberId) => ({ memberId })),
        });
        const payerShares = computeSplits({
          amountMinor: amount,
          type: "equal",
          participants: payerIds.map((memberId) => ({ memberId })),
        });
        return {
          payers: payerShares.map((share) => ({
            memberId: share.memberId,
            amountMinor: share.amountMinor,
          })),
          splits: shares.map((share) => ({
            memberId: share.memberId,
            amountMinor: share.amountMinor,
          })),
        } satisfies PairwiseExpense;
      });

    fc.assert(
      fc.property(
        fc.array(expenseArb, { minLength: 1, maxLength: 12 }),
        fc.array(
          fc.record({
            from: fc.integer({ min: 0, max: 4 }),
            to: fc.integer({ min: 0, max: 4 }),
            amount: fc.integer({ min: 1, max: 100_00 }),
          }),
          { maxLength: 6 },
        ),
        (expenses, rawSettlements) => {
          const settlements = rawSettlements
            .filter((s) => s.from !== s.to)
            .map((s) => ({
              fromMemberId: memberIds[s.from] ?? "m0",
              toMemberId: memberIds[s.to] ?? "m1",
              amountMinor: s.amount,
            }));
          const ledger = buildDebtLedger(expenses, settlements);

          for (const memberId of memberIds) {
            const paid = expenses
              .flatMap((expense) => expense.payers)
              .filter((payer) => payer.memberId === memberId)
              .reduce((sum, payer) => sum + payer.amountMinor, 0);
            const owed = expenses
              .flatMap((expense) => expense.splits)
              .filter((split) => split.memberId === memberId)
              .reduce((sum, split) => sum + split.amountMinor, 0);
            const sent = settlements
              .filter((s) => s.fromMemberId === memberId)
              .reduce((sum, s) => sum + s.amountMinor, 0);
            const received = settlements
              .filter((s) => s.toMemberId === memberId)
              .reduce((sum, s) => sum + s.amountMinor, 0);
            expect(ledgerNet(ledger, memberId)).toBe(paid - owed + sent - received);
          }
        },
      ),
      { numRuns: 1500 },
    );
  });
});

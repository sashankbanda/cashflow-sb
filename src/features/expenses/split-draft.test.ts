import { describe, expect, it } from "vitest";
import {
  emptyPayerDraft,
  emptySplitDraft,
  payerDraftToPayers,
  splitDraftToParticipants,
  type PayerDraft,
  type SplitDraft,
} from "./split-draft";

const members = ["a", "b", "c"];

describe("splitDraftToParticipants", () => {
  it("equal: passes included members through", () => {
    const result = splitDraftToParticipants(emptySplitDraft(members), 10000);
    expect(result).toEqual({
      ok: true,
      participants: members.map((memberId) => ({ memberId })),
    });
  });

  it("rejects an empty selection", () => {
    const draft: SplitDraft = { ...emptySplitDraft(members), included: [] };
    expect(splitDraftToParticipants(draft, 10000).ok).toBe(false);
  });

  it("exact: reports paise left to assign", () => {
    const draft: SplitDraft = {
      ...emptySplitDraft(members),
      type: "exact",
      included: ["a", "b"],
      exactAmounts: { a: "80" },
    };
    const result = splitDraftToParticipants(draft, 10000);
    expect(result).toEqual({ ok: false, message: "₹20 left to assign" });
  });

  it("exact: reports over-assignment", () => {
    const draft: SplitDraft = {
      ...emptySplitDraft(members),
      type: "exact",
      included: ["a"],
      exactAmounts: { a: "120.50" },
    };
    const result = splitDraftToParticipants(draft, 10000);
    expect(result).toEqual({ ok: false, message: "₹20.50 over the total" });
  });

  it("exact: settles when amounts add up, preserving paise weights", () => {
    const draft: SplitDraft = {
      ...emptySplitDraft(members),
      type: "exact",
      included: ["a", "b"],
      exactAmounts: { a: "70", b: "30" },
    };
    const result = splitDraftToParticipants(draft, 10000);
    expect(result).toEqual({
      ok: true,
      participants: [
        { memberId: "a", weight: 7000 },
        { memberId: "b", weight: 3000 },
      ],
    });
  });

  it("percent: reports remaining percentage", () => {
    const draft: SplitDraft = {
      ...emptySplitDraft(members),
      type: "percent",
      included: ["a", "b"],
      percents: { a: "60", b: "25.5" },
    };
    const result = splitDraftToParticipants(draft, 10000);
    expect(result).toEqual({ ok: false, message: "14.5% left to assign" });
  });

  it("percent: settles at exactly 100", () => {
    const draft: SplitDraft = {
      ...emptySplitDraft(members),
      type: "percent",
      included: ["a", "b"],
      percents: { a: "60", b: "40" },
    };
    expect(splitDraftToParticipants(draft, 10000).ok).toBe(true);
  });

  it("percent: rejects garbage input", () => {
    const draft: SplitDraft = {
      ...emptySplitDraft(members),
      type: "percent",
      included: ["a"],
      percents: { a: "-5" },
    };
    expect(splitDraftToParticipants(draft, 10000).ok).toBe(false);
  });

  it("shares: defaults to 1x and rejects all-zero", () => {
    const good: SplitDraft = { ...emptySplitDraft(members), type: "shares" };
    const result = splitDraftToParticipants(good, 10000);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.participants).toEqual(members.map((memberId) => ({ memberId, weight: 1 })));
    }
    const zero: SplitDraft = {
      ...good,
      shares: { a: 0, b: 0, c: 0 },
    };
    expect(splitDraftToParticipants(zero, 10000)).toEqual({
      ok: false,
      message: "Give at least one share.",
    });
  });
});

describe("payerDraftToPayers", () => {
  it("single mode: full amount on the selected payer", () => {
    expect(payerDraftToPayers(emptyPayerDraft("a"), 10000)).toEqual({
      ok: true,
      payers: [{ memberId: "a", amountMinor: 10000 }],
    });
  });

  it("single mode without a payer is blocked", () => {
    expect(payerDraftToPayers(emptyPayerDraft(null), 10000).ok).toBe(false);
  });

  it("multi mode: validates the running remainder", () => {
    const draft: PayerDraft = {
      mode: "multi",
      singleMemberId: null,
      selected: ["a", "b"],
      amounts: { a: "60", b: "30" },
    };
    expect(payerDraftToPayers(draft, 10000)).toEqual({
      ok: false,
      message: "₹10 left to assign",
    });
    const settled: PayerDraft = { ...draft, amounts: { a: "60", b: "40" } };
    expect(payerDraftToPayers(settled, 10000)).toEqual({
      ok: true,
      payers: [
        { memberId: "a", amountMinor: 6000 },
        { memberId: "b", amountMinor: 4000 },
      ],
    });
  });

  it("multi mode: every selected payer needs a positive amount", () => {
    const draft: PayerDraft = {
      mode: "multi",
      singleMemberId: null,
      selected: ["a", "b"],
      amounts: { a: "100" },
    };
    expect(payerDraftToPayers(draft, 10000).ok).toBe(false);
  });
});

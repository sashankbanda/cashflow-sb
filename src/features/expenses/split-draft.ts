import { amountToMinor } from "@/lib/amount-input";
import { formatMoney } from "@/lib/format";
import type { SplitParticipant, SplitType } from "@/lib/split";

/**
 * Pure UI-draft models for the split and payer editors. Components hold raw
 * input strings; these helpers turn drafts into engine inputs and produce the
 * live "₹120 left to assign" validation, so the logic is unit-testable.
 */

export interface SplitDraft {
  type: SplitType;
  /** Members included in the split. */
  included: ReadonlyArray<string>;
  /** Raw ₹ strings per member (exact mode). */
  exactAmounts: Readonly<Record<string, string>>;
  /** Raw percent strings per member (percent mode). */
  percents: Readonly<Record<string, string>>;
  /** Share counts per member (shares mode). */
  shares: Readonly<Record<string, number>>;
}

export function emptySplitDraft(memberIds: ReadonlyArray<string>): SplitDraft {
  return {
    type: "equal",
    included: [...memberIds],
    exactAmounts: {},
    percents: {},
    shares: Object.fromEntries(memberIds.map((id) => [id, 1])),
  };
}

function parsePercent(raw: string | undefined): number {
  if (!raw || raw.trim() === "") return 0;
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) && value >= 0 ? value : Number.NaN;
}

export type DraftResult =
  { ok: true; participants: SplitParticipant[] } | { ok: false; message: string };

/** Convert a draft into engine participants, or a human-readable blocker. */
export function splitDraftToParticipants(draft: SplitDraft, amountMinor: number): DraftResult {
  if (draft.included.length === 0) {
    return { ok: false, message: "Pick at least one person." };
  }

  switch (draft.type) {
    case "equal":
      return { ok: true, participants: draft.included.map((memberId) => ({ memberId })) };

    case "exact": {
      let assigned = 0;
      const participants: SplitParticipant[] = [];
      for (const memberId of draft.included) {
        const minor = amountToMinor(draft.exactAmounts[memberId] ?? "");
        assigned += minor;
        participants.push({ memberId, weight: minor });
      }
      if (assigned !== amountMinor) {
        const diff = amountMinor - assigned;
        return {
          ok: false,
          message:
            diff > 0
              ? `${formatMoney(diff)} left to assign`
              : `${formatMoney(-diff)} over the total`,
        };
      }
      return { ok: true, participants };
    }

    case "percent": {
      let total = 0;
      const participants: SplitParticipant[] = [];
      for (const memberId of draft.included) {
        const percent = parsePercent(draft.percents[memberId]);
        if (Number.isNaN(percent)) {
          return { ok: false, message: "Percentages must be numbers." };
        }
        total += percent;
        participants.push({ memberId, weight: percent });
      }
      const diff = 100 - total;
      if (Math.abs(diff) > 1e-6) {
        return {
          ok: false,
          message: diff > 0 ? `${trimPct(diff)}% left to assign` : `${trimPct(-diff)}% over 100`,
        };
      }
      return { ok: true, participants };
    }

    case "shares": {
      let total = 0;
      const participants: SplitParticipant[] = [];
      for (const memberId of draft.included) {
        const count = draft.shares[memberId] ?? 1;
        if (!Number.isInteger(count) || count < 0) {
          return { ok: false, message: "Shares must be whole numbers." };
        }
        total += count;
        participants.push({ memberId, weight: count });
      }
      if (total <= 0) {
        return { ok: false, message: "Give at least one share." };
      }
      return { ok: true, participants };
    }
  }
}

function trimPct(value: number): string {
  return String(Math.round(value * 100) / 100);
}

// ---------- Payers ----------

export interface PayerDraft {
  mode: "single" | "multi";
  /** Selected payer in single mode. */
  singleMemberId: string | null;
  /** Members selected in multi mode. */
  selected: ReadonlyArray<string>;
  /** Raw ₹ strings per selected member (multi mode). */
  amounts: Readonly<Record<string, string>>;
}

export function emptyPayerDraft(defaultMemberId: string | null): PayerDraft {
  return { mode: "single", singleMemberId: defaultMemberId, selected: [], amounts: {} };
}

export type PayerDraftResult =
  | { ok: true; payers: Array<{ memberId: string; amountMinor: number }> }
  | { ok: false; message: string };

/** Convert a payer draft into payer rows, or a human-readable blocker. */
export function payerDraftToPayers(draft: PayerDraft, amountMinor: number): PayerDraftResult {
  if (draft.mode === "single") {
    if (!draft.singleMemberId) return { ok: false, message: "Pick who paid." };
    return { ok: true, payers: [{ memberId: draft.singleMemberId, amountMinor }] };
  }

  if (draft.selected.length === 0) {
    return { ok: false, message: "Pick who paid." };
  }
  let assigned = 0;
  const payers: Array<{ memberId: string; amountMinor: number }> = [];
  for (const memberId of draft.selected) {
    const minor = amountToMinor(draft.amounts[memberId] ?? "");
    assigned += minor;
    payers.push({ memberId, amountMinor: minor });
  }
  if (assigned !== amountMinor) {
    const diff = amountMinor - assigned;
    return {
      ok: false,
      message:
        diff > 0 ? `${formatMoney(diff)} left to assign` : `${formatMoney(-diff)} over the total`,
    };
  }
  if (payers.some((payer) => payer.amountMinor <= 0)) {
    return { ok: false, message: "Every payer needs an amount." };
  }
  return { ok: true, payers };
}

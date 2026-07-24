import { assertMinor, sumMinor } from "./money";

/**
 * The split engine: computes each participant's exact share in paise for
 * every split type. Pure, deterministic, and paise-exact — the invariant
 * Σ shares === amount holds for every valid input (largest-remainder method,
 * ties broken by memberId so results are independent of input order).
 */

export type SplitType = "equal" | "exact" | "percent" | "shares";

export interface SplitParticipant {
  memberId: string;
  /**
   * Meaning depends on the split type:
   * - equal:   ignored
   * - exact:   the participant's share in paise (integer ≥ 0)
   * - percent: percentage, may be fractional (e.g. 33.33)
   * - shares:  share count (e.g. 2 for "2x"), ≥ 0
   */
  weight?: number;
}

export interface SplitShare {
  memberId: string;
  amountMinor: number;
  /** The original weight, preserved for edit round-trips (null for equal). */
  weight: number | null;
}

export type SplitErrorCode =
  | "INVALID_AMOUNT"
  | "NO_PARTICIPANTS"
  | "DUPLICATE_MEMBER"
  | "INVALID_WEIGHT"
  | "EXACT_MISMATCH"
  | "PERCENT_SUM_MISMATCH"
  | "ZERO_TOTAL_WEIGHT";

export class SplitError extends Error {
  readonly code: SplitErrorCode;
  constructor(code: SplitErrorCode, message: string) {
    super(message);
    this.name = "SplitError";
    this.code = code;
  }
}

export interface SplitInput {
  amountMinor: number;
  type: SplitType;
  participants: ReadonlyArray<SplitParticipant>;
}

const PERCENT_EPSILON = 1e-6;

function assertParticipants(participants: ReadonlyArray<SplitParticipant>): void {
  if (participants.length === 0) {
    throw new SplitError("NO_PARTICIPANTS", "A split needs at least one participant.");
  }
  const seen = new Set<string>();
  for (const participant of participants) {
    if (seen.has(participant.memberId)) {
      throw new SplitError("DUPLICATE_MEMBER", `Duplicate member: ${participant.memberId}`);
    }
    seen.add(participant.memberId);
  }
}

/**
 * Largest-remainder distribution: floor every ideal share, then hand the
 * leftover paise to the largest fractional parts (memberId breaks ties).
 */
function distributeByIdeal(
  amountMinor: number,
  ideals: ReadonlyArray<{ memberId: string; ideal: number }>,
): Map<string, number> {
  const floors = new Map<string, number>();
  let assigned = 0;
  for (const { memberId, ideal } of ideals) {
    const floor = Math.floor(ideal);
    floors.set(memberId, floor);
    assigned += floor;
  }

  let remainder = amountMinor - assigned;
  const byFraction = [...ideals].sort((a, b) => {
    const fractionDiff = b.ideal - Math.floor(b.ideal) - (a.ideal - Math.floor(a.ideal));
    if (Math.abs(fractionDiff) > Number.EPSILON) return fractionDiff > 0 ? 1 : -1;
    return a.memberId < b.memberId ? -1 : a.memberId > b.memberId ? 1 : 0;
  });

  for (const { memberId } of byFraction) {
    if (remainder <= 0) break;
    floors.set(memberId, (floors.get(memberId) ?? 0) + 1);
    remainder -= 1;
  }

  return floors;
}

function computeWeighted(
  amountMinor: number,
  participants: ReadonlyArray<SplitParticipant>,
  weightOf: (participant: SplitParticipant) => number,
  totalWeight: number,
): SplitShare[] {
  const ideals = participants.map((participant) => ({
    memberId: participant.memberId,
    ideal: (amountMinor * weightOf(participant)) / totalWeight,
  }));
  const amounts = distributeByIdeal(amountMinor, ideals);
  return participants.map((participant) => ({
    memberId: participant.memberId,
    amountMinor: amounts.get(participant.memberId) ?? 0,
    weight: weightOf(participant),
  }));
}

/** Compute exact per-member shares. Throws SplitError on invalid input. */
export function computeSplits(input: SplitInput): SplitShare[] {
  const { amountMinor, type, participants } = input;

  try {
    assertMinor(amountMinor, { label: "split amount" });
  } catch (error) {
    throw new SplitError("INVALID_AMOUNT", (error as Error).message);
  }
  assertParticipants(participants);

  switch (type) {
    case "equal": {
      const ideals = participants.map((participant) => ({
        memberId: participant.memberId,
        ideal: amountMinor / participants.length,
      }));
      const amounts = distributeByIdeal(amountMinor, ideals);
      return participants.map((participant) => ({
        memberId: participant.memberId,
        amountMinor: amounts.get(participant.memberId) ?? 0,
        weight: null,
      }));
    }

    case "exact": {
      for (const participant of participants) {
        const weight = participant.weight;
        if (weight === undefined || !Number.isSafeInteger(weight) || weight < 0) {
          throw new SplitError(
            "INVALID_WEIGHT",
            `Exact splits need non-negative integer paise for every member (got ${participant.weight}).`,
          );
        }
      }
      const total = sumMinor(participants.map((participant) => participant.weight ?? 0));
      if (total !== amountMinor) {
        throw new SplitError(
          "EXACT_MISMATCH",
          `Exact shares sum to ${total}, expected ${amountMinor}.`,
        );
      }
      return participants.map((participant) => ({
        memberId: participant.memberId,
        amountMinor: participant.weight ?? 0,
        weight: participant.weight ?? 0,
      }));
    }

    case "percent": {
      for (const participant of participants) {
        const weight = participant.weight;
        if (weight === undefined || !Number.isFinite(weight) || weight < 0) {
          throw new SplitError(
            "INVALID_WEIGHT",
            `Percent splits need a non-negative percentage for every member (got ${participant.weight}).`,
          );
        }
      }
      const totalPercent = participants.reduce((sum, p) => sum + (p.weight ?? 0), 0);
      if (Math.abs(totalPercent - 100) > PERCENT_EPSILON) {
        throw new SplitError(
          "PERCENT_SUM_MISMATCH",
          `Percentages sum to ${totalPercent}, expected 100.`,
        );
      }
      return computeWeighted(amountMinor, participants, (p) => p.weight ?? 0, totalPercent);
    }

    case "shares": {
      for (const participant of participants) {
        const weight = participant.weight;
        if (weight === undefined || !Number.isFinite(weight) || weight < 0) {
          throw new SplitError(
            "INVALID_WEIGHT",
            `Share splits need a non-negative share count for every member (got ${participant.weight}).`,
          );
        }
      }
      const totalShares = participants.reduce((sum, p) => sum + (p.weight ?? 0), 0);
      if (totalShares <= 0) {
        throw new SplitError("ZERO_TOTAL_WEIGHT", "At least one member needs a positive share.");
      }
      return computeWeighted(amountMinor, participants, (p) => p.weight ?? 0, totalShares);
    }
  }
}

/**
 * Remaining paise to assign while composing an exact split — drives the
 * "₹120 left to assign" live validation in the UI.
 */
export function exactRemainder(amountMinor: number, assigned: ReadonlyArray<number>): number {
  return amountMinor - sumMinor(assigned, "assigned share");
}

export interface PayerInput {
  memberId: string;
  amountMinor: number;
}

/** Validate multi-payer amounts: unique members, positive paise, exact total. */
export function validatePayers(amountMinor: number, payers: ReadonlyArray<PayerInput>): void {
  if (payers.length === 0) {
    throw new SplitError("NO_PARTICIPANTS", "An expense needs at least one payer.");
  }
  const seen = new Set<string>();
  for (const payer of payers) {
    if (seen.has(payer.memberId)) {
      throw new SplitError("DUPLICATE_MEMBER", `Duplicate payer: ${payer.memberId}`);
    }
    seen.add(payer.memberId);
    try {
      assertMinor(payer.amountMinor, { label: "payer amount" });
    } catch (error) {
      throw new SplitError("INVALID_WEIGHT", (error as Error).message);
    }
  }
  const total = sumMinor(payers.map((payer) => payer.amountMinor));
  if (total !== amountMinor) {
    throw new SplitError(
      "EXACT_MISMATCH",
      `Payer amounts sum to ${total}, expected ${amountMinor}.`,
    );
  }
}

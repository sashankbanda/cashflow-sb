import { MoneyError } from "./money";

/**
 * Debt simplification: turn per-member nets into at most n−1 transfers that
 * settle everyone. Greedy max-debtor ↔ max-creditor matching (industry
 * standard; true minimum-count is NP-hard). Pure and deterministic —
 * magnitude-descending with memberId tie-breaks.
 */

export interface NetBalance {
  memberId: string;
  /** Positive → is owed; negative → owes. */
  netMinor: number;
}

export interface Transfer {
  fromMemberId: string;
  toMemberId: string;
  amountMinor: number;
}

export function simplifyDebts(balances: ReadonlyArray<NetBalance>): Transfer[] {
  for (const balance of balances) {
    if (!Number.isSafeInteger(balance.netMinor)) {
      throw new MoneyError(`Net for ${balance.memberId} must be integer paise.`);
    }
  }
  const total = balances.reduce((sum, balance) => sum + balance.netMinor, 0);
  if (total !== 0) {
    throw new MoneyError(`Nets must sum to zero, got ${total}.`);
  }

  const creditors = balances
    .filter((balance) => balance.netMinor > 0)
    .map((balance) => ({ ...balance }));
  const debtors = balances
    .filter((balance) => balance.netMinor < 0)
    .map((balance) => ({ memberId: balance.memberId, netMinor: -balance.netMinor }));

  const byMagnitude = (
    a: { netMinor: number; memberId: string },
    b: { netMinor: number; memberId: string },
  ) => b.netMinor - a.netMinor || (a.memberId < b.memberId ? -1 : 1);

  const transfers: Transfer[] = [];
  while (creditors.length > 0 && debtors.length > 0) {
    creditors.sort(byMagnitude);
    debtors.sort(byMagnitude);
    const creditor = creditors[0];
    const debtor = debtors[0];
    if (!creditor || !debtor) break;

    const amount = Math.min(creditor.netMinor, debtor.netMinor);
    transfers.push({
      fromMemberId: debtor.memberId,
      toMemberId: creditor.memberId,
      amountMinor: amount,
    });
    creditor.netMinor -= amount;
    debtor.netMinor -= amount;
    if (creditor.netMinor === 0) creditors.shift();
    if (debtor.netMinor === 0) {
      const index = debtors.indexOf(debtor);
      if (index !== -1) debtors.splice(index, 1);
    }
  }

  return transfers;
}

/** Apply transfers to nets — used by tests and optimistic UI previews. */
export function applyTransfers(
  balances: ReadonlyArray<NetBalance>,
  transfers: ReadonlyArray<Transfer>,
): NetBalance[] {
  const nets = new Map(balances.map((balance) => [balance.memberId, balance.netMinor]));
  for (const transfer of transfers) {
    nets.set(transfer.fromMemberId, (nets.get(transfer.fromMemberId) ?? 0) + transfer.amountMinor);
    nets.set(transfer.toMemberId, (nets.get(transfer.toMemberId) ?? 0) - transfer.amountMinor);
  }
  return [...nets.entries()].map(([memberId, netMinor]) => ({ memberId, netMinor }));
}

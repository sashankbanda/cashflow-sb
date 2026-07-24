import { sumMinor } from "./money";

/**
 * Pairwise debt attribution: who owes whom, exactly, in paise. Each
 * expense split is distributed across that expense's payers proportionally
 * (largest-remainder, payer-id tie-break), self-portions drop out, and
 * settlements accrue in the opposite direction. Pure and deterministic.
 *
 * Invariant (tested): for every member, incoming − outgoing over the ledger
 * equals their net (paid − share + settlements sent − received).
 */

export interface MoneyParty {
  memberId: string;
  amountMinor: number;
}

export interface PairwiseExpense {
  payers: ReadonlyArray<MoneyParty>;
  splits: ReadonlyArray<MoneyParty>;
}

export interface PairwiseSettlement {
  fromMemberId: string;
  toMemberId: string;
  amountMinor: number;
}

/** Gross debts keyed `debtorId|creditorId` (parallel entries both ways). */
export type DebtLedger = Map<string, number>;

function addDebt(ledger: DebtLedger, debtor: string, creditor: string, amountMinor: number): void {
  if (amountMinor === 0 || debtor === creditor) return;
  const key = `${debtor}|${creditor}`;
  ledger.set(key, (ledger.get(key) ?? 0) + amountMinor);
}

/**
 * Allocate one expense as an integer matrix D[participant][payer] whose row
 * sums equal the shares and column sums equal the paid amounts — proportional
 * first (largest remainder per row), then a paise-level column repair so each
 * payer's credited total is exact. Exact columns are what make ledger nets
 * agree with the authoritative paid − share nets.
 */
function allocateExpense(expense: PairwiseExpense, totalPaid: number): number[][] {
  const payers = expense.payers;
  const splits = expense.splits;
  const matrix: number[][] = splits.map(() => payers.map(() => 0));

  // Rows: proportional with largest remainder → row sums are exact.
  splits.forEach((split, rowIndex) => {
    const ideals = payers.map((payer, columnIndex) => ({
      columnIndex,
      memberId: payer.memberId,
      ideal: (split.amountMinor * payer.amountMinor) / totalPaid,
    }));
    let assigned = 0;
    const row = matrix[rowIndex];
    if (!row) return;
    for (const { columnIndex, ideal } of ideals) {
      const floor = Math.floor(ideal);
      row[columnIndex] = floor;
      assigned += floor;
    }
    let remainder = split.amountMinor - assigned;
    const order = [...ideals].sort((a, b) => {
      const fractionDiff = b.ideal - Math.floor(b.ideal) - (a.ideal - Math.floor(a.ideal));
      if (Math.abs(fractionDiff) > Number.EPSILON) return fractionDiff > 0 ? 1 : -1;
      return a.memberId < b.memberId ? -1 : a.memberId > b.memberId ? 1 : 0;
    });
    for (const { columnIndex } of order) {
      if (remainder <= 0) break;
      row[columnIndex] = (row[columnIndex] ?? 0) + 1;
      remainder -= 1;
    }
  });

  // Columns: repair ±paise drift by moving single paise within rows.
  const columnDiff = payers.map(
    (payer, columnIndex) =>
      matrix.reduce((sum, row) => sum + (row[columnIndex] ?? 0), 0) - payer.amountMinor,
  );
  for (let over = 0; over < payers.length; over += 1) {
    while ((columnDiff[over] ?? 0) > 0) {
      const under = columnDiff.findIndex((diff) => diff < 0);
      if (under === -1) break;
      const rowIndex = matrix.findIndex((row) => (row[over] ?? 0) > 0);
      const row = rowIndex === -1 ? undefined : matrix[rowIndex];
      if (!row) break;
      row[over] = (row[over] ?? 0) - 1;
      row[under] = (row[under] ?? 0) + 1;
      columnDiff[over] = (columnDiff[over] ?? 0) - 1;
      columnDiff[under] = (columnDiff[under] ?? 0) + 1;
    }
  }

  return matrix;
}

/** Build the gross debt ledger for a group's expenses and settlements. */
export function buildDebtLedger(
  expenses: ReadonlyArray<PairwiseExpense>,
  settlements: ReadonlyArray<PairwiseSettlement>,
): DebtLedger {
  const ledger: DebtLedger = new Map();

  for (const expense of expenses) {
    const totalPaid = sumMinor(expense.payers.map((payer) => payer.amountMinor));
    if (totalPaid <= 0) continue;
    const matrix = allocateExpense(expense, totalPaid);
    expense.splits.forEach((split, rowIndex) => {
      expense.payers.forEach((payer, columnIndex) => {
        addDebt(ledger, split.memberId, payer.memberId, matrix[rowIndex]?.[columnIndex] ?? 0);
      });
    });
  }

  // Paying someone back accrues an opposite-direction obligation that nets
  // against the original debt.
  for (const settlement of settlements) {
    addDebt(ledger, settlement.toMemberId, settlement.fromMemberId, settlement.amountMinor);
  }

  return ledger;
}

/** Net between two members: positive → `other` owes `me`. */
export function pairNet(ledger: DebtLedger, me: string, other: string): number {
  return (ledger.get(`${other}|${me}`) ?? 0) - (ledger.get(`${me}|${other}`) ?? 0);
}

/** A member's net implied by the ledger (incoming − outgoing). */
export function ledgerNet(ledger: DebtLedger, memberId: string): number {
  let net = 0;
  for (const [key, amount] of ledger) {
    const separator = key.indexOf("|");
    const debtor = key.slice(0, separator);
    const creditor = key.slice(separator + 1);
    if (creditor === memberId) net += amount;
    if (debtor === memberId) net -= amount;
  }
  return net;
}

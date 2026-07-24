/**
 * Money invariants. All amounts everywhere are integers of minor units
 * (paise). Floats never carry money; these helpers enforce that at the
 * boundaries of every money computation.
 */

/** ₹99,99,99,999 in paise — matches the keypad's 9-integer-digit cap. */
export const MAX_AMOUNT_MINOR = 999_999_999 * 100;

export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoneyError";
  }
}

export interface AssertMinorOptions {
  allowZero?: boolean;
  allowNegative?: boolean;
  label?: string;
}

/** Assert a value is a safe integer amount of paise within bounds. */
export function assertMinor(value: number, options: AssertMinorOptions = {}): void {
  const { allowZero = false, allowNegative = false, label = "amount" } = options;
  if (!Number.isSafeInteger(value)) {
    throw new MoneyError(`${label} must be an integer of paise, got ${value}`);
  }
  if (!allowNegative && value < 0) {
    throw new MoneyError(`${label} must not be negative, got ${value}`);
  }
  if (!allowZero && value === 0) {
    throw new MoneyError(`${label} must not be zero`);
  }
  if (Math.abs(value) > MAX_AMOUNT_MINOR) {
    throw new MoneyError(`${label} exceeds the maximum supported amount`);
  }
}

/** Sum paise values with per-item and total safety checks. */
export function sumMinor(values: Iterable<number>, label = "amount"): number {
  let total = 0;
  for (const value of values) {
    if (!Number.isSafeInteger(value)) {
      throw new MoneyError(`${label} must be an integer of paise, got ${value}`);
    }
    total += value;
    if (!Number.isSafeInteger(total)) {
      throw new MoneyError(`${label} sum overflowed the safe integer range`);
    }
  }
  return total;
}

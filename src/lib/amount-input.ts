/**
 * Pure input model for the custom amount keypad. The draft value is a plain
 * digit string with an optional decimal point ("1234.5"); components render it
 * and `amountToMinor` converts it to integer paise at submit time.
 */

export type KeypadKey =
  "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "." | "backspace";

export const MAX_INTEGER_DIGITS = 9; // ₹99,99,99,999 — beyond any group expense
export const MAX_DECIMAL_DIGITS = 2;

/** Apply one keypad press to the current draft, enforcing all input rules. */
export function applyKeypadKey(value: string, key: KeypadKey): string {
  if (key === "backspace") {
    return value.slice(0, -1);
  }

  if (key === ".") {
    if (value.includes(".")) return value;
    if (value === "") return "0.";
    return `${value}.`;
  }

  // digit
  const dotIndex = value.indexOf(".");
  if (dotIndex === -1) {
    if (value === "0") return key; // no leading zeros
    if (value.length >= MAX_INTEGER_DIGITS) return value;
    return `${value}${key}`;
  }
  const decimals = value.length - dotIndex - 1;
  if (decimals >= MAX_DECIMAL_DIGITS) return value;
  return `${value}${key}`;
}

/** Convert a draft string to integer paise. Empty/partial drafts are safe. */
export function amountToMinor(value: string): number {
  if (value === "" || value === ".") return 0;
  const [intPart = "", decPart = ""] = value.split(".");
  const rupees = intPart === "" ? 0 : Number.parseInt(intPart, 10);
  const paise = Number.parseInt(
    decPart.padEnd(MAX_DECIMAL_DIGITS, "0").slice(0, MAX_DECIMAL_DIGITS) || "0",
    10,
  );
  if (!Number.isSafeInteger(rupees) || !Number.isSafeInteger(paise)) return 0;
  return rupees * 100 + paise;
}

/** Convert integer paise back to a draft string (for editing an expense). */
export function minorToAmount(minor: number): string {
  if (!Number.isSafeInteger(minor) || minor <= 0) return "";
  const rupees = Math.trunc(minor / 100);
  const paise = minor % 100;
  return paise === 0 ? String(rupees) : `${rupees}.${String(paise).padStart(2, "0")}`;
}

/** A draft is submittable when it represents a positive amount. */
export function isValidAmount(value: string): boolean {
  return amountToMinor(value) > 0;
}

/**
 * Sanitize free typing (OS keyboard) into a valid decimal draft: digits and
 * one dot, capped integer/decimal digits. Keeps a trailing dot while typing.
 */
export function sanitizeDecimalInput(
  raw: string,
  maxIntDigits: number,
  maxDecimals: number,
): string {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const dotIndex = cleaned.indexOf(".");
  if (dotIndex === -1) {
    return cleaned.replace(/^0+(?=\d)/, "").slice(0, maxIntDigits);
  }
  const intPart = cleaned
    .slice(0, dotIndex)
    .replace(/^0+(?=\d)/, "")
    .slice(0, maxIntDigits);
  const decPart = cleaned
    .slice(dotIndex + 1)
    .replace(/\./g, "")
    .slice(0, maxDecimals);
  return `${intPart === "" ? "0" : intPart}.${decPart}`;
}

/** Rupee-amount variant of sanitizeDecimalInput. */
export function sanitizeAmountInput(raw: string): string {
  return sanitizeDecimalInput(raw, MAX_INTEGER_DIGITS, MAX_DECIMAL_DIGITS);
}

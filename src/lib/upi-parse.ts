/**
 * Parse the text of a UPI payment share/receipt or a bank debit-credit SMS into
 * a prefilled entry. Pure and dependency-free so it's unit-testable and safe on
 * both server (share-target URL) and client (clipboard paste).
 */

export interface ParsedUpiText {
  /** Whole paise, or null when no amount was found. */
  amountMinor: number | null;
  /** Best-effort payee/payer name for the description ("" when unknown). */
  description: string;
  /** True when the text reads as money received (credit). */
  isIncome: boolean;
  /** True when an amount was recognised — the signal the parse is usable. */
  matched: boolean;
}

const AMOUNT_RE = /(?:₹|\brs\.?|\binr\.?)\s*([\d,]+(?:\.\d{1,2})?)/i;
const CREDIT_RE = /\b(?:received|credited|credit of)\b/i;
const TO_RE = /\b(?:to|towards|at)[:\s]+([A-Za-z][A-Za-z0-9 @._&'-]{1,50})/i;
const FROM_RE = /\bfrom[:\s]+([A-Za-z][A-Za-z0-9 @._&'-]{1,50})/i;

/** Trim a captured name at common SMS boilerplate and tidy it up. */
function cleanName(raw: string): string {
  let name = raw;
  // Cut at the usual trailing clauses banks append.
  const cutAt = /\s+(?:on|via|using|upi|ref|refno|txn|a\/c|ac|info|not you|call|sms|avl|bal)\b|[(\n\r.]/i.exec(
    name,
  );
  if (cutAt) name = name.slice(0, cutAt.index);
  // A VPA like zomato@paytm → "zomato".
  const at = name.indexOf("@");
  if (at > 0) name = name.slice(0, at);
  name = name.replace(/[_.]/g, " ").replace(/\s{2,}/g, " ").trim();
  if (name.length < 2) return "";
  // Title-case single-case text (SHOUTY bank SMS, lowercase VPAs); keep mixed case.
  if (name === name.toUpperCase() || name === name.toLowerCase()) {
    name = name
      .toLowerCase()
      .split(" ")
      .map((word) => (word ? word[0]!.toUpperCase() + word.slice(1) : word))
      .join(" ");
  }
  return name.slice(0, 60);
}

/** Parse a shared receipt / bank SMS. Returns matched:false for unrelated text. */
export function parseUpiText(text: string | null | undefined): ParsedUpiText {
  const source = (text ?? "").trim();
  if (source === "") {
    return { amountMinor: null, description: "", isIncome: false, matched: false };
  }

  const amountMatch = AMOUNT_RE.exec(source);
  const amountMinor = amountMatch
    ? Math.round(Number.parseFloat(amountMatch[1]!.replace(/,/g, "")) * 100)
    : null;

  const isIncome = CREDIT_RE.test(source);
  const nameMatch = isIncome ? (FROM_RE.exec(source) ?? TO_RE.exec(source)) : TO_RE.exec(source);
  const description = nameMatch ? cleanName(nameMatch[1]!) : "";

  return {
    amountMinor: amountMinor !== null && amountMinor > 0 ? amountMinor : null,
    description,
    isIncome,
    matched: amountMinor !== null && amountMinor > 0,
  };
}

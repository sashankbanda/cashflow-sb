/**
 * Bank-statement CSV parser: turns exported statements (HDFC/SBI/ICICI-style
 * or any generic CSV) into candidate entries. Pure and dependency-free so the
 * preview runs client-side and the whole thing is unit-testable.
 *
 * Handles the two common shapes:
 * - separate Withdrawal/Deposit (or Debit/Credit) columns
 * - one signed Amount column (negative or "(…)" = money out)
 */

export interface StatementRow {
  /** ISO day (YYYY-MM-DD). */
  date: string;
  description: string;
  /** Whole paise, always positive; direction lives in isIncome. */
  amountMinor: number;
  isIncome: boolean;
}

export interface StatementParseResult {
  rows: StatementRow[];
  /** Lines that looked like data but couldn't be read. */
  skipped: number;
}

const MAX_ROWS = 1000;

/** Split one CSV line, honouring double-quoted fields with embedded commas. */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]!;
    if (quoted) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields.map((field) => field.trim());
}

const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

/** Read the common Indian statement date formats into an ISO day, or null. */
export function parseStatementDate(raw: string): string | null {
  const value = raw.trim();
  // 2026-08-06 (already ISO)
  let match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  // 06/08/2026 · 06-08-2026 · 06/08/26 (day first — Indian bank convention)
  match = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/.exec(value);
  if (match) {
    const day = match[1]!.padStart(2, "0");
    const month = match[2]!.padStart(2, "0");
    const year = match[3]!.length === 2 ? `20${match[3]}` : match[3]!;
    if (Number(month) > 12) return null;
    return `${year}-${month}-${day}`;
  }
  // 06 Aug 2026 · 06-Aug-26 · 6 August 2026
  match = /^(\d{1,2})[ /-]([A-Za-z]{3,9})[ /-](\d{2,4})$/.exec(value);
  if (match) {
    const month = MONTHS[match[2]!.slice(0, 3).toLowerCase()];
    if (!month) return null;
    const day = match[1]!.padStart(2, "0");
    const year = match[3]!.length === 2 ? `20${match[3]}` : match[3]!;
    return `${year}-${month}-${day}`;
  }
  return null;
}

/** "1,234.56", "₹1234", "(500)" → whole paise (negative for parentheses). */
export function parseStatementAmount(raw: string): number | null {
  let value = raw.trim();
  if (value === "" || value === "-") return null;
  let negative = false;
  if (/^\(.*\)$/.test(value)) {
    negative = true;
    value = value.slice(1, -1);
  }
  if (value.startsWith("-")) {
    negative = true;
    value = value.slice(1);
  }
  value = value.replace(/[₹\s]/g, "").replace(/(cr|dr)\.?$/i, "").replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return null;
  const minor = Math.round(Number.parseFloat(value) * 100);
  if (!Number.isSafeInteger(minor)) return null;
  return negative ? -minor : minor;
}

interface ColumnMap {
  date: number;
  description: number;
  debit: number | null;
  credit: number | null;
  amount: number | null;
}

function mapColumns(headers: string[]): ColumnMap | null {
  const find = (pattern: RegExp) => {
    const index = headers.findIndex((header) => pattern.test(header));
    return index === -1 ? null : index;
  };
  const date = find(/\bdate\b/i) ?? find(/date/i);
  const description = find(/narration|description|particulars|details|remarks|transaction/i);
  const debit = find(/withdrawal|debit|\bdr\b/i);
  const credit = find(/deposit|credit|\bcr\b/i);
  const amount = find(/^amount|amount\s*\(|\bamount\b/i);
  if (date === null || description === null) return null;
  if (debit === null && credit === null && amount === null) return null;
  return { date, description, debit, credit, amount };
}

const LINE_DATE_RE =
  /^(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}[ /-][A-Za-z]{3,9}[ /-]\d{2,4})\b/;

/**
 * Parse free-form statement text (one transaction per line — the shape a PDF
 * statement collapses to). A line is `date … description … [amount] balance`;
 * direction comes from the running balance (it went up = money in), falling
 * back to a trailing Cr/Dr marker, else defaults to a spend.
 */
export function parseStatementLines(lines: ReadonlyArray<string>): StatementParseResult {
  const rows: StatementRow[] = [];
  let skipped = 0;
  let previousBalance: number | null = null;

  for (const raw of lines) {
    if (rows.length >= MAX_ROWS) break;
    const line = raw.trim();
    const dateMatch = LINE_DATE_RE.exec(line);
    if (!dateMatch) continue; // header/footer noise, not a transaction line
    const date = parseStatementDate(dateMatch[1]!);
    if (!date) {
      skipped += 1;
      continue;
    }

    // Collect trailing numeric tokens (amount column(s) + running balance),
    // tolerating a Cr/Dr marker between or after them.
    const tokens = line.slice(dateMatch[0].length).trim().split(/\s+/);
    const numbers: number[] = [];
    let marker: "cr" | "dr" | null = null;
    let cut = tokens.length;
    for (let i = tokens.length - 1; i >= 0 && numbers.length < 3; i -= 1) {
      const token = tokens[i]!;
      if (/^(cr|dr)\.?$/i.test(token)) {
        marker = token.slice(0, 2).toLowerCase() as "cr" | "dr";
        cut = i;
        continue;
      }
      const value = parseStatementAmount(token);
      if (value === null) break;
      numbers.unshift(value);
      cut = i;
    }
    if (numbers.length === 0) {
      skipped += 1;
      continue;
    }

    const description =
      tokens.slice(0, cut).join(" ").replace(/\s{2,}/g, " ").trim().slice(0, 80) ||
      "Imported entry";

    // One number = the amount. Two+ = […, amount, balance].
    const balance = numbers.length >= 2 ? numbers[numbers.length - 1]! : null;
    let amountMinor =
      numbers.length >= 2 ? Math.abs(numbers[numbers.length - 2]!) : Math.abs(numbers[0]!);
    let isIncome = false;
    if (balance !== null && previousBalance !== null) {
      const delta = balance - previousBalance;
      isIncome = delta > 0;
      // Three numbers = withdrawal + deposit + balance; the delta says which.
      if (numbers.length >= 3 && Math.abs(delta) > 0) amountMinor = Math.abs(delta);
    } else if (marker) {
      isIncome = marker === "cr";
    } else if (numbers.length === 1 && numbers[0]! < 0) {
      isIncome = false;
    }
    if (balance !== null) previousBalance = balance;

    if (amountMinor <= 0) {
      skipped += 1;
      continue;
    }
    rows.push({ date, description, amountMinor, isIncome });
  }

  return { rows, skipped };
}

/** Parse a whole statement CSV. Returns matched rows plus a skipped count. */
export function parseStatementCsv(text: string): StatementParseResult {
  const lines = (text ?? "").split(/\r?\n/).filter((line) => line.trim() !== "");
  // The header row isn't always first — banks love preamble. Find the first
  // line that maps to usable columns.
  let columns: ColumnMap | null = null;
  let headerIndex = -1;
  for (let i = 0; i < Math.min(lines.length, 25); i += 1) {
    columns = mapColumns(splitCsvLine(lines[i]!));
    if (columns) {
      headerIndex = i;
      break;
    }
  }
  if (!columns || headerIndex === -1) return { rows: [], skipped: 0 };

  const rows: StatementRow[] = [];
  let skipped = 0;
  for (const line of lines.slice(headerIndex + 1)) {
    if (rows.length >= MAX_ROWS) break;
    const fields = splitCsvLine(line);
    const date = parseStatementDate(fields[columns.date] ?? "");
    if (!date) {
      skipped += 1;
      continue;
    }
    const description =
      (fields[columns.description] ?? "").replace(/\s{2,}/g, " ").trim().slice(0, 80) ||
      "Imported entry";

    let amountMinor: number | null = null;
    let isIncome = false;
    const debitRaw = columns.debit !== null ? (fields[columns.debit] ?? "") : "";
    const creditRaw = columns.credit !== null ? (fields[columns.credit] ?? "") : "";
    const debit = parseStatementAmount(debitRaw);
    const credit = parseStatementAmount(creditRaw);
    if (debit !== null && debit > 0) {
      amountMinor = debit;
    } else if (credit !== null && credit > 0) {
      amountMinor = credit;
      isIncome = true;
    } else if (columns.amount !== null) {
      const signed = parseStatementAmount(fields[columns.amount] ?? "");
      if (signed !== null && signed !== 0) {
        amountMinor = Math.abs(signed);
        isIncome = signed > 0;
      }
    }
    if (amountMinor === null || amountMinor <= 0) {
      skipped += 1;
      continue;
    }
    rows.push({ date, description, amountMinor, isIncome });
  }
  return { rows, skipped };
}

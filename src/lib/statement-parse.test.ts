import { describe, expect, it } from "vitest";
import {
  parseStatementAmount,
  parseStatementCsv,
  parseStatementDate,
  parseStatementLines,
} from "./statement-parse";

describe("parseStatementDate", () => {
  it("reads the common Indian formats", () => {
    expect(parseStatementDate("06/08/2026")).toBe("2026-08-06");
    expect(parseStatementDate("6-8-26")).toBe("2026-08-06");
    expect(parseStatementDate("2026-08-06")).toBe("2026-08-06");
    expect(parseStatementDate("06 Aug 2026")).toBe("2026-08-06");
    expect(parseStatementDate("6-Aug-26")).toBe("2026-08-06");
  });

  it("rejects non-dates", () => {
    expect(parseStatementDate("Opening Balance")).toBeNull();
    expect(parseStatementDate("06/13/2026")).toBeNull();
    expect(parseStatementDate("")).toBeNull();
  });
});

describe("parseStatementAmount", () => {
  it("reads separators, symbols and negatives", () => {
    expect(parseStatementAmount("1,234.56")).toBe(123456);
    expect(parseStatementAmount("₹ 500")).toBe(50000);
    expect(parseStatementAmount("(250.00)")).toBe(-25000);
    expect(parseStatementAmount("-99")).toBe(-9900);
    expect(parseStatementAmount("120.5 Cr")).toBe(12050);
  });

  it("rejects blanks and junk", () => {
    expect(parseStatementAmount("")).toBeNull();
    expect(parseStatementAmount("-")).toBeNull();
    expect(parseStatementAmount("abc")).toBeNull();
  });
});

describe("parseStatementCsv", () => {
  it("parses a bank-style CSV with withdrawal/deposit columns and preamble", () => {
    const csv = [
      "HDFC BANK Statement",
      "Account: XX1234,,,",
      "Date,Narration,Withdrawal Amt,Deposit Amt,Closing Balance",
      '06/08/2026,"UPI-SWIGGY-ORDER, BLR",450.00,,"12,000.00"',
      "05/08/2026,SALARY AUG,,50000.00,62450.00",
      "junk line without a date,,,",
    ].join("\n");
    const { rows, skipped } = parseStatementCsv(csv);
    expect(rows).toEqual([
      {
        date: "2026-08-06",
        description: "UPI-SWIGGY-ORDER, BLR",
        amountMinor: 45000,
        isIncome: false,
      },
      { date: "2026-08-05", description: "SALARY AUG", amountMinor: 5000000, isIncome: true },
    ]);
    expect(skipped).toBe(1);
  });

  it("parses a generic signed-amount CSV", () => {
    const csv = [
      "date,description,amount",
      "2026-08-01,Chai,-20",
      "2026-08-02,Refund,120",
      "2026-08-03,Zero row,0",
    ].join("\n");
    const { rows, skipped } = parseStatementCsv(csv);
    expect(rows).toEqual([
      { date: "2026-08-01", description: "Chai", amountMinor: 2000, isIncome: false },
      { date: "2026-08-02", description: "Refund", amountMinor: 12000, isIncome: true },
    ]);
    expect(skipped).toBe(1);
  });

  it("returns nothing for text that isn't a statement", () => {
    expect(parseStatementCsv("hello\nworld").rows).toEqual([]);
    expect(parseStatementCsv("").rows).toEqual([]);
  });
});

describe("parseStatementLines (PDF-style text)", () => {
  it("uses the running balance for direction", () => {
    const { rows } = parseStatementLines([
      "HDFC BANK — Statement of account",
      "01/08/2026 UPI-SWIGGY-ORDER123 450.00 11,550.00",
      "02/08/2026 SALARY AUG 50,000.00 61,550.00",
      "03/08/2026 UPI-CHAI POINT 20.00 61,530.00",
      "Page 1 of 2",
    ]);
    expect(rows).toEqual([
      {
        date: "2026-08-01",
        description: "UPI-SWIGGY-ORDER123",
        amountMinor: 45000,
        isIncome: false,
      },
      { date: "2026-08-02", description: "SALARY AUG", amountMinor: 5000000, isIncome: true },
      { date: "2026-08-03", description: "UPI-CHAI POINT", amountMinor: 2000, isIncome: false },
    ]);
  });

  it("falls back to Cr/Dr markers when there's no balance column", () => {
    const { rows } = parseStatementLines([
      "01-Aug-26 REFUND AMAZON 120.00 Cr",
      "02-Aug-26 ATM WDL 500.00 Dr",
    ]);
    expect(rows[0]).toMatchObject({ amountMinor: 12000, isIncome: true });
    expect(rows[1]).toMatchObject({ amountMinor: 50000, isIncome: false });
  });

  it("ignores non-transaction lines without counting them as skipped", () => {
    const result = parseStatementLines(["Opening Balance 12,000.00", "", "Statement period"]);
    expect(result.rows).toEqual([]);
    expect(result.skipped).toBe(0);
  });
});

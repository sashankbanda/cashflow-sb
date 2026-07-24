import { describe, expect, it } from "vitest";
import { csvDocument, csvField, csvRow, rupeesFromMinor } from "./csv";

describe("csvField", () => {
  it("passes plain values through", () => {
    expect(csvField("Coffee")).toBe("Coffee");
    expect(csvField(42)).toBe("42");
  });

  it("quotes and escapes commas, quotes, and newlines", () => {
    expect(csvField("a,b")).toBe('"a,b"');
    expect(csvField('she said "hi"')).toBe('"she said ""hi"""');
    expect(csvField("line1\nline2")).toBe('"line1\nline2"');
  });
});

describe("csvRow / csvDocument", () => {
  it("joins fields and rows with CRLF", () => {
    expect(csvRow(["a", "b", 1])).toBe("a,b,1");
    const doc = csvDocument(["Date", "Note"], [["2026-07-25", "Lunch, big"]]);
    expect(doc).toContain("Date,Note\r\n");
    expect(doc).toContain('2026-07-25,"Lunch, big"');
    expect(doc.endsWith("\r\n")).toBe(true);
  });

  it("starts with a UTF-8 BOM", () => {
    expect(csvDocument(["x"], []).charCodeAt(0)).toBe(0xfeff);
  });
});

describe("rupeesFromMinor", () => {
  it("formats paise as a plain 2-decimal number string", () => {
    expect(rupeesFromMinor(123456)).toBe("1234.56");
    expect(rupeesFromMinor(5000)).toBe("50.00");
    expect(rupeesFromMinor(7)).toBe("0.07");
    expect(rupeesFromMinor(-2550)).toBe("-25.50");
  });
});

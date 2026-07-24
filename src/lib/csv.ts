/**
 * Minimal, correct CSV building. RFC-4180 escaping, CRLF line endings, and a
 * UTF-8 BOM so Excel/Sheets open ₹ text and Unicode cleanly. Pure + tested.
 */

export type CsvValue = string | number;

/** Byte-order mark that makes Excel read the file as UTF-8. */
export const CSV_BOM = "﻿";

export function csvField(value: CsvValue): string {
  const text = typeof value === "number" ? String(value) : value;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function csvRow(values: ReadonlyArray<CsvValue>): string {
  return values.map(csvField).join(",");
}

/** Full CSV document with BOM + header, CRLF-terminated. */
export function csvDocument(
  headers: ReadonlyArray<string>,
  rows: ReadonlyArray<ReadonlyArray<CsvValue>>,
): string {
  const lines = [csvRow(headers), ...rows.map((row) => csvRow(row))];
  return `${CSV_BOM}${lines.join("\r\n")}\r\n`;
}

/** Integer paise → a plain decimal string (no symbol) so it lands as a number. */
export function rupeesFromMinor(minor: number): string {
  const negative = minor < 0;
  const abs = Math.abs(minor);
  return `${negative ? "-" : ""}${Math.trunc(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

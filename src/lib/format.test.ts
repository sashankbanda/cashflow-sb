import { describe, expect, it } from "vitest";
import { formatMoney, formatNumber, formatPercent } from "./format";

describe("formatMoney", () => {
  it("formats whole rupees with Indian grouping and no paise", () => {
    expect(formatMoney(250000)).toBe("₹2,500");
    expect(formatMoney(25000000)).toBe("₹2,50,000");
  });

  it("shows paise automatically when non-zero", () => {
    expect(formatMoney(12345650)).toBe("₹1,23,456.50");
    expect(formatMoney(101)).toBe("₹1.01");
  });

  it("respects paise mode", () => {
    expect(formatMoney(250000, { paise: "always" })).toBe("₹2,500.00");
    expect(formatMoney(250075, { paise: "never" })).toBe("₹2,500");
  });

  it("signs negatives with a typographic minus", () => {
    expect(formatMoney(-84000)).toBe("−₹840");
    expect(formatMoney(-12345650)).toBe("−₹1,23,456.50");
  });

  it("adds an explicit plus when sign is always", () => {
    expect(formatMoney(84000, { sign: "always" })).toBe("+₹840");
    expect(formatMoney(0, { sign: "always" })).toBe("₹0");
  });

  it("formats compact Indian notation", () => {
    expect(formatMoney(12000000, { compact: true })).toBe("₹1.2L");
    expect(formatMoney(250000000, { compact: true })).toBe("₹25L");
    expect(formatMoney(1500000000, { compact: true })).toBe("₹1.5Cr");
    expect(formatMoney(120000, { compact: true })).toBe("₹1.2K");
    expect(formatMoney(85000, { compact: true })).toBe("₹850");
    expect(formatMoney(-12000000, { compact: true })).toBe("−₹1.2L");
  });

  it("formats zero", () => {
    expect(formatMoney(0)).toBe("₹0");
  });

  it("rejects non-integer amounts", () => {
    expect(() => formatMoney(10.5)).toThrow(TypeError);
    expect(() => formatMoney(Number.NaN)).toThrow(TypeError);
    expect(() => formatMoney(Number.MAX_SAFE_INTEGER + 1)).toThrow(TypeError);
  });
});

describe("formatNumber", () => {
  it("groups with en-IN rules", () => {
    expect(formatNumber(1234567)).toBe("12,34,567");
  });
});

describe("formatPercent", () => {
  it("formats fractions as percentages", () => {
    expect(formatPercent(0.325)).toBe("33%");
    expect(formatPercent(0.325, 1)).toBe("32.5%");
  });
});

import { describe, expect, it } from "vitest";
import { assertMinor, MAX_AMOUNT_MINOR, MoneyError, sumMinor } from "./money";

describe("assertMinor", () => {
  it("accepts positive integer paise", () => {
    expect(() => assertMinor(1)).not.toThrow();
    expect(() => assertMinor(MAX_AMOUNT_MINOR)).not.toThrow();
  });

  it("rejects floats, NaN, and unsafe integers", () => {
    expect(() => assertMinor(10.5)).toThrow(MoneyError);
    expect(() => assertMinor(Number.NaN)).toThrow(MoneyError);
    expect(() => assertMinor(Number.MAX_SAFE_INTEGER + 1)).toThrow(MoneyError);
  });

  it("rejects zero and negatives by default, allows via options", () => {
    expect(() => assertMinor(0)).toThrow(MoneyError);
    expect(() => assertMinor(-100)).toThrow(MoneyError);
    expect(() => assertMinor(0, { allowZero: true })).not.toThrow();
    expect(() => assertMinor(-100, { allowNegative: true })).not.toThrow();
  });

  it("rejects amounts beyond the supported maximum", () => {
    expect(() => assertMinor(MAX_AMOUNT_MINOR + 1)).toThrow(MoneyError);
  });
});

describe("sumMinor", () => {
  it("sums integer paise", () => {
    expect(sumMinor([100, 250, 50])).toBe(400);
    expect(sumMinor([])).toBe(0);
  });

  it("rejects non-integer members", () => {
    expect(() => sumMinor([100, 0.5])).toThrow(MoneyError);
  });

  it("rejects overflowing totals", () => {
    expect(() => sumMinor([Number.MAX_SAFE_INTEGER, 1])).toThrow(MoneyError);
  });
});

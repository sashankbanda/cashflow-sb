import { describe, expect, it } from "vitest";
import {
  amountToMinor,
  applyKeypadKey,
  isValidAmount,
  minorToAmount,
  sanitizeAmountInput,
  sanitizeDecimalInput,
  type KeypadKey,
} from "./amount-input";

function type(sequence: string): string {
  let value = "";
  for (const char of sequence) {
    value = applyKeypadKey(value, char as KeypadKey);
  }
  return value;
}

describe("applyKeypadKey", () => {
  it("builds plain amounts", () => {
    expect(type("2500")).toBe("2500");
  });

  it("replaces a lone leading zero", () => {
    expect(type("07")).toBe("7");
  });

  it("starts decimals with 0.", () => {
    expect(type(".5")).toBe("0.5");
  });

  it("ignores a second decimal point", () => {
    expect(type("12.3.4")).toBe("12.34");
  });

  it("caps decimals at two digits", () => {
    expect(type("1.999")).toBe("1.99");
  });

  it("caps integer digits at nine", () => {
    expect(type("12345678901")).toBe("123456789");
  });

  it("backspaces", () => {
    expect(applyKeypadKey("123", "backspace")).toBe("12");
    expect(applyKeypadKey("", "backspace")).toBe("");
  });
});

describe("amountToMinor", () => {
  it("converts rupees and paise", () => {
    expect(amountToMinor("2500")).toBe(250000);
    expect(amountToMinor("2500.5")).toBe(250050);
    expect(amountToMinor("2500.55")).toBe(250055);
  });

  it("handles empty and partial drafts", () => {
    expect(amountToMinor("")).toBe(0);
    expect(amountToMinor(".")).toBe(0);
    expect(amountToMinor("0.")).toBe(0);
    expect(amountToMinor("12.")).toBe(1200);
  });
});

describe("minorToAmount", () => {
  it("round-trips", () => {
    expect(minorToAmount(250000)).toBe("2500");
    expect(minorToAmount(250050)).toBe("2500.50");
    expect(minorToAmount(101)).toBe("1.01");
    expect(minorToAmount(0)).toBe("");
  });
});

describe("isValidAmount", () => {
  it("requires a positive amount", () => {
    expect(isValidAmount("")).toBe(false);
    expect(isValidAmount("0")).toBe(false);
    expect(isValidAmount("0.00")).toBe(false);
    expect(isValidAmount("0.01")).toBe(true);
  });
});

describe("sanitizeDecimalInput / sanitizeAmountInput", () => {
  it("strips non-numeric characters", () => {
    expect(sanitizeAmountInput("₹1,2a50")).toBe("1250");
  });

  it("keeps a single dot and a trailing dot while typing", () => {
    expect(sanitizeAmountInput("12.")).toBe("12.");
    expect(sanitizeAmountInput("12.3.4")).toBe("12.34");
  });

  it("caps decimals and integer digits", () => {
    expect(sanitizeAmountInput("1.999")).toBe("1.99");
    expect(sanitizeAmountInput("12345678901")).toBe("123456789");
    expect(sanitizeDecimalInput("123.456", 3, 2)).toBe("123.45");
  });

  it("normalizes leading zeros and bare dots", () => {
    expect(sanitizeAmountInput("007")).toBe("7");
    expect(sanitizeAmountInput(".5")).toBe("0.5");
  });
});

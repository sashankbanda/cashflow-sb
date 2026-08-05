import { describe, expect, it } from "vitest";
import { parseUpiText } from "./upi-parse";

describe("parseUpiText", () => {
  it("parses a GPay-style share text", () => {
    const parsed = parseUpiText("You paid ₹450.00 to Zomato using Google Pay. UPI ref 1234.");
    expect(parsed.matched).toBe(true);
    expect(parsed.amountMinor).toBe(45000);
    expect(parsed.description).toBe("Zomato");
    expect(parsed.isIncome).toBe(false);
  });

  it("parses a bank debit SMS with Rs. and a VPA", () => {
    const parsed = parseUpiText(
      "Rs.1,250.50 debited from A/c XX1234 to swiggy@ybl on 04-08-26. Not you? Call 1800...",
    );
    expect(parsed.matched).toBe(true);
    expect(parsed.amountMinor).toBe(125050);
    expect(parsed.description).toBe("Swiggy");
    expect(parsed.isIncome).toBe(false);
  });

  it("parses a PhonePe-style payment line", () => {
    const parsed = parseUpiText("Paid ₹89 to CHAI POINT via PhonePe");
    expect(parsed.amountMinor).toBe(8900);
    expect(parsed.description).toBe("Chai Point");
    expect(parsed.isIncome).toBe(false);
  });

  it("detects money received as income", () => {
    const parsed = parseUpiText("INR 5,000.00 credited to A/c XX1234 from RAHUL SHARMA on 03-08");
    expect(parsed.matched).toBe(true);
    expect(parsed.amountMinor).toBe(500000);
    expect(parsed.description).toBe("Rahul Sharma");
    expect(parsed.isIncome).toBe(true);
  });

  it("still matches when only an amount is present", () => {
    const parsed = parseUpiText("₹120 payment successful");
    expect(parsed.matched).toBe(true);
    expect(parsed.amountMinor).toBe(12000);
    expect(parsed.description).toBe("");
  });

  it("rejects unrelated text and empty input", () => {
    expect(parseUpiText("hello, lunch tomorrow?").matched).toBe(false);
    expect(parseUpiText("").matched).toBe(false);
    expect(parseUpiText(null).matched).toBe(false);
  });
});

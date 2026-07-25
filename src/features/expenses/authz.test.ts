import { describe, expect, it } from "vitest";
import { canModifyExpense } from "./authz";

describe("canModifyExpense", () => {
  it("allows the creator, a payer, or the group owner", () => {
    expect(canModifyExpense({ isCreator: true, isPayer: false, isOwner: false })).toBe(true);
    expect(canModifyExpense({ isCreator: false, isPayer: true, isOwner: false })).toBe(true);
    expect(canModifyExpense({ isCreator: false, isPayer: false, isOwner: true })).toBe(true);
  });

  it("DENIES a plain participant / non-member (the negative case)", () => {
    expect(canModifyExpense({ isCreator: false, isPayer: false, isOwner: false })).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import {
  attachmentStorageKey,
  isAllowedMime,
  MAX_ATTACHMENT_BYTES,
  validateAttachment,
} from "./attachments";

describe("isAllowedMime", () => {
  it("accepts jpeg/png/webp and rejects others", () => {
    expect(isAllowedMime("image/jpeg")).toBe(true);
    expect(isAllowedMime("image/png")).toBe(true);
    expect(isAllowedMime("image/webp")).toBe(true);
    expect(isAllowedMime("image/gif")).toBe(false);
    expect(isAllowedMime("application/pdf")).toBe(false);
  });
});

describe("validateAttachment", () => {
  it("passes a valid small jpeg", () => {
    expect(validateAttachment({ mime: "image/jpeg", sizeBytes: 100_000 })).toEqual({ ok: true });
  });

  it("rejects disallowed types", () => {
    expect(validateAttachment({ mime: "image/gif", sizeBytes: 100 }).ok).toBe(false);
  });

  it("rejects empty and oversize files", () => {
    expect(validateAttachment({ mime: "image/png", sizeBytes: 0 }).ok).toBe(false);
    expect(validateAttachment({ mime: "image/png", sizeBytes: MAX_ATTACHMENT_BYTES + 1 }).ok).toBe(
      false,
    );
  });
});

describe("attachmentStorageKey", () => {
  it("namespaces by expense with a typed suffix", () => {
    expect(attachmentStorageKey("exp1", "att9", "image/webp")).toBe("receipts/exp1/att9.webp");
    expect(attachmentStorageKey("exp1", "att9", "image/jpeg")).toBe("receipts/exp1/att9.jpg");
  });
});

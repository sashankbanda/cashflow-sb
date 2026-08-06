import "server-only";
import { createHash } from "node:crypto";

/**
 * sha256 of the given parts, formatted as a UUID — a stable idempotency key,
 * so replays of the same source data can never double-book an entry.
 */
export function deterministicUuid(...parts: string[]): string {
  const hex = createHash("sha256").update(parts.join("\n")).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

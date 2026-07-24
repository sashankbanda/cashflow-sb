import { uuidv7 } from "uuidv7";

/**
 * Time-ordered UUIDv7 primary keys: index-friendly inserts and usable as
 * stable pagination cursors (lexicographic order = creation order).
 */
export function newId(): string {
  return uuidv7();
}

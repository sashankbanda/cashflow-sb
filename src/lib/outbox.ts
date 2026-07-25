import { openDB, type IDBPDatabase } from "idb";
import { ordered, type OutboxExpense } from "./outbox-model";

/**
 * IndexedDB-backed offline outbox for add-expense. Client-only. Browsers
 * without IndexedDB degrade to a no-op (queue always empty), so the app still
 * works — it just can't defer writes.
 */

const DB_NAME = "cashflow-outbox";
const STORE = "expenses";
const OUTBOX_EVENT = "cashflow:outbox-changed";

function available(): boolean {
  return typeof indexedDB !== "undefined";
}

let dbPromise: Promise<IDBPDatabase> | null = null;
function db(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(STORE)) {
          database.createObjectStore(STORE, { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

function announce(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(OUTBOX_EVENT));
}

export const OUTBOX_CHANGED = OUTBOX_EVENT;

export async function enqueueExpense(item: Omit<OutboxExpense, "createdAt">): Promise<void> {
  if (!available()) return;
  // Stamp the time here (outside React render) so callers stay pure.
  await (await db()).put(STORE, { ...item, createdAt: Date.now() });
  announce();
}

export async function listQueued(): Promise<OutboxExpense[]> {
  if (!available()) return [];
  const items = (await (await db()).getAll(STORE)) as OutboxExpense[];
  return ordered(items);
}

export async function removeQueued(id: string): Promise<void> {
  if (!available()) return;
  await (await db()).delete(STORE, id);
  announce();
}

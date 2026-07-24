/**
 * Pure model for the offline add-expense outbox. The IndexedDB layer
 * (lib/outbox.ts) is a thin wrapper; all the queue logic lives here so it's
 * unit-testable. Items are keyed by their idempotency key, so a replay after
 * reconnect can never create a duplicate expense.
 */

export interface OutboxExpense {
  /** Idempotency key — also the IndexedDB primary key. */
  id: string;
  createdAt: number;
  attempts: number;
  payload: {
    description: string;
    amountMinor: number;
    categoryId: string;
    expenseDate: string;
    tagIds: string[];
    /** Denormalized for optimistic "pending" rendering while offline. */
    categoryName: string;
    categoryIcon: string;
    categoryGradient: string;
  };
}

/** Insert or replace by id (idempotency key). */
export function upsert(items: ReadonlyArray<OutboxExpense>, item: OutboxExpense): OutboxExpense[] {
  const without = items.filter((existing) => existing.id !== item.id);
  return [...without, item];
}

export function remove(items: ReadonlyArray<OutboxExpense>, id: string): OutboxExpense[] {
  return items.filter((item) => item.id !== id);
}

export function bumpAttempt(items: ReadonlyArray<OutboxExpense>, id: string): OutboxExpense[] {
  return items.map((item) => (item.id === id ? { ...item, attempts: item.attempts + 1 } : item));
}

/** Oldest first — the order we replay in. */
export function ordered(items: ReadonlyArray<OutboxExpense>): OutboxExpense[] {
  return [...items].sort((a, b) => a.createdAt - b.createdAt);
}

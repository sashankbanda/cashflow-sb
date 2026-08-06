import "server-only";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { deterministicUuid } from "@/server/hash-id";
import { sendPushToUsers } from "@/server/push";
import type { ActionUser } from "@/server/action-core";
import { resolveCategoryId } from "@/features/expenses/categorize";
import {
  createPersonalExpense,
  createSplitExpense,
  findDuplicateEntry,
} from "@/features/expenses/service";
import { formatMoney } from "@/lib/format";
import { parseUpiText } from "@/lib/upi-parse";

/** Read the user's webhook token (null until generated). */
export async function getCaptureToken(userId: string): Promise<string | null> {
  const row = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { captureToken: true },
  });
  return row?.captureToken ?? null;
}

/** Mint (or rotate) the webhook token. */
export async function setCaptureToken(userId: string): Promise<{ token: string }> {
  const token = randomBytes(24).toString("base64url");
  await db.update(users).set({ captureToken: token }).where(eq(users.id, userId));
  return { token };
}

/** Revoke the webhook token — old Shortcuts stop working immediately. */
export async function clearCaptureToken(userId: string): Promise<void> {
  await db.update(users).set({ captureToken: null }).where(eq(users.id, userId));
}

export interface CaptureResult {
  saved: boolean;
  reason?: "bad-token" | "no-amount";
  amountMinor?: number;
  description?: string;
  isIncome?: boolean;
  splitWith?: string[];
}

/**
 * The webhook body: an SMS/receipt text sent by an iOS Shortcut automation (or
 * Tasker etc). Parses the amount/payee, saves a personal entry under a default
 * category, and pushes a "tap to categorize" notification. Idempotent per
 * (user, text), so automation retries can never double-enter.
 */
export async function captureFromText(token: string, text: string): Promise<CaptureResult> {
  const user = await db.query.users.findFirst({ where: eq(users.captureToken, token) });
  if (!user) return { saved: false, reason: "bad-token" };

  const parsed = parseUpiText(text);
  if (!parsed.matched || parsed.amountMinor === null) return { saved: false, reason: "no-amount" };

  const description =
    parsed.description || (parsed.isIncome ? "Money received" : "UPI payment");

  // Merchant memory + kind-matching fallback (shared with statement import).
  const resolved = await resolveCategoryId(user.id, description, parsed.isIncome);
  if (!resolved) return { saved: false, reason: "no-amount" };
  // Today in the user's timezone (en-CA formats as YYYY-MM-DD).
  const expenseDate = new Intl.DateTimeFormat("en-CA", { timeZone: user.timezone }).format(
    new Date(),
  );

  const actor: ActionUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image ?? null,
  };
  // Same amount already logged today through another channel? Save anyway
  // (true retries dedupe by idempotency) but say so in the notification.
  // The key includes the DAY so identical SMS texts on later days (recurring
  // payments with no reference number) still book — same-day retries dedupe.
  const idempotencyKey = deterministicUuid(user.id, expenseDate, text);
  const duplicate = await findDuplicateEntry(user.id, {
    amountMinor: parsed.amountMinor,
    expenseDate,
    isIncome: parsed.isIncome,
    excludeIdempotencyKey: idempotencyKey,
  });

  const wantsSplit = !parsed.isIncome && parsed.splitWith.length > 0;
  if (wantsSplit) {
    // "… split with Rahul, Sandeep" → book the equal split directly.
    await createSplitExpense(actor, {
      description,
      amountMinor: parsed.amountMinor,
      categoryId: resolved.categoryId,
      expenseDate,
      names: parsed.splitWith,
      idempotencyKey,
    });
  } else {
    const result = await createPersonalExpense(actor, {
      description,
      amountMinor: parsed.amountMinor,
      categoryId: resolved.categoryId,
      expenseDate,
      idempotencyKey,
      tagIds: [],
      isIncome: parsed.isIncome,
    });
    if (!result.created) {
      // Same text delivered again today — already booked; don't re-notify.
      return {
        saved: true,
        amountMinor: parsed.amountMinor,
        description,
        isIncome: parsed.isIncome,
        splitWith: parsed.splitWith,
      };
    }
  }

  const duplicateNote = duplicate ? ` · looks like a duplicate of “${duplicate.description}”` : "";
  await sendPushToUsers([user.id], "expense_added", {
    title: parsed.isIncome ? "Income captured" : wantsSplit ? "Split captured" : "Payment captured",
    body: wantsSplit
      ? `${formatMoney(parsed.amountMinor)} · ${description} — split with ${parsed.splitWith.length}${duplicateNote}`
      : `${formatMoney(parsed.amountMinor)} · ${description}${
          resolved.remembered ? " — saved" : " — tap to set a category"
        }${duplicateNote}`,
    url: wantsSplit ? "/groups" : "/expenses",
    tag: `capture-${idempotencyKey}`,
  });

  return {
    saved: true,
    amountMinor: parsed.amountMinor,
    description,
    isIncome: parsed.isIncome,
    splitWith: parsed.splitWith,
  };
}

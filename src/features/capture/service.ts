import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, asc, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { categories, expenses, users } from "@/server/db/schema";
import { sendPushToUsers } from "@/server/push";
import type { ActionUser } from "@/server/action-core";
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

/** Format a sha256 as a UUID so repeated deliveries of the same SMS dedupe. */
function deterministicKey(userId: string, text: string): string {
  const hex = createHash("sha256").update(`${userId}\n${text}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
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

  // Merchant memory: reuse the category this user last gave the same payee —
  // exact name first, then first-word prefix so "SWIGGY*ORDER123" still finds
  // "Swiggy". Falls back to a kind-matching system default.
  const normalized = description.toLowerCase();
  const firstWord = normalized
    .replace(/[^a-z0-9 ]+/g, " ")
    .trim()
    .split(/\s+/)[0] ?? "";
  const rememberedWhere = (match: ReturnType<typeof sql>) =>
    and(
      eq(expenses.createdBy, user.id),
      isNull(expenses.groupId),
      isNull(expenses.deletedAt),
      isNotNull(expenses.categoryId),
      match,
    );
  let [remembered] = await db
    .select({ categoryId: expenses.categoryId })
    .from(expenses)
    .where(rememberedWhere(sql`lower(${expenses.description}) = ${normalized}`))
    .orderBy(desc(expenses.createdAt))
    .limit(1);
  if (!remembered && firstWord.length >= 4) {
    [remembered] = await db
      .select({ categoryId: expenses.categoryId })
      .from(expenses)
      .where(rememberedWhere(sql`lower(${expenses.description}) like ${`${firstWord}%`}`))
      .orderBy(desc(expenses.createdAt))
      .limit(1);
  }

  const fallbackCategory = remembered?.categoryId
    ? { id: remembered.categoryId }
    : ((await db.query.categories.findFirst({
        where: and(
          isNull(categories.userId),
          eq(categories.kind, parsed.isIncome ? "income" : "expense"),
        ),
        orderBy: [asc(categories.name)],
      })) ??
      (await db.query.categories.findFirst({
        where: isNull(categories.userId),
        orderBy: [asc(categories.name)],
      })));
  if (!fallbackCategory) return { saved: false, reason: "no-amount" };
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
  const idempotencyKey = deterministicKey(user.id, text);
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
      categoryId: fallbackCategory.id,
      expenseDate,
      names: parsed.splitWith,
      idempotencyKey,
    });
  } else {
    await createPersonalExpense(actor, {
      description,
      amountMinor: parsed.amountMinor,
      categoryId: fallbackCategory.id,
      expenseDate,
      idempotencyKey,
      tagIds: [],
      isIncome: parsed.isIncome,
    });
  }

  const duplicateNote = duplicate ? ` · looks like a duplicate of “${duplicate.description}”` : "";
  await sendPushToUsers([user.id], "expense_added", {
    title: parsed.isIncome ? "Income captured" : wantsSplit ? "Split captured" : "Payment captured",
    body: wantsSplit
      ? `${formatMoney(parsed.amountMinor)} · ${description} — split with ${parsed.splitWith.length}${duplicateNote}`
      : `${formatMoney(parsed.amountMinor)} · ${description}${
          remembered?.categoryId ? " — saved" : " — tap to set a category"
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

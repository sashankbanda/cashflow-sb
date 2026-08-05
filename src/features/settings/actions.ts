"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { MAX_AMOUNT_MINOR } from "@/lib/money";
import { db } from "@/server/db";
import {
  accounts,
  budgets,
  categories,
  expenses,
  groupMembers,
  notifications,
  pushSubscriptions,
  recurringRules,
  sessions,
  tags,
  users,
} from "@/server/db/schema";
import { authedAction } from "@/server/action";

/** Save (or clear, with "") the user's UPI ID so friends can pay them directly. */
export const updateUpiIdAction = authedAction({
  name: "settings.updateUpiId",
  schema: z.object({
    upiId: z
      .string()
      .trim()
      .max(80)
      .refine((value) => value === "" || /^[\w.-]{2,64}@[a-z]{2,32}$/i.test(value), {
        message: "That doesn't look like a UPI ID (e.g. name@bank).",
      }),
  }),
  handler: async ({ input, ctx }) => {
    await db
      .update(users)
      .set({ upiId: input.upiId === "" ? null : input.upiId })
      .where(eq(users.id, ctx.user.id));
    revalidatePath("/profile");
    return { ok: true };
  },
});

/**
 * Erase me: soft-deletes all personal financial data, unlinks the identity
 * from shared groups (memberships become named ghosts so nobody's balances
 * change), revokes every session, and anonymizes the user row (kept only to
 * satisfy foreign keys on shared expenses). Irreversible.
 */
export const deleteAccountAction = authedAction({
  name: "settings.deleteAccount",
  schema: z.object({ confirm: z.literal("DELETE") }),
  handler: async ({ ctx }) => {
    const userId = ctx.user.id;
    await db.transaction(async (tx) => {
      const now = new Date();
      // Personal financial data.
      await tx
        .update(expenses)
        .set({ deletedAt: now })
        .where(
          and(eq(expenses.createdBy, userId), isNull(expenses.groupId), isNull(expenses.deletedAt)),
        );
      await tx.delete(budgets).where(eq(budgets.userId, userId));
      await tx.update(recurringRules).set({ pausedAt: now }).where(eq(recurringRules.userId, userId));
      const ownTags = await tx
        .select({ id: tags.id })
        .from(tags)
        .where(eq(tags.userId, userId));
      if (ownTags.length > 0) {
        await tx.delete(tags).where(inArray(tags.id, ownTags.map((tag) => tag.id)));
      }
      await tx
        .update(categories)
        .set({ archivedAt: now })
        .where(eq(categories.userId, userId));
      await tx.delete(notifications).where(eq(notifications.userId, userId));
      await tx.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
      // Unlink from shared groups: memberships become named ghosts, so group
      // history and balances stay exact for everyone else.
      await tx.update(groupMembers).set({ userId: null }).where(eq(groupMembers.userId, userId));
      // Revoke access + anonymize the identity row (kept for FKs on shared rows).
      await tx.delete(sessions).where(eq(sessions.userId, userId));
      await tx.delete(accounts).where(eq(accounts.userId, userId));
      await tx
        .update(users)
        .set({
          name: "Deleted user",
          email: `deleted+${userId}@cashflow.invalid`,
          image: null,
          captureToken: null,
          upiId: null,
          openingBalanceMinor: null,
          notificationPrefs: {},
        })
        .where(eq(users.id, userId));
    });
    return { deleted: true };
  },
});

/** Set (or clear, with null) the starting balance the Home hero builds on. */
export const updateOpeningBalanceAction = authedAction({
  name: "settings.updateOpeningBalance",
  schema: z.object({
    amountMinor: z.number().int().min(0).max(MAX_AMOUNT_MINOR).nullable(),
  }),
  handler: async ({ input, ctx }) => {
    await db
      .update(users)
      .set({ openingBalanceMinor: input.amountMinor })
      .where(eq(users.id, ctx.user.id));
    revalidatePath("/profile");
    revalidatePath("/home");
    return { ok: true };
  },
});

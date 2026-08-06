import "server-only";
import { and, eq, gte, notLike, sql } from "drizzle-orm";
import { newId } from "@/lib/ids";
import { formatMoney } from "@/lib/format";
import { db } from "@/server/db";
import { groupMembers, notifications, users } from "@/server/db/schema";
import { sendPushToUser } from "@/server/push";
import { getFriendBalances } from "@/features/balances/queries";

/** Below this a weekly nudge is more annoying than useful. */
const MIN_NUDGE_MINOR = 10_000; // ₹100
/** One nudge per creditor per debtor per week (cron is weekly; this guards reruns). */
const COOLDOWN_DAYS = 6;

/**
 * Weekly settle-up nudges: for every outstanding debt between two real users,
 * the DEBTOR gets one notification + push ("Reminder to settle up with X").
 * Ghosts have no account to nudge. Deduped per (creditor, debtor) via the
 * fromUserId payload marker; the "settlement_reminder" pref mutes it.
 */
export async function sendWeeklyReminders(): Promise<{ creditors: number; nudged: number }> {
  const activeUsers = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .innerJoin(groupMembers, eq(groupMembers.userId, users.id))
    .where(notLike(users.email, "deleted+%"))
    .groupBy(users.id, users.name);

  const cutoff = new Date(Date.now() - COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
  let nudged = 0;

  for (const creditor of activeUsers) {
    const balances = await getFriendBalances(creditor.id);
    for (const friend of balances) {
      if (friend.userId === null || friend.netMinor < MIN_NUDGE_MINOR) continue;

      const [recent] = await db
        .select({ id: notifications.id })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, friend.userId),
            eq(notifications.type, "settlement_reminder"),
            gte(notifications.createdAt, cutoff),
            sql`${notifications.payload} ->> 'fromUserId' = ${creditor.id}`,
          ),
        )
        .limit(1);
      if (recent) continue;

      await db.insert(notifications).values({
        id: newId(),
        userId: friend.userId,
        type: "settlement_reminder",
        payload: {
          actorName: creditor.name,
          amountMinor: friend.netMinor,
          fromUserId: creditor.id,
        },
      });
      await sendPushToUser(friend.userId, "settlement_reminder", {
        title: "Settle up reminder",
        body: `You give ${formatMoney(friend.netMinor)} to ${creditor.name} — settle up when you can.`,
        url: "/friends",
      });
      nudged += 1;
    }
  }

  return { creditors: activeUsers.length, nudged };
}

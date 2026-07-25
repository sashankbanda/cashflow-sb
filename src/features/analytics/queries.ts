import "server-only";
import { endOfMonth, formatISO, startOfMonth, subDays, subMonths } from "date-fns";
import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/server/db";
import { activityLogs, groupMembers } from "@/server/db/schema";
import { describeActivity, type ActivityPayload } from "@/features/activity/describe";
import { getFriendBalances } from "@/features/balances/queries";
import { getDailySpend, getPersonalSpendTotal } from "@/features/expenses/personal-queries";

function iso(date: Date): string {
  return formatISO(date, { representation: "date" });
}

export interface HomeActivity {
  id: string;
  actorName: string;
  actorImage: string | null;
  text: string;
  /** Signed from the viewer's perspective, or undefined for non-money events. */
  amountMinor?: number;
}

export interface HomeSummary {
  netMinor: number;
  owedToYouMinor: number;
  youOweMinor: number;
  owedFromCount: number;
  oweToCount: number;
  monthSpendMinor: number;
  monthDeltaFraction: number | null;
  /** Daily spend for the trailing ~2 weeks (sparkline). */
  trend: number[];
  activity: HomeActivity[];
}

/** Everything Home needs, in one aggregation pass. */
export async function getHomeSummary(userId: string): Promise<HomeSummary> {
  const now = new Date();
  const monthStart = iso(startOfMonth(now));
  const today = iso(now);
  const prevMonthStart = iso(startOfMonth(subMonths(now, 1)));
  const prevMonthEnd = iso(endOfMonth(subMonths(now, 1)));
  const trendStart = iso(subDays(now, 13));

  const [friends, monthSpend, prevMonthSpend, daily] = await Promise.all([
    getFriendBalances(userId),
    getPersonalSpendTotal(userId, { from: monthStart, to: today }),
    getPersonalSpendTotal(userId, { from: prevMonthStart, to: prevMonthEnd }),
    getDailySpend(userId, { from: trendStart, to: today }),
  ]);

  const owedToYou = friends.filter((f) => f.netMinor > 0);
  const youOwe = friends.filter((f) => f.netMinor < 0);
  const owedToYouMinor = owedToYou.reduce((sum, f) => sum + f.netMinor, 0);
  const youOweMinor = youOwe.reduce((sum, f) => sum + -f.netMinor, 0);

  // Dense 14-day trend: fill missing days with zero.
  const byDate = new Map(daily.map((row) => [row.date, row.amountMinor]));
  const trend = Array.from(
    { length: 14 },
    (_, index) => byDate.get(iso(subDays(now, 13 - index))) ?? 0,
  );

  const memberships = await db.query.groupMembers.findMany({
    where: and(eq(groupMembers.userId, userId), isNull(groupMembers.leftAt)),
    columns: { groupId: true },
  });
  const groupIds = memberships.map((m) => m.groupId);

  const activityRows = await db.query.activityLogs.findMany({
    where:
      groupIds.length > 0
        ? or(inArray(activityLogs.groupId, groupIds), eq(activityLogs.actorUserId, userId))
        : eq(activityLogs.actorUserId, userId),
    orderBy: [desc(activityLogs.id)],
    limit: 6,
    with: { actor: { columns: { name: true, image: true } } },
  });

  const activity: HomeActivity[] = activityRows.map((row) => {
    const described = describeActivity(row.verb, (row.payload ?? {}) as ActivityPayload);
    return {
      id: row.id,
      actorName: row.actor?.name ?? "Someone",
      actorImage: row.actor?.image ?? null,
      text: described.text,
    };
  });

  return {
    netMinor: owedToYouMinor - youOweMinor,
    owedToYouMinor,
    youOweMinor,
    owedFromCount: owedToYou.length,
    oweToCount: youOwe.length,
    monthSpendMinor: monthSpend,
    monthDeltaFraction: prevMonthSpend > 0 ? (monthSpend - prevMonthSpend) / prevMonthSpend : null,
    trend,
    activity,
  };
}

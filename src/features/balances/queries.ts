import "server-only";
import { unstable_cache } from "next/cache";
import { and, eq, isNull, sql } from "drizzle-orm";
import { buildDebtLedger, pairNet } from "@/lib/pairwise";
import { db } from "@/server/db";
import { expenses, groupMembers, settlements } from "@/server/db/schema";
import { logger } from "@/server/logger";
import { assertMember } from "@/features/groups/service";

export interface MemberBalance {
  memberId: string;
  displayName: string;
  image: string | null;
  userId: string | null;
  netMinor: number;
  /** Total they put down (Σ payer rows). */
  paidMinor: number;
  /** Total consumption (Σ split shares). */
  spentMinor: number;
}

interface GroupMoneyGraph {
  members: MemberBalance[];
  /** Serialized pairwise debt ledger entries: [`debtor|creditor`, paise]. */
  ledger: Array<[string, number]>;
}

export const groupBalancesTag = (groupId: string): string => `group:${groupId}:balances`;

/**
 * Per-member nets via one SQL aggregation (covering indexes; no row math in
 * JS) plus the pairwise ledger for friend attribution. Cached per group and
 * invalidated by every money mutation via groupBalancesTag.
 */
async function fetchGroupMoneyGraph(groupId: string): Promise<GroupMoneyGraph> {
  const result = await db.execute(sql`
    select
      m.id as member_id,
      m.display_name,
      m.user_id,
      u.image,
      (
        coalesce(p.total, 0) - coalesce(s.total, 0)
        + coalesce(so.total, 0) - coalesce(si.total, 0)
      )::bigint as net_minor,
      coalesce(p.total, 0)::bigint as paid_minor,
      coalesce(s.total, 0)::bigint as spent_minor
    from group_members m
    left join users u on u.id = m.user_id
    left join (
      select ep.member_id, sum(ep.amount_minor) as total
      from expense_payers ep
      join expenses e on e.id = ep.expense_id
      where e.group_id = ${groupId} and e.deleted_at is null
      group by ep.member_id
    ) p on p.member_id = m.id
    left join (
      select es.member_id, sum(es.amount_minor) as total
      from expense_splits es
      join expenses e on e.id = es.expense_id
      where e.group_id = ${groupId} and e.deleted_at is null
      group by es.member_id
    ) s on s.member_id = m.id
    left join (
      select st.from_member_id as member_id, sum(st.amount_minor) as total
      from settlements st
      where st.group_id = ${groupId} and st.deleted_at is null
      group by st.from_member_id
    ) so on so.member_id = m.id
    left join (
      select st.to_member_id as member_id, sum(st.amount_minor) as total
      from settlements st
      where st.group_id = ${groupId} and st.deleted_at is null
      group by st.to_member_id
    ) si on si.member_id = m.id
    where m.group_id = ${groupId} and m.left_at is null
    order by m.joined_at asc
  `);

  const members: MemberBalance[] = (
    result.rows as Array<{
      member_id: string;
      display_name: string;
      user_id: string | null;
      image: string | null;
      net_minor: string | number;
      paid_minor: string | number;
      spent_minor: string | number;
    }>
  ).map((row) => ({
    memberId: row.member_id,
    displayName: row.display_name,
    image: row.image,
    userId: row.user_id,
    netMinor: Number(row.net_minor),
    paidMinor: Number(row.paid_minor),
    spentMinor: Number(row.spent_minor),
  }));

  // Runtime sanity: nets must sum to zero (leave rule guarantees it holds
  // even across departures). A violation is a data bug — log loudly.
  const zeroSum = members.reduce((sum, member) => sum + member.netMinor, 0);
  if (zeroSum !== 0) {
    logger.error({ groupId, zeroSum }, "group balances violate zero-sum invariant");
  }

  const expenseRows = await db.query.expenses.findMany({
    where: and(eq(expenses.groupId, groupId), isNull(expenses.deletedAt)),
    columns: { id: true },
    with: {
      payers: { columns: { memberId: true, amountMinor: true } },
      splits: { columns: { memberId: true, amountMinor: true } },
    },
  });
  const settlementRows = await db.query.settlements.findMany({
    where: and(eq(settlements.groupId, groupId), isNull(settlements.deletedAt)),
    columns: { fromMemberId: true, toMemberId: true, amountMinor: true },
  });

  const ledger = buildDebtLedger(
    expenseRows.map((row) => ({
      payers: row.payers.map((payer) => ({
        memberId: payer.memberId ?? "",
        amountMinor: payer.amountMinor,
      })),
      splits: row.splits.map((split) => ({
        memberId: split.memberId ?? "",
        amountMinor: split.amountMinor,
      })),
    })),
    settlementRows,
  );

  return { members, ledger: [...ledger.entries()] };
}

function cachedGroupMoneyGraph(groupId: string): Promise<GroupMoneyGraph> {
  // Bump the version segment whenever GroupMoneyGraph's shape changes —
  // cached entries outlive deploys.
  return unstable_cache(() => fetchGroupMoneyGraph(groupId), ["group-money-v2", groupId], {
    tags: [groupBalancesTag(groupId)],
  })();
}

export interface GroupBalances {
  members: MemberBalance[];
  myNetMinor: number;
  byMember: Record<string, number>;
}

/** Member nets for a group, viewer-aware. FORBIDDEN for non-members. */
export async function getGroupBalances(userId: string, groupId: string): Promise<GroupBalances> {
  const myMember = await assertMember(db, userId, groupId);
  const graph = await cachedGroupMoneyGraph(groupId);
  return {
    members: graph.members,
    myNetMinor: graph.members.find((member) => member.memberId === myMember.id)?.netMinor ?? 0,
    byMember: Object.fromEntries(graph.members.map((member) => [member.memberId, member.netMinor])),
  };
}

/** Viewer's net per group (deck subtitles, Home widgets). */
export async function getMyNets(
  userId: string,
  groupIds: ReadonlyArray<string>,
): Promise<Record<string, number>> {
  const entries = await Promise.all(
    groupIds.map(async (groupId) => {
      const graph = await cachedGroupMoneyGraph(groupId);
      const mine = graph.members.find((member) => member.userId === userId);
      return [groupId, mine?.netMinor ?? 0] as const;
    }),
  );
  return Object.fromEntries(entries);
}

export interface FriendGroupLine {
  groupId: string;
  groupName: string;
  emoji: string | null;
  netMinor: number;
}

export interface FriendBalance {
  /** Null for ghost members — people added by name who have no account yet. */
  userId: string | null;
  name: string;
  image: string | null;
  /** Positive → the friend owes you. */
  netMinor: number;
  groups: FriendGroupLine[];
}

/** Per-friend nets aggregated across every shared group (pairwise ledger). */
export async function getFriendBalances(userId: string): Promise<FriendBalance[]> {
  const memberships = await db.query.groupMembers.findMany({
    where: and(eq(groupMembers.userId, userId), isNull(groupMembers.leftAt)),
    with: { group: { columns: { id: true, name: true, emoji: true } } },
  });

  const friends = new Map<string, FriendBalance>();

  // Fetch each group's money graph in parallel (cold cache would otherwise
  // serialize N heavy aggregations); accumulate after.
  const graphs = await Promise.all(
    memberships.map(async (membership) => ({
      membership,
      graph: await cachedGroupMoneyGraph(membership.groupId),
    })),
  );

  for (const { membership, graph } of graphs) {
    const ledger = new Map(graph.ledger);
    for (const other of graph.members) {
      // Skip yourself; INCLUDE ghosts (userId null) — money they owe is real
      // even before they have an account.
      if (other.memberId === membership.id || other.userId === userId) continue;
      const key = other.userId ?? `ghost:${other.memberId}`;
      const net = pairNet(ledger, membership.id, other.memberId);
      const existing = friends.get(key) ?? {
        userId: other.userId,
        name: other.displayName,
        image: other.image,
        netMinor: 0,
        groups: [],
      };
      existing.netMinor += net;
      existing.image = existing.image ?? other.image;
      existing.groups.push({
        groupId: membership.groupId,
        groupName: membership.group.name,
        emoji: membership.group.emoji,
        netMinor: net,
      });
      friends.set(key, existing);
    }
  }

  return [...friends.values()].sort((a, b) => Math.abs(b.netMinor) - Math.abs(a.netMinor));
}

import "server-only";
import { and, desc, eq, gte, ilike, inArray, isNull, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/server/db";
import { expenses, groupMembers } from "@/server/db/schema";
import { getCategoriesForUser, type CategoryOption } from "@/features/categories/queries";
import { getTagsForUser, type TagOption } from "@/features/categories/tags-service";
import { getFriendBalances } from "@/features/balances/queries";
import { getMyGroups } from "@/features/groups/queries";
import { hasSearchCriteria, type SearchInput } from "./schemas";

export interface SearchExpense {
  id: string;
  description: string;
  amountMinor: number;
  expenseDate: string;
  /** Group name, or null for a personal expense. */
  source: string | null;
  category: { icon: string; gradient: string; name: string } | null;
}

export interface SearchGroupHit {
  id: string;
  name: string;
  emoji: string | null;
}

export interface SearchFriendHit {
  userId: string;
  name: string;
  image: string | null;
}

export interface SearchResults {
  expenses: SearchExpense[];
  groups: SearchGroupHit[];
  friends: SearchFriendHit[];
}

async function myGroupIds(userId: string): Promise<string[]> {
  const memberships = await db.query.groupMembers.findMany({
    where: and(eq(groupMembers.userId, userId), isNull(groupMembers.leftAt)),
    columns: { groupId: true },
  });
  return memberships.map((membership) => membership.groupId);
}

/** Omnisearch across the user's visible expenses, groups, and friends. */
export async function searchAll(userId: string, input: SearchInput): Promise<SearchResults> {
  if (!hasSearchCriteria(input)) return { expenses: [], groups: [], friends: [] };

  const groupIds = await myGroupIds(userId);
  const { query, filters } = input;
  const term = query.trim();

  // Authz: only the user's group expenses + their own personal expenses.
  const visible = or(
    groupIds.length > 0 ? inArray(expenses.groupId, groupIds) : sql`false`,
    and(isNull(expenses.groupId), eq(expenses.createdBy, userId)),
  );

  const conditions: Array<SQL | undefined> = [isNull(expenses.deletedAt), visible];
  if (term) {
    conditions.push(
      or(ilike(expenses.description, `%${term}%`), ilike(expenses.notes, `%${term}%`)),
    );
  }
  if (filters.categoryIds?.length) {
    conditions.push(inArray(expenses.categoryId, filters.categoryIds));
  }
  if (filters.groupIds?.length) {
    conditions.push(inArray(expenses.groupId, filters.groupIds));
  }
  if (filters.dateFrom) conditions.push(gte(expenses.expenseDate, filters.dateFrom));
  if (filters.dateTo) conditions.push(lte(expenses.expenseDate, filters.dateTo));
  if (filters.amountMinMinor !== undefined) {
    conditions.push(gte(expenses.amountMinor, filters.amountMinMinor));
  }
  if (filters.amountMaxMinor !== undefined) {
    conditions.push(lte(expenses.amountMinor, filters.amountMaxMinor));
  }
  if (filters.tagIds?.length) {
    conditions.push(
      sql`exists (select 1 from expense_tags et where et.expense_id = ${expenses.id} and et.tag_id = any(${filters.tagIds}))`,
    );
  }
  if (filters.memberUserIds?.length) {
    conditions.push(
      sql`exists (select 1 from expense_splits es where es.expense_id = ${expenses.id} and es.user_id = any(${filters.memberUserIds}))`,
    );
  }

  const rows = await db
    .select({
      id: expenses.id,
      description: expenses.description,
      amountMinor: expenses.amountMinor,
      expenseDate: expenses.expenseDate,
      groupId: expenses.groupId,
      categoryId: expenses.categoryId,
      categoryName: sql<string | null>`cat.name`,
      categoryIcon: sql<string | null>`cat.icon`,
      categoryGradient: sql<string | null>`cat.gradient`,
      groupName: sql<string | null>`grp.name`,
    })
    .from(expenses)
    .leftJoin(sql`categories cat`, sql`cat.id = ${expenses.categoryId}`)
    .leftJoin(sql`groups grp`, sql`grp.id = ${expenses.groupId}`)
    .where(and(...conditions))
    .orderBy(desc(expenses.expenseDate), desc(expenses.id))
    .limit(50);

  const expenseHits: SearchExpense[] = rows.map((row) => ({
    id: row.id,
    description: row.description,
    amountMinor: row.amountMinor,
    expenseDate: row.expenseDate,
    source: row.groupId ? (row.groupName ?? "Group") : null,
    category: row.categoryId
      ? {
          icon: row.categoryIcon ?? "shapes",
          gradient: row.categoryGradient ?? "ocean",
          name: row.categoryName ?? "Other",
        }
      : null,
  }));

  // Groups + friends match on name only (small sets — filter in JS).
  const lowerTerm = term.toLowerCase();
  const [groups, friends] = await Promise.all([getMyGroups(userId), getFriendBalances(userId)]);

  const groupHits: SearchGroupHit[] = term
    ? groups
        .filter((group) => group.name.toLowerCase().includes(lowerTerm))
        .map((group) => ({ id: group.id, name: group.name, emoji: group.emoji }))
    : [];
  const friendHits: SearchFriendHit[] = term
    ? friends
        .filter(
          (friend): friend is typeof friend & { userId: string } =>
            friend.userId !== null && friend.name.toLowerCase().includes(lowerTerm),
        )
        .map((friend) => ({ userId: friend.userId, name: friend.name, image: friend.image }))
    : [];

  return { expenses: expenseHits, groups: groupHits, friends: friendHits };
}

export interface SearchOptions {
  categories: CategoryOption[];
  groups: SearchGroupHit[];
  tags: TagOption[];
  people: Array<{ userId: string; name: string }>;
}

/** Filter-sheet options: the user's categories, groups, tags, and friends. */
export async function getSearchOptions(userId: string): Promise<SearchOptions> {
  const [categories, tags, groups, friends] = await Promise.all([
    getCategoriesForUser(userId),
    getTagsForUser(userId),
    getMyGroups(userId),
    getFriendBalances(userId),
  ]);
  return {
    categories,
    tags,
    groups: groups.map((group) => ({ id: group.id, name: group.name, emoji: group.emoji })),
    people: friends
      .filter((friend): friend is typeof friend & { userId: string } => friend.userId !== null)
      .map((friend) => ({ userId: friend.userId, name: friend.name })),
  };
}

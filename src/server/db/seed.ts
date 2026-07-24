import "dotenv/config";
import { subDays, formatISO } from "date-fns";
import { SYSTEM_CATEGORIES } from "@/features/categories/system";
import { newId } from "@/lib/ids";
import { computeSplits, type SplitType } from "@/lib/split";
import { db } from "./index";
import {
  activityLogs,
  categories,
  expensePayers,
  expenses,
  expenseSplits,
  groupMembers,
  groups,
  settlements,
  users,
} from "./schema";

/**
 * Development seed. Deterministic and idempotent: reruns wipe and recreate
 * only the seed-owned rows (identified by the fixed dev user). System
 * categories are upserted and never duplicated. Refuses production.
 */

const DEV_USER_ID = "seed-user-dev";
const FRIEND_IDS = {
  rohit: "seed-user-rohit",
  asha: "seed-user-asha",
} as const;

function day(daysAgo: number): string {
  return formatISO(subDays(new Date(), daysAgo), { representation: "date" });
}

interface SeedExpense {
  description: string;
  amountMinor: number;
  categoryId: string;
  daysAgo: number;
  paidBy: string; // member id
  splitType: SplitType;
  participants: Array<{ memberId: string; weight?: number }>;
}

async function seed(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed a production database.");
  }

  // ---- System categories (upsert, stable ids) ----
  for (const category of SYSTEM_CATEGORIES) {
    await db
      .insert(categories)
      .values({
        id: category.id,
        userId: null,
        name: category.name,
        icon: category.icon,
        gradient: category.gradient,
        sort: category.sort,
      })
      .onConflictDoUpdate({
        target: categories.id,
        set: {
          name: category.name,
          icon: category.icon,
          gradient: category.gradient,
          sort: category.sort,
        },
      });
  }

  // ---- Reset seed-owned data (dev users cascade to memberships etc.) ----
  const { inArray, or } = await import("drizzle-orm");
  const seedUserIds = [DEV_USER_ID, FRIEND_IDS.rohit, FRIEND_IDS.asha];
  const seedEmails = ["dev@cashflow.local", "rohit@cashflow.local", "asha@cashflow.local"];
  const seedGroups = await db
    .select({ id: groups.id })
    .from(groups)
    .where(inArray(groups.createdBy, seedUserIds));
  // Groups deliberately do NOT cascade expenses (archive-not-delete design),
  // so remove seed expenses first; payers/splits/attachments cascade from them.
  await db.delete(expenses).where(inArray(expenses.createdBy, seedUserIds));
  if (seedGroups.length > 0) {
    const seedGroupIds = seedGroups.map((row) => row.id);
    await db.delete(expenses).where(inArray(expenses.groupId, seedGroupIds));
    await db.delete(groups).where(inArray(groups.id, seedGroupIds));
  }
  await db
    .delete(users)
    .where(or(inArray(users.id, seedUserIds), inArray(users.email, seedEmails)));

  // ---- Users: the dev user + two registered friends ----
  await db.insert(users).values([
    { id: DEV_USER_ID, name: "Dev User", email: "dev@cashflow.local", emailVerified: true },
    {
      id: FRIEND_IDS.rohit,
      name: "Rohit Verma",
      email: "rohit@cashflow.local",
      emailVerified: true,
    },
    { id: FRIEND_IDS.asha, name: "Asha Iyer", email: "asha@cashflow.local", emailVerified: true },
  ]);

  // ---- Group 1: Goa trip (5 members, 2 ghosts) ----
  const goaId = newId();
  await db.insert(groups).values({
    id: goaId,
    name: "Goa trip",
    emoji: "🌴",
    gradient: "ocean",
    createdBy: DEV_USER_ID,
  });

  const goa = {
    dev: newId(),
    rohit: newId(),
    asha: newId(),
    ghostDev1: newId(),
    ghostDev2: newId(),
  };
  await db.insert(groupMembers).values([
    { id: goa.dev, groupId: goaId, userId: DEV_USER_ID, displayName: "Dev User", role: "owner" },
    { id: goa.rohit, groupId: goaId, userId: FRIEND_IDS.rohit, displayName: "Rohit Verma" },
    { id: goa.asha, groupId: goaId, userId: FRIEND_IDS.asha, displayName: "Asha Iyer" },
    { id: goa.ghostDev1, groupId: goaId, userId: null, displayName: "Dev Patel" },
    { id: goa.ghostDev2, groupId: goaId, userId: null, displayName: "Meera Nair" },
  ]);

  // ---- Group 2: Flat 402 (3 members, 1 ghost) ----
  const flatId = newId();
  await db.insert(groups).values({
    id: flatId,
    name: "Flat 402",
    emoji: "🏠",
    gradient: "iris",
    createdBy: DEV_USER_ID,
  });

  const flat = { dev: newId(), asha: newId(), ghost: newId() };
  await db.insert(groupMembers).values([
    { id: flat.dev, groupId: flatId, userId: DEV_USER_ID, displayName: "Dev User", role: "owner" },
    { id: flat.asha, groupId: flatId, userId: FRIEND_IDS.asha, displayName: "Asha Iyer" },
    { id: flat.ghost, groupId: flatId, userId: null, displayName: "Karan Shah" },
  ]);

  const memberUser = new Map<string, string | null>([
    [goa.dev, DEV_USER_ID],
    [goa.rohit, FRIEND_IDS.rohit],
    [goa.asha, FRIEND_IDS.asha],
    [goa.ghostDev1, null],
    [goa.ghostDev2, null],
    [flat.dev, DEV_USER_ID],
    [flat.asha, FRIEND_IDS.asha],
    [flat.ghost, null],
  ]);

  const goaAll = [goa.dev, goa.rohit, goa.asha, goa.ghostDev1, goa.ghostDev2];
  const flatAll = [flat.dev, flat.asha, flat.ghost];

  const seedExpenses: Array<SeedExpense & { groupId: string }> = [
    // Goa trip — the canonical scenario
    {
      groupId: goaId,
      description: "Dinner at Fisherman's Wharf",
      amountMinor: 250000,
      categoryId: "sys-food",
      daysAgo: 6,
      paidBy: goa.dev,
      splitType: "equal",
      participants: goaAll.map((memberId) => ({ memberId })),
    },
    {
      groupId: goaId,
      description: "Movie tickets",
      amountMinor: 120000,
      categoryId: "sys-entertainment",
      daysAgo: 5,
      paidBy: goa.rohit,
      splitType: "equal",
      participants: goaAll.map((memberId) => ({ memberId })),
    },
    {
      groupId: goaId,
      description: "Petrol",
      amountMinor: 90000,
      categoryId: "sys-fuel",
      daysAgo: 5,
      paidBy: goa.asha,
      splitType: "equal",
      participants: goaAll.map((memberId) => ({ memberId })),
    },
    {
      groupId: goaId,
      description: "Hotel — 2 nights",
      amountMinor: 800000,
      categoryId: "sys-travel",
      daysAgo: 4,
      paidBy: goa.ghostDev1,
      splitType: "equal",
      participants: goaAll.map((memberId) => ({ memberId })),
    },
    {
      groupId: goaId,
      description: "Beach shack lunch",
      amountMinor: 145000,
      categoryId: "sys-food",
      daysAgo: 4,
      paidBy: goa.dev,
      splitType: "shares",
      participants: [
        { memberId: goa.dev, weight: 2 },
        { memberId: goa.rohit, weight: 1 },
        { memberId: goa.asha, weight: 1 },
        { memberId: goa.ghostDev2, weight: 1 },
      ],
    },
    {
      groupId: goaId,
      description: "Scuba session",
      amountMinor: 360000,
      categoryId: "sys-entertainment",
      daysAgo: 3,
      paidBy: goa.rohit,
      splitType: "exact",
      participants: [
        { memberId: goa.dev, weight: 120000 },
        { memberId: goa.rohit, weight: 120000 },
        { memberId: goa.ghostDev1, weight: 120000 },
      ],
    },
    {
      groupId: goaId,
      description: "Cab to airport",
      amountMinor: 85000,
      categoryId: "sys-travel",
      daysAgo: 2,
      paidBy: goa.asha,
      splitType: "percent",
      participants: [
        { memberId: goa.dev, weight: 40 },
        { memberId: goa.asha, weight: 40 },
        { memberId: goa.rohit, weight: 20 },
      ],
    },
    // Flat 402 — household
    {
      groupId: flatId,
      description: "July rent",
      amountMinor: 3600000,
      categoryId: "sys-rent",
      daysAgo: 14,
      paidBy: flat.dev,
      splitType: "equal",
      participants: flatAll.map((memberId) => ({ memberId })),
    },
    {
      groupId: flatId,
      description: "Electricity bill",
      amountMinor: 240000,
      categoryId: "sys-rent",
      daysAgo: 8,
      paidBy: flat.asha,
      splitType: "equal",
      participants: flatAll.map((memberId) => ({ memberId })),
    },
    {
      groupId: flatId,
      description: "BigBasket order",
      amountMinor: 187550,
      categoryId: "sys-groceries",
      daysAgo: 3,
      paidBy: flat.ghost,
      splitType: "equal",
      participants: flatAll.map((memberId) => ({ memberId })),
    },
    {
      groupId: flatId,
      description: "Wi-Fi renewal",
      amountMinor: 99900,
      categoryId: "sys-subscriptions",
      daysAgo: 1,
      paidBy: flat.dev,
      splitType: "equal",
      participants: flatAll.map((memberId) => ({ memberId })),
    },
  ];

  for (const seedExpense of seedExpenses) {
    const expenseId = newId();
    const shares = computeSplits({
      amountMinor: seedExpense.amountMinor,
      type: seedExpense.splitType,
      participants: seedExpense.participants,
    });
    await db.insert(expenses).values({
      id: expenseId,
      groupId: seedExpense.groupId,
      description: seedExpense.description,
      amountMinor: seedExpense.amountMinor,
      categoryId: seedExpense.categoryId,
      splitType: seedExpense.splitType,
      expenseDate: day(seedExpense.daysAgo),
      createdBy: memberUser.get(seedExpense.paidBy) ?? DEV_USER_ID,
    });
    await db.insert(expensePayers).values({
      id: newId(),
      expenseId,
      memberId: seedExpense.paidBy,
      userId: memberUser.get(seedExpense.paidBy) ?? null,
      amountMinor: seedExpense.amountMinor,
    });
    await db.insert(expenseSplits).values(
      shares.map((share) => ({
        id: newId(),
        expenseId,
        memberId: share.memberId,
        userId: memberUser.get(share.memberId) ?? null,
        amountMinor: share.amountMinor,
        weight: share.weight,
      })),
    );
    await db.insert(activityLogs).values({
      id: newId(),
      groupId: seedExpense.groupId,
      actorUserId: memberUser.get(seedExpense.paidBy) ?? DEV_USER_ID,
      verb: "expense_added",
      objectType: "expense",
      objectId: expenseId,
      payload: {
        description: seedExpense.description,
        amountMinor: seedExpense.amountMinor,
        groupName: seedExpense.groupId === goaId ? "Goa trip" : "Flat 402",
      },
    });
  }

  // ---- A settlement: Asha paid Dev back ₹1,000 in the flat ----
  await db.insert(settlements).values({
    id: newId(),
    groupId: flatId,
    fromMemberId: flat.asha,
    toMemberId: flat.dev,
    amountMinor: 100000,
    method: "upi",
    createdBy: FRIEND_IDS.asha,
  });

  // ---- Personal expenses for the dev user ----
  const personal = [
    { description: "Morning coffee", amountMinor: 24000, categoryId: "sys-food", daysAgo: 1 },
    { description: "Gym membership", amountMinor: 150000, categoryId: "sys-health", daysAgo: 7 },
    { description: "Spotify", amountMinor: 11900, categoryId: "sys-subscriptions", daysAgo: 10 },
  ];
  for (const item of personal) {
    const expenseId = newId();
    await db.insert(expenses).values({
      id: expenseId,
      groupId: null,
      description: item.description,
      amountMinor: item.amountMinor,
      categoryId: item.categoryId,
      splitType: "equal",
      expenseDate: day(item.daysAgo),
      createdBy: DEV_USER_ID,
    });
    await db.insert(expensePayers).values({
      id: newId(),
      expenseId,
      memberId: null,
      userId: DEV_USER_ID,
      amountMinor: item.amountMinor,
    });
    await db.insert(expenseSplits).values({
      id: newId(),
      expenseId,
      memberId: null,
      userId: DEV_USER_ID,
      amountMinor: item.amountMinor,
      weight: null,
    });
  }

  const counts = {
    users: await db.$count(users),
    groups: await db.$count(groups),
    members: await db.$count(groupMembers),
    expenses: await db.$count(expenses),
    splits: await db.$count(expenseSplits),
    settlements: await db.$count(settlements),
    categories: await db.$count(categories),
  };
  console.log("Seed complete:", counts);
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });

import "server-only";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { categories, groups, recurringRules } from "@/server/db/schema";
import { FREQUENCY_LABEL, isEnded, upcomingDates, type Frequency } from "./recurrence";

interface StoredTemplate {
  kind: "personal" | "group";
  description: string;
  amountMinor: number;
  categoryId: string;
  groupId?: string;
  anchorDay: number;
}

export interface RuleCategory {
  name: string;
  icon: string;
  gradient: string;
}

export interface RecurringRuleView {
  id: string;
  description: string;
  amountMinor: number;
  frequency: Frequency;
  frequencyLabel: string;
  interval: number;
  nextRunOn: string;
  paused: boolean;
  ended: boolean;
  kind: "personal" | "group";
  groupName: string | null;
  category: RuleCategory | null;
}

export interface UpcomingOccurrence {
  ruleId: string;
  date: string;
  description: string;
  amountMinor: number;
  category: RuleCategory | null;
  groupName: string | null;
}

async function metadata(templates: StoredTemplate[]): Promise<{
  categoryById: Map<string, RuleCategory>;
  groupNameById: Map<string, string>;
}> {
  const categoryIds = [...new Set(templates.map((t) => t.categoryId).filter(Boolean))];
  const groupIds = [
    ...new Set(templates.map((t) => t.groupId).filter((id): id is string => Boolean(id))),
  ];

  const [categoryRows, groupRows] = await Promise.all([
    categoryIds.length > 0
      ? db
          .select({
            id: categories.id,
            name: categories.name,
            icon: categories.icon,
            gradient: categories.gradient,
          })
          .from(categories)
          .where(inArray(categories.id, categoryIds))
      : Promise.resolve([]),
    groupIds.length > 0
      ? db
          .select({ id: groups.id, name: groups.name })
          .from(groups)
          .where(inArray(groups.id, groupIds))
      : Promise.resolve([]),
  ]);

  return {
    categoryById: new Map(
      categoryRows.map((row) => [
        row.id,
        { name: row.name, icon: row.icon, gradient: row.gradient },
      ]),
    ),
    groupNameById: new Map(groupRows.map((row) => [row.id, row.name])),
  };
}

/** All of a user's recurring rules, soonest first, with display metadata. */
export async function getRecurringRules(userId: string): Promise<RecurringRuleView[]> {
  const rows = await db.query.recurringRules.findMany({
    where: eq(recurringRules.userId, userId),
    orderBy: [asc(recurringRules.nextRunOn)],
  });
  const templates = rows.map((row) => row.template as unknown as StoredTemplate);
  const { categoryById, groupNameById } = await metadata(templates);

  return rows.map((row, index) => {
    const template = templates[index] as StoredTemplate;
    const frequency = row.frequency as Frequency;
    return {
      id: row.id,
      description: template.description,
      amountMinor: template.amountMinor,
      frequency,
      frequencyLabel: FREQUENCY_LABEL[frequency],
      interval: row.interval,
      nextRunOn: row.nextRunOn,
      paused: row.pausedAt !== null,
      ended: isEnded({
        nextRunOn: row.nextRunOn,
        frequency,
        interval: row.interval,
        anchorDay: template.anchorDay,
        endsOn: row.endsOn,
      }),
      kind: template.kind,
      groupName: template.groupId ? (groupNameById.get(template.groupId) ?? null) : null,
      category: categoryById.get(template.categoryId) ?? null,
    };
  });
}

/** The next few scheduled occurrences across active rules, soonest first. */
export async function getUpcomingOccurrences(
  userId: string,
  count = 5,
): Promise<UpcomingOccurrence[]> {
  const rows = await db.query.recurringRules.findMany({
    where: eq(recurringRules.userId, userId),
  });
  const active = rows.filter((row) => row.pausedAt === null);
  const templates = active.map((row) => row.template as unknown as StoredTemplate);
  const { categoryById, groupNameById } = await metadata(templates);

  const occurrences: UpcomingOccurrence[] = [];
  active.forEach((row, index) => {
    const template = templates[index] as StoredTemplate;
    const frequency = row.frequency as Frequency;
    const dates = upcomingDates(
      {
        nextRunOn: row.nextRunOn,
        frequency,
        interval: row.interval,
        anchorDay: template.anchorDay,
        endsOn: row.endsOn,
      },
      count,
    );
    for (const date of dates) {
      occurrences.push({
        ruleId: row.id,
        date,
        description: template.description,
        amountMinor: template.amountMinor,
        category: categoryById.get(template.categoryId) ?? null,
        groupName: template.groupId ? (groupNameById.get(template.groupId) ?? null) : null,
      });
    }
  });

  return occurrences.sort((a, b) => a.date.localeCompare(b.date)).slice(0, count);
}

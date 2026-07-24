import { relations } from "drizzle-orm";
import { activityLogs } from "./activity";
import { attachments } from "./attachments";
import { budgets } from "./budgets";
import { categories } from "./categories";
import { expensePayers, expenses, expenseSplits } from "./expenses";
import { groupMembers, groups } from "./groups";
import { invites } from "./invites";
import { notifications, pushSubscriptions } from "./notifications";
import { recurringRules } from "./recurring";
import { settlements } from "./settlements";
import { expenseTags, tags } from "./tags";
import { users } from "./users";

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(groupMembers),
  categories: many(categories),
  budgets: many(budgets),
  notifications: many(notifications),
  pushSubscriptions: many(pushSubscriptions),
  recurringRules: many(recurringRules),
  tags: many(tags),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  creator: one(users, { fields: [groups.createdBy], references: [users.id] }),
  members: many(groupMembers),
  expenses: many(expenses),
  settlements: many(settlements),
  invites: many(invites),
  activity: many(activityLogs),
}));

export const groupMembersRelations = relations(groupMembers, ({ one, many }) => ({
  group: one(groups, { fields: [groupMembers.groupId], references: [groups.id] }),
  user: one(users, { fields: [groupMembers.userId], references: [users.id] }),
  paid: many(expensePayers),
  shares: many(expenseSplits),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  owner: one(users, { fields: [categories.userId], references: [users.id] }),
  expenses: many(expenses),
}));

export const expensesRelations = relations(expenses, ({ one, many }) => ({
  group: one(groups, { fields: [expenses.groupId], references: [groups.id] }),
  category: one(categories, { fields: [expenses.categoryId], references: [categories.id] }),
  creator: one(users, { fields: [expenses.createdBy], references: [users.id] }),
  recurringRule: one(recurringRules, {
    fields: [expenses.recurringRuleId],
    references: [recurringRules.id],
  }),
  payers: many(expensePayers),
  splits: many(expenseSplits),
  attachments: many(attachments),
  expenseTags: many(expenseTags),
}));

export const expensePayersRelations = relations(expensePayers, ({ one }) => ({
  expense: one(expenses, { fields: [expensePayers.expenseId], references: [expenses.id] }),
  member: one(groupMembers, { fields: [expensePayers.memberId], references: [groupMembers.id] }),
  user: one(users, { fields: [expensePayers.userId], references: [users.id] }),
}));

export const expenseSplitsRelations = relations(expenseSplits, ({ one }) => ({
  expense: one(expenses, { fields: [expenseSplits.expenseId], references: [expenses.id] }),
  member: one(groupMembers, { fields: [expenseSplits.memberId], references: [groupMembers.id] }),
  user: one(users, { fields: [expenseSplits.userId], references: [users.id] }),
}));

export const settlementsRelations = relations(settlements, ({ one }) => ({
  group: one(groups, { fields: [settlements.groupId], references: [groups.id] }),
  fromMember: one(groupMembers, {
    fields: [settlements.fromMemberId],
    references: [groupMembers.id],
    relationName: "settlementsFrom",
  }),
  toMember: one(groupMembers, {
    fields: [settlements.toMemberId],
    references: [groupMembers.id],
    relationName: "settlementsTo",
  }),
}));

export const invitesRelations = relations(invites, ({ one }) => ({
  group: one(groups, { fields: [invites.groupId], references: [groups.id] }),
  member: one(groupMembers, { fields: [invites.memberId], references: [groupMembers.id] }),
}));

export const budgetsRelations = relations(budgets, ({ one }) => ({
  owner: one(users, { fields: [budgets.userId], references: [users.id] }),
  category: one(categories, { fields: [budgets.categoryId], references: [categories.id] }),
}));

export const recurringRulesRelations = relations(recurringRules, ({ one, many }) => ({
  owner: one(users, { fields: [recurringRules.userId], references: [users.id] }),
  group: one(groups, { fields: [recurringRules.groupId], references: [groups.id] }),
  expenses: many(expenses),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  group: one(groups, { fields: [activityLogs.groupId], references: [groups.id] }),
  actor: one(users, { fields: [activityLogs.actorUserId], references: [users.id] }),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  expense: one(expenses, { fields: [attachments.expenseId], references: [expenses.id] }),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  owner: one(users, { fields: [tags.userId], references: [users.id] }),
  expenseTags: many(expenseTags),
}));

export const expenseTagsRelations = relations(expenseTags, ({ one }) => ({
  expense: one(expenses, { fields: [expenseTags.expenseId], references: [expenses.id] }),
  tag: one(tags, { fields: [expenseTags.tagId], references: [tags.id] }),
}));

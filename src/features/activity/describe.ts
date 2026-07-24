/**
 * Pure renderers for activity + notification rows. Everything comes from the
 * row's denormalized `payload`, so feeds render with no joins.
 */

export interface ActivityPayload {
  description?: string;
  amountMinor?: number;
  groupName?: string;
  displayName?: string;
  fromName?: string;
  toName?: string;
  payerName?: string;
  actorName?: string;
  categoryName?: string | null;
  level?: string;
}

/** Predicate for an activity-feed line (the actor's name is rendered separately). */
export function describeActivity(
  verb: string,
  payload: ActivityPayload,
): { text: string; amountMinor?: number } {
  switch (verb) {
    case "expense_added":
      return {
        text: `added ${payload.description ?? "an expense"}${payload.groupName ? ` in ${payload.groupName}` : ""}`,
        amountMinor: payload.amountMinor,
      };
    case "expense_updated":
      return { text: `edited ${payload.description ?? "an expense"}` };
    case "expense_deleted":
      return { text: `deleted ${payload.description ?? "an expense"}` };
    case "settlement_recorded":
      return {
        text: `recorded a payment${payload.groupName ? ` in ${payload.groupName}` : ""}`,
        amountMinor: payload.amountMinor,
      };
    case "member_joined":
      return { text: `joined ${payload.groupName ?? "a group"}` };
    case "member_claimed":
      return { text: `claimed a spot${payload.groupName ? ` in ${payload.groupName}` : ""}` };
    case "member_added":
      return {
        text: `added ${payload.displayName ?? "someone"} to ${payload.groupName ?? "the group"}`,
      };
    case "group_created":
      return { text: "created a group" };
    case "group_updated":
      return { text: "updated the group" };
    case "group_archived":
      return { text: "archived the group" };
    case "member_left":
      return { text: `left ${payload.groupName ?? "the group"}` };
    default:
      return { text: "updated the group" };
  }
}

/** Full self-contained sentence for a notification-center row. */
export function describeNotification(type: string, payload: ActivityPayload): string {
  const who = payload.actorName ?? "Someone";
  switch (type) {
    case "expense_added":
      return `${who} added ${payload.description ?? "an expense"}${payload.groupName ? ` in ${payload.groupName}` : ""}`;
    case "settlement_recorded":
      return `${who} recorded a payment to you${payload.groupName ? ` in ${payload.groupName}` : ""}`;
    case "settlement_reminder":
      return `Reminder to settle up with ${who}`;
    case "member_joined":
      return `${who} joined ${payload.groupName ?? "your group"}`;
    case "member_claimed":
      return `${who} claimed a spot${payload.groupName ? ` in ${payload.groupName}` : ""}`;
    case "budget_threshold":
      return payload.level === "over"
        ? `You're over your ${payload.categoryName ?? "overall"} budget`
        : `You're close to your ${payload.categoryName ?? "overall"} budget`;
    default:
      return `${who} updated something`;
  }
}

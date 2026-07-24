import "server-only";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import { notifications } from "@/server/db/schema";
import { describeNotification, type ActivityPayload } from "@/features/activity/describe";

export interface NotificationView {
  id: string;
  type: string;
  text: string;
  amountMinor?: number;
  read: boolean;
  createdAt: string;
}

/** The user's recent notifications, newest first, rendered from payload. */
export async function getNotifications(userId: string, limit = 30): Promise<NotificationView[]> {
  const rows = await db.query.notifications.findMany({
    where: eq(notifications.userId, userId),
    orderBy: [desc(notifications.createdAt)],
    limit,
  });
  return rows.map((row) => {
    const payload = (row.payload ?? {}) as ActivityPayload;
    return {
      id: row.id,
      type: row.type,
      text: describeNotification(row.type, payload),
      amountMinor: typeof payload.amountMinor === "number" ? payload.amountMinor : undefined,
      read: row.readAt !== null,
      createdAt: row.createdAt.toISOString(),
    };
  });
}

/** Count of unread notifications (dock/bell badge). */
export async function getUnreadCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return row?.value ?? 0;
}

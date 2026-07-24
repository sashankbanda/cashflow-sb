import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { attachments } from "@/server/db/schema";
import { accessibleExpense } from "./service";

export interface AttachmentView {
  id: string;
  /** Authed view route (302s to the blob for authorized users). */
  viewUrl: string;
  mime: string;
  width: number | null;
  height: number | null;
  blurhash: string | null;
}

/** Receipts on an expense, authz-checked. Serves the authed view route, not the raw blob URL. */
export async function getExpenseAttachments(
  userId: string,
  expenseId: string,
): Promise<AttachmentView[]> {
  await accessibleExpense(userId, expenseId);
  const rows = await db.query.attachments.findMany({
    where: eq(attachments.expenseId, expenseId),
    orderBy: [asc(attachments.createdAt)],
  });
  return rows.map((row) => ({
    id: row.id,
    viewUrl: `/api/attachments/${row.id}`,
    mime: row.mime,
    width: row.width,
    height: row.height,
    blurhash: row.blurhash,
  }));
}

/** Resolve a blob URL for a viewer, only if the user may see the expense. */
export async function getAttachmentForView(
  userId: string,
  id: string,
): Promise<{ url: string; mime: string } | null> {
  const attachment = await db.query.attachments.findFirst({ where: eq(attachments.id, id) });
  if (!attachment) return null;
  try {
    await accessibleExpense(userId, attachment.expenseId);
  } catch {
    return null;
  }
  return { url: attachment.url, mime: attachment.mime };
}

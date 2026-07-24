import "server-only";
import { count, eq } from "drizzle-orm";
import { newId } from "@/lib/ids";
import {
  attachmentStorageKey,
  MAX_ATTACHMENTS_PER_EXPENSE,
  validateAttachment,
  type AttachmentMime,
} from "@/lib/attachments";
import { db } from "@/server/db";
import { attachments, expenses, type Expense } from "@/server/db/schema";
import { conflict, forbidden, notFound, validationError } from "@/server/errors";
import { isStorageConfigured, storage } from "@/server/storage";
import type { ActionUser } from "@/server/action-core";
import { assertMember } from "@/features/groups/service";

/** The expense, if the user may see it (group member, or personal owner). */
export async function accessibleExpense(userId: string, expenseId: string): Promise<Expense> {
  const expense = await db.query.expenses.findFirst({ where: eq(expenses.id, expenseId) });
  if (!expense || expense.deletedAt) throw notFound("Expense");
  if (expense.groupId) {
    await assertMember(db, userId, expense.groupId);
  } else if (expense.createdBy !== userId) {
    throw forbidden("That isn't your expense.");
  }
  return expense;
}

export interface AddAttachmentInput {
  expenseId: string;
  mime: string;
  sizeBytes: number;
  data: Buffer;
  width?: number;
  height?: number;
  blurhash?: string;
}

/** Validate, store the blob, and record the attachment (authz-checked). */
export async function addAttachment(
  user: ActionUser,
  input: AddAttachmentInput,
): Promise<{ id: string }> {
  if (!isStorageConfigured()) {
    throw validationError("Attachments aren't available — storage isn't configured yet.");
  }
  const check = validateAttachment({ mime: input.mime, sizeBytes: input.sizeBytes });
  if (!check.ok) throw validationError(check.reason);

  await accessibleExpense(user.id, input.expenseId);

  const [existing] = await db
    .select({ value: count() })
    .from(attachments)
    .where(eq(attachments.expenseId, input.expenseId));
  if ((existing?.value ?? 0) >= MAX_ATTACHMENTS_PER_EXPENSE) {
    throw conflict(`Up to ${MAX_ATTACHMENTS_PER_EXPENSE} receipts per expense.`);
  }

  const id = newId();
  const key = attachmentStorageKey(input.expenseId, id, input.mime as AttachmentMime);
  const stored = await storage.put(key, input.data, input.mime);

  await db.insert(attachments).values({
    id,
    expenseId: input.expenseId,
    uploadedBy: user.id,
    url: stored.url,
    mime: input.mime,
    sizeBytes: input.sizeBytes,
    width: input.width ?? null,
    height: input.height ?? null,
    blurhash: input.blurhash ?? null,
  });

  return { id };
}

/** Delete an attachment and clean up its blob (authz-checked). */
export async function deleteAttachment(user: ActionUser, id: string): Promise<void> {
  const attachment = await db.query.attachments.findFirst({ where: eq(attachments.id, id) });
  if (!attachment) throw notFound("Attachment");
  await accessibleExpense(user.id, attachment.expenseId);
  await storage.delete(attachment.url);
  await db.delete(attachments).where(eq(attachments.id, id));
}

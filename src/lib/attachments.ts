/**
 * Attachment constraints, shared by client (pre-flight) and server (enforced).
 * Pure — no I/O — so the validation is unit-testable and identical on both ends.
 */

export const ALLOWED_ATTACHMENT_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export type AttachmentMime = (typeof ALLOWED_ATTACHMENT_MIME)[number];

/** Hard ceiling on the *uploaded* (already client-compressed) file. */
export const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024; // 2 MB
/** Target the client compresses toward before upload. */
export const COMPRESS_TARGET_BYTES = 500 * 1024; // ~500 KB
export const MAX_ATTACHMENTS_PER_EXPENSE = 5;

export interface AttachmentCandidate {
  mime: string;
  sizeBytes: number;
}

export type AttachmentValidation = { ok: true } | { ok: false; reason: string };

export function isAllowedMime(mime: string): mime is AttachmentMime {
  return (ALLOWED_ATTACHMENT_MIME as readonly string[]).includes(mime);
}

/** Validate a candidate upload's type and size. */
export function validateAttachment(candidate: AttachmentCandidate): AttachmentValidation {
  if (!isAllowedMime(candidate.mime)) {
    return { ok: false, reason: "Only JPEG, PNG, or WebP images are allowed." };
  }
  if (!Number.isFinite(candidate.sizeBytes) || candidate.sizeBytes <= 0) {
    return { ok: false, reason: "That file looks empty." };
  }
  if (candidate.sizeBytes > MAX_ATTACHMENT_BYTES) {
    return { ok: false, reason: "That image is too large even after compression." };
  }
  return { ok: true };
}

const EXTENSION: Record<AttachmentMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Storage key for a receipt: namespaced by expense, opaque id, typed suffix. */
export function attachmentStorageKey(expenseId: string, id: string, mime: AttachmentMime): string {
  return `receipts/${expenseId}/${id}.${EXTENSION[mime]}`;
}

import { NextResponse } from "next/server";
import { getSession } from "@/features/auth/session";
import { addAttachment } from "@/features/attachments/service";
import { AppError } from "@/server/errors";
import { logger } from "@/server/logger";
import { uploadLimiter } from "@/server/ratelimit";
import { MAX_ATTACHMENT_BYTES } from "@/lib/attachments";

export const runtime = "nodejs";

/** Multipart receipt upload. The blob body is already client-compressed. */
export async function POST(request: Request): Promise<Response> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { success } = await uploadLimiter.limit(`upload:${session.user.id}`);
  if (!success) {
    return NextResponse.json({ error: "Too many uploads — slow down." }, { status: 429 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const expenseId = form.get("expenseId");
  if (!(file instanceof File) || typeof expenseId !== "string") {
    return NextResponse.json({ error: "A file and expenseId are required." }, { status: 400 });
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return NextResponse.json({ error: "That image is too large." }, { status: 413 });
  }

  const width = Number(form.get("width")) || undefined;
  const height = Number(form.get("height")) || undefined;
  const blurhashValue = form.get("blurhash");
  const blurhash = typeof blurhashValue === "string" && blurhashValue ? blurhashValue : undefined;
  const data = Buffer.from(await file.arrayBuffer());

  try {
    const { id } = await addAttachment(
      {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image ?? null,
      },
      { expenseId, mime: file.type, sizeBytes: data.byteLength, data, width, height, blurhash },
    );
    return NextResponse.json({ id, viewUrl: `/api/attachments/${id}` });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    logger.error({ err: error }, "attachment upload failed");
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}

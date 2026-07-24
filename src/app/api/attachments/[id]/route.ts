import { NextResponse } from "next/server";
import { getSession } from "@/features/auth/session";
import { getAttachmentForView } from "@/features/attachments/queries";

export const runtime = "nodejs";

/** Authorized receipt access: only a group member / owner is redirected to the blob. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const found = await getAttachmentForView(session.user.id, id);
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.redirect(found.url);
}

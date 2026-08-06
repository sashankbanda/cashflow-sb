import { NextResponse } from "next/server";
import { getSession } from "@/features/auth/session";
import { getFullExport } from "@/features/settings/export-service";
import { logger } from "@/server/logger";

export const runtime = "nodejs";

/** Whole-account takeout: one JSON document with everything the user owns. */
export async function GET(): Promise<Response> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = await getFullExport(session.user.id);
    const day = new Date().toISOString().slice(0, 10);
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="cashflow-data-${day}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    logger.error({ err: error }, "full export failed");
    return NextResponse.json({ error: "Export failed." }, { status: 500 });
  }
}

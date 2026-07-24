import { NextResponse } from "next/server";
import { csvDocument } from "@/lib/csv";
import { getSession } from "@/features/auth/session";
import {
  GROUP_EXPORT_HEADERS,
  PERSONAL_EXPORT_HEADERS,
  getGroupExportRows,
  getPersonalExportRows,
  type ExportRow,
} from "@/features/reports/queries";
import { AppError } from "@/server/errors";
import { logger } from "@/server/logger";

export const runtime = "nodejs";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Filter-aware CSV export (personal ledger or a group), streamed as UTF-8. */
export async function GET(request: Request): Promise<Response> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const type = url.searchParams.get("type") === "group" ? "group" : "personal";
  const groupId = url.searchParams.get("groupId") ?? undefined;
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const range = from && to && DATE.test(from) && DATE.test(to) ? { from, to } : undefined;

  try {
    let headers: ReadonlyArray<string>;
    let rows: ExportRow[];
    let name: string;

    if (type === "group") {
      if (!groupId) return NextResponse.json({ error: "groupId is required." }, { status: 400 });
      headers = GROUP_EXPORT_HEADERS;
      rows = await getGroupExportRows(session.user.id, groupId, range);
      name = `cashflow-group-${groupId}`;
    } else {
      headers = PERSONAL_EXPORT_HEADERS;
      rows = await getPersonalExportRows(session.user.id, range);
      name = "cashflow-personal";
    }

    const doc = csvDocument(headers, rows);
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(doc));
        controller.close();
      },
    });

    return new Response(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${name}-${range?.to ?? "all"}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error({ err: error }, "csv export failed");
    return NextResponse.json({ error: "Export failed." }, { status: 500 });
  }
}

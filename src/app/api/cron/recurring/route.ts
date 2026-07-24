import { NextResponse } from "next/server";
import { env } from "@/env";
import { formatISODate } from "@/lib/dates";
import { logger } from "@/server/logger";
import { materializeDueRules } from "@/features/recurring/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily recurring-expense materializer. Triggered by Vercel Cron (see
 * vercel.json). Verifies the `CRON_SECRET` bearer token when one is configured;
 * in local dev with no secret set it runs unauthenticated for manual testing.
 */
export async function GET(request: Request): Promise<Response> {
  const secret = env.CRON_SECRET;
  if (secret) {
    const authorization = request.headers.get("authorization");
    if (authorization !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const today = formatISODate(new Date());
  try {
    const result = await materializeDueRules(today);
    logger.info({ today, ...result }, "recurring cron run");
    return NextResponse.json({ ok: true, today, ...result });
  } catch (error) {
    logger.error({ err: error, today }, "recurring cron failed");
    return NextResponse.json({ ok: false, error: "cron_failed" }, { status: 500 });
  }
}

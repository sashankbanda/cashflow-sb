import { NextResponse } from "next/server";
import { env } from "@/env";
import { logger } from "@/server/logger";
import { sendWeeklyReminders } from "@/features/notifications/auto-remind";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Weekly settle-up nudges. Triggered by Vercel Cron (see vercel.json).
 * Verifies the `CRON_SECRET` bearer token when one is configured; in local
 * dev with no secret set it runs unauthenticated for manual testing.
 */
export async function GET(request: Request): Promise<Response> {
  const secret = env.CRON_SECRET;
  if (secret) {
    const authorization = request.headers.get("authorization");
    if (authorization !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await sendWeeklyReminders();
    logger.info(result, "reminder cron run");
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    logger.error({ err: error }, "reminder cron failed");
    return NextResponse.json({ ok: false, error: "cron_failed" }, { status: 500 });
  }
}

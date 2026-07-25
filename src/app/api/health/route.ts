import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/server/db";
import { logger } from "@/server/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Liveness + DB readiness probe for deploy checks and uptime monitoring. */
export async function GET(): Promise<Response> {
  const version = process.env.APP_VERSION ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "dev";
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json(
      { status: "ok", version, time: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logger.error({ err: error }, "health check failed");
    return NextResponse.json(
      { status: "degraded", db: "down", version },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

import { NextResponse } from "next/server";
import { logger } from "@/server/logger";

export const runtime = "nodejs";

interface VitalBody {
  name?: string;
  value?: number;
  id?: string;
  rating?: string;
  path?: string;
}

/** Collects Web Vitals beacons and emits them as structured logs (drain-ready). */
export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as VitalBody;
    if (body && typeof body.name === "string" && typeof body.value === "number") {
      logger.info(
        {
          metric: body.name,
          value: Math.round(body.value),
          rating: body.rating,
          path: body.path,
          id: body.id,
        },
        "web-vital",
      );
    }
  } catch {
    // Malformed beacon — ignore.
  }
  return new NextResponse(null, { status: 204 });
}

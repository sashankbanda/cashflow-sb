import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { captureFromText } from "@/features/capture/service";
import { captureLimiter } from "@/server/ratelimit";

/**
 * SMS auto-capture webhook. An iOS Shortcut automation (or Tasker) POSTs
 * `{ token, text }` when a bank message arrives; the entry saves itself and a
 * push notification asks the user to categorize. Token-authed (no cookies),
 * rate-limited per IP, idempotent per (user, text).
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { success } = await captureLimiter.limit(ip);
  if (!success) {
    return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as {
    token?: unknown;
    text?: unknown;
  } | null;
  const token = typeof body?.token === "string" ? body.token : "";
  const text = typeof body?.text === "string" ? body.text : "";
  if (token.length < 16 || text.length === 0 || text.length > 2000) {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }

  const result = await captureFromText(token, text);
  if (result.reason === "bad-token") {
    return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 401 });
  }
  if (!result.saved) {
    return NextResponse.json({ ok: true, saved: false, error: "No amount found" });
  }

  revalidatePath("/expenses");
  revalidatePath("/home");
  revalidatePath("/insights");
  revalidatePath("/budgets");
  return NextResponse.json({
    ok: true,
    saved: true,
    amountMinor: result.amountMinor,
    description: result.description,
    isIncome: result.isIncome,
  });
}

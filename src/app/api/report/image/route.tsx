import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { formatMoney } from "@/lib/format";
import { PALETTE_HEX } from "@/components/ui/palette";
import { getSession } from "@/features/auth/session";
import { getMonthlyReport } from "@/features/reports/queries";

export const runtime = "nodejs";

const MONTH = /^\d{4}-\d{2}$/;

/** 1200×630 shareable monthly-summary card (gradient, total, top categories). */
export async function GET(request: Request): Promise<Response> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const monthParam = new URL(request.url).searchParams.get("month");
  const report = await getMonthlyReport(
    session.user.id,
    monthParam && MONTH.test(monthParam) ? monthParam : undefined,
  );
  const [c0, c1, c2] = PALETTE_HEX.aurora;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: `linear-gradient(165deg, ${c0} 0%, ${c1} 52%, ${c2} 100%)`,
        color: "#ffffff",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 30, opacity: 0.8, letterSpacing: 1 }}>
          {report.monthLabel.toUpperCase()}
        </div>
        <div style={{ fontSize: 34, marginTop: 8, opacity: 0.9 }}>Spent this month</div>
        <div style={{ fontSize: 128, fontWeight: 800, letterSpacing: -3, lineHeight: 1.05 }}>
          {formatMoney(report.totalMinor)}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {report.topCategories.map((category) => (
          <div key={category.name} style={{ display: "flex", fontSize: 34, opacity: 0.95 }}>
            <span style={{ flex: 1 }}>{category.name}</span>
            <span style={{ fontWeight: 700 }}>{formatMoney(category.amountMinor)}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 30 }}>
        <span style={{ opacity: 0.85 }}>
          {report.netMinor >= 0 ? "Owed to you" : "You owe"}{" "}
          {formatMoney(Math.abs(report.netMinor))}
        </span>
        <span style={{ fontWeight: 800 }}>Cashflow</span>
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}

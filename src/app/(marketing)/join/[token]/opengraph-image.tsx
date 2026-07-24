import { ImageResponse } from "next/og";
import { asPalette, PALETTE_HEX } from "@/components/ui/palette";
import { getInviteByToken } from "@/features/groups/members-service";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Cashflow group invite";

/** Invite share card: group name on its gradient cover. */
export default async function OpenGraphImage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let name = "Cashflow";
  let emoji: string | null = null;
  let stops = PALETTE_HEX.aurora;
  try {
    const invite = await getInviteByToken(token);
    name = invite.group.name;
    emoji = invite.group.emoji;
    stops = PALETTE_HEX[asPalette(invite.group.gradient)];
  } catch {
    // Fall back to the brand card for invalid tokens.
  }

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(165deg, ${stops[0]} 0%, ${stops[1]} 52%, ${stops[2]} 100%)`,
        color: "#ffffff",
        fontFamily: "sans-serif",
      }}
    >
      {emoji ? <div style={{ fontSize: 120, marginBottom: 8 }}>{emoji}</div> : null}
      <div style={{ fontSize: 84, fontWeight: 700, letterSpacing: -2 }}>{name}</div>
      <div style={{ fontSize: 36, opacity: 0.75, marginTop: 16 }}>
        Join me on Cashflow — expenses, settled beautifully
      </div>
    </div>,
    size,
  );
}

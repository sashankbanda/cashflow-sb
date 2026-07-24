import { ImageResponse } from "next/og";

export const runtime = "nodejs";

/** Maskable PWA icon: full-bleed volt field with a dark ₹ in the safe zone. */
export function GET(request: Request): Response {
  const requested = Number(new URL(request.url).searchParams.get("size"));
  const size = requested === 512 ? 512 : 192;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#d4f82a",
        color: "#050506",
        fontSize: size * 0.56,
        fontWeight: 800,
        fontFamily: "sans-serif",
      }}
    >
      ₹
    </div>,
    { width: size, height: size },
  );
}

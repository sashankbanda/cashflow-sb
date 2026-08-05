import { ImageResponse } from "next/og";

export const runtime = "nodejs";

/** Maskable PWA icon: full-bleed emerald field with a white ₹ (brand accent). */
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
        background: "#0e8a4e",
        color: "#ffffff",
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

import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/** App areas that require a session (unauthenticated → sign-in). */
const PROTECTED = [
  "/home",
  "/groups",
  "/insights",
  "/activity",
  "/profile",
  "/budgets",
  "/recurring",
  "/reports",
  "/expenses",
  "/friends",
  "/search",
  "/settings",
];

function isProtected(pathname: string): boolean {
  return PROTECTED.some((base) => pathname === base || pathname.startsWith(`${base}/`));
}

function makeNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/**
 * Content-Security-Policy with a per-request nonce (Next applies it to its own
 * scripts) plus `strict-dynamic`. Styles stay `unsafe-inline` (framework +
 * Tailwind inject inline styles; nonce-ing them isn't practical). Dev adds the
 * eval/ws exceptions HMR needs.
 */
function buildCsp(nonce: string): string {
  const dev = process.env.NODE_ENV !== "production";
  const scriptSrc = ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", dev ? "'unsafe-eval'" : ""]
    .filter(Boolean)
    .join(" ");
  const connectSrc = ["'self'", dev ? "ws:" : ""].filter(Boolean).join(" ");

  return [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https://lh3.googleusercontent.com https://*.public.blob.vercel-storage.com`,
    `font-src 'self' data:`,
    `connect-src ${connectSrc}`,
    `worker-src 'self'`,
    `manifest-src 'self'`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
    `upgrade-insecure-requests`,
  ].join("; ");
}

function applySecurityHeaders(headers: Headers, csp: string): void {
  headers.set("Content-Security-Policy", csp);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Frame-Options", "DENY");
  headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(), geolocation=(), browsing-topics=()",
  );
  headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
}

export default function proxy(request: NextRequest): NextResponse {
  const nonce = makeNonce();
  const csp = buildCsp(nonce);

  if (isProtected(request.nextUrl.pathname) && !getSessionCookie(request)) {
    const signIn = new URL("/sign-in", request.url);
    signIn.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(signIn);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  applySecurityHeaders(response.headers, csp);
  return response;
}

export const config = {
  // Every route except Next internals and public files (which need no headers/gate).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|robots.txt|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)",
  ],
};

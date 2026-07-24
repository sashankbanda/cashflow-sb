import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Optimistic auth gate for app routes: no session cookie → straight to
 * sign-in. Real session validation happens server-side in requireUser();
 * this only prevents unauthenticated shells from flashing.
 */
export default function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const signIn = new URL("/sign-in", request.url);
    signIn.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(signIn);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/home/:path*",
    "/groups/:path*",
    "/insights/:path*",
    "/activity/:path*",
    "/profile/:path*",
    "/budgets/:path*",
    "/expenses/:path*",
    "/friends/:path*",
    "/search/:path*",
  ],
};

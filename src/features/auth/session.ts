import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { users, type User } from "@/server/db/schema";

/** Request-deduped session lookup (cookie-cached for 5 min by Better Auth). */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

/** The authenticated user, or redirect to sign-in. Use in (app) pages. */
export async function requireUser(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }
  const { id, name, email, image } = session.user;
  return { id, name, email, image: image ?? null };
}

/** Full database row for the authenticated user (currency, timezone, …). */
export const requireDbUser = cache(async (): Promise<User> => {
  const sessionUser = await requireUser();
  const row = await db.query.users.findFirst({ where: eq(users.id, sessionUser.id) });
  if (!row) {
    redirect("/sign-in");
  }
  return row;
});

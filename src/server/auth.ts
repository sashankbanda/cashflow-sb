import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { env } from "@/env";
import { newId } from "@/lib/ids";
import { db } from "@/server/db";
import * as schema from "@/server/db/schema";

/**
 * Better Auth server instance. Google OAuth is the primary (and currently
 * only) provider; adding another provider is one entry in `socialProviders` —
 * account linking merges providers into the same user by verified email.
 */
export const auth = betterAuth({
  appName: "Cashflow",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
    schema,
  }),
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // rotate expiry at most daily
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // signed cookie cache: session reads skip the DB for 5 min
    },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 30,
    customRules: {
      "/sign-in/*": { window: 60, max: 5 },
    },
  },
  advanced: {
    database: {
      generateId: () => newId(),
    },
  },
  trustedOrigins: [env.BETTER_AUTH_URL, "http://localhost:3001"],
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;

import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import { env } from "@/env";
import * as schema from "./schema";

// The WebSocket driver (not neon-http) so db.transaction() is a real
// interactive transaction — money invariants depend on it.
if (typeof globalThis.WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

const pool = new Pool({ connectionString: env.DATABASE_URL });

export const db = drizzle({ client: pool, schema, casing: "snake_case" });

export type Database = typeof db;
/** The transaction handle passed into services running inside db.transaction. */
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

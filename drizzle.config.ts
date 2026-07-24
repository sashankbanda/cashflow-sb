import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/server/db/schema",
  out: "./src/server/db/migrations",
  dialect: "postgresql",
  casing: "snake_case",
  dbCredentials: {
    // Validated by src/env.ts at runtime; drizzle-kit runs outside Next.
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});

import "dotenv/config";
import { newId } from "@/lib/ids";
import { db } from "./index";
import { users } from "./schema";

/**
 * Development seed. Idempotent: running twice leaves the database unchanged.
 * Extended by later phases as the domain schema lands. Refuses to touch a
 * production database.
 */
async function seed(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed a production database.");
  }

  const devUser = {
    id: newId(),
    name: "Dev User",
    email: "dev@cashflow.local",
    emailVerified: true,
  } as const;

  await db.insert(users).values(devUser).onConflictDoNothing({ target: users.email });

  const total = await db.$count(users);
  console.log(`Seed complete. users: ${total}`);
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });

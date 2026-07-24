-- Search: trigram indexes for fast ILIKE omnisearch over expenses & groups.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expenses_description_trgm"
  ON "expenses" USING gin ("description" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expenses_notes_trgm"
  ON "expenses" USING gin ("notes" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "groups_name_trgm"
  ON "groups" USING gin ("name" gin_trgm_ops);

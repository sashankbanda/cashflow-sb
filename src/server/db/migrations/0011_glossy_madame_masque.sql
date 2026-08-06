ALTER TABLE "users" ADD COLUMN "opening_balance_set_on" date;--> statement-breakpoint
-- Existing balances get anchored today (stops the historical double-count
-- immediately); re-saving the balance re-anchors it precisely.
UPDATE "users" SET "opening_balance_set_on" = current_date WHERE "opening_balance_minor" IS NOT NULL;
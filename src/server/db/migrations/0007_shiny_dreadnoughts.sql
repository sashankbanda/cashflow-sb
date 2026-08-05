ALTER TABLE "users" ADD COLUMN "capture_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_captureToken_unique" UNIQUE("capture_token");
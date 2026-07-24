CREATE TYPE "public"."activity_verb" AS ENUM('group_created', 'group_updated', 'group_archived', 'member_added', 'member_joined', 'member_claimed', 'member_left', 'invite_created', 'expense_added', 'expense_updated', 'expense_deleted', 'settlement_recorded', 'settlement_deleted', 'budget_hit');--> statement-breakpoint
CREATE TYPE "public"."budget_period" AS ENUM('monthly', 'weekly');--> statement-breakpoint
CREATE TYPE "public"."split_type" AS ENUM('equal', 'exact', 'percent', 'shares');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('owner', 'member');--> statement-breakpoint
CREATE TYPE "public"."recurring_frequency" AS ENUM('daily', 'weekly', 'monthly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."settlement_method" AS ENUM('cash', 'upi', 'bank', 'other');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('expense_added', 'settlement_recorded', 'settlement_reminder', 'member_joined', 'member_claimed', 'budget_threshold');--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text,
	"actor_user_id" text NOT NULL,
	"verb" "activity_verb" NOT NULL,
	"object_type" text NOT NULL,
	"object_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" text PRIMARY KEY NOT NULL,
	"expense_id" text NOT NULL,
	"uploaded_by" text NOT NULL,
	"url" text NOT NULL,
	"mime" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"width" integer,
	"height" integer,
	"blurhash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"category_id" text,
	"amount_minor" bigint NOT NULL,
	"period" "budget_period" DEFAULT 'monthly' NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date,
	"rollover" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budgets_user_category_period_uq" UNIQUE NULLS NOT DISTINCT("user_id","category_id","period"),
	CONSTRAINT "budgets_amount_positive" CHECK (amount_minor > 0)
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"icon" text NOT NULL,
	"gradient" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_user_name_uq" UNIQUE NULLS NOT DISTINCT("user_id","name")
);
--> statement-breakpoint
CREATE TABLE "expense_payers" (
	"id" text PRIMARY KEY NOT NULL,
	"expense_id" text NOT NULL,
	"member_id" text,
	"user_id" text,
	"amount_minor" bigint NOT NULL,
	CONSTRAINT "expense_payers_amount_positive" CHECK (amount_minor > 0)
);
--> statement-breakpoint
CREATE TABLE "expense_splits" (
	"id" text PRIMARY KEY NOT NULL,
	"expense_id" text NOT NULL,
	"member_id" text,
	"user_id" text,
	"amount_minor" bigint NOT NULL,
	"weight" double precision,
	CONSTRAINT "expense_splits_amount_non_negative" CHECK (amount_minor >= 0)
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text,
	"description" text NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" char(3) DEFAULT 'INR' NOT NULL,
	"category_id" text,
	"split_type" "split_type" NOT NULL,
	"expense_date" date NOT NULL,
	"notes" text,
	"created_by" text NOT NULL,
	"recurring_rule_id" text,
	"idempotency_key" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expenses_idempotencyKey_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "expenses_amount_positive" CHECK (amount_minor > 0)
);
--> statement-breakpoint
CREATE TABLE "group_members" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"user_id" text,
	"display_name" text NOT NULL,
	"role" "member_role" DEFAULT 'member' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"left_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"emoji" text,
	"gradient" text DEFAULT 'ocean' NOT NULL,
	"currency" char(3) DEFAULT 'INR' NOT NULL,
	"created_by" text NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurring_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"group_id" text,
	"template" jsonb NOT NULL,
	"frequency" "recurring_frequency" NOT NULL,
	"interval" integer DEFAULT 1 NOT NULL,
	"next_run_on" date NOT NULL,
	"ends_on" date,
	"paused_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settlements" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"from_member_id" text NOT NULL,
	"to_member_id" text NOT NULL,
	"amount_minor" bigint NOT NULL,
	"method" "settlement_method" DEFAULT 'upi' NOT NULL,
	"note" text,
	"settled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settlements_amount_positive" CHECK (amount_minor > 0),
	CONSTRAINT "settlements_distinct_parties" CHECK (from_member_id <> to_member_id)
);
--> statement-breakpoint
CREATE TABLE "invites" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"group_id" text NOT NULL,
	"member_id" text,
	"created_by" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"max_uses" integer,
	"use_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" "notification_type" NOT NULL,
	"payload" jsonb NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"keys" jsonb NOT NULL,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "expense_tags" (
	"expense_id" text NOT NULL,
	"tag_id" text NOT NULL,
	CONSTRAINT "expense_tags_expense_id_tag_id_pk" PRIMARY KEY("expense_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_user_name_uq" UNIQUE("user_id","name")
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_expense_id_expenses_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_payers" ADD CONSTRAINT "expense_payers_expense_id_expenses_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_payers" ADD CONSTRAINT "expense_payers_member_id_group_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."group_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_payers" ADD CONSTRAINT "expense_payers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_splits" ADD CONSTRAINT "expense_splits_expense_id_expenses_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_splits" ADD CONSTRAINT "expense_splits_member_id_group_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."group_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_splits" ADD CONSTRAINT "expense_splits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_recurring_rule_id_recurring_rules_id_fk" FOREIGN KEY ("recurring_rule_id") REFERENCES "public"."recurring_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_rules" ADD CONSTRAINT "recurring_rules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_rules" ADD CONSTRAINT "recurring_rules_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_from_member_id_group_members_id_fk" FOREIGN KEY ("from_member_id") REFERENCES "public"."group_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_to_member_id_group_members_id_fk" FOREIGN KEY ("to_member_id") REFERENCES "public"."group_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_member_id_group_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."group_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_tags" ADD CONSTRAINT "expense_tags_expense_id_expenses_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_tags" ADD CONSTRAINT "expense_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_logs_group_idx" ON "activity_logs" USING btree ("group_id","id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "activity_logs_actor_idx" ON "activity_logs" USING btree ("actor_user_id","id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "attachments_expense_idx" ON "attachments" USING btree ("expense_id");--> statement-breakpoint
CREATE INDEX "budgets_user_idx" ON "budgets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "categories_user_idx" ON "categories" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "expense_payers_expense_member_uq" ON "expense_payers" USING btree ("expense_id","member_id") WHERE member_id is not null;--> statement-breakpoint
CREATE INDEX "expense_payers_member_idx" ON "expense_payers" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "expense_payers_user_idx" ON "expense_payers" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "expense_splits_expense_member_uq" ON "expense_splits" USING btree ("expense_id","member_id") WHERE member_id is not null;--> statement-breakpoint
CREATE INDEX "expense_splits_member_idx" ON "expense_splits" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "expense_splits_user_expense_idx" ON "expense_splits" USING btree ("user_id","expense_id");--> statement-breakpoint
CREATE INDEX "expenses_group_date_idx" ON "expenses" USING btree ("group_id","expense_date" DESC NULLS LAST) WHERE deleted_at is null;--> statement-breakpoint
CREATE INDEX "expenses_creator_date_idx" ON "expenses" USING btree ("created_by","expense_date" DESC NULLS LAST) WHERE group_id is null and deleted_at is null;--> statement-breakpoint
CREATE INDEX "expenses_category_idx" ON "expenses" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "group_members_group_user_uq" ON "group_members" USING btree ("group_id","user_id") WHERE user_id is not null;--> statement-breakpoint
CREATE INDEX "group_members_user_idx" ON "group_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "group_members_group_idx" ON "group_members" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "recurring_rules_next_run_idx" ON "recurring_rules" USING btree ("next_run_on") WHERE paused_at is null;--> statement-breakpoint
CREATE INDEX "recurring_rules_user_idx" ON "recurring_rules" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "settlements_group_idx" ON "settlements" USING btree ("group_id","settled_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "settlements_from_member_idx" ON "settlements" USING btree ("from_member_id");--> statement-breakpoint
CREATE INDEX "settlements_to_member_idx" ON "settlements" USING btree ("to_member_id");--> statement-breakpoint
CREATE INDEX "invites_group_idx" ON "invites" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "notifications_user_read_idx" ON "notifications" USING btree ("user_id","read_at","created_at" DESC NULLS LAST);
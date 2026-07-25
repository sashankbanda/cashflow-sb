CREATE INDEX "expense_payers_expense_idx" ON "expense_payers" USING btree ("expense_id");--> statement-breakpoint
CREATE INDEX "expense_splits_expense_idx" ON "expense_splits" USING btree ("expense_id");--> statement-breakpoint
CREATE INDEX "expenses_creator_category_idx" ON "expenses" USING btree ("created_by","category_id") WHERE deleted_at is null;--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "notifications" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_idx" ON "push_subscriptions" USING btree ("user_id");
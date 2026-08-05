ALTER TABLE "categories" ADD COLUMN "kind" text DEFAULT 'expense' NOT NULL;--> statement-breakpoint
INSERT INTO "categories" ("id","user_id","name","icon","gradient","kind","sort") VALUES
 ('sys-inc-salary',NULL,'Salary','banknote','mint','income',100),
 ('sys-inc-business',NULL,'Freelance & Business','briefcase','ocean','income',101),
 ('sys-inc-gift',NULL,'Gifts received','gift','iris','income',102),
 ('sys-inc-refund',NULL,'Refunds','undo-2','solar','income',103),
 ('sys-inc-interest',NULL,'Interest & Returns','trending-up','mint','income',104),
 ('sys-inc-other',NULL,'Other income','shapes','ocean','income',105)
ON CONFLICT ("id") DO NOTHING;
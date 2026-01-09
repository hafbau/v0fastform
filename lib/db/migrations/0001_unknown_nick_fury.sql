ALTER TABLE "apps" ADD COLUMN IF NOT EXISTS "spec" jsonb;
--> statement-breakpoint
UPDATE "apps" SET "spec" = '{}'::jsonb WHERE "spec" IS NULL;
--> statement-breakpoint
ALTER TABLE "apps" ALTER COLUMN "spec" SET DEFAULT '{}'::jsonb;
--> statement-breakpoint
ALTER TABLE "apps" ALTER COLUMN "spec" SET NOT NULL;

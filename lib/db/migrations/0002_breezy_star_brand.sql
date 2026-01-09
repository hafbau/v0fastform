CREATE TABLE IF NOT EXISTS "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appId" uuid NOT NULL,
	"data" jsonb NOT NULL,
	"status" varchar(20) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
	IF to_regclass('public.submissions') IS NOT NULL
		AND NOT EXISTS (
			SELECT 1
			FROM pg_constraint
			WHERE conname = 'submissions_appId_apps_id_fk'
				AND conrelid = to_regclass('public.submissions')
		)
	THEN
		ALTER TABLE "submissions"
			ADD CONSTRAINT "submissions_appId_apps_id_fk"
			FOREIGN KEY ("appId")
			REFERENCES "public"."apps"("id") ON DELETE no action ON UPDATE no action;
	END IF;
END $$;

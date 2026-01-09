ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "submittedBy" varchar(255);
--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "assignedTo" varchar(255);
--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "deleted" timestamp;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "submissionHistory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submissionId" uuid NOT NULL,
	"status" varchar(20) NOT NULL,
	"updatedBy" varchar(255) NOT NULL,
	"notes" varchar(1000),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
	IF to_regclass('public.\"submissionHistory\"') IS NOT NULL
		AND NOT EXISTS (
			SELECT 1
			FROM pg_constraint
			WHERE conname = 'submissionHistory_submissionId_submissions_id_fk'
				AND conrelid = to_regclass('public.\"submissionHistory\"')
		)
	THEN
		ALTER TABLE "submissionHistory"
			ADD CONSTRAINT "submissionHistory_submissionId_submissions_id_fk"
			FOREIGN KEY ("submissionId")
			REFERENCES "public"."submissions"("id") ON DELETE no action ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verificationTokens" (
	"identifier" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
	IF to_regclass('public.\"verificationTokens\"') IS NOT NULL
		AND NOT EXISTS (
			SELECT 1
			FROM pg_constraint
			WHERE conname = 'verificationTokens_identifier_token_unique'
				AND conrelid = to_regclass('public.\"verificationTokens\"')
		)
	THEN
		ALTER TABLE "verificationTokens"
			ADD CONSTRAINT "verificationTokens_identifier_token_unique"
			UNIQUE ("identifier", "token");
	END IF;
END $$;

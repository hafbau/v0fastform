-- Rename tables to camelCase
ALTER TABLE "anonymous_chat_logs" RENAME TO "anonymousChatLogs";
--> statement-breakpoint
ALTER TABLE "chat_ownerships" RENAME TO "chatOwnerships";
--> statement-breakpoint
-- Rename columns in users table
ALTER TABLE "users" RENAME COLUMN "created_at" TO "createdAt";
--> statement-breakpoint
-- Rename columns in anonymousChatLogs table
ALTER TABLE "anonymousChatLogs" RENAME COLUMN "ip_address" TO "ipAddress";
--> statement-breakpoint
ALTER TABLE "anonymousChatLogs" RENAME COLUMN "v0_chat_id" TO "v0ChatId";
--> statement-breakpoint
ALTER TABLE "anonymousChatLogs" RENAME COLUMN "created_at" TO "createdAt";
--> statement-breakpoint
-- Rename columns in chatOwnerships table
ALTER TABLE "chatOwnerships" RENAME COLUMN "v0_chat_id" TO "v0ChatId";
--> statement-breakpoint
ALTER TABLE "chatOwnerships" RENAME COLUMN "user_id" TO "userId";
--> statement-breakpoint
ALTER TABLE "chatOwnerships" RENAME COLUMN "created_at" TO "createdAt";
--> statement-breakpoint
-- Rename constraints to match new table/column names
ALTER TABLE "chatOwnerships" DROP CONSTRAINT IF EXISTS "chat_ownerships_v0_chat_id_unique";
--> statement-breakpoint
ALTER TABLE "chatOwnerships" ADD CONSTRAINT "chatOwnerships_v0ChatId_unique" UNIQUE("v0ChatId");
--> statement-breakpoint
ALTER TABLE "chatOwnerships" DROP CONSTRAINT IF EXISTS "chat_ownerships_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "chatOwnerships" ADD CONSTRAINT "chatOwnerships_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
-- Create apps table
CREATE TABLE "apps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "apps" ADD CONSTRAINT "apps_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
-- Add appId column to chatOwnerships (nullable for existing data migration)
ALTER TABLE "chatOwnerships" ADD COLUMN "appId" uuid;
--> statement-breakpoint
ALTER TABLE "chatOwnerships" ADD CONSTRAINT "chatOwnerships_appId_apps_id_fk" FOREIGN KEY ("appId") REFERENCES "public"."apps"("id") ON DELETE no action ON UPDATE no action;

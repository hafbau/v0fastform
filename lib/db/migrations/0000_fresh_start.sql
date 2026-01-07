-- Drop existing tables (both old snake_case and new camelCase names)
DROP TABLE IF EXISTS "chatOwnerships" CASCADE;
DROP TABLE IF EXISTS "chat_ownerships" CASCADE;
DROP TABLE IF EXISTS "apps" CASCADE;
DROP TABLE IF EXISTS "anonymousChatLogs" CASCADE;
DROP TABLE IF EXISTS "anonymous_chat_logs" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(64) NOT NULL,
	"password" varchar(64),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "apps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chatOwnerships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"v0ChatId" varchar(255) NOT NULL,
	"userId" uuid NOT NULL,
	"appId" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "chatOwnerships_v0ChatId_unique" UNIQUE("v0ChatId")
);
--> statement-breakpoint
CREATE TABLE "anonymousChatLogs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ipAddress" varchar(45) NOT NULL,
	"v0ChatId" varchar(255) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "apps" ADD CONSTRAINT "apps_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "chatOwnerships" ADD CONSTRAINT "chatOwnerships_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "chatOwnerships" ADD CONSTRAINT "chatOwnerships_appId_apps_id_fk" FOREIGN KEY ("appId") REFERENCES "public"."apps"("id") ON DELETE no action ON UPDATE no action;

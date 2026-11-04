ALTER TABLE "profiles" ADD COLUMN "avatar" "bytea";--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "avatar_mime" varchar(20);--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "avatar_updated_at" timestamp with time zone;
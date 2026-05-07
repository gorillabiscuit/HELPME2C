CREATE TYPE "public"."privacy_level" AS ENUM('public', 'friends', 'private');--> statement-breakpoint
CREATE TYPE "public"."watch_entry_kind" AS ENUM('anchor', 'tracking');--> statement-breakpoint
CREATE TYPE "public"."watch_status" AS ENUM('watching', 'completed', 'on_hold', 'dropped', 'plan_to_watch');--> statement-breakpoint
CREATE TABLE "watch_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title_id" uuid NOT NULL,
	"kind" "watch_entry_kind" NOT NULL,
	"status" "watch_status",
	"current_episode" integer,
	"rating" integer,
	"notes" text,
	"privacy" "privacy_level" DEFAULT 'private' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "watch_entries" ADD CONSTRAINT "watch_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch_entries" ADD CONSTRAINT "watch_entries_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "watch_entries_user_title_idx" ON "watch_entries" USING btree ("user_id","title_id");--> statement-breakpoint
CREATE INDEX "watch_entries_user_status_idx" ON "watch_entries" USING btree ("user_id","status");
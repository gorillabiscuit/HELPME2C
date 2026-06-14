CREATE TABLE "reason_feedback_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title_id" uuid NOT NULL,
	"mode" text NOT NULL,
	"question_shown" text NOT NULL,
	"options_shown" jsonb NOT NULL,
	"selected_slugs" text[] DEFAULT '{}' NOT NULL,
	"none_of_these_fit" boolean DEFAULT false NOT NULL,
	"free_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reason_feedback_events" ADD CONSTRAINT "reason_feedback_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reason_feedback_events" ADD CONSTRAINT "reason_feedback_events_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE cascade ON UPDATE no action;
CREATE TABLE "anonymous_watch_signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"anonymous_user_id" uuid NOT NULL,
	"title_id" uuid NOT NULL,
	"kind" "watch_entry_kind" NOT NULL,
	"status" "watch_status",
	"rating" integer,
	"current_episode" integer,
	"original_created_at" timestamp with time zone NOT NULL,
	"original_updated_at" timestamp with time zone NOT NULL,
	"anonymised_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "anonymous_watch_signals" ADD CONSTRAINT "anonymous_watch_signals_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "anonymous_watch_signals_title_idx" ON "anonymous_watch_signals" USING btree ("title_id");--> statement-breakpoint
CREATE INDEX "anonymous_watch_signals_anon_user_idx" ON "anonymous_watch_signals" USING btree ("anonymous_user_id");--> statement-breakpoint
CREATE INDEX "anonymous_watch_signals_title_rating_idx" ON "anonymous_watch_signals" USING btree ("title_id","rating");
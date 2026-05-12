CREATE TABLE "pairwise_comparisons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"winner_title_id" uuid NOT NULL,
	"loser_title_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "watch_entries" ADD COLUMN "manual_rank" integer;--> statement-breakpoint
ALTER TABLE "watch_entries" ADD COLUMN "elo_score" double precision;--> statement-breakpoint
ALTER TABLE "pairwise_comparisons" ADD CONSTRAINT "pairwise_comparisons_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pairwise_comparisons" ADD CONSTRAINT "pairwise_comparisons_winner_title_id_titles_id_fk" FOREIGN KEY ("winner_title_id") REFERENCES "public"."titles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pairwise_comparisons" ADD CONSTRAINT "pairwise_comparisons_loser_title_id_titles_id_fk" FOREIGN KEY ("loser_title_id") REFERENCES "public"."titles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pairwise_user_created_idx" ON "pairwise_comparisons" USING btree ("user_id","created_at");--> statement-breakpoint
-- Backfill: rated-taste model treats "your taste" as the set of rated
-- entries. Existing loved=true rows from the previous unified-taste model
-- represent titles the user has explicitly flagged as taste-defining —
-- the rated-taste analogue is rating=10. Only backfill rows without an
-- existing rating (don't overwrite 1-9 ratings the user already set).
UPDATE "watch_entries" SET "rating" = 10 WHERE "loved" = true AND "rating" IS NULL;
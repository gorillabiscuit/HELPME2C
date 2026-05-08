CREATE TYPE "public"."rec_feedback_rating" AS ENUM('terrible', 'bad', 'ok', 'good', 'terrific');--> statement-breakpoint
CREATE TABLE "rec_feedback" (
	"user_id" uuid NOT NULL,
	"title_id" uuid NOT NULL,
	"rating" "rec_feedback_rating",
	"dismissed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rec_feedback_user_id_title_id_pk" PRIMARY KEY("user_id","title_id")
);
--> statement-breakpoint
ALTER TABLE "rec_feedback" ADD CONSTRAINT "rec_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rec_feedback" ADD CONSTRAINT "rec_feedback_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE cascade ON UPDATE no action;
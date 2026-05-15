CREATE TABLE "title_themes" (
	"title_id" uuid NOT NULL,
	"theme_slug" text NOT NULL,
	"label" text NOT NULL,
	"confidence" real NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "title_themes_title_id_theme_slug_pk" PRIMARY KEY("title_id","theme_slug")
);
--> statement-breakpoint
ALTER TABLE "title_themes" ADD CONSTRAINT "title_themes_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "title_themes_slug_idx" ON "title_themes" USING btree ("theme_slug");
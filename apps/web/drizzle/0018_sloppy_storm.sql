CREATE TABLE "title_descriptors" (
	"title_id" uuid PRIMARY KEY NOT NULL,
	"viewer_pleasures" text[] NOT NULL,
	"tone" text[] NOT NULL,
	"subtextual_themes" text[] DEFAULT '{}' NOT NULL,
	"narrative_mode" text NOT NULL,
	"engagement_level" text NOT NULL,
	"stakes_scale" text NOT NULL,
	"source_model" text NOT NULL,
	"prompt_version" text NOT NULL,
	"extracted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "title_comparable_titles" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"title_id" uuid NOT NULL,
	"position" smallint NOT NULL,
	"referenced_title" text NOT NULL,
	"referenced_title_id" uuid,
	"reason" text NOT NULL,
	"source_model" text NOT NULL,
	"prompt_version" text NOT NULL,
	"extracted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "title_comparable_titles_title_position_uq" UNIQUE("title_id","position")
);
--> statement-breakpoint
ALTER TABLE "title_themes" ADD COLUMN "prompt_version" text DEFAULT 'v1' NOT NULL;--> statement-breakpoint
ALTER TABLE "title_themes" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "title_descriptors" ADD CONSTRAINT "title_descriptors_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "title_comparable_titles" ADD CONSTRAINT "title_comparable_titles_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "title_comparable_titles" ADD CONSTRAINT "title_comparable_titles_referenced_title_id_titles_id_fk" FOREIGN KEY ("referenced_title_id") REFERENCES "public"."titles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "title_comparable_titles_title_id_idx" ON "title_comparable_titles" USING btree ("title_id");--> statement-breakpoint
CREATE INDEX "title_comparable_titles_ref_id_idx" ON "title_comparable_titles" USING btree ("referenced_title_id") WHERE referenced_title_id IS NOT NULL;
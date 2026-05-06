CREATE TYPE "public"."media_source" AS ENUM('tmdb', 'anilist');--> statement-breakpoint
CREATE TYPE "public"."media_type" AS ENUM('tv', 'film', 'anime');--> statement-breakpoint
CREATE TYPE "public"."title_status" AS ENUM('ongoing', 'completed', 'cancelled', 'upcoming');--> statement-breakpoint
CREATE TYPE "public"."streaming_type" AS ENUM('streaming', 'rent', 'buy', 'free');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text NOT NULL,
	"display_name" text,
	"region" text DEFAULT 'eu' NOT NULL,
	"age_verified" boolean DEFAULT false NOT NULL,
	"age_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"source" "media_source" NOT NULL,
	"category" text,
	"description" text,
	CONSTRAINT "tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "title_tags" (
	"title_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"weight" real DEFAULT 100 NOT NULL,
	"is_spoiler" boolean DEFAULT false NOT NULL,
	CONSTRAINT "title_tags_title_id_tag_id_pk" PRIMARY KEY("title_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "titles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text NOT NULL,
	"source" "media_source" NOT NULL,
	"media_type" "media_type" NOT NULL,
	"title" text NOT NULL,
	"original_title" text,
	"synopsis" text,
	"status" "title_status",
	"release_year" integer,
	"end_year" integer,
	"episode_count" integer,
	"episode_duration_minutes" integer,
	"poster_url" text,
	"backdrop_url" text,
	"popularity_score" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "streaming_availability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title_id" uuid NOT NULL,
	"provider_id" text NOT NULL,
	"provider_name" text NOT NULL,
	"provider_logo_url" text,
	"country_code" text NOT NULL,
	"type" "streaming_type" NOT NULL,
	"source_url" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "title_tags" ADD CONSTRAINT "title_tags_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "title_tags" ADD CONSTRAINT "title_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streaming_availability" ADD CONSTRAINT "streaming_availability_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tags_name_idx" ON "tags" USING btree ("name");--> statement-breakpoint
CREATE INDEX "tags_source_idx" ON "tags" USING btree ("source");--> statement-breakpoint
CREATE INDEX "titles_external_id_source_idx" ON "titles" USING btree ("external_id","source");--> statement-breakpoint
CREATE INDEX "titles_media_type_idx" ON "titles" USING btree ("media_type");--> statement-breakpoint
CREATE INDEX "titles_release_year_idx" ON "titles" USING btree ("release_year");--> statement-breakpoint
CREATE INDEX "streaming_title_country_idx" ON "streaming_availability" USING btree ("title_id","country_code");--> statement-breakpoint
CREATE INDEX "streaming_provider_idx" ON "streaming_availability" USING btree ("provider_id");
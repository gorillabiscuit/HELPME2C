ALTER TABLE "users" ADD COLUMN "preview_audio_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "titles" ADD COLUMN "trailer_provider" text;--> statement-breakpoint
ALTER TABLE "titles" ADD COLUMN "trailer_video_id" text;
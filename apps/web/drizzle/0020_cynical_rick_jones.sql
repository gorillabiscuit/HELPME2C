DROP INDEX "titles_external_id_source_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "titles_external_id_source_media_type_idx" ON "titles" USING btree ("external_id","source","media_type");
ALTER TABLE "titles" ADD COLUMN "id_mal" integer;--> statement-breakpoint
CREATE INDEX "titles_id_mal_idx" ON "titles" USING btree ("id_mal");
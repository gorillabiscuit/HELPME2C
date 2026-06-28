ALTER TABLE "titles" ADD COLUMN "genres" text[];
CREATE INDEX "titles_genres_gin_idx" ON "titles" USING gin ("genres");
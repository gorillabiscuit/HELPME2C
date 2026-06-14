-- Enable pg_trgm for fuzzy / typo-tolerant title search.
-- GIN indexes on title + original_title support word_similarity() queries
-- and are safe to create concurrently on a live table (no table lock).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX CONCURRENTLY IF NOT EXISTS titles_title_trgm_idx
  ON titles USING GIN (title gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS titles_original_title_trgm_idx
  ON titles USING GIN (original_title gin_trgm_ops);

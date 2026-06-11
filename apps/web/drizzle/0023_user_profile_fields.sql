-- Add birth_year and gender to users table.
-- birth_year: 4-digit year (e.g. 1990). Nullable — existing users haven't provided it.
-- gender: free-text with a short suggested set ('male','female','non-binary','prefer_not_to_say').
--   Stored as text rather than enum so we can add options without a migration.
-- filter_providers: opt-in flag. When false (default), recommendations are not filtered
--   by the user's connected streaming providers — full catalog discovery is preserved.
--   When true, only titles available on their connected providers are shown.
ALTER TABLE "users"
  ADD COLUMN "birth_year" smallint,
  ADD COLUMN "gender" text,
  ADD COLUMN "filter_providers" boolean NOT NULL DEFAULT false;

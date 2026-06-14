ALTER TABLE "rec_feedback"
  ADD COLUMN "dismissal_reason" text,
  ADD COLUMN "dismissed_until"  timestamptz;

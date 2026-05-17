import { boolean, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Per-entry visibility. Default private — safer if the user never chooses.
// Lives on users.ts (not watch.ts) because users.default_privacy references
// the same enum, and putting it here keeps the import direction one-way
// (watch → users) without a circular dep.
export const privacyLevelEnum = pgEnum('privacy_level', ['public', 'friends', 'private']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Clerk's opaque user ID — never email, per ADR-0012 §9.
  clerkId: text('clerk_id').notNull().unique(),
  displayName: text('display_name'),
  // Region captured at age-check; determines which GDPR threshold applies
  // (ADR-0012 §5). Phase 1B will derive this from `country` and drop the
  // column — kept for backwards-compat through the transition (existing
  // rows have `region` but not `country`).
  region: text('region', { enum: ['eu', 'row'] })
    .notNull()
    .default('eu'),
  // ISO-3166-1 alpha-2 country code, IP-defaulted at age-check (Vercel's
  // x-vercel-ip-country header) with one-tap correction. Added 2026-05-17
  // per the cold-start research §1.4 — country is the proper granularity
  // for streaming-availability filtering (TMDB watch_region takes country,
  // not the eu/row split). Nullable until the user completes the new
  // age-check; existing users see NULL until they re-verify or until the
  // Phase 1B backfill ticket lands.
  country: text('country'),
  // Household composition: solo / partner / family / housemates. Drives
  // group-rec routing (which aggregation strategy to apply by default).
  // Defaults to 'solo' so existing users get a sensible non-null value
  // without re-onboarding; new onboarding flow (next PR) collects this
  // explicitly post-picker.
  household: text('household', {
    enum: ['solo', 'partner', 'family', 'housemates'],
  })
    .notNull()
    .default('solo'),
  ageVerified: boolean('age_verified').notNull().default(false),
  // We store the fact of verification, not the birth date (ADR-0012 §5).
  ageVerifiedAt: timestamp('age_verified_at', { withTimezone: true }),
  // Default visibility applied to new watch_entries when the user doesn't
  // pick one explicitly. Existing entries are NOT retroactively updated when
  // this changes — per-entry privacy is the source of truth.
  defaultPrivacy: privacyLevelEnum('default_privacy').notNull().default('private'),
  // Whether trailer-preview modals start with audio on. Defaults to true
  // because the user is in a discovery flow and the audio is part of
  // the preview. Users who'd rather browse silently flip this in
  // /settings/account.
  previewAudioEnabled: boolean('preview_audio_enabled').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

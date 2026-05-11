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
  // Region captured at age-check; used as a soft prior for recommendations and
  // determines which GDPR threshold applies (ADR-0012 §5).
  region: text('region', { enum: ['eu', 'row'] })
    .notNull()
    .default('eu'),
  ageVerified: boolean('age_verified').notNull().default(false),
  // We store the fact of verification, not the birth date (ADR-0012 §5).
  ageVerifiedAt: timestamp('age_verified_at', { withTimezone: true }),
  // Default visibility applied to new watch_entries when the user doesn't
  // pick one explicitly. Existing entries are NOT retroactively updated when
  // this changes — per-entry privacy is the source of truth.
  defaultPrivacy: privacyLevelEnum('default_privacy').notNull().default('private'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

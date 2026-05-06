import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

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
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

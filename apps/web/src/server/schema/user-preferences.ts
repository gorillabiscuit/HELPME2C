import { jsonb, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

// Feature-preference vector collected during onboarding Screen 3.
// One row per user, upserted on change. Deletable under ADR-0012.
//
// Stored as JSONB rather than typed columns because:
//   1. The preference axes are expected to evolve (new facets, new
//      axes from Phase 1B research) — schema migrations for every
//      axis change would be expensive.
//   2. The scoring layer reads this as a plain object and maps it to
//      the facet vocabulary — no per-column indexing needed.
//
// Privacy: per synthesis-onboarding-quiz.md §4, we store coarse derived
// bands (-1 to +1 on each axis) NOT raw personality-trait scores.
// NFA-avoidance scores and moral-ambiguity items require separate
// ADR-0012 stop-and-ask before storage — they are NOT included here.
//
// Shape of the `preferences` JSONB (all fields optional, null = not set):
//   tone:            number | null  // -1 = brooding, +1 = playful
//   pacing:          number | null  // -1 = slow-burn, +1 = fast-paced
//   ending:          number | null  // -1 = downbeat, +1 = uplifting
//   intensity:       number | null  // -1 = cosy/light, +1 = emotionally intense
//   complexity:      number | null  // -1 = straightforward, +1 = complex
//   moral:           number | null  // -1 = clear heroes/villains, +1 = morally grey
//   violenceVeto:    boolean | null // true = avoid graphic violence
//   sexualContentVeto: boolean | null // true = avoid sexual content
export interface UserPreferencesData {
  tone?: number | null;
  pacing?: number | null;
  ending?: number | null;
  intensity?: number | null;
  complexity?: number | null;
  moral?: number | null;
  violenceVeto?: boolean | null;
  sexualContentVeto?: boolean | null;
  // Vocabulary slugs surfaced via the AI insight conversation screen.
  // Each entry is a slug the user confirmed they value (from like picks)
  // or want to avoid (from dislike picks). Used to boost/suppress facet
  // weights in the scoring layer. Stored as slug strings, not scores,
  // so the mapping can be updated without re-running onboarding.
  insightSlugs?: string[] | null;
  insightAvoidSlugs?: string[] | null;
}

export const userPreferences = pgTable('user_preferences', {
  userId: uuid('user_id')
    .primaryKey()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  preferences: jsonb('preferences').notNull().$type<UserPreferencesData>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

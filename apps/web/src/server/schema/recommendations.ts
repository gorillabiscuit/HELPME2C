import { boolean, jsonb, pgEnum, pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core';
import { titles } from './titles';
import { users } from './users';

// Shape of the JSONB payload column. Bumping schemaVersion lets the reader
// detect old payloads and trigger a recompute without a column migration.
// Validated at the application layer (the Inngest job writer + the tRPC
// reader); Drizzle's $type<> annotation surfaces this shape at the TS level.
export interface RecommendationsPayload {
  readonly schemaVersion: 1;
  readonly items: ReadonlyArray<{ readonly titleId: string; readonly score: number }>;
}

// Pre-computed personal recommendations cache per ADR-0013.
//
// Single row per user, keyed by users.id (the internal uuid, NOT clerk_id —
// matches the watch_entries pattern). The Inngest job in M4 commit 4
// computes the ranked list, serialises it into `payload`, and replaces the
// row wholesale. Read path is one indexed PK lookup, returning JSONB —
// well under the <500ms p95 personal-rec budget per ADR-0008.
//
// Cascade-deletes on user erasure (the DSAR contract from commit 5cd2afa).
//
// `payload` shape, by convention (validated at the application layer):
//
//   {
//     "schemaVersion": 1,
//     "items": [
//       { "titleId": "<uuid>", "score": <number> },
//       ...up to 200 (M4 plan default cap)
//     ]
//   }
//
// schemaVersion lets us evolve the JSONB structure later (e.g. adding
// per-item explanation strings, diversity-rerank metadata, etc.) without
// a column migration. The reader checks the version and falls back to
// recomputing if it doesn't recognise the payload.
export const userRecommendations = pgTable('user_recommendations', {
  // PRIMARY KEY makes the user_id lookup index automatic — sub-10ms p95
  // for a single-row JSONB read on the free Neon tier per ADR-0013.
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),

  payload: jsonb('payload').$type<RecommendationsPayload>().notNull(),

  // When the Inngest compute job last wrote this row. Used by the read
  // path to decide whether to recommend on stale data ("computed Xh ago")
  // and by the compute job itself to skip users whose row is fresher than
  // the trigger window (e.g. user just changed an anchor and the
  // user-event-driven recompute already ran).
  computedAt: timestamp('computed_at', { withTimezone: true }).notNull().defaultNow(),
});

// Per-rec user feedback (M6.2). Two independent signals merged into one
// row per (user, title):
//
//   rating    — 5-level coarse-scale "did the recommender do well?".
//               Collected for future algorithm tuning per ROADMAP.md M6.
//               No current consumer; the rec engine stays purely
//               taste-vector driven (per packages/ml/CLAUDE.md the moat
//               boundary stays clean — no scoring change here).
//   dismissed — "stop showing me this rec." Excluded by
//               recommendations.list at read time. Drives the
//               "Not interested" / "Seen it" quick-actions on dashboard
//               rec cards.
//
// Either field can be set independently. Upsert pattern: ON CONFLICT
// DO UPDATE on the (user_id, title_id) PK. Removed via account-deletion
// cascade per ADR-0012 §account-deletion.
export const recFeedbackRatingEnum = pgEnum('rec_feedback_rating', [
  'terrible',
  'bad',
  'ok',
  'good',
  'terrific',
]);

export const recFeedback = pgTable(
  'rec_feedback',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    titleId: uuid('title_id')
      .notNull()
      .references(() => titles.id, { onDelete: 'cascade' }),
    rating: recFeedbackRatingEnum('rating'),
    dismissed: boolean('dismissed').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.titleId] })],
);

export type RecFeedbackRating = (typeof recFeedbackRatingEnum.enumValues)[number];

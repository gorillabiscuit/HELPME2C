import {
  boolean,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { titles } from './titles';
import { users } from './users';

// Shape of the JSONB payload column. Bumping schemaVersion lets the reader
// detect old payloads and trigger a recompute without a column migration.
// Validated at the application layer (the Inngest job writer + the tRPC
// reader); Drizzle's $type<> annotation surfaces this shape at the TS level.
//
// v2 (current): items carry an optional `reasonHint` — a pre-formatted
// "Why this rec?" string (e.g. "Because you like dark crime") computed
// at engine time from the taste vector and stored denormalised so the
// read path stays simple. `reasonHint` is nullable because cold-start
// filler items + the long tail below the explain budget don't carry
// one; the UI just hides the subtitle when null.
//
// v1 (legacy): items are { titleId, score }. The reader falls back to
// no reasonHint when it sees a v1 payload; the next cron writes v2.
export interface RecommendationItemV2 {
  readonly titleId: string;
  readonly score: number;
  readonly reasonHint: string | null;
}

export interface RecommendationsPayload {
  readonly schemaVersion: 2;
  readonly items: ReadonlyArray<RecommendationItemV2>;
}

// Forward-compat helper for the reader — accepts either v1 or v2 in
// the JSONB column. The reader maps both into the v2 shape with
// reasonHint=null for legacy rows.
export interface RecommendationsPayloadAny {
  readonly schemaVersion: 1 | 2;
  readonly items: ReadonlyArray<{
    readonly titleId: string;
    readonly score: number;
    readonly reasonHint?: string | null;
  }>;
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

  payload: jsonb('payload').$type<RecommendationsPayloadAny>().notNull(),

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
    // "Not interested" — user actively dismissed. The engine's read
    // path excludes these from future recs (recommendations.list).
    dismissed: boolean('dismissed').notNull().default(false),
    // "Don't know it" — user has no opinion because they don't
    // recognise the show. Soft signal: recorded for analytics but the
    // engine does NOT exclude on this. Distinct semantic from
    // dismissed (which is real negative signal). Added 2026-05-15.
    unfamiliar: boolean('unfamiliar').notNull().default(false),
    // Structured reason for dismissal — one of the five reason chips
    // the user can pick after clicking "Not interested". NULL when the
    // user skipped reason selection. Stored as text (not pg enum) so
    // new reasons don't require migrations.
    dismissalReason: text('dismissal_reason'),
    // Non-null when the dismissal is mood-based ("not in the mood").
    // The exclusion filter in recommendations.list treats rows with a
    // future dismissed_until as suppressed even if dismissed=false,
    // so the title can resurface after the window expires without a
    // separate DB write.
    dismissedUntil: timestamp('dismissed_until', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.titleId] })],
);

export type RecFeedbackRating = (typeof recFeedbackRatingEnum.enumValues)[number];

// Append-only log of onboarding reason-answer events (ADR-0027). Distinct
// from the scoring path: `saveInsight` folds selected slugs into the user's
// preference vector and overwrites, discarding which question was asked,
// which options were shown, and any "None of these fit" / free-text answer.
// This table preserves the raw event so the taxonomy can be improved later
// (discovery of axes the chip set is missing — e.g. spectacle, format veto).
//
// NOT a preference signal: free text is captured for taxonomy-discovery,
// routing, and the procedural-justice voice effect — never trusted as a
// per-user scoring input (the Wilson & Schooler confabulation problem an
// LLM cannot solve; see ADR-0027 §Why).
//
// Privacy: free_text is user-generated content that may contain PII.
// Hard-deleted on account deletion via the user_id CASCADE (ADR-0012);
// included in the Article 15/20 export. Anonymisation of the structured
// fields for the discovery job is deferred (same posture as rec_feedback).
export const reasonFeedbackEvents = pgTable('reason_feedback_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  titleId: uuid('title_id')
    .notNull()
    .references(() => titles.id, { onDelete: 'cascade' }),
  // Which onboarding question this answered — like ("what made it click")
  // or dislike ("what put you off"). Text, not enum: matches saveInsight.
  mode: text('mode', { enum: ['like', 'dislike'] }).notNull(),
  // The exact question + options the user saw, so a later analysis can
  // interpret the answer without reconstructing the (LLM-generated) prompt.
  questionShown: text('question_shown').notNull(),
  optionsShown: jsonb('options_shown').$type<Array<{ label: string; slugs: string[] }>>().notNull(),
  // The slugs the user's selected chips mapped to (empty when they picked
  // only "None of these fit" or a viewer-state escape hatch).
  selectedSlugs: text('selected_slugs').array().notNull().default([]),
  // True when the user tapped "None of these fit" — the highest-value
  // discovery signal (the taxonomy demonstrably failed for them here).
  noneOfTheseFit: boolean('none_of_these_fit').notNull().default(false),
  // Optional free text, surfaced only after "None of these fit". NULL when
  // the user skipped it (the common case). Never required.
  freeText: text('free_text'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type ReasonFeedbackMode = 'like' | 'dislike';

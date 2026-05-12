import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { titles } from './titles';
import { privacyLevelEnum, users } from './users';

// Discriminates onboarding "anchor" picks (M3 Path A — user stated this is
// their taste, no claim about viewing history) from "tracking" entries
// (M3 Path B — user is/has watched). Different rec-engine signal weights.
// A row can graduate from anchor → tracking when a user who picked X as an
// anchor later starts watching it; the (user, title) unique index ensures
// one row per pair.
export const watchEntryKindEnum = pgEnum('watch_entry_kind', ['anchor', 'tracking']);

// Standard MAL/AniList vocabulary. Phase 1A only — Phase 2 may add
// platform-specific equivalents.
export const watchStatusEnum = pgEnum('watch_status', [
  'watching',
  'completed',
  'on_hold',
  'dropped',
  'plan_to_watch',
]);

// privacyLevelEnum lives on users.ts — it's referenced by both
// users.default_privacy and watch_entries.privacy, and putting it there
// avoids a circular import (watch already imports users).

// One row per (user, title). Both M3 intake paths (onboarding anchors,
// manual tracking) converge on this table. Rec engine reads it in M4.
export const watchEntries = pgTable(
  'watch_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // FK to users.id (internal uuid, NOT clerk_id). Cascade-delete on user
    // erasure works through this FK without touching the DSAR endpoint.
    //
    // ADR-0012 §2 anticipates anonymising behavioural signals rather than
    // deleting them — preserving aggregate rec-engine signal across user
    // churn. That requires this column to be nullable + on-delete-set-null,
    // which complicates every query that joins to users. Defer the
    // migration to M4 when the rec engine actually consumes this data;
    // for now, cascade-delete keeps the schema simple and the DSAR
    // contract intact.
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    titleId: uuid('title_id')
      .notNull()
      .references(() => titles.id, { onDelete: 'cascade' }),

    kind: watchEntryKindEnum('kind').notNull(),

    // Set when kind='tracking'. Null for anchor-only rows.
    status: watchStatusEnum('status'),

    // Per-episode progress for TV / anime. Null for films and for entries
    // where progress isn't being tracked yet.
    currentEpisode: integer('current_episode'),

    // 1–10. Null until the user explicitly rates.
    rating: integer('rating'),

    // Free-text. Treated as PII for DSAR — user could write anything.
    // Cleared via the cascade on user erasure even if/when behavioural
    // signals migrate to anonymised-rather-than-deleted.
    notes: text('notes'),

    privacy: privacyLevelEnum('privacy').notNull().default('private'),

    // "I love this — treat it as taste-defining." The unified-taste model
    // (see docs/UX_AUDIT.md) drops the user-facing distinction between
    // anchors and tracked entries: a tracking row (status=watching,
    // rating=8) can ALSO be loved without overwriting its kind. Rec
    // engine treats kind='anchor' OR loved=true as a high-weight signal.
    loved: boolean('loved').notNull().default(false),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // One row per (user, title). UNIQUE — required for any future upsert
    // ON CONFLICT target (e.g. anchor-pick-that-becomes-tracking),
    // matching the lesson from titles_external_id_source_idx.
    uniqueIndex('watch_entries_user_title_idx').on(t.userId, t.titleId),
    // "Show me this user's list filtered by status" — the most common
    // expected query shape on the M3 list/dashboard surface.
    index('watch_entries_user_status_idx').on(t.userId, t.status),
  ],
);

// ---------------------------------------------------------------------------
// Anonymous watch signals — the moat-preservation half of ADR-0012 §2.
// ---------------------------------------------------------------------------
//
// On account deletion, the existing FK CASCADE on watch_entries.user_id
// hard-deletes every entry. Per ADR-0012 §2 we want to preserve the
// rating / behaviour signal as aggregate input for the rec engine while
// genuinely severing the link to the user.
//
// Strategy: BEFORE the cascade fires, the delete route COPIES each
// watch_entry into this table with a per-deletion random UUID as
// `anonymous_user_id`. The random UUID is generated server-side at
// deletion time and never stored anywhere else — so "these N entries
// came from the same person" is preserved (useful for collaborative-
// filtering co-occurrence signal), but no rejoin path exists back to
// the original user. ADR-0012 §2: "Once the deletion job runs, the
// data is unlinkable."
//
// `original_created_at` and `original_updated_at` preserve the temporal
// shape of the user's list so future time-windowed signal extraction
// can use them. `anonymised_at` marks when this row transitioned out of
// identifiable storage.
//
// No FK to users (the whole point). FK on titles.id with cascade is
// fine — if the title is gone, the signal about that title is moot.
//
// Not currently READ by anything — it's a write-side commitment for the
// future rec-engine evolution that uses this signal. The current engine
// reads only live `watch_entries` (per recompute.ts).
export const anonymousWatchSignals = pgTable(
  'anonymous_watch_signals',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Random per-deletion uuid. Generated server-side at deletion time
    // and discarded after the COPY completes — there is intentionally
    // no record anywhere of "user X became anonymous_user_id Y."
    anonymousUserId: uuid('anonymous_user_id').notNull(),

    titleId: uuid('title_id')
      .notNull()
      .references(() => titles.id, { onDelete: 'cascade' }),

    // Mirrors watch_entries shape so future signal extraction can use
    // the same field semantics without re-mapping.
    kind: watchEntryKindEnum('kind').notNull(),
    status: watchStatusEnum('status'),
    rating: integer('rating'),
    currentEpisode: integer('current_episode'),

    // Preserves the time profile of the original entry. Useful if we
    // ever want to weight recent ratings more heavily than old ones.
    originalCreatedAt: timestamp('original_created_at', { withTimezone: true }).notNull(),
    originalUpdatedAt: timestamp('original_updated_at', { withTimezone: true }).notNull(),

    anonymisedAt: timestamp('anonymised_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('anonymous_watch_signals_title_idx').on(t.titleId),
    // For "all signal from one anonymous person" lookup — useful for
    // collaborative-filtering co-occurrence queries.
    index('anonymous_watch_signals_anon_user_idx').on(t.anonymousUserId),
    // For rating-distribution analytics per title.
    index('anonymous_watch_signals_title_rating_idx').on(t.titleId, t.rating),
  ],
);

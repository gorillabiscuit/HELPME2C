import {
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
import { users } from './users';

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

// Per-entry visibility. Default private — safer if the user never chooses.
// Actual UX for setting this lands in M9 (privacy hardening); schema is in
// place now so we don't migrate later.
export const privacyLevelEnum = pgEnum('privacy_level', ['public', 'friends', 'private']);

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

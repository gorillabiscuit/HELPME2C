import { sql } from 'drizzle-orm';
import {
  bigserial,
  index,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { titles } from './titles';

// LLM-produced "comparable titles" graph — per ADR-0025 / ADR-0026. For each
// title, the V4 extraction produces 3-5 comparable works (any medium) with
// a one-phrase reason for the shared appeal. This table is 1:N — one row
// per (title, comparable, position).
//
// Why a separate table (not JSONB array on `title_descriptors`):
//   - The N:1 structure invites graph queries — "which titles reference X
//     as comparable" is a one-index lookup, not a JSONB scan.
//   - Resolution to `referenced_title_id` is a clear nullable FK column;
//     JSONB would bury it inside the array element.
//   - Per-row source/prompt_version lets us re-resolve unresolved strings
//     later (as the catalog grows) without touching the descriptor row.
//
// FK resolution: at extraction time, the comparable's `referenced_title`
// string is matched case-insensitively against `titles.title`. Match
// found → `referenced_title_id` is set. No match → NULL, and the string
// is preserved for debugging or later re-resolution (e.g. via pgvector
// embedding similarity in Phase 2 per ADR-0006).
//
// The recommender (per ADR-0027) walks ONLY the resolved-FK edges. Unresolved
// strings contribute nothing to scoring — they're noise without an FK.
//
// `position` is the LLM's ranked order (0-4). Used to weight edges in the
// scoring kernel: position 0 is "most similar," position 4 is "weakest of
// the listed comparables." UNIQUE (title_id, position) prevents the same
// slot being filled twice in a re-extraction.
export const titleComparableTitles = pgTable(
  'title_comparable_titles',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    titleId: uuid('title_id')
      .notNull()
      .references(() => titles.id, { onDelete: 'cascade' }),
    // 0-4 — the LLM's rank order for comparable strength. Preserved for
    // the scoring kernel to weight edges.
    position: smallint('position').notNull(),
    // The title string the LLM produced. May or may not match a catalog
    // entry — see referencedTitleId below.
    referencedTitle: text('referenced_title').notNull(),
    // Resolved FK to the catalog title, if a match was found at extraction
    // time. NULL when the LLM cited a work not in our catalog.
    // ON DELETE SET NULL: if the referenced title is later removed from
    // the catalog, this edge becomes unresolved (but stays in place for
    // potential later re-resolution).
    referencedTitleId: uuid('referenced_title_id').references(() => titles.id, {
      onDelete: 'set null',
    }),
    // The LLM's one-phrase explanation of the shared appeal. Kept for
    // explanation UX ("Recommended because: <reason>") and for prompt
    // iteration debugging.
    reason: text('reason').notNull(),
    // Provenance — same shape as title_descriptors. See ADR-0026.
    sourceModel: text('source_model').notNull(),
    promptVersion: text('prompt_version').notNull(),
    extractedAt: timestamp('extracted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Position slots are 0-4 per title; UNIQUE prevents duplicate slots
    // from a buggy re-extraction.
    unique('title_comparable_titles_title_position_uq').on(t.titleId, t.position),
    // Fast lookup of all comparables for a given title (forward edges).
    index('title_comparable_titles_title_id_idx').on(t.titleId),
    // Fast lookup of all titles that reference X (reverse edges) — used by
    // the recommender's comparable-graph traversal. Partial index because
    // unresolved rows (NULL) aren't queried for reverse lookup.
    index('title_comparable_titles_ref_id_idx')
      .on(t.referencedTitleId)
      .where(sql`referenced_title_id IS NOT NULL`),
  ],
);

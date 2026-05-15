import { index, pgTable, primaryKey, real, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { titles } from './titles';

// LLM-extracted thematic descriptors per title. Distinct from the existing
// `themes` / `tag_themes` tables (which are an editorial tag→theme bridge
// for the AniList/TMDB taxonomy). This table holds NEW signal computed
// by passing each title's synopsis through Claude Haiku; the goal is to
// replace surface-level demographic tags ("Male Protagonist", "Shounen")
// as the source of "Why this rec?" copy with substantive thematic
// descriptors ("grief-driven revenge", "found family", "moral compromise
// under institutional pressure").
//
// One row per (title, theme) — multiple themes per title (typically 3-7
// after extraction), and themes are shared across titles when the LLM
// produces matching slugs. The `confidence` field is the LLM's self-
// reported confidence (0-1) so the rec engine can weight strong themes
// higher than tentative ones.
//
// The reasonHint generator (apps/web/src/inngest/functions/recommend.ts)
// prefers titleThemes over the legacy tag-based reasons when available
// — a title with any extracted theme overrides the "Because you like
// male protagonist" fallback path.
export const titleThemes = pgTable(
  'title_themes',
  {
    titleId: uuid('title_id')
      .notNull()
      .references(() => titles.id, { onDelete: 'cascade' }),
    // Editorial-stable kebab-case slug. The LLM is constrained to a
    // controlled vocabulary defined in the extraction script — free-form
    // text would produce drift ("revenge driven" vs "driven by revenge")
    // and kill cross-title theme matching. New slugs surface as gaps to
    // review before being added to the vocabulary.
    themeSlug: text('theme_slug').notNull(),
    // Human-readable label for the theme. Stored on every row (denormalised
    // from a hypothetical themes-vocab table) so the read path stays a
    // single indexed scan; the trade-off is that renaming a theme means a
    // bulk UPDATE rather than one row. The vocabulary is small (~50
    // canonical slugs) and renames are rare, so the trade is favourable.
    label: text('label').notNull(),
    // 0..1 confidence reported by the LLM. Used to weight themes when
    // picking the headline for "Why this rec?" and to skip noise floor.
    confidence: real('confidence').notNull(),
    // Source model identifier (e.g. "claude-sonnet-4-6"). Lets us detect
    // stale extractions when we upgrade the model + rerun.
    source: text('source').notNull(),
    // Extraction prompt version (e.g. 'v1', 'v4.0'). Per ADR-0026, paired
    // with `source` so we can target re-extraction at specific (model,
    // prompt) cohorts. Existing V1 rows default to 'v1'.
    promptVersion: text('prompt_version').notNull().default('v1'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    // Updated on every re-extraction. The original ON CONFLICT DO UPDATE
    // pattern left created_at frozen at first-extraction time, which made
    // it impossible to tell stale rows from fresh ones. `updated_at` is
    // bumped on every UPSERT — see extract.ts persistThemes.
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.titleId, t.themeSlug] }),
    // Reverse lookup: "find all titles with theme X" — used by the
    // cross-medium bridges surface and future faceted discovery.
    index('title_themes_slug_idx').on(t.themeSlug),
  ],
);

import { integer, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { tags } from './titles';

// Cross-medium themes — the editorial substrate that bridges TMDB's
// lowercase user-submitted-ish keywords ("super power", "antihero", "post-
// apocalyptic") with AniList's curated Title-Case taxonomy ("Super Power",
// "Anti-Hero", "Post-Apocalyptic"). Even where the concept is identical,
// the case-sensitive UNIQUE on tags.name keeps them as separate rows; this
// table maps both into a single canonical theme.
//
// Editorial workflow (per the reviewer's 2026-05-07 framing):
//
//   1. A maintainer adds entries to packages/ml/src/themes/mappings.ts
//   2. Triggers the apply-themes Inngest event (M2 commit
//      apps/web/src/inngest/functions/apply-themes.ts)
//   3. The function looks up tag IDs by (source, name), upserts theme
//      rows, upserts tag_themes link rows
//
// The mappings file is the source of truth; this DB representation is
// what the rec engine (M4+) reads at scoring time. Removing a mapping
// from the source file does NOT delete the DB row — orphans are
// harmless (the tag still scores via direct tag-overlap; the theme
// just has one fewer member).
//
// Future M4 follow-on: the rec engine extracts user taste at the THEME
// level instead of (or in addition to) the tag level, so an anchor
// tagged with TMDB's "tragedy" lights up the same theme as an anchor
// tagged with AniList's "Tragedy", and the cross-medium bridge starts
// producing recommendations that genuinely cross mediums. That's the
// product moat per PROJECT.md §revenue.
export const themes = pgTable('themes', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Editorial-stable identifier. Kebab-case. Used by the mappings file
  // as the canonical key — names can change, slugs shouldn't.
  slug: text('slug').notNull().unique(),

  // Human-readable name. Shown in admin/curation UI when one exists;
  // not currently surfaced to end users.
  name: text('name').notNull(),

  // What the theme covers, in plain English. Helps the next editor
  // understand intent without reverse-engineering the tag list.
  description: text('description'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Many-to-many join: a tag can belong to multiple themes (TMDB's
// "antihero" might map to both "antihero-protagonist" and "morally-
// complex-character"); a theme can include many tags from many sources
// (the whole point).
export const tagThemes = pgTable(
  'tag_themes',
  {
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    themeId: uuid('theme_id')
      .notNull()
      .references(() => themes.id, { onDelete: 'cascade' }),

    // Strength of the mapping (0-100). Hand-curated. v1 mappings are all
    // 100 (full match); partial mappings (e.g. "high school" → "school-
    // life" theme at strength 70 because the theme is broader) become
    // useful as the editorial surface matures.
    strength: integer('strength').notNull().default(100),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.tagId, t.themeId] })],
);

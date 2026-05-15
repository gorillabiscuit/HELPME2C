import { sql } from 'drizzle-orm';
import { check, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { titles } from './titles';

// V4 content descriptors — the LLM-extracted viewer-experience fields per
// ADR-0025 / ADR-0026. One row per title (1:1). The closed-vocab themes
// continue to live in `title_themes`; this table holds the six new fields:
// viewer_pleasures, tone, narrative_mode, subtextual_themes, engagement_level,
// stakes_scale.
//
// Why a separate table (not JSONB on `titles`):
//   - Editorial title metadata (TMDB-synced) and LLM-extracted descriptors
//     have different volatility profiles. TMDB columns rarely change; V4
//     descriptors get rewritten on every prompt iteration. Keeping them in
//     the same row mixes hot- and cold-read paths.
//   - Indexable enum columns (narrative_mode, engagement_level, stakes_scale)
//     stay queryable. JSONB would force ->'' lookups for every enum query.
//
// Why text[] (not JSONB) for the array fields:
//   - Postgres native arrays support `ANY()` and `@>` directly. GIN-indexable
//     when we need it.
//   - JSONB earns its place when array elements need per-item metadata
//     (e.g. confidence per pleasure). V4 doesn't — each entry is a plain
//     phrase. Migration to JSONB later is `jsonb_build_array(unnest(col))`
//     if our model evolves.
//
// Why CHECK + text (not Postgres ENUM) for narrative_mode / engagement_level
// / stakes_scale: changing ENUM members is harder to roll back than DROP
// CONSTRAINT / ADD CONSTRAINT. The V4 enums are stable for now, but the
// flexibility costs nothing.
//
// Why `source_model` + `prompt_version` per-row (not per-pipeline-run):
//   - We re-extract single titles for manual fixes and per-title prompt
//     iteration; per-row provenance makes "what's stale" a one-indexed-
//     lookup question instead of a join through a pipeline-runs table.
//   - Cost-attribution: pair (source_model, prompt_version) against the
//     Inngest run logs to compute marginal cost of re-extraction subsets.
//
// Deletion: ON DELETE CASCADE matches title_themes / title_comparable_titles.
// If a title is removed from the catalog, all its descriptors go with it.
//
// CHECK constraints on the three enum columns guard against parser drift —
// extract.ts validates enum values in parseRaw, but defence-in-depth at the
// schema level catches direct INSERTs (manual fixups, future tooling) that
// bypass the parser. TEXT + CHECK chosen over Postgres ENUM type because
// changing CHECK is one DROP/ADD; changing ENUM is harder to roll back.
export const titleDescriptors = pgTable(
  'title_descriptors',
  {
    titleId: uuid('title_id')
      .primaryKey()
      .references(() => titles.id, { onDelete: 'cascade' }),
    // 4-6 free-form short phrases naming concrete surface pleasures that
    // make someone press play. Open-vocab by design — see ADR-0025 for the
    // reasoning. Phase 2 will embed these for similarity scoring.
    viewerPleasures: text('viewer_pleasures').array().notNull(),
    // 2-4 free-form tonal descriptors. Single or compound adjectives.
    tone: text('tone').array().notNull(),
    // 0-4 free-form phrases describing depth for viewers who want it.
    // Allowed to be empty per the prompt — popcorn action films legitimately
    // have no subtext worth naming. Default '{}' supports that.
    subtextualThemes: text('subtextual_themes').array().notNull().default([]),
    // Enum: plays-straight | deconstructs | parodies | reinvents | hybrid.
    narrativeMode: text('narrative_mode').notNull(),
    // Enum: low | medium | high.
    engagementLevel: text('engagement_level').notNull(),
    // Enum: interpersonal | community | national | civilizational | cosmic.
    // The PRIMARY DRAMATIC stakes layer per ADR-0025 — where the work
    // invests emotional weight, not where its plot's action takes place.
    stakesScale: text('stakes_scale').notNull(),
    // Provenance — see top-of-file rationale.
    sourceModel: text('source_model').notNull(),
    promptVersion: text('prompt_version').notNull(),
    extractedAt: timestamp('extracted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'title_descriptors_narrative_mode_chk',
      sql`${t.narrativeMode} IN ('plays-straight', 'deconstructs', 'parodies', 'reinvents', 'hybrid')`,
    ),
    check(
      'title_descriptors_engagement_level_chk',
      sql`${t.engagementLevel} IN ('low', 'medium', 'high')`,
    ),
    check(
      'title_descriptors_stakes_scale_chk',
      sql`${t.stakesScale} IN ('interpersonal', 'community', 'national', 'civilizational', 'cosmic')`,
    ),
  ],
);

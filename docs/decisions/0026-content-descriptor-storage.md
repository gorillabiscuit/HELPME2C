# ADR-0026: Storage schema for V4 content descriptors

**Status:** Accepted
**Date:** 2026-05-15
**Supersedes:** —

## What we chose

Store the V4 extraction output (per [ADR-0025](0025-viewer-experience-extraction.md)) across **three tables**:

1. **`title_themes`** (existing — extended) — closed-vocab themes, one row per (title, slug). Add two columns: `prompt_version TEXT NOT NULL DEFAULT 'v1'` and `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` (`updated_at` set on every INSERT and on the existing `ON CONFLICT DO UPDATE`).

2. **`title_descriptors`** (new — 1:1 with titles) — the six new scalar/array fields:

   ```
   title_id          UUID PRIMARY KEY REFERENCES titles(id) ON DELETE CASCADE
   viewer_pleasures  TEXT[]  NOT NULL                -- 4–6 free-form phrases
   tone              TEXT[]  NOT NULL                -- 2–4 tonal descriptors
   subtextual_themes TEXT[]  NOT NULL DEFAULT '{}'   -- 0–4 phrases (may be empty)
   narrative_mode    TEXT    NOT NULL                -- enum, see CHECK constraint
   engagement_level  TEXT    NOT NULL                -- 'low' | 'medium' | 'high'
   stakes_scale      TEXT    NOT NULL                -- 'interpersonal' | 'community' | 'national' | 'civilizational' | 'cosmic'
   source_model      TEXT    NOT NULL                -- e.g. 'claude-sonnet-4-6'
   prompt_version    TEXT    NOT NULL                -- e.g. 'v4.0'
   extracted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
   ```
   Enum values enforced via `CHECK` constraints (not Postgres `ENUM` type — changing enum members is harder than text + CHECK). No indexes on enum columns at Phase 1A; add when a query demands one. `text[]` (Postgres native arrays) chosen over JSONB for the three free-form lists — simpler semantics, native `ANY()`/`@>` queries, GIN-indexable later if needed.

3. **`title_comparable_titles`** (new — 1:N, 3–5 rows per title) — comparable-titles graph:

   ```
   id                   BIGSERIAL PRIMARY KEY
   title_id             UUID    NOT NULL REFERENCES titles(id) ON DELETE CASCADE
   position             SMALLINT NOT NULL                       -- 0–4, LLM's rank
   referenced_title     TEXT    NOT NULL                        -- title string as produced by the LLM
   referenced_title_id  UUID    NULL REFERENCES titles(id) ON DELETE SET NULL  -- resolved FK if matched
   reason               TEXT    NOT NULL
   source_model         TEXT    NOT NULL
   prompt_version       TEXT    NOT NULL
   extracted_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
   UNIQUE (title_id, position)
   INDEX (title_id), INDEX (referenced_title_id) WHERE referenced_title_id IS NOT NULL
   ```
   Resolution to `referenced_title_id` happens at extraction time via case-insensitive exact match on `titles.title` (cheap, deterministic). Fuzzy matching deferred. Unresolved rows keep the FK NULL and retain the string for debugging + later re-resolution as the catalog grows.

**Per-row model + prompt provenance.** Every extracted row records `source_model`, `prompt_version`, and `extracted_at`. This lets us (a) detect stale extractions when a model or prompt changes, (b) attribute cost retroactively, (c) re-extract only the subset that needs it. Token-count / per-call cost columns are NOT added at Phase 1A — out-of-band logging (Inngest run metadata) is sufficient until we need finer cost analytics.

## What we rejected

- **Single JSONB column on `titles`** (`titles.descriptors_v4 JSONB`) — atomic single-row read, but loses indexability on the enum fields, makes the comparable-titles N:1 graph awkward to query, and conflates editorial title metadata (TMDB-synced) with LLM output (rebuilt on every prompt change). The two have different volatility profiles.
- **One mega-table** (`title_v4_extractions` holding themes + descriptors + comparable as JSONB) — simpler to write to, but throws away the existing `title_themes` shape that already feeds the reasonHint generator. Cleanest only if we were starting from scratch; we aren't.
- **Postgres `ENUM` types** for `narrative_mode` / `engagement_level` / `stakes_scale` — changing enum members in Postgres is more painful than `TEXT NOT NULL` + `CHECK`. The V4 enums are unlikely to change but if they do, `ALTER TYPE` is harder to roll back than `DROP CONSTRAINT / ADD CONSTRAINT`.
- **Resolving `referenced_title` to FK via fuzzy matching at extraction time** — trigram similarity + a confidence threshold would catch "Watchmen (2009 film)" → `titles[Watchmen]`, but it's noise we don't need to introduce in v1. The pgvector store (per [ADR-0006](0006-vector-store.md)) is the right tool for this resolution when Phase 2 opens — embed the comparable-string and nearest-neighbour against title embeddings.
- **Versioning by row history (event sourcing)** — keep every prior extraction with a `version` discriminator. Cheap insurance against bad re-extractions but doubles storage and complicates the read path. The current `ON CONFLICT DO UPDATE` pattern in `title_themes` is already destructive; this ADR preserves that and accepts the trade.
- **Storing token counts / `cost_usd` per row** — useful for finance-grade cost attribution but premature at Phase 1A. Inngest already logs per-run cost metadata; bulk cost can be computed from there. Revisit if catalog grows ≥10× or per-title re-extraction frequency rises.

## Why

Three observations driving the shape:

1. **The existing `title_themes` table works.** It's already shaped right for closed-vocab themes (1:N, slug + confidence + source), the reasonHint generator already reads it, and the schema needs only two additive columns (`prompt_version`, `updated_at`) to participate in V4. Replacing it would be churn for no gain.

2. **The new fields split cleanly into two shapes.** Six fields are per-title scalars or short arrays → `title_descriptors` (1:1). One field (`comparable_titles`) is genuinely N:1 with optional graph-edge semantics → its own table. Forcing all seven into one shape costs either query power (JSONB-only) or schema overhead (everything-is-a-table).

3. **Provenance per row, not per pipeline run.** When we re-extract one title (a manual fix, a per-title prompt iteration), we update *that title's* `source_model` + `prompt_version` + `extracted_at`. A pipeline-run table would force us to look up "which run was this title's last?" Per-row provenance keeps the read path one indexed lookup.

This is a §4 stop-and-ask schema change per CLAUDE.md (new tables + columns added to a populated `title_themes`). The two `ALTER TABLE` operations are additive-with-default → safe in Postgres, but per CLAUDE.md they still require a Neon-branch dry-run before production rollout: prove that the default fills don't lock the populated `title_themes` table for an unacceptable window. With ~3,000–15,000 rows in `title_themes` today, the lock window should be sub-second; the dry-run confirms.

**Migration / cutover plan:**

1. **Schema migration (additive only).** New tables + two columns on `title_themes`. Dry-run on Neon branch; apply to production. Rollback path is `DROP TABLE` on the new tables + `DROP COLUMN` on `title_themes` — trivial because nothing reads from them yet.
2. **Re-extraction run.** Inngest `extractThemesAll` updated to V4 prompt and Sonnet 4.6 default. For each title: (a) DELETE existing `title_themes` rows where `title_id = ?` (avoids stale themes lingering after a re-extraction with fewer themes), (b) INSERT new themes, descriptors, comparable rows in a single transaction per title. Cost estimate: **$30–60 one-shot** for the ~3,000-title catalog at Sonnet 4.6 rates (≈$0.02/call, batch of 1500/600 in/out tokens).
3. **Read path.** Until the recommender wiring ADR ships, only the reasonHint generator + admin tooling reads the new tables. The user-visible recommender continues to score via the existing `tag_themes` bridge; nothing breaks.
4. **Dual-write / deprecation.** Not needed. V1 `title_themes` rows are UPSERTed in place — no period where two extractions disagree. Old `prompt_version = 'v1'` rows that survive (because V4 happened to drop a previously-extracted theme) are cleaned by the DELETE-then-INSERT in step 2.

**Cost-attribution side-benefit.** Per-row `source_model` + `prompt_version` lets us answer questions like "what's the marginal cost of rerunning extraction on the 200 titles where the V4.0 prompt scored low engagement_level confidence?" without a separate audit table — just `SELECT title_id FROM title_descriptors WHERE prompt_version = 'v4.0' AND engagement_level = 'medium'` and pipe through the Inngest cost calculator.

## What would change our mind

- **The 1:1 `title_descriptors` table becomes the hottest join in the recommendation read path.** If `SELECT title FROM titles JOIN title_descriptors ON …` shows up in pg_stat_statements as a bottleneck, consider materialising into a single denormalised read table (or moving into a JSONB column on `titles`).
- **Comparable-title FK resolution rate is low (<60%).** If the case-insensitive-exact match doesn't resolve most LLM-produced strings (because the LLM cites foreign-language titles, partial titles, or titles missing from our catalog), we either expand catalog coverage or move resolution to pgvector embeddings sooner than planned.
- **Re-extraction frequency goes up.** If we end up re-extracting every title every 6 weeks because prompt iteration is constant, the destructive UPSERT loses information we'd want for retrospectives. Switch to versioned history.
- **Token-count cost becomes load-bearing.** If month-over-month LLM spend exceeds $1k and we can't trace what drove it, add `input_tokens` / `output_tokens` columns or a dedicated `extraction_audit` table.
- **JSONB beats text[] in practice.** If the array fields need richer per-element metadata (e.g. confidence per `viewer_pleasure`, or sentiment per `tone`), text[] becomes inadequate and JSONB wins. Migration is straightforward (`jsonb_build_array(unnest(text_col))`).

## Related

- [ADR-0025](0025-viewer-experience-extraction.md) — the extraction contract this storage schema serves.
- [ADR-0005](0005-database-postgres-host.md) — Neon Postgres; the migration runs on a Neon branch first.
- [ADR-0006](0006-vector-store.md) — pgvector; the eventual home of comparable-title resolution via embeddings.
- [ADR-0008](0008-ml-inference-approach.md) — pre-computed recs pipeline; this schema feeds it.
- [ADR-0019](0019-orm.md) — Drizzle; the new tables get Drizzle schema files alongside `title-themes.ts`.
- [CLAUDE.md](../../CLAUDE.md) §4 — schema-migration stop-and-ask scope.
- [apps/web/src/server/schema/title-themes.ts](../../apps/web/src/server/schema/title-themes.ts) — the existing schema this ADR extends.
- **Follow-up ADRs required before implementation:**
  (a) the **scoring-engine wiring ADR** flagged in [ADR-0025](0025-viewer-experience-extraction.md) — how `packages/ml` consumes the new tables.
  (b) eventually, the **Phase 2 embedding ADR** for `viewer_pleasures` / `comparable_titles` resolution.

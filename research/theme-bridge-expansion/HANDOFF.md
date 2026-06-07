# HANDOFF — theme-bridge expansion (41 → 200)

**Purpose:** Single document a fresh Claude Code session can load to begin implementing the theme-bridge expansion workflow proposed 2026-05-17.

**Companion artefacts** (don't load all of these upfront — pull in as needed):

- `research/theme-bridge-expansion/REPORT.md` — full research report
- `research/theme-bridge-expansion/raw/*.md` — per-source evidence
- `research/theme-bridge-expansion/RUN_LOG.md` — research-run audit trail

This file is the load-bearing summary. Everything below is **proposed default + context** the next session needs to act. **Decisions are NOT locked — Wouter has not reviewed yet.** See the DECISIONS PENDING section before starting any implementation work.

---

## DECISIONS PENDING (review before implementing)

These are the proposed defaults from the research. Wouter has not yet reviewed or signed off. The implementing session should either (a) start a conversation to confirm each, or (b) wait for Wouter's explicit sign-off. **Do not assume any of these are locked.**

1. **Vocabulary structure: shallow faceted (keep flat top layer, add `facet` column).**
   - Proposed defaults: facets = `emotional-pole`, `narrative-mode`, `aesthetic-register`, `subject-matter`, `protagonist-type`, `setting-context`.
   - Alternative considered + rejected by research: full hierarchy (Heymann auto-derivation produces ~50% acceptable parent-child links, too unreliable for HelpME2C's intentionally even distribution).
   - Open question: does Wouter want all 41 existing themes backfilled with facets in one PR, or one facet at a time?
2. **Candidate-generation model: `sentence-transformers/all-MiniLM-L6-v2`, cosine threshold ≥0.55, batch size 50.**
   - These are the research's defaults. Open question: Python dependency in a TypeScript project — Wouter may prefer a different language for the script (Bun + ONNX, Node + transformers.js).
3. **Curator tool: CLI in `scripts/theme-bridge-curation/`.**
   - Research-proposed default over an admin UI for git-trackability and zero new web infrastructure.
   - Open question: does the existing repo have a conventional location for scripts that read DB?
4. **Cadence: 5–10 bridges per 25-min session, 2 sessions/week.**
   - This is a Wouter-time commitment. Open for Wouter to decide.
5. **Pruning thresholds for per-bridge firing-rate (Track A):** N=20 fires AND M=10 distinct users after 30 days.
   - Tunable; defaults from the research are placeholders.
6. **External cultural-bias review pass before publishing 200 bridges.**
   - This requires Wouter to identify an external reviewer. Open.
7. **Ship order:** all 6 tooling tickets ship before any curation work begins, OR ship the CLI MVP first and grow tooling iteratively.
   - Research proposes the former (Phase 1 = 9 person-days, all tooling, then Phase 2 = curation).

---

## TICKETS, IN ORDER

### TICKET 1 — `HM2C-?` add `facet` column to `THEME_MAPPINGS` schema + backfill

**Scope:** schema migration + Drizzle schema update + backfill of 41 existing themes. ~1 person-day.

#### Stop-and-ask gates this ticket trips (per CLAUDE.md §4)

- **Schema migrations on existing tables:** YES — additive nullable column. Per §4 these are "usually safe" but still flag.
- **Touching the recommendation engine boundary** (`packages/ml/*`): NO — `THEME_MAPPINGS` lives in `packages/ml/src/themes/mappings.ts` but the `facet` column lives in the database `tagThemes` / `themes` table, not in the `mappings.ts` source artefact. **Verify before starting.** If facets need to live in the TypeScript export too, it does cross the boundary and needs Wouter go-ahead per CLAUDE.md §4.

#### Schema deltas

```sql
-- apps/web/drizzle/migrations/NNNN_add_theme_facet.sql
-- (verify the exact `themes` table location — apps/web/src/server/schema/themes.ts is referenced
--  in packages/ml/src/themes/mappings.ts comments)
ALTER TABLE themes
  ADD COLUMN facet text;
-- text not enum: makes future facet additions schema-free.
-- Application-layer validation against a static list (see proposed defaults above).
```

Drizzle schema update in `apps/web/src/server/schema/themes.ts`:

```ts
facet: text('facet'),  // nullable until backfilled; proposed enum: emotional-pole | narrative-mode | aesthetic-register | subject-matter | protagonist-type | setting-context
```

#### Backfill plan (41 existing themes)

Add a `facet` field to each `ThemeMapping` entry in `packages/ml/src/themes/mappings.ts`. Proposed facet assignments (these are research-suggested; Wouter to verify or override):

| Theme | Proposed facet |
|---|---|
| tragedy, revenge, war, crime, gambling, prison | emotional-pole / subject-matter / setting-context (case-by-case) |
| super-power, magic, time-manipulation, reincarnation, isekai | narrative-mode / subject-matter |
| antihero, samurai, ninja, detectives, assassins, mafia, gangs | protagonist-type |
| post-apocalyptic, dystopian, medieval, historical, space, school-life, military, religion | aesthetic-register / setting-context |
| demons, vampires, zombies, dragons, ghosts, aliens, pirates, cult, pandemic | subject-matter |
| martial-arts, espionage, mythology, amnesia, survival | narrative-mode / aesthetic-register |

The backfill should be a single PR with the migration + the `mappings.ts` updates so the two stay in sync.

**Tests:** Approach A (or arguably Scaffolding) per CLAUDE.md §8.1. Add an assertion that every `ThemeMapping` has a `facet` set (catches future regressions where a new theme is added without one).

**Diff tagging per CLAUDE.md §6:** schema migration is **Decision** (the column shape locks in for the foreseeable future). Backfill assignments are **Decision** (the facet-per-theme calls are editorial judgments Wouter should review).

---

### TICKET 2 — `HM2C-?` per-bridge firing-rate logging in `recommend.ts`

**Scope:** Track A telemetry — log per-bridge fires per recompute. ~1 person-day.

#### Stop-and-ask gates

- **Adding new external ingress / new persisted data:** YES — new log writes to a per-bridge stats table. Confirm storage location (Postgres new table? PostHog event? Vercel log?) before coding.
- **Processing user data without explicit user action:** YES — this aggregates over recomputes, which run nightly per ADR-0008. Per-user counts are persisted. Confirm what counts as "personal data" here — `userId` + theme firing counts is presumably acceptable as it's already derivable from `user_recommendations`, but flag for Wouter.

#### Proposed shape

New table:

```sql
-- apps/web/drizzle/migrations/NNNN_bridge_firing_stats.sql
CREATE TABLE bridge_firing_stats (
  id            uuid PK,
  theme_id      uuid NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  candidate_title_id uuid NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  contribution  real NOT NULL,        -- the score contribution from this bridge
  fired_at      timestamptz NOT NULL DEFAULT now(),
  is_top_reason boolean NOT NULL DEFAULT false  -- did this bridge make the top-50 reason hint?
);

CREATE INDEX bridge_firing_stats_theme_idx ON bridge_firing_stats (theme_id, fired_at DESC);
CREATE INDEX bridge_firing_stats_user_idx ON bridge_firing_stats (user_id, fired_at DESC);
```

**Caveat:** at ~50 users × 2k candidate titles × N bridges firing per candidate, this table grows fast. For Phase 1A scale this is fine; for Phase 2+ partition by month or rotate to a TimescaleDB-style downsampler. Document in an ADR.

Instrumentation in `apps/web/src/inngest/functions/recommend.ts`:

```ts
// inside the recs.map() block, when explainRecommendation returns a theme-bridge reason
for (const reason of reasons) {
  if (reason.kind === 'theme-bridge' && reason.themeId) {
    firingStats.push({
      themeId: reason.themeId,
      userId,
      candidateTitleId: r.titleId,
      contribution: reason.contribution,
      isTopReason: i < 50, // top-50 cap matches EXPLAIN_DEPTH
    });
  }
}
// flush firingStats in a batch INSERT at end of recomputeUserRecommendations
```

**Tests:** Approach A. Test that firing stats are written for at least one theme-bridge reason on a fixture user.

**Diff tagging:** **Logic** (the per-bridge accounting decision matters) + **External** (the new log destination is new data egress).

---

### TICKET 3 — `HM2C-?` `generate-candidates.ts` (sentence-transformers offline pass)

**Scope:** offline script that mines candidate (TMDB keyword, AniList tag) bridge pairs from the local DB using sentence-transformers semantic similarity. ~2 person-days.

#### Stop-and-ask gates

- **Adding a new dependency to any `package.json`:** YES — `sentence-transformers` is a Python package, not directly installable in the TypeScript project. Open question (see DECISIONS PENDING #2): pure-TS alternative via `transformers.js` or `@xenova/transformers` (which can run MiniLM-L6-v2 in Node, no Python dependency)? Or accept a Python sidecar?
- **Calling an external API from new code paths:** NO — runs entirely locally with a pretrained model file (~80MB MiniLM-L6-v2).
- **Adding a new top-level directory** (`scripts/theme-bridge-curation/`): YES per CLAUDE.md §4 — confirm with Wouter before adding.

#### Proposed shape

```
scripts/theme-bridge-curation/
  README.md
  generate-candidates.ts
  package.json (if standalone) OR add to root devDependencies
```

The script:

1. Queries DB for:
   - Every TMDB keyword (source='tmdb', filter by local title attachment count ≥10)
   - Every AniList tag (source='anilist', filter by category in ALLOWED_BRIDGE_CATEGORIES, rank ≥50, attachment count ≥5)
2. Builds anchor sentences for each of the 41 existing themes:
   ```
   {name}. {description}. {member_tag_names.join(', ')}.
   ```
3. Computes pairwise cosine similarity between every (anchor, candidate-tag-name) pair NOT already bridged.
4. Outputs ranked candidate pairs to `proposals/YYYY-MM-DD-candidates.json`:
   ```json
   [
     {
       "tmdbKeyword": "gangster",
       "anilistTag": "Mafia",
       "similarity": 0.612,
       "tmdbLocalCount": 1247,
       "anilistLocalCount": 32,
       "topTmdbTitles": ["The Godfather", "Goodfellas", "Casino"],
       "topAnilistTitles": ["Baccano!", "91 Days", "Gangsta."]
     },
     ...
   ]
   ```

**Library decision:** `@xenova/transformers` is the lowest-friction option — pure TS, can run MiniLM-L6-v2, no Python dependency. Confirm with Wouter (DECISIONS PENDING #2).

**Tests:** Approach A is fine. Add a fixture-based test that exercises the cosine math on a small known set.

**Diff tagging:** **Decision** (model + threshold choice are research-grounded but Wouter-locked) + **External** (loading a pretrained model file into the build).

---

### TICKET 4 — `HM2C-?` `curate.ts` interactive CLI (bulk + deep modes)

**Scope:** terminal UI that reads the candidate JSON from Ticket 3, prompts the curator (Wouter) for each candidate, and writes decisions + proposals. ~2 person-days.

#### Two modes

**Mode A — `pnpm curate bulk --batch=YYYY-MM-DD-batch-N`:**

```
Bridge candidate 1/50
  TMDB: gangster (1,247 local titles)
  AniList: Mafia (32 local titles)
  Similarity: 0.612
  Existing bridge? NO
  [a]ccept / [r]eject / [d]efer / [s]kip + reason ?
```

Decision logged immediately to `decisions.jsonl` (append-only). Accepted candidates enter the proposal file `proposals/YYYY-MM-DD-batch-N-proposed.json` with placeholder slug/name/description for the deep-mode session to fill in.

**Mode B — `pnpm curate deep --candidate=tmdbKeyword:anilistTag`:**

Single-bridge-deep with title previews on both sides, prompts to author `slug`, `name`, `description` (target: 80–150 chars, AniList voice), and `facet`. Output: a fully-formed `ThemeMapping` entry suitable for cherry-pick into `mappings.ts`.

#### Synonym-check gate (Check 1 from §2.6)

Before writing any decision, the CLI checks:
- TMDB keyword already in any existing bridge's `members[]`? If yes, refuse acceptance, log as "synonym already bridged".
- AniList tag already in any existing bridge's `members[]`? Same.
- Proposed `slug` collides with existing? Block.

#### State management

- `decisions.jsonl` — append-only, one JSON per line, the audit trail.
- `proposals/*.json` — one file per session, the proposals heading to merge.
- Resume-friendly: re-running the CLI on the same batch resumes from the last logged decision.

**Tests:** Approach A. Test that the synonym-check gate blocks expected cases.

**Diff tagging:** **Logic** (the gates and state-machine are real logic) + **Decision** (CLI UX choices are Wouter-facing).

---

### TICKET 5 — `HM2C-?` `bridgeAblation` extension to `packages/ml/src/eval/`

**Scope:** per-bridge ablation function that computes the rec-quality delta with vs without a given bridge. ~2 person-days. **Approach B (sub-agent isolation) required per CLAUDE.md §8.1.**

#### Stop-and-ask gates

- **Touching the recommendation engine boundary** (`packages/ml/*`): YES per CLAUDE.md §4 — explicit Wouter go-ahead required. The research justifies it (per-bridge quality measurement is the moat-defence mechanism), but the §4 gate applies.

#### Proposed function signature

```ts
// packages/ml/src/eval/bridge-ablation.ts
export function bridgeAblation(
  bridgeSlug: string,
  fixtures: ReadonlyArray<EvalFixture>,
  params: GroupScoreParams,
  limit: number,
): BridgeAblationResult {
  // 1. Run the fixtures with the full theme membership.
  // 2. Run the fixtures with this bridge's memberships filtered out.
  // 3. Compute composite quality delta on each fixture.
  // 4. Return { withBridge, withoutBridge, delta, perFixtureDeltas }.
}
```

#### Fixture set extension

The cold-start research's fixtures (`packages/ml/src/eval/cold-start-fixtures.ts` per the prior handoff) need cross-medium pairings added. New fixtures:

| Fixture name | Shape |
|---|---|
| `tv-fan-with-bridgeable-anime-candidates` | TV-only taste vector + candidate set including anime that bridges via theme |
| `anime-fan-with-bridgeable-tv-candidates` | Mirror of above |
| `couple-bridge-vs-direct` | Two taste vectors (one TV-leaning, one anime-leaning) + candidate set where the bridge is the only thing connecting them |
| `cross-medium-veto-test` | Same as couple-bridge but with one member's taste explicitly antithetical to the bridge themes (regression for ADR-0020 mixed-medium failure mode) |

**Tests:** **Approach B mandatory** — sub-agent writes the tests with only the contract + ADRs visible, never the implementation file. Test that `bridgeAblation('tragedy', ...)` returns a positive delta on `tv-fan-with-bridgeable-anime-candidates` (regression gate).

**Diff tagging:** **Logic** (eval methodology) + **Decision** (composite quality metric weights).

---

### TICKET 6 — `HM2C-?` `merge-proposals.ts` (ablation-gated merge)

**Scope:** script that reads accepted proposals, runs the ablation gate (Check 2 from §2.6), and produces a git-staged diff for human approval. ~1 person-day.

The script:

1. Reads `proposals/YYYY-MM-DD-batch-N-proposed.json`.
2. For each accepted bridge, runs `bridgeAblation` against the fixture set.
3. If Δ composite quality < 0 on >25% of fixtures, flags the bridge for re-review (writes to a separate `proposals/needs-review-*.json`).
4. For passing bridges, writes the new entries into `packages/ml/src/themes/mappings.ts` via AST manipulation (use `ts-morph` for safety).
5. Stages the file with `git add` but does NOT commit.
6. Outputs a summary: "X bridges added, Y flagged for review, Z rejected."

**Tests:** Approach A. Test the AST manipulation produces well-formed output.

**Diff tagging:** **Logic** (the gate is the negative-transfer guardrail).

---

## SCHEMA DELTAS (consolidated)

| Table | Column | Type | Default | Notes |
|---|---|---|---|---|
| `themes` | `facet` | text NULL | NULL | Backfilled for existing 41 in TICKET 1. Application-validated against enum. |
| `bridge_firing_stats` (NEW) | `id` | uuid PK | gen_random_uuid() | TICKET 2 |
| `bridge_firing_stats` | `theme_id` | uuid FK NOT NULL | — | references `themes(id)` |
| `bridge_firing_stats` | `user_id` | uuid FK NOT NULL | — | references `users(id)` |
| `bridge_firing_stats` | `candidate_title_id` | uuid FK NOT NULL | — | references `titles(id)` |
| `bridge_firing_stats` | `contribution` | real NOT NULL | — | bridge's score contribution |
| `bridge_firing_stats` | `fired_at` | timestamptz NOT NULL | now() | |
| `bridge_firing_stats` | `is_top_reason` | boolean NOT NULL | false | did it make top-50 reason hint? |

No changes to existing columns. No changes to `tagThemes` or `THEME_MAPPINGS` structure (apart from `facet`).

---

## EVAL HARNESS DELTAS (consolidated)

- New file: `packages/ml/src/eval/bridge-ablation.ts`
- New file: `packages/ml/src/eval/bridge-fixtures.ts` (cross-medium fixture set)
- One new exported function: `bridgeAblation`
- Four new fixtures (see TICKET 5)

No changes to existing fixtures, metrics, or types.

---

## EVIDENCE INDEX

If the implementing session needs to back up a decision, the evidence is here:

| Question | File |
|---|---|
| Why faceted-not-hierarchical? | `raw/academic-taxonomy.md` §3, §6 + REPORT.md §2.1 |
| Why `all-MiniLM-L6-v2` specifically? | `raw/mood-taxonomies.md` §6 + REPORT.md §2.2 |
| Why threshold ≥0.55? | REPORT.md §2.2 (no single-source citation; informed by research synthesis) |
| Why CLI not admin UI? | `raw/spotify-echonest.md` (McDonald layoff lesson) + `raw/allmusic.md` (no public versioning lesson) + REPORT.md §2.3 |
| Why 5–10 bridges per session? | `raw/pandora-mgp.md` (analyst rate) + `raw/mood-taxonomies.md` §1 (Letterboxd ceiling) + REPORT.md §2.4 |
| Why per-bridge firing-rate telemetry? | `raw/spotify-echonest.md` (listener-cluster evidence) + `raw/pandora-mgp.md` §5 (two-loop model) + REPORT.md §2.5 |
| Why a synonym-check gate? | `raw/tmdb-keywords.md` §6 + `raw/imdb-keywords.md` §6 + REPORT.md §2.6 |
| Why a post-merge ablation gate? | `raw/academic-taxonomy.md` §3 (Sen 21% adequacy) + REPORT.md §2.6 |
| Why bus-factor mitigation is load-bearing? | `raw/spotify-echonest.md` (McDonald layoff cratered Wrapped 2024) |
| Why an external cultural-bias review? | `raw/pandora-mgp.md` §6 + `raw/netflix-altgenres.md` §6 (both flag Anglo-American bias) |
| Why continuous `[0,1]` not binary? | `raw/academic-taxonomy.md` §4 (Tag Genome 2012) |
| Why Wikidata QIDs per theme? | `raw/academic-taxonomy.md` §8 (Specia & Motta 2007) |
| Why compound from atomic via grammar? | `raw/netflix-altgenres.md` §1 (the cleanest architectural lesson) |

---

## NO-FLY ZONE — DO NOT RE-DECIDE

These were considered and explicitly ruled out in the research. If the implementing session is tempted, push back and reference the raw file before re-opening.

| Don't add | Why not | Evidence |
|---|---|---|
| Full hierarchical tree over the 200-bridge set | Heymann auto-derivation produces ~50% acceptable parent-child links on real data; degrades further on intentionally-even tag distributions (which HelpME2C's is). | `raw/academic-taxonomy.md` §5 + REPORT.md §2.1 |
| Open user-contribution UI for theme bridges in Phase 1A | Sen 2009 entropy filter retains 21% of raw user tags. IMDb's sock-puppet voting is the cautionary tale. The HelpME2C moat is curator-controlled vocabulary. | `raw/academic-taxonomy.md` §3 + `raw/imdb-keywords.md` §6 |
| Hand-curate 200+ bridges from scratch without evidence-mining | Spotify/McDonald's "vapor twitch" failure mode — invented names without underlying clusters become hallucinated taxonomy. | `raw/spotify-echonest.md` §6 + REPORT.md §2.2 |
| LLM-as-curator (LLM proposes AND accepts bridges autonomously) | LLM proposes is fine (research endorses); LLM accepts removes the human-in-loop that prevents negative transfer per the 2025 CDR survey. | `raw/academic-taxonomy.md` §10 + Zhang et al. arXiv:2503.14110 |
| Bridge any TMDB keyword in the pre-approved trivia list (`3d`, `duringcreditsstinger`, etc) | Technical metadata, not themes. Explicitly excluded from bridge-candidate generation. | `raw/tmdb-keywords.md` §1 |
| Bridge any AniList tag in `Cast-Traits`, `Cast-Main Cast`, `Demographic`, or `Sexual Content` categories | Already blacklisted in `recommend.ts:47-54`. Cast/demographic ≠ theme. | `raw/anilist-tags.md` §6 + existing code |
| Add per-user-per-bridge thumbs voting at MVP scale | Spotify/McDonald scale requires this; <1000 users does not. Track A firing-rate + Track B eval-ablation cover the same ground for Phase 1A. | REPORT.md §2.5 |
| Skip the synonym-check gate "because Wouter will catch dupes manually" | TMDB's documented synonym proliferation says otherwise. The gate is free; running without is the IMDb failure mode. | `raw/tmdb-keywords.md` §6 + `raw/imdb-keywords.md` §6 |
| Allow >50 candidates per bulk-mode session | Cognitive-load tipping point per the mood-taxonomies survey + Pandora analyst rate (~16-24/day deep). Above 50 is the librarian-not-tastemaker failure mode. | `raw/mood-taxonomies.md` §1 |

---

## OPEN QUESTIONS for the implementing session

1. **`sentence-transformers` Python dep vs pure-TS via `@xenova/transformers`.** Research-proposed default is `@xenova/transformers` (pure TS, runs in Node, no Python sidecar). Wouter to confirm or override. Affects TICKET 3.
2. **`scripts/theme-bridge-curation/` as a new top-level directory.** CLAUDE.md §4 stop-and-ask gate. Confirm.
3. **`bridge_firing_stats` table storage and lifecycle.** Postgres new table is the proposed default. Alternative: PostHog event stream. Alternative: an aggregated weekly summary table instead of per-event. Wouter to confirm storage shape before TICKET 2 schema design is final.
4. **`facet` enum vs free text.** Research-proposed enum has 6 values; using `text` keeps schema migration cost zero for future facets but requires application-layer validation. Wouter to confirm.
5. **External cultural-bias reviewer.** The Phase 3 validation track requires an external reviewer to mitigate the Anglo-American bias failure mode documented in Pandora + Netflix. Wouter to identify (could be a non-Western cinephile friend, a film-Twitter contact, a Letterboxd-cinephile).
6. **Wikidata QID per theme (Specia-Motta lesson, REPORT.md §1 academic-taxonomy item 6).** Adding to TICKET 1 backfill adds ~1 hour but makes the bridge set more interoperable. Wouter's call.
7. **The MoodPics question.** The original research brief mentioned a "MoodPics" service that could not be verified as a real public product. If Wouter has a specific URL or reference, the workflow above might want a separate evidence pass against it.

---

## DELIVERABLE-LEVEL ACCEPTANCE CRITERIA

For a "ship it" call on the full theme-bridge expansion (post all 6 tickets + Phase 2 curation + Phase 3 validation):

- [ ] `facet` column live on `themes`; all 41 existing themes have a facet assigned (TICKET 1)
- [ ] `bridge_firing_stats` table populated by nightly cron runs (TICKET 2)
- [ ] `generate-candidates.ts` runs end-to-end and produces a ranked candidate JSON (TICKET 3)
- [ ] `curate.ts` bulk + deep modes both functional; decisions persist to git-trackable files (TICKET 4)
- [ ] `bridgeAblation` runs against fixture set; cross-medium fixtures added (TICKET 5)
- [ ] `merge-proposals.ts` produces a git-staged diff with ablation-gate results (TICKET 6)
- [ ] ≥150 bridges live (target 200) by end of Phase 2
- [ ] Eval-harness ablation shows ≥+5% NDCG@10 on cross-medium fixtures vs 41-bridge baseline (Phase 3)
- [ ] No regression on personal-rec NDCG@10 (Phase 3)
- [ ] External cultural-bias review pass complete; feedback incorporated (Phase 3)
- [ ] Per-bridge firing-rate report shows no "dead" bridges (≥5 fires/week in synthetic test traffic) (Phase 3)
- [ ] Governance ADR committed (one-pager: vocabulary structure decision, bridge-acceptance criteria, deprecation criteria, audit cadence)

---

_End of HANDOFF. Implementing session: load this file + the relevant raw evidence file(s) + the file(s) you're about to edit. The REPORT.md is ~700 lines — skip unless you need the full per-source synthesis. Start with the DECISIONS PENDING section and confirm with Wouter before any implementation work._

# Theme-bridge expansion — RUN_LOG

**Run date:** 2026-05-17
**Operator:** Claude (autonomous, ~3h budget, user away)
**Trigger:** `/research` autonomous-mode invocation (continuation of the competitive-benchmark run earlier the same day)
**Constraints:** no AskUserQuestion, no ExitPlanMode, no /research-skill orchestration, read-only on repo, write only under `research/theme-bridge-expansion/`.

---

## Plan (one page)

### The question this run answers

How does a single curator (Wouter) grow HelpME2C's cross-medium theme-bridge set from 41 to 200+ without poisoning the engine? The competitive-benchmark research earlier today established this is the *coverage gap* that turns the cross-medium architecture from "great prototype" into "great product". This run designs the editorial workflow.

### Output shape

```
research/theme-bridge-expansion/
  RUN_LOG.md          ← this file
  REPORT.md           ← three-part synthesis (per-source review, workflow design, 90-day plan)
  HANDOFF.md          ← ticket-ready, in the style of research/cold-start-signals/HANDOFF.md
  raw/
    pandora-mgp.md
    netflix-altgenres.md
    imdb-keywords.md
    tmdb-keywords.md
    anilist-tags.md
    letterboxd-tags.md
    apple-music-subgenres.md
    spotify-echonest.md
    allmusic.md
    discogs.md
    mood-taxonomies.md
    academic-taxonomy.md
```

### Phase A — Per-source evidence (12 sources, 6 sub-agents, items_per_agent=2)

Pre-committed batch_size=4. 12 sources / 2 per agent = 6 sub-agents → run in two waves (4 + 2).

- **Wave A1** (4 parallel):
  - Agent A1.1: Pandora MGP + Netflix altgenres (industrial-editorial precedents)
  - Agent A1.2: IMDb keywords + TMDB keywords (community-curated metadata; TMDB is our upstream)
  - Agent A1.3: AniList tags + Letterboxd Showdown lists/tags (community-curated, in our domain)
  - Agent A1.4: Apple Music subgenres + Spotify/Echo Nest taxonomy lineage (commercial-platform taxonomies)
- **Wave A2** (2 parallel, launched as A1 agents finish):
  - Agent A2.1: AllMusic + Discogs (deep music metadata; the editorial reference)
  - Agent A2.2: Mood-focused film taxonomies + Academic taxonomy literature (Cantador CDR Ch.27, Tagommenders, Heymann/Garcia-Molina tag hierarchies)

For each source, the per-file template covers: **vocabulary structure** (flat / hierarchical / faceted / overlapping), **vocabulary size + growth over time**, **editorial workflow** (curators, time-per-term, review, gold-standard), **tooling** (curator UI, bulk-edit, suggestion engine, audit log), **quality measurement** (precision/recall, user feedback, inter-annotator agreement), **failure modes documented or visible**.

### Phase B — Synthesis

I (orchestrator) read all raw files and write `REPORT.md` with three sections:

1. **Per-source synthesis** — what's transferable from each precedent, what isn't, what HelpME2C should explicitly reject
2. **Editorial workflow design** — vocabulary structure decision (flat vs hierarchical), candidate generation (sentence-transformers offline pass), curator UI shape, session shape, quality measurement, negative-transfer guardrails
3. **90-day 41 → 200 plan** — Phase 1 (weeks 1-2, tooling), Phase 2 (weeks 3-10, curation), Phase 3 (weeks 11-12, validation), with engineering-vs-curator-time split called out per item

### Phase C — HANDOFF.md

Ticket-ready editorial-workflow plan in the same style as `research/cold-start-signals/HANDOFF.md`. The HANDOFF must NOT presume Wouter's decisions — it flags them as **PROPOSED DEFAULTS** and uses an explicit "DECISIONS PENDING" section instead of "DECISIONS LOCKED". Wouter will decide on return.

### What anchors the workflow design

Already read and grounded:

- `PROJECT.md` §moats — cross-medium theme taxonomy is moat #2
- `packages/ml/src/themes/mappings.ts` — the 41 existing bridges (flat list, `slug` + `name` + `description` + `members[]` with `source`/`tagName`/`strength`)
- `packages/ml/src/cross-medium.ts` + `scoring.ts` — the cross-medium-only scoring rule (theme bridges fire ONLY for tags absent from the user's taste vector, preventing double-counting)
- `packages/ml/src/recommendation.ts` — `extractTasteVector` + `recommendForUser`, with the `TagThemeMembership` import path
- `apps/web/src/inngest/functions/extract-themes.ts` — the LLM theme-extraction job (Anthropic SDK, sequential ~3s/title, 60-title batches, 1k/day step budget). This is per-title theme *extraction* from synopses (writes to `title_themes`), not theme-bridge curation. The bridge-curation surface this research designs is a separate workflow.
- `apps/web/src/inngest/functions/recommend.ts` — `formatReasonHint` uses bridge themes via `themeNames.get(reason.themeId)`; bridges feed user-visible "Matches your tragedy interest" copy
- `docs/decisions/0023-franchise-level-taste-signal.md` — franchise-as-atomic-unit; the bridge fires at the franchise's tag set, not per-season
- `research/competitive-benchmark/REPORT.md` §sota-cross-domain — the literature anchor (Cantador, Pandora MGP, Shi/Larson/Hanjalic, Nazari, Fernández-Tobías, 2025 negative-transfer survey)
- `research/competitive-benchmark/raw/sota-cross-domain.md` — deeper evidence base; recommended `sentence-transformers` candidate generation + human-in-loop accept/reject as the cheapest credible extension path

### Risks / things that could blow up the run

- Several of the proprietary taxonomies (Pandora, Apple Music, Spotify Echo Nest internals) are documented thinly — best evidence is patents, press writeups, dev talks
- Pandora's actual curator UI is a closed system; expect to triangulate via interviews, blog posts, court documents (the Pandora vs. SoundExchange materials surfaced internal taxonomy detail)
- Editorial productivity literature is thin for "tag curation specifically" — expect to extrapolate from translation-memory, ontology-engineering, and content-moderation productivity work
- The HANDOFF must respect the "Wouter is away, don't presume decisions" constraint — frame as proposed defaults, list decisions explicitly

---

## Execution log

### Phase A — Per-source evidence (12 sources, 6 sub-agents)

Pre-committed batch_size=4, items_per_agent=2. Ran in two waves of 4 + 2.

| Wave | Agent | Items | Status | Notable evidence gaps |
|---|---|---|---|---|
| A1 | A1.1 | Pandora MGP + Netflix altgenres | ✅ done | Could not fetch Madrigal's Atlantic article directly (Atlantic + Wayback both blocked WebFetch); Pandora CRB / SoundExchange testimony PDFs 403; no published Cohen's-kappa or precision/recall on either taxonomy. |
| A1 | A1.2 | IMDb keywords + TMDB keywords | ✅ done | Live TMDB keyword count is "~18,432" via moderator estimate (years old; live count would require pulling today's daily export); IMDb does not publish vocabulary size — estimates suggest 100k+ but no primary source. |
| A1 | A1.3 | AniList tags + Letterboxd Showdown/tags | ✅ done | **Best primary-source haul of the run.** Live GraphQL queries pulled 423 AniList tags / 25 categories on 2026-05-17. AniList forum thread bodies + Letterboxd help-centre + Letterboxd Journal + Letterboxd `/about/crew/` all Cloudflare-403; structural claims are primary-source, verbatim quotes mostly search-snippet. |
| A1 | A1.4 | Apple Music subgenres + Spotify/Echo Nest | ✅ done | No exact published count of Apple Music subgenres; the GitHub-scraped list is the best community proxy. "~1,000 Apple Music editors" figure is industry-not-Apple-confirmed. Spotify-confirmed precision/recall on `danceability`/`valence`/`energy` does not exist publicly. |
| A2 | A2.1 | AllMusic + Discogs | ✅ done | AllMusic moods/themes pages + Discogs help-centre returned 403 to WebFetch; Wayback blocked entirely. Partial alphabetic mood scan (~67 entries A–D) from search snippets; full enumeration not possible. Lewandowski interviews surfaced in search but not deep-fetched. |
| A2 | A2.2 | Mood-focused film taxonomies + Academic literature | ✅ done | **The "MoodPics" service referenced in the brief did not surface as a named product.** Documented as a research gap in §8 of the mood file. Adjacent results (genery.io, filmvibes.io) are filmmaker-moodboard tools, not film recommenders. Cantador et al. Springer chapter + Vig/Sen/Riedl PDFs returned binary streams not extractable; findings reconstructed from authoritative secondary sources. |

### Phase B — Synthesis

- Read all 12 raw files (~250KB / ~2,518 lines total)
- Wrote `REPORT.md` (~700 lines) with three sections: per-source synthesis (one section per source, plus thematic family clustering), editorial workflow design (6 sub-question answers anchored to specific sources), 90-day plan (Phase 1 tooling / Phase 2 curation / Phase 3 validation, with explicit engineering-vs-curator-time split)
- Wrote `HANDOFF.md` (~500 lines) in the cold-start-signals style: DECISIONS PENDING (7 items), 6 tickets in order (TICKET 1–6), schema deltas, eval-harness deltas, evidence index, no-fly zone (9 items), open questions (7 items), acceptance criteria
- The HANDOFF deliberately uses "PROPOSED DEFAULTS" framing throughout — Wouter has not yet reviewed; the implementing session should confirm each decision before acting

### Top-level synthesis conclusions

1. **Vocabulary shape:** keep flat top layer + add `facet` column; do not build a hierarchy. Anchored to Marchionini 2006 (facets > one big tree for exploration) + Heymann auto-derivation accuracy ~50% on real data.
2. **Vocabulary growth model:** Spotify/McDonald's cluster-first / name-second beats Pandora's hand-author for a single curator. Mine candidates via sentence-transformers semantic similarity from TMDB+AniList co-occurrence; Wouter judges + names, doesn't design from scratch.
3. **Curator tool:** CLI script with two modes (bulk + deep), Git-trackable decisions and proposals. Bus-factor mitigation by design — McDonald-at-Spotify lesson.
4. **Cadence:** ~10 bridges/week sustainable; landing at ~150–200 in 12 weeks.
5. **Quality measurement:** dual tracks — per-bridge firing-rate telemetry in production + eval-harness ablation per new bridge. Two loops mirror Pandora's editorial + thumbs at single-curator scale.
6. **Negative-transfer guardrails:** synonym check (free pre-merge), ablation gate (cheap post-merge), firing-rate watch (lagging post-launch).
7. **Cultural-bias mitigation:** schedule an external review pass before publishing 200. Both Pandora and Netflix documented Anglo-American bias as a single-team failure mode.

### Flags for Wouter

1. **The "MoodPics" service referenced in the brief was not found** as a real public film-mood-tagging product. Adjacent results were filmmaker moodboard tools. If Wouter has a specific URL or reference, the analysis in [raw/mood-taxonomies.md](raw/mood-taxonomies.md) §8 should be re-scoped against it.
2. **The HANDOFF is genuinely Wouter-decisions-pending** — the 7-item DECISIONS PENDING list at the top must be reviewed before any implementation. Most-load-bearing: (a) `facet` column structure and the 6 proposed facet values, (b) `@xenova/transformers` vs alternative for the sentence-transformers pass, (c) `bridge_firing_stats` table shape and lifecycle.
3. **6 of the 6 tickets touch `stop-and-ask` gates** per CLAUDE.md §4:
   - TICKET 1: schema migration (additive nullable, "usually safe")
   - TICKET 2: new persisted data, processing user data without explicit user action
   - TICKET 3: new top-level directory, new dependency
   - TICKET 4: CLI UX choices
   - TICKET 5: **touches the `packages/ml/*` boundary** — explicit Wouter go-ahead required
   - TICKET 6: file-rewrite (AST manipulation of `mappings.ts`)
4. **The 200-target is aspirational, not guaranteed.** Realistic landing is 150–200 by week 12; the 200-bridge mark may require the additional Phase 3 validation work to add tail bridges as gaps surface.
5. **AniList tags are bridge-candidate-capped at ~200** (out of 423 total, after excluding Cast-*, Demographic, Sexual Content, and most of Technical). Coincidentally close to the 200-bridge target — so the bottleneck on AniList side is "are all bridgeable tags actually bridged" rather than "can we find more candidates."
6. **The cross-medium fixture set extension in TICKET 5 reuses the cold-start research's existing fixtures pattern.** Cohesion with that prior research is intentional — the cold-start fixtures and the bridge-ablation fixtures should live in the same `packages/ml/src/eval/` directory and share the same `EvalMetrics` type.
7. **No code was modified in this run.** Read-only on the repo per the memory feedback. All writes went to `research/theme-bridge-expansion/`.

### Wall-clock budget

Total: ~95 minutes of sub-agent wall-clock from launch to last completion + ~25 minutes synthesis = ~2 hours total, well under the ~3h budget. No agent failed; all 12 returned usable deliverables (one with a flagged gap on the MoodPics search). Sequencing kept ≤4 agents in flight at any time per the pre-committed batch_size=4.


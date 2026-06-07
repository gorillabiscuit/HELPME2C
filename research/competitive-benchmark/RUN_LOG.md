# Competitive Benchmark — RUN_LOG

**Run date:** 2026-05-17
**Operator:** Claude (autonomous, ~3h budget, user away)
**Trigger:** `/research` autonomous-mode invocation
**Constraints:** no AskUserQuestion, no ExitPlanMode, no /research-skill orchestration, read-only on repo.

---

## Plan (one page)

### Output shape

```
research/competitive-benchmark/
  RUN_LOG.md          ← this file
  REPORT.md           ← final consolidated deliverable
  raw/
    platform-myanimelist.md
    platform-anilist.md
    platform-simkl.md
    platform-trakt.md
    platform-netflix.md
    platform-spotify.md
    platform-justwatch.md
    platform-letterboxd.md
    platform-plex-discover.md
    sota-cold-start.md
    sota-tag-vs-cf-vs-hybrid.md
    sota-group-aggregation.md
    sota-cross-domain.md
```

### Phase A — Competitive landscape (9 platforms)

Pre-committed batch_size=4, items_per_agent=2 → 5 sub-agents total, run in two waves so we never have more than 4 in flight.

- **Wave A1** (4 parallel):
  - Agent A1.1: MyAnimeList + AniList
  - Agent A1.2: Simkl + Trakt
  - Agent A1.3: Netflix + Spotify (cold-start parallel)
  - Agent A1.4: JustWatch + Letterboxd
- **Wave A2** (1 agent):
  - Agent A2.1: Plex Discover (singleton)

### Phase B — State of the Art (4 themes)

4 parallel SOTA agents, one per theme (items_per_agent=1 because each topic is a literature scan, not a per-product write-up):

- Agent B1: Cold-start recommendation (preference elicitation, active learning, demographic priors)
- Agent B2: Theme/tag scoring vs collaborative filtering vs hybrid
- Agent B3: Group recommendation aggregation (Average Without Misery, Borda, Copeland, fairness-aware, etc)
- Agent B4: Cross-domain / cross-medium taste transfer

### Phase C — Synthesis

I (orchestrator) read all raw outputs and write `REPORT.md` with three sections:

1. **Competitive landscape** — per-platform summaries
2. **State of the art** — what's actually deployable at <1000 users
3. **Honest gap analysis** — HelpME2C vs competition vs SOTA, with a boxed
   "TOP 3 CONCRETE CHANGES" callout (priority, effort S/M/L, moat impact).

### What anchors the gap analysis

Already read and grounded:

- `PROJECT.md` — moat is group recs + cross-medium taxonomy; Phase 1A = rule-based scoring, no ML training infra; <1000 users; web-only
- ADR-0008 — pre-computed nightly via Inngest, Postgres cache; tag-based scoring is acceptable for 1A
- ADR-0013 — Postgres JSONB cache, no Redis
- ADR-0022 — anonymous_watch_signals table preserves co-occurrence signal across deletions
- ADR-0023 — franchise-as-atomic-unit-of-taste; mean of seasons; prevents triple-counting
- ADR-0024 — bipolar rating semantics; (rating-5.5)/4.5 → [-1, +1] signed weight
- `packages/ml/src/recommendation.ts` — extractTasteVector + recommendForUser + recommendForGroup; AWM with per-user normalisation + soft σ penalty (λ=0.5, vetoThreshold=0.5)
- `packages/ml/src/scoring.ts` — buildTagThemeIndex / buildTasteTheme / scoreCandidate; cross-medium-only rule (a tag with direct user signal scores via tag-overlap, theme bridge fires only for tags absent from taste)
- `packages/ml/src/cross-medium.ts` — findCrossMediumBridges; taste-agnostic per-title bridges
- `packages/ml/src/explain.ts` — explainRecommendation + explainGroupRecommendation; sharedDirectTags + sharedBridgeThemes
- `packages/ml/src/themes/mappings.ts` — 41 hand-curated theme bridges (TMDB ↔ AniList)
- `apps/web/src/inngest/functions/recommend.ts` — orchestrator; franchise aggregation, Elo-adjusted rating, blocked tag categories (cast/demographic), top-50 reason hints
- `apps/web/src/app/onboarding/page.tsx` — cold-start UX: search + popular grid + multi-pick; deferreds explicitly listed in top comment block

### Risks / things that could blow up the run

- WebSearch quota / region constraints (only US per tool docs)
- Sub-agent returns garbage from one platform → log it, proceed with remaining
- Some signals (Netflix's actual cold-start algorithm) are proprietary — best we can do is cite engineering blog posts + academic papers + reverse-engineered behaviour
- 3-hour budget cap; if a SOTA agent hits a wall on academic citation depth, accept "best effort" with what's found

---

## Execution log

### Phase A — Competitive landscape (9 platforms, 5 sub-agents)

| Wave | Agent | Items | Status | Notable evidence gaps |
|---|---|---|---|---|
| A1 | A1.1 | MyAnimeList, AniList | ✅ done | AniList `/signup` and forum threads return HTTP 403 (Cloudflare/JS gate); Reddit content largely deindexed from search → all user-complaint evidence is via Trustpilot summaries, Sitejabber, Quora, AniList forum thread titles |
| A1 | A1.2 | Simkl, Trakt | ✅ done | `r/trakt` / `r/Simkl` site-restricted Reddit returned zero indexed results; `trakt.docs.apiary.io` now password-protected — endpoint detail via `pytrakt` wrapper instead; signup pages 403 → field lists reconstructed from third-party walkthroughs |
| A1 | A1.3 | Netflix, Spotify | ✅ done | Netflix Foundation Model tech-blog post cert-errored → cited via secondary write-ups; arXiv 2007.13287 PDF couldn't extract verbatim → cited by author/title/URL; Spotify Community threads 403 → verbatim quotes via WebSearch snippets; Netflix Research `/recommendations` page returned only navigation chrome |
| A1 | A1.4 | JustWatch, Letterboxd | ✅ done | Every `letterboxd.com/*` URL returns HTTP 403 → primary quotes via search snippets; "TimeTravel" JustWatch product could not be verified (may be internal codename or deprecated label — Content Insights + Streaming Charts are the analytics products that did surface); no Karl von Randow / Matthew Buchanan engineering podcast found within budget; no published quantitative metrics from the JustWatch Enjins partnership |
| A2 | A2.1 | Plex Discover | ✅ done | support.plex.tv and plex.tv/blog return 403; Plex Pro Week 2024 Discover-session content gated; whether Plex's "for you" rails use unified embeddings spanning live-action+anime+non-English or separate models per language/region — not confirmed |

### Phase B — State of the Art (4 sub-agents, one per theme)

| Agent | Theme | Status | Headline finding |
|---|---|---|---|
| B1 | Cold-start methods | ✅ done | Pop×Ent (Rashid 2002) + thumbs vocabulary + MMR re-rank + active popularity decay is the literature-endorsed Phase 1A stack. Do NOT collect age/gender for taste signal (Ekstrand 2022, Wang 2025) |
| B2 | Tag vs CF vs hybrid | ✅ done | Pure tag-overlap is literature-recommended at <1k users; CF starts paying off at 5–10k users with ≥50 ratings each; right next step is Burke's switching hybrid with CB-primary + item-based-CF-understudy |
| B3 | Group aggregation | ✅ done | HelpME2C's AWM + λ·σ is the direct composition of Masthoff 2004 (AWM) + Amer-Yahia VLDB 2009 (relevance − λ·disagreement). Defensible, mainstream. Explanation moves satisfaction more than aggregation choice does (Tintarev/Najafian) |
| B4 | Cross-domain | ✅ done | Hand-curated theme bridges are the right design point for Phase 1A; HelpME2C's specific integration (TV↔anime, deterministic cross-medium-only rule, dual personalised+taste-agnostic surfaces) is rare-in-publication; cheapest extension is sentence-transformers-assisted curation |

### Phase C — Synthesis

- Read all 13 raw files (~250KB / ~2,834 lines total)
- Wrote `REPORT.md` (~480 lines) with three sections: competitive landscape (one summary table + one-line take per platform), state of the art (four themes with deployability verdicts), gap analysis (cold-start / personal / group / cross-medium) + boxed "TOP 3 CONCRETE CHANGES" callout
- Top 3: (1) Pop×Ent picker + thumbs + MMR — S effort, unlock for downstream moats; (2) expand themes 41→200+ via sentence-transformers-assisted curation — M effort, direct moat defence; (3) double down on group-rec explanation UX + confidence-weighted veto threshold — M effort, moat doubling-down

### Flags for the human

1. **Letterboxd verbatim quotes need a human pass** before being cited publicly — every `letterboxd.com/*` URL returned HTTP 403 to WebFetch, so primary-source quotes were reconstructed from search-result snippets. URLs are cited; the snippets are accurate; but the *exact* wording at the source URL has not been verified.
2. **No Reddit content was directly accessible** — site-restricted Reddit search returned zero indexed results on 2026-05-17 for every platform queried. User-complaint evidence came from Trustpilot / Sitejabber / Quora / official platform forums / aggregator summaries instead. If a Reddit-direct quote is wanted, a human needs to manually navigate.
3. **The "TimeTravel" JustWatch product mentioned in the brief could not be verified** as a real public product name. The analytics products that did surface are Content Insights and Streaming Charts. Worth checking with a JustWatch contact whether TimeTravel is an internal codename, a deprecated product, or a misremembered name.
4. **Spotify, Netflix, Blend/Jam aggregation functions are not disclosed publicly** — the gap analysis treats HelpME2C as "AHEAD on transparency" because of this; the comparative ranking is on disclosure, not on what may exist behind closed doors at those companies.
5. **The 41-theme-bridge coverage number** is from `packages/ml/src/themes/mappings.ts` (counted directly). If that file grows before the report is acted on, the Pandora comparison ("450 attributes / 1,300 sub-genres") still scales but the headline number in the report would be stale.
6. **No external lookup of HelpME2C's actual current user count was attempted** — gap analysis uses "<1000 users / Phase 1A" per PROJECT.md and the constraints box. If actual user count has crossed thresholds (e.g., 1k+ active users with ≥50 ratings each → CF becomes viable per the literature), some recommendations shift.

### Wall-clock budget

Total: ~75 minutes of agent wall-clock from launch to last completion, well under the ~3h budget. Each sub-agent ran 4–8 minutes; sequencing kept ≤4 in flight at any time per the pre-committed batch_size=4. No agent failed; all 13 returned usable deliverables.


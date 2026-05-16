# ADR-0025: Viewer-experience extraction schema

**Status:** Accepted
**Date:** 2026-05-15
**Supersedes:** — (formalises and replaces the existing implicit V1 schema in `apps/web/src/server/themes/extract.ts`)

## What we chose

A new 8-field LLM extraction schema for the title-level content descriptor pipeline, oriented around **why a viewer would enjoy this work** rather than **what the work is about**. Default model: **Claude Sonnet 4.6** (not Haiku). Default input: title + medium + synopsis, with the system prompt explicitly inviting the model to draw on its prior knowledge for well-known works.

Fields:

1. **`themes`** — 3–7 entries from the existing closed vocabulary (`apps/web/src/server/themes/vocabulary.ts`). `{slug, confidence}` where confidence ≥ 0.5. Unchanged from V1.
2. **`viewer_pleasures`** — 4–6 free-form short phrases (3–10 words each) naming concrete surface pleasures that make someone press play and recommend the work. **New, and the load-bearing addition.**
3. **`tone`** — 2–4 free-form tonal descriptors (e.g. `deadpan`, `melancholic`, `operatic`).
4. **`narrative_mode`** — one of `plays-straight` | `deconstructs` | `parodies` | `reinvents` | `hybrid`.
5. **`subtextual_themes`** — 2–4 free-form phrases of depth-for-viewers-who-want-it. Optional; genuinely surface-only works return `[]`. Demoted from "central" in earlier drafts.
6. **`comparable_titles`** — 3–5 `{title, reason}` entries referencing other works (any medium) that share core appeal. Cross-medium pairings explicitly invited.
7. **`engagement_level`** — `low` | `medium` | `high`.
8. **`stakes_scale`** — `interpersonal` | `community` | `national` | `civilizational` | `cosmic`. The PRIMARY DRAMATIC stakes layer, not where the plot's action is set.

The system prompt frames extraction as input for a **cross-medium recommendation engine that needs to know why a viewer would enjoy each work** — explicitly NOT a literary critique. The prompt includes worked examples for `viewer_pleasures` that name concrete surface enjoyment (animation quality, performance, fight choreography, ensemble chemistry) and warns off film-studies register.

**Scope of this ADR:** the extraction contract only — schema, prompt orientation, model tier. Storage migration plan, scoring-engine wiring, and embeddings on `viewer_pleasures` / `comparable_titles` are each their own follow-up ADR.

## Known calibration issues at acceptance

Surfaced during Stage 0 testing on 2026-05-15. None block acceptance — Sonnet 4.6 (the default model) handles all four acceptably. Tracked for the implementation-time prompt-tuning pass.

- **Haiku skews `engagement_level: high`.** On the 8-title focused run, Haiku rated One Punch Man, Mob Psycho 100, and The Good Place all `high` where Sonnet and Opus rated them `medium`. Rubric needs sharpening with one or two anchor examples ("a low-engagement show looks like X; a high-engagement show looks like Y") before Haiku gets used for any subset of the catalog.
- **Opus picks more conservative `narrative_mode` labels.** Opus called One Punch Man `parodies`, Death Note `plays-straight`, Better Call Saul `plays-straight`, and The Good Place `hybrid` where Sonnet and Haiku consistently picked `deconstructs` / `reinvents`. The line between `deconstructs` and `reinvents` is genuinely blurry for several of these; some disagreement is informative rather than wrong. Worth one more pass of mode definitions before accepting the label space as final.
- **`stakes_scale` literal-vs-dramatic ambiguity.** Opus called The Good Place `cosmic` (literal afterlife setting) where Sonnet and Haiku correctly read `interpersonal` (the show invests its emotional weight in friendships, not in the cosmos). The prompt says "PRIMARY DRAMATIC stakes" but Opus reads literally on edge cases. Add one or two negative examples in the prompt.
- **`subtextual_themes` rarely returns `[]`.** The prompt explicitly says "if a work is genuinely surface-only, return `[]`" but in practice the model almost always produces a subtextual phrase even for shows where there isn't much beneath the surface. Likely needs a worked example of a "return `[]`" case (a popcorn action film, a procedural) to anchor the calibration.

## What we rejected

- **Stay with V1 (closed-vocab themes only)** — empirical Stage 0 (2026-05-15) showed V1 systematically misses surface pleasures. The OPM extraction across Haiku/Sonnet/Opus and all three prompt variants never once named the fights, the Madhouse S1 animation, or the Saitama-vs-Boros battle until the prompt was reframed. Four action-coded anime (OPM, Chainsaw Man, AoT FS, Mob Psycho) collapse to near-identical V1 theme sets; V4 sharply distinguishes them via `viewer_pleasures`.
- **Closed-vocab `viewer_pleasures`** — controllable but lossy. Fan-discourse pleasures are too varied to enumerate (e.g. "Janet as one of TV's most inventive comic creations", "Sawano's bombastic score elevating every climax", "Kim Wexler as one of TV's great characters"). Open-vocab keeps fidelity; downstream embedding (future ADR) provides the matching layer.
- **Per-episode or per-season extraction** — 12–50× cost increase for low marginal signal at the recommendation layer. The small subset of shows where season variance materially matters (BoJack tonal pivots, Game of Thrones late-season collapse) can be revisited in Phase 1B if user complaints surface it.
- **Pure collaborative filtering / forum mining as primary signal** — fails Phase 1A's cold-start success metric (PROJECT.md §53: "5–10 onboarding likes → relevant recs"). Belongs in Phase 2 layered on top of content-based extraction, not instead of it. AniList/MAL user lists and TMDB's `/recommendations` endpoint are the cheap, legal future path; forum scraping is neither.
- **Haiku 4.5 for everything** — Stage 0 showed Haiku misses cultural-knowledge depth for well-known works. Several V1 titles (Mob Psycho 100, A Silent Voice, Death Note variants) returned empty extractions under Haiku where Sonnet succeeded. The ~5× cost saving is not justified when extraction quality is the moat.
- **Opus 4.7 for everything** — Sonnet 4.6 quality is close enough that the ~5× cost premium isn't justified for routine extraction. Reserve Opus for the golden evaluation set used to tune prompts and validate Sonnet output.
- **Adding more closed-vocab `themes` slugs** — would not fix the gap the new fields fix. The 70-slug vocabulary is fine; the failure was structural (single-field, work-about framing), not vocabulary size.
- **Embedding `viewer_pleasures` and `comparable_titles` now (Phase 1A)** — pgvector is already provisioned ([ADR-0006](0006-vector-store.md)) and embeddings would extract more matching power, but PROJECT.md §96 defers content-embedding to Phase 2. This ADR extracts in an *embedding-ready* shape; the embedding step is one decision away when Phase 2 opens.

## Why

PROJECT.md §111–116 names the cross-medium theme taxonomy as defensible moat #2 (after group recs, which depend on it). Extraction quality directly determines moat strength. CLAUDE.md §2 makes `packages/ml/*` an architectural boundary for the same reason.

The existing V1 extraction (synopsis-only → closed-vocab themes only) systematically misses what viewers actually enjoy. The blind spot is structural: the prompt asks "what is this work about" and the model dutifully answers in film-criticism register. For a recommendation engine the right question is "why does someone watch and rewatch this" — different question, different answer, and the latter is what determines whether a recommendation lands. The Stage 0 OPM extraction made this concrete: across Haiku/Sonnet/Opus and three prompt variants, *no* model mentioned the fights, the animation, or the Boros battle until the prompt was reframed around viewer enjoyment. After reframing, all three models *independently* named the Madhouse S1 animation and the Saitama-vs-Boros fight.

Empirical Stage 0 results (compare across 15 titles, then a focused 8-title re-test, 2026-05-15):

- The reframed prompt produces strong cross-model consensus on surface pleasures — much tighter agreement than V1/V2 thematic extraction.
- `viewer_pleasures` distinguishes within-category — four action-coded anime produce four genuinely different pleasure profiles where V1 themes would collapse them.
- The model correctly calibrates. Better Call Saul gets craft pleasures (Odenkirk performance, Kim Wexler, slow burn); The Good Place gets ensemble + ethics-jokes + Janet. No "everything has fights" overcorrection.
- `comparable_titles` produces cross-medium bridges (Watchmen ↔ AoT, *Tree of Life* ↔ Evangelion, Mad Men ↔ BoJack) that no Postgres join over AniList tags ∩ TMDB keywords would surface. This is the highest single-field leverage in the schema for cross-medium recommendation.

Sonnet 4.6 as default model is justified by the cultural-knowledge gap with Haiku (which materially hurts the head of the catalog where extraction quality matters most), and by the negligible quality difference with Opus at ~5× the cost. Estimated one-shot re-extraction cost for the ~3,000-title catalog: **$30–60**.

This is a §4 stop-and-ask area in CLAUDE.md (theme extraction is the moat boundary). The empirical Stage 0 work *was* the stop-and-ask; this ADR records what the asking concluded.

## What would change our mind

- **A/B testing shows `viewer_pleasures` overlap doesn't outperform `themes` overlap** as a scoring signal once we wire it into `scoreCandidate`. Re-evaluate field weighting and prompt framing.
- **Cost balloons** — if Sonnet pricing rises or the catalog grows ≥10× and one-shot re-extraction exceeds $500, revisit a tiered strategy (Sonnet for top-N popular titles, Haiku for tail).
- **The viewer-experience framing leaks biases at scale** — fan-discourse pleasures may over-index on titles with active English-language fandoms. If extraction quality degrades sharply for foreign-language or niche titles, add a "no-prior-knowledge mode" branch keyed off popularity.
- **Embedding `viewer_pleasures` (Phase 2)** turns out to require more structured input than free-form text supports cleanly. Tighten to a controlled vocabulary, or interpose a normalisation step.
- **Legal/ToS shifts** around using Claude for content tagging at scale make the cost or risk model unworkable.
- **Per-episode/per-season extraction becomes load-bearing** — if "the engine recommends me Game of Thrones based on S1 but I hated S8" becomes a recurring user complaint, revisit season-level granularity for the small set of shows where it materially matters.

## Related

- [PROJECT.md](../../PROJECT.md) §moats — moat-2 (cross-medium taxonomy) is what this ADR protects.
- [ADR-0006](0006-vector-store.md) — pgvector is provisioned; `viewer_pleasures` and `comparable_titles` are designed to be embedding-ready when Phase 2 opens.
- [ADR-0008](0008-ml-inference-approach.md) — pre-computed nightly recs via Inngest; the new schema slots into the same pipeline.
- [ADR-0023](0023-franchise-level-taste-signal.md) — parallel recommendation-quality investment; both ADRs strengthen the same moat from different angles (signal aggregation vs descriptor richness).
- [CLAUDE.md](../../CLAUDE.md) §2 (`packages/ml` boundary), §4 (stop-and-ask scope including theme extraction).
- [apps/web/src/server/themes/extract.ts](../../apps/web/src/server/themes/extract.ts) — current V1 implementation this ADR proposes replacing.
- [apps/web/scripts/compare-models.ts](../../apps/web/scripts/compare-models.ts), [apps/web/scripts/test-viewer-pleasures.ts](../../apps/web/scripts/test-viewer-pleasures.ts) — Stage 0 empirical backing (run output captured in sibling `compare-output-*.txt` and `test-pleasures-*.txt`).
- **Follow-up ADRs needed before implementation:**
  (a) **Storage schema** — new tables vs JSONB column on `titles`; backfill / cutover plan; whether to retire `title_themes` or co-exist.
  (b) **Scoring integration** — how `viewer_pleasures`, `tone`, and `comparable_titles` factor into `scoreCandidate` in `packages/ml`. Currently `title_themes` is orphaned downstream; that has to be fixed for any of this to reach the user.
  (c) **Phase 2 embedding strategy** — embed `viewer_pleasures` / `comparable_titles` via Voyage AI or OpenAI, store in pgvector, define nearest-neighbour query shape and score blending.

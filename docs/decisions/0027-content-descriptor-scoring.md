# ADR-0027: V4 content descriptors in the recommendation engine

**Status:** Accepted
**Date:** 2026-05-15
**Supersedes:** —

## What we chose

Wire **five of the eight V4 fields** into `packages/ml` scoring at Phase 1A. Defer three to Phase 2 pending embeddings ([ADR-0006](0006-vector-store.md), [PROJECT.md §96](../../PROJECT.md)).

### Wired now

| Field | Score component | Mechanism |
|---|---|---|
| `themes` (V4 closed-vocab) | **`themeScore`** | User's V4-theme taste vector (aggregated from rated titles' themes, weighted by rating delta from neutral) overlapped with each candidate's V4 themes, weighted by per-theme confidence. |
| `comparable_titles` (resolved-FK edges only) | **`comparableScore`** | Bidirectional graph walk: if user has rated title `T` and an edge exists `T → candidate` OR `candidate → T`, contribute `userRating(T) × edgePositionWeight`. Unresolved string-only edges ignored. |
| `narrative_mode`, `engagement_level`, `stakes_scale` | **`enumFitScore`** | Three sub-scores, one per enum field. User's preference distribution (counts of each value across rated titles, rating-weighted) × candidate's value. Summed. |

### Score formula

```
totalScore = baseTagScore                  // existing — unchanged
           + β × themeScore                // NEW — V4 closed-vocab themes
           + γ × comparableScore           // NEW — comparable-title graph
           + δ × enumFitScore              // NEW — mode + engagement + stakes
```

**Initial weights:** `β = 1.0`, `γ = 0.8`, `δ = 0.3`. Tunable constants in `packages/ml`. These are strawmen anchored on the intuition that closed-vocab theme overlap is the moat signal (β at parity with baseline), the comparable-titles graph is high-leverage but its resolution rate is unknown until V4 runs at scale (γ slightly below), and the three enum fields are coarser per-field signals that earn weight only when summed (δ small).

### Deferred to Phase 2

- `viewer_pleasures`, `tone`, `subtextual_themes` — all open-vocab. Direct string matching is fragile (LLM produces "spectacular fight choreography" / "kinetic combat" / "great action" for the same pleasure). Stored at extraction time per [ADR-0026](0026-content-descriptor-storage.md), ready for embedding-based similarity scoring when Phase 2 opens.

### Public surface change to `packages/ml`

Per [packages/ml/CLAUDE.md](../../packages/ml/CLAUDE.md), function signature changes are contract changes. **This change is additive** (optional parameter; absence → existing V1 behaviour unchanged), not breaking. Existing callers continue to work without modification.

```typescript
// packages/ml/src/recommendation.ts (exported)
export function recommendForUser(
  taste: UserTasteVector,
  candidates: ReadonlyArray<TitleTagSet>,
  limit: number = DEFAULT_LIMIT,
  themeMembership: ReadonlyArray<TagThemeMembership> = [],
  v4?: V4RecInputs,                              // NEW — optional
): Recommendation[];

export interface V4RecInputs {
  taste: V4TasteVector;                          // user's aggregated V4 signal
  candidateDescriptors: ReadonlyMap<string, V4Descriptor>;
  comparableEdges: ReadonlyArray<ComparableEdge>;
  userRatings: ReadonlyMap<string, number>;      // titleId → rating delta from neutral
}

export interface ComparableEdge {
  fromTitleId: string;
  toTitleId: string;
  position: number;                              // 0-4, lower = stronger
}
```

The caller (`apps/web` Inngest pre-compute job per [ADR-0008](0008-ml-inference-approach.md)) is responsible for fetching all of this from Postgres and assembling the plain-data inputs. `packages/ml` never reads the DB directly — invariant per [packages/ml/CLAUDE.md](../../packages/ml/CLAUDE.md).

The internal `scoreCandidate` is extended in parallel; the explanation layer (`scoreCandidateBreakdown`, used by `explainRecommendation`) returns the per-component breakdown so reasonHint copy can name *which* V4 signal drove a recommendation.

### Group recs

`recommendForGroup` receives `V4RecInputs` per member and applies the existing group reduction ([ADR-0020](0020-group-rec-strategy.md)) to the new components. No new group-specific logic in this ADR.

### Tests

Per [packages/ml/CLAUDE.md](../../packages/ml/CLAUDE.md), all non-trivial functions in this package use Approach B (sub-agent isolation, CLAUDE.md §8.1). The new scoring components are non-trivial. Tests will be written by a sub-agent with only the V4 schema (ADR-0025), the score formula above, and the contract in mind — not the implementation source. Rankings are asserted; absolute scores are not.

## What we rejected

- **Wire all 8 fields with poor-man's-embedding string normalisation (lowercase, dedup, stem-match)** — brittle. "spectacular fight choreography" / "kinetic combat" / "great action" all encode the same pleasure but don't string-match. We'd ship a scoring component that systematically under-credits genuine matches. Embedding is the right tool; defer.
- **Reciprocal Rank Fusion / rank-based score blending** — more robust to scale differences between components but much harder to debug. When a recommendation looks wrong, "candidate Y ranked Nth across each axis" is harder to reason about than "candidate Y got 1.4 from tags + 2.1 from themes." Phase 1A optimises for debuggability, not robustness-to-scale.
- **Hierarchical cascade (tag-score primary, V4 as tie-breaker)** — wastes the V4 signal on candidates the existing tag-score already ranks confidently. The whole point of the V4 work is that themes/comparables/enums catch signal the tags miss. Tie-breaker isn't where that signal pays off.
- **Wait for full Phase 2 embeddings before wiring anything** — leaves five high-signal fields on the floor for months while Phase 1A ships. The five wired fields are exactly the ones that *don't* need embeddings to be useful (closed-vocab themes, FK-resolved comparables, enums).
- **User-rating-agnostic comparable graph (each edge is +1 boost regardless of how the user felt about the source title)** — a user who *disliked* title X shouldn't see their dislike's comparables boosted. The `userRatings` field threads rating valence through the boost.
- **Use unresolved comparable-title strings for scoring** — without an FK, we'd need string matching against the catalog (the very fuzzy problem we deferred in ADR-0026). Pure string boost would be noise.
- **Externalise score weights (β, γ, δ) as DB-configurable per-user** — premature. Constants are debuggable. Per-user weights belong in Phase 2 personalisation work, not in the initial wiring.

## Why

The V4 extraction work ([ADR-0025](0025-viewer-experience-extraction.md)) is worth nothing until something downstream consumes it. Today `title_themes` is orphaned from `packages/ml/scoring.ts` — only the reasonHint generator reads it ([apps/web/src/inngest/functions/recommend.ts](../../apps/web/src/inngest/functions/recommend.ts)). That's the gap this ADR closes.

The three wired components correspond to the three "free" recommendation signals the V4 schema provides at Phase 1A:

1. **`themes`** is the literal moat signal per [PROJECT.md §111-116](../../PROJECT.md). Aggregating closed-vocab themes from rated titles into a user theme vector, then scoring candidates by overlap, is the most direct expression of the cross-medium-theme-based recommendation promise. This was always the plan; the wiring just hadn't happened.

2. **`comparable_titles`** with FK resolution is a title-to-title graph the LLM hands us at extraction time. No user-behavioural data needed — the model's training-data cultural knowledge produces edges like *Watchmen ↔ Attack on Titan*, *Tree of Life ↔ Evangelion*, *Mad Men ↔ BoJack* (per Stage 0). These edges are cross-medium by construction, which is exactly what moat #2 needs. Even at modest FK resolution rates (Phase 1A unknowns suggest 40-70%), this is the highest single-field leverage in the schema.

3. **Enum fits** (mode/engagement/stakes) individually are coarse — three buckets, five buckets, five buckets. Together they're a meaningful viewing-mode match: a user who consistently rates `engagement_level: low + stakes_scale: interpersonal + narrative_mode: plays-straight` works highly is signalling a comfort-watch preference that the existing tag-overlap can't see. The δ weight is low because each field is coarse; the sum is what earns its place.

Linear combination over rank fusion is debuggability. When a rec looks wrong, the breakdown is readable: `tag=0.8 + theme=1.2 + comparable=0.6 + enum=0.1 = 2.7`. The team can trace which component drove a bad recommendation and which weight needs revisiting. Rank fusion obscures this.

Backward compatibility via an optional `v4` parameter respects [packages/ml/CLAUDE.md](../../packages/ml/CLAUDE.md)'s "small stable public surface" rule. Callers that haven't yet adopted V4 keep working; the Inngest pre-compute job opts in once the V4 extraction has run. This avoids a synchronised flag day.

## What would change our mind

- **A/B testing shows one of `β`, `γ`, `δ` dominates** in a way that suggests the formula is mis-shaped — e.g. all top-10 recs are driven by `comparableScore`, suggesting it should be capped or normalised against the other components.
- **FK resolution rate is genuinely low** (<40% of LLM-produced comparable strings resolve to a catalog title). The graph signal collapses; either invest in catalog coverage or pull the Phase 2 embedding work forward to resolve via vector similarity.
- **Cold-start metric ([PROJECT.md §53](../../PROJECT.md)) stays poor** even after wiring. The five new components were partly motivated by improving the 5–10 onboarding-likes → relevant recs experience; if that doesn't move, the diagnosis was wrong somewhere upstream (extraction quality, or the user signal aggregation, or the score blend).
- **Pre-compute job p95 regresses** beyond the [packages/ml/CLAUDE.md](../../packages/ml/CLAUDE.md) performance budget (<50ms per `recommendForUser` call). The V4 inputs add work per candidate; if the impact is unacceptable, materialise per-user V4 taste into Postgres rather than reassembling at pre-compute time.
- **Rank fusion turns out to be necessary** because the component score scales drift sharply as the catalog grows (e.g. `themeScore` outgrows `baseTagScore` because more themes get extracted per title than tags are assigned). Migrate the blending formula but keep the per-component breakdown for explanation.
- **Per-user weight tuning becomes load-bearing** (Phase 2 personalisation). Externalise `β`/`γ`/`δ` into the user profile.

## Related

- [ADR-0025](0025-viewer-experience-extraction.md) — the extraction contract that produces the inputs this ADR consumes.
- [ADR-0026](0026-content-descriptor-storage.md) — the storage schema this ADR's caller (Inngest pre-compute) reads from.
- [ADR-0008](0008-ml-inference-approach.md) — pre-computed nightly recs. The caller of `recommendForUser(…, v4)` is that pipeline.
- [ADR-0020](0020-group-rec-strategy.md) — group reduction. `recommendForGroup` extends to V4 via the same V4RecInputs-per-member shape; group reduction logic is unchanged.
- [ADR-0023](0023-franchise-level-taste-signal.md) — franchise aggregation. Composes with this ADR — franchise-aggregated rated entries become the input to the V4 taste-vector builder.
- [ADR-0006](0006-vector-store.md) — pgvector. The home of Phase 2 embedding-based wiring for `viewer_pleasures` / `tone` / `subtextual_themes`.
- [CLAUDE.md](../../CLAUDE.md) §4 — stop-and-ask scope for `packages/ml` changes.
- [packages/ml/CLAUDE.md](../../packages/ml/CLAUDE.md) — pure-module invariants, Approach B test discipline, public-surface contract rules.
- [packages/ml/src/scoring.ts](../../packages/ml/src/scoring.ts), [packages/ml/src/recommendation.ts](../../packages/ml/src/recommendation.ts) — the existing implementation this ADR extends.
- **Follow-up ADR** when Phase 2 opens: embedding-based scoring for `viewer_pleasures` / `tone` / `subtextual_themes`, including the score blending update (new ε, ζ, η components) and pgvector query shape.

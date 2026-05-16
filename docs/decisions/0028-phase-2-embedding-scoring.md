# ADR-0028: Phase 2 — embedding-based scoring for open-vocab V4 fields

**Status:** Proposed
**Date:** 2026-05-16
**Supersedes:** — (supersedes the QUEUE.md strawman drafted 2026-05-16)

## What we chose

Per-field embeddings of the three open-vocab V4 descriptor fields (`viewer_pleasures`, `tone`, `subtextual_themes`) using **OpenAI `text-embedding-3-small` (1536 dim) via the Vercel AI SDK**, stored in **pgvector** alongside the existing `title_descriptors` data, with **three new normalised scoring components** (ε for viewer_pleasures, ζ for tone, η for subtextual_themes) layered into `recommendForUser` per [ADR-0027 Edit 2026-05-16](0027-content-descriptor-scoring.md)'s extensible weighting scheme.

### Concrete shape

**Schema (new table):**

```sql
CREATE TABLE title_field_embeddings (
  title_id        UUID NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  field           TEXT NOT NULL CHECK (field IN ('viewer_pleasures', 'tone', 'subtextual_themes')),
  embedding       vector(1536) NOT NULL,
  source_model    TEXT NOT NULL,        -- 'openai/text-embedding-3-small'
  model_version   TEXT NOT NULL,        -- '2024-01-25' or similar
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (title_id, field)
);
CREATE INDEX title_field_embeddings_field_hnsw_idx
  ON title_field_embeddings USING hnsw (embedding vector_cosine_ops)
  WHERE field = 'viewer_pleasures';
-- (Separate partial HNSW indexes per field — see "What we rejected" below
-- for why not a single index across all fields.)
```

**Embedding generation:** for each title with V4 descriptors, embed each field's phrase array as a SINGLE STRING joined by `' • '`:

```typescript
const pleasuresText = descriptor.viewerPleasures.join(' • ');
// e.g. "spectacular one-shot fight finishers • S1 Madhouse animation widely
//       cited as a high-water mark • deadpan reaction shots..."
const { embedding } = await embed({
  model: openai.embedding('text-embedding-3-small'),
  value: pleasuresText,
});
```

**Score components (extending the V4 framework):**

```
totalScore = baseTagScore         (V1, alpha = 1.0)
           + beta  × themeScore   (V4 closed-vocab)
           + gamma × comparableScore
           + delta × enumFitScore
           + epsilon × pleasuresEmbeddingScore     // NEW
           + zeta    × toneEmbeddingScore           // NEW
           + eta     × subtextEmbeddingScore        // NEW
```

`pleasuresEmbeddingScore(candidate)` = cosine similarity of the candidate's `viewer_pleasures` embedding against the user's **rating-weighted mean** `viewer_pleasures` embedding, normalised per-component across the candidate set the same way V4 components are.

Initial weights (all strawmen): **ε = 1.5, ζ = 0.8, η = 0.5**. Reasoning: `viewer_pleasures` was the Stage 0 load-bearing field (it fixed the OPM "spectacular fights" gap), so it gets parity-plus weight. `tone` is a meaningful but more diffuse signal. `subtextual_themes` is the most film-criticism-coded field and probably contributes least to actual recommendation fit; small weight until empirical tuning says otherwise.

**Cost (first pass, all current V4-extracted titles):**

| Step | Tokens | Cost |
|---|---|---|
| Embed 3 fields × ~3,000 titles × ~150 tokens/field | 1.35M | **~$0.03** |
| Re-embedding after prompt iteration | Same | ~$0.03/run |
| Per-user-recompute (no new embeddings; just cosine NN in pgvector) | 0 | $0 |

OpenAI also offers a 50% discount via batch API. At this volume, not worth the operational complexity.

**Time:** ~2-3 sessions
- Session 1: schema migration + embedding job + backfill
- Session 2: scoring kernel extension + Approach B sub-agent tests
- Session 3: weight tuning + Linear ticket follow-ups + ADR finalisation

## What we rejected

- **OpenAI `text-embedding-3-large`** — 3072 dim, $0.13/1M, ~5% MTEB lift over `-3-small`. Costs ~$0.18 for first pass. The MTEB lift is real but not transformative at our scale + use case (similarity matching of short phrases, not long-document retrieval). Easy migration path if quality is insufficient — same provider, just swap the model id.

- **Voyage AI `voyage-3-large`** — 1024 dim default (matryoshka 256/512/1024/2048), $0.18/1M, **+10.58% MTEB over OpenAI-3-large at 1024 dim** per their 2025 benchmark. Strongest quality available. Rejected for v1 because: (a) new vendor with its own billing/observability story; (b) Vercel AI Gateway support is less mature than OpenAI; (c) OpenAI-3-small is sufficient for the proof of concept. **Flagged as the upgrade path if quality issues surface.**

- **Cohere `embed-v4`** — 1536 dim with matryoshka, $0.12/1M for text, $0.47/1M for image. Multimodal is interesting (could embed posters + descriptors together) but irrelevant for Phase 2 scope. Quality benchmarks put it below voyage-3-large and roughly on par with OpenAI-3-large. No compelling reason at our scale.

- **Self-hosted (sentence-transformers via Vercel AI Gateway or HuggingFace Inference Endpoints)** — zero per-call cost but operational overhead (model versioning, container scaling, latency variance). Not worth it at our scale. Revisit if monthly embedding spend exceeds $50/month at production scale.

- **Concatenate all three fields into one embedding per title** — easier to score (one component instead of three), saves storage. Loses per-field signal. Stage 0 evidence shows `viewer_pleasures` and `tone` distinguish shows on different axes (one captures *what's enjoyed*, the other captures *how it feels*). Mushing them flattens these axes back together. Keep separate.

- **Per-phrase embeddings (one row per phrase instead of per field)** — gives finest-grained matching, supports queries like "find titles with phrases similar to X". Explodes storage (15-20 rows per title vs 3) and aggregation cost at scoring time. Mean-of-field is the right granularity for Phase 2; per-phrase is a Phase 3 consideration if specific phrase matching becomes a product feature.

- **Embedding-only scoring (replace V4 themes + comparable + enum entirely)** — embeddings are dense and high-signal but lose the interpretable handles (theme slug, comparable title id, enum value) that the explanation layer uses for headline copy ("Reminiscent of Mob Psycho 100"). Keep V4 closed-vocab and enums; ADD embedding components on top. The combined system is interpretable AND has the dense-similarity power.

- **Single HNSW index across all three fields** — saves one index, query needs `WHERE field = 'X'`. Performance penalty per query: HNSW degrades when the filter eliminates >50% of vectors. Separate per-field partial indexes are the cleaner pattern and at our scale (3k titles × 3 fields = 9k vectors) the storage overhead is negligible.

- **Postgres `cube` extension instead of pgvector** — `cube` works for low dimensions (≤100) but lacks the HNSW / IVFFlat indexes pgvector provides for 1536-dim vectors. Wrong tool.

- **Wait for OpenAI's batch API** — 50% discount, async with 24h SLA. At $0.03 first-pass cost the savings are $0.015 — not worth the operational complexity.

## Why

Three reinforcing motivations:

1. **The three open-vocab fields were Stage 0's load-bearing insight.** The `viewer_pleasures` reframing fixed the OPM "spectacular fights" gap that single-handedly transformed the rec quality. Currently stored, extracted, but *unused for scoring*. ADR-0027 explicitly defers their scoring to Phase 2 pending embeddings — this ADR is that Phase 2 work.

2. **Embeddings are the right tool for fuzzy phrase similarity.** Two titles with viewer_pleasures `"kinetic chainsaw combat with inventive choreography"` and `"visceral, blood-soaked chainsaw combat"` are obviously similar — but no string-comparison heuristic catches this and the closed-vocab themes are too coarse-grained. Dense embeddings get this for free.

3. **The infrastructure is already in place.** [ADR-0006](0006-vector-store.md) provisioned pgvector; it's currently unused. The Vercel AI SDK is already a dependency. Adding the title_field_embeddings table is purely additive. The biggest implementation lift is the scoring-kernel extension, which mirrors the existing ε/ζ/η component pattern from ADR-0027.

The cost at our scale is **negligible** — $0.03 for the first pass embeds the entire V4-extracted catalog (~3,000 titles × 3 fields). Even at 10× catalog scale and 10× re-embedding frequency, annual spend stays under $5. The friction is implementation effort + ADR alignment, not cost.

This is the highest-leverage Phase 2 unlock per PROJECT.md §111-116 (cross-medium taxonomy as moat #2). It compounds with the existing V4 work — every V4-extracted title becomes embedded automatically, and the scoring layer gains three new components that capture *the most expressive* parts of the V4 schema.

## Implementation sketch

**Phase 2.1 — Schema + Embedding Generation (1 session)**

1. Migration 0021: create `title_field_embeddings` table + 3 partial HNSW indexes (one per field).
2. New module `apps/web/src/server/embeddings/generate.ts` — pure function: takes `title_descriptors` row + Vercel AI SDK client → 3 embeddings.
3. New script `apps/web/scripts/embeddings-backfill.ts` — iterates V4-extracted titles, calls generate, writes to pgvector. Resume-safe (skips titles already embedded with current `source_model + model_version`).
4. Cost monitoring: log per-batch token consumption for budgeting.

**Phase 2.2 — Scoring kernel extension (1 session, includes Approach B tests)**

1. New types in `packages/ml/src/recommendation.ts`:
   ```typescript
   export interface V4EmbeddingTaste {
     readonly viewerPleasures: ReadonlyArray<number> | null;  // mean embedding
     readonly tone: ReadonlyArray<number> | null;
     readonly subtextualThemes: ReadonlyArray<number> | null;
   }
   export interface V4EmbeddingInputs {
     readonly taste: V4EmbeddingTaste;
     readonly candidateEmbeddings: ReadonlyMap<string, { /* per-field */ }>;
   }
   ```
2. New component computations in `packages/ml/src/scoring.ts`: cosine similarity per field.
3. Extend `V4RecInputs` with optional `embedding?: V4EmbeddingInputs`.
4. Extend `computeRecommendationScales` to include the three new components.
5. Extend `recommendForUser` + `recommendForGroup` to consume the new components.
6. Spawn sub-agent for Approach B tests (`packages/ml/CLAUDE.md` §8.1 mandatory).

**Phase 2.3 — Inngest pre-compute wiring + weight tuning (1 session)**

1. Update `apps/web/src/inngest/functions/recommend.ts`:
   - Fetch `title_field_embeddings` for candidate set + user's rated titles
   - Build `V4EmbeddingTaste` (rating-weighted mean of rated titles' field embeddings)
   - Pass `V4EmbeddingInputs` to `recommendForUser`
2. Run `validate-rec-profiles` to eyeball whether the embedding components materially improve cross-medium recs.
3. Iterate weights (ε, ζ, η) based on sample quality.
4. Promote this ADR's status to `Accepted` once weights settle.

## What would change our mind

- **OpenAI embedding pricing changes substantially** — switch to Voyage-3-large or Cohere embed-v4 (both still cheap at our scale, both higher quality).
- **OpenAI quality ceiling is hit** — eyeball 50-100 cross-medium pairs, if matches feel mediocre (e.g. `"spectacular fights"` doesn't match `"kinetic combat"`), switch to Voyage-3-large. Migration cost is one re-embed run ($0.18 for the larger model).
- **pgvector becomes a hot spot** at >100k embeddings — switch to a dedicated vector DB (Pinecone, Weaviate) per [ADR-0006 §what-would-change-our-mind](0006-vector-store.md). Our current trajectory is ~30k embeddings at 10k titles × 3 fields — pgvector handles this comfortably.
- **The mean-of-field aggregation mushes distinct preferences** — a user who likes both "spectacular action" and "quiet character drama" gets a mean embedding that points at neither. If this is a real issue, switch to: (a) per-anchor embeddings + top-K matching, or (b) clustered taste profiles.
- **Per-field separate components turn out to over-fit** — three new score components add three new weight tuning knobs. If ε/ζ/η can't be set independently because they trade off in unstable ways, collapse to a single "embedding similarity" component using concatenated-field embeddings.
- **The `viewer_pleasures` field's quality erodes** under prompt iteration — the embedding signal is downstream of LLM output quality. If extraction quality regresses, embedding quality regresses with it. Revisit prompt v4.x calibration before chasing embedding-side fixes.

## Related

- [PROJECT.md](../../PROJECT.md) §96 — explicitly defers "Content recommendations from synopsis (NLP/embeddings)" to Phase 2.
- [PROJECT.md](../../PROJECT.md) §111-116 — cross-medium taxonomy as moat #2; this ADR's three new score components are the dense embedding layer atop the closed-vocab moat.
- [ADR-0006](0006-vector-store.md) — pgvector chosen for Phase 1A; currently unused; this is its first real consumer.
- [ADR-0025](0025-viewer-experience-extraction.md) — extraction schema; the three open-vocab fields (`viewer_pleasures`, `tone`, `subtextual_themes`) are what this ADR scores.
- [ADR-0026](0026-content-descriptor-storage.md) — storage; this ADR adds a new table alongside.
- [ADR-0027](0027-content-descriptor-scoring.md) — V4 scoring + normalisation; this ADR extends with three new components in the same per-component normalisation framework.
- [ADR-0008](0008-ml-inference-approach.md) — pre-computed nightly recs; embedding generation is a new step in that pipeline.
- [ADR-0017](0017-hosting-platform.md) — Vercel for Phase 1A. Vercel AI SDK is the natural client; the OpenAI provider package (`@ai-sdk/openai`) is not under `@vercel/*` so it doesn't violate the lock-in firewall.
- [packages/ml/CLAUDE.md](../../packages/ml/CLAUDE.md) — pure-module invariants, Approach B test discipline; this ADR's scoring-kernel extension follows the same pattern as ADR-0027.
- **Follow-up after this ADR lands:** the franchise-key Linear ticket (ADR-0023 follow-up) — the same embedding pipeline can resolve unresolved comparable-title strings via vector similarity, lifting FK resolution from 88% toward 95%+. Two use cases, one shared pipeline.

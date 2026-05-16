# ADR Queue — pending stack-selection decisions

**This is Phase 1 work.** Walk through each entry below with the human, finalise as a real numbered ADR using `_template.md`, then commit. The order is roughly dependency order — earlier choices constrain later ones.

Each entry below has:
- The decision to make
- The previous-session Claude's recommendation
- The alternatives that were considered and why they're not the recommendation
- What might change the recommendation

These are NOT decisions yet. They're strawmen for the new-session Claude + human to challenge or accept.

---

---

## ADR-XXXX: Phase 2 — embedding-based scoring for `viewer_pleasures` / `tone` / `subtextual_themes`

**Recommendation:** OpenAI `text-embedding-3-small` (1536 dim) + pgvector cosine similarity, embedded per-field and aggregated at score time. Run as an Inngest cron after V4 extraction. Phase 2 work per [PROJECT.md §96](../../PROJECT.md) and [ADR-0027 §what-we-rejected](0027-content-descriptor-scoring.md).

**The decision:** how to score the three open-vocab V4 fields (`viewer_pleasures`, `tone`, `subtextual_themes`) that are stored but currently un-used by the recommender. These were Stage 0's load-bearing insight (the OPM "spectacular fights" gap fix); they're the highest-leverage Phase 2 unlock.

**Strawman implementation:**

- Add `title_field_embeddings(title_id, field, embedding vector(1536), source_model, prompt_version)` table. One row per (title, field) — 3 rows per title.
- Embed each phrase array as a single string (`viewer_pleasures.join(' • ')`) per title. Total: ~3,000 V4-extracted titles × 3 fields × ~150 tokens/string = ~1.4M tokens.
- Cost: $0.02 / 1M tokens (OpenAI `text-embedding-3-small`) → **~$0.03 for the first pass** of all current V4 titles. Negligible.
- Storage: pgvector HNSW index on each field-typed embedding column for cosine NN.
- Score component: for each candidate, compute cosine similarity of its field embedding vs a *user field embedding* (mean of rated titles' field embeddings, weighted by rating delta). Three new scoring components (one per field), normalised + weighted into the existing combined score per [ADR-0027 Edit 2026-05-16](0027-content-descriptor-scoring.md).
- ADR-0027 §what-we-chose explicitly leaves room for these as components ε, ζ, η.

**What we'd reject:**

- **Voyage AI** — better quality embeddings (voyage-3 1024-dim) but $0.06/1M tokens (3× cost). Worth revisiting if we hit quality ceilings with OpenAI's embeddings, but premature now — at our scale and field shape, embedding quality differences are inside the noise of the LLM-generated phrases themselves.
- **Cohere `embed-v4`** — strong multilingual coverage but $0.10/1M tokens (5× cost) and the multilingual benefit is mostly noise for our anime-heavy catalog.
- **Self-hosted (sentence-transformers via Vercel AI Gateway)** — zero per-call cost but operational overhead (model versioning, vector dim stability, latency). Not worth it at our scale.
- **Concatenate all three fields into one embedding per title** — easier to score (one component instead of three), but loses the per-field signal. Phase 1A V4 already showed tone and viewer_pleasures distinguish shows differently; keeping them separate preserves that.
- **Per-phrase embeddings (one row per phrase, not per field)** — gives finest-grained matching but explodes storage and aggregation cost. Per-field mean is the right granularity.
- **Embedding-only scoring (replace V4 themes + comparable + enum entirely)** — embeddings are powerful but lose the interpretable handles (themeSlug, comparable title, enum value) the explanation layer needs. Keep V4 components, add embeddings as an additional layer.

**What might change the recommendation:**

- **OpenAI embedding pricing changes substantially** — switch to Voyage or self-hosted.
- **Quality ceiling hits at OpenAI** — sample 50-100 titles, eyeball similarity matches, switch to Voyage if matches feel mediocre.
- **PGVector becomes a hot spot** — at >100k embeddings, may need dedicated vector DB (Pinecone, Weaviate) per [ADR-0006 §what-would-change-our-mind](0006-vector-store.md).
- **The user signal aggregation (mean rating-weighted embedding) turns out to mush distinct preferences** — switch to "anchors-only embedding" or top-K nearest-rated-embedding.

**Dependencies on other Phase 2 work:**

- Embedding-aware comparable-title resolution (ADR-0006) — uses the same OpenAI embedding pipeline to fuzzy-match unresolved comparable strings against catalog titles. Two use cases, one pipeline. Cost is shared.

**Estimated effort:** 2-3 sessions.
- Session 1: schema + embedding job (extract→OpenAI→pgvector)
- Session 2: scoring integration in `packages/ml` + sub-agent tests
- Session 3: tune weights + comparable-title fuzzy resolution + ADR finalisation

**Empirical readiness (as of 2026-05-16):**

- 2,500+ titles have V4 descriptors (505 from initial bulk + 2,000 in-progress)
- 88% comparable-title FK resolution post-trigram-fallback
- V4 scoring + normalisation + reasonHint copy all wired end-to-end
- Multi-profile validation shows V4 produces meaningful cross-medium recs
- Open-vocab fields are highest-quality V4 output but un-used in scoring — straight unlock with no further extraction work needed

---

## How to work through this queue in Phase 1

1. **Read each entry above with the human.**
2. **For each: confirm the recommendation, push back, or pick an alternative.** Don't accept silently — make the human articulate why they agree.
3. **Write the real ADR file** at `docs/decisions/000X-<title-slug>.md` using `_template.md`. Status = "Accepted". Date = today.
4. **Commit each ADR as its own commit** (`docs(adr): accept ADR-0001 monorepo tool` etc).
5. **Mark this `QUEUE.md` entry as resolved** by deleting that section and adding a one-liner to `README.md`'s index table.

Once all pending entries are accepted: Phase 1 done, move to Phase 2 (repo bootstrap).

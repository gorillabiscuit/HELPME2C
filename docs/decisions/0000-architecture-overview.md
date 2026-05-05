# ADR-0000: Architecture overview

**Status:** Draft. To be reviewed and finalised in Phase 1 by the Claude Code session that picks up after kickoff.
**Date:** 2026-05-03
**Supersedes:** —

This ADR is unusual — it's not a single decision; it's the macro shape of the system, written upfront so subsequent ADRs (0001 through ~0011) refine specific choices without re-litigating the whole picture. Treat it as a strawman: the previous-session Claude wrote it from the product brief; the new session should challenge anything that looks wrong.

---

## What we chose

A **Next.js monorepo with a tRPC API, Postgres + pgvector for data, Inngest for scheduled / queued jobs, and a cleanly-separated recommendation engine module that can be re-exposed as a public product later.**

Concretely:

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (Phase 1A) / Mobile (Phase 2)                           │
│   ↓ tRPC over HTTP, type-safe end-to-end                         │
├─────────────────────────────────────────────────────────────────┤
│  apps/web (Next.js, Vercel)                                      │
│   ├── Server Components for the read-heavy surface (title pages, │
│   │   recommendation lists, group views)                         │
│   ├── tRPC routers in app/api/trpc/                              │
│   └── auth via [chosen provider] (ADR-0004)                      │
├─────────────────────────────────────────────────────────────────┤
│  packages/                                                       │
│   ├── shared/    types, Zod schemas, hooks (platform-agnostic)   │
│   ├── ui/        React components (web only)                     │
│   ├── ml/        recommendation engine (the prospective moat)    │
│   │              ├── tag-overlap scoring (Phase 1A)              │
│   │              ├── group-compatibility scoring (Phase 1A)      │
│   │              ├── ghost-profile inference (Phase 1B)          │
│   │              └── embedding-based recs (Phase 2)              │
│   └── content/   ingestion + sync from TMDB / AniList            │
├─────────────────────────────────────────────────────────────────┤
│  Postgres ([provider TBD by ADR-0005])                           │
│   ├── relational: users, watch_entries, ratings, groups,         │
│   │               titles, tags, streaming_availability            │
│   └── pgvector: title_embeddings, user_taste_vectors              │
│                 (Phase 2 work; schema in place from Phase 1A)     │
├─────────────────────────────────────────────────────────────────┤
│  Inngest (job orchestration)                                     │
│   ├── nightly: refresh title metadata from TMDB / AniList        │
│   ├── nightly: precompute personal recommendations per user      │
│   ├── on-write: invalidate cached recommendations when user      │
│   │             rates / changes a watch entry                    │
│   └── on-demand: group recommendation computation (sync, fast)   │
├─────────────────────────────────────────────────────────────────┤
│  External APIs                                                   │
│   ├── TMDB (TV / film metadata + watch providers)                │
│   ├── AniList GraphQL (anime metadata + tag taxonomy)            │
│   └── (Phase 1B+) RapidAPI Streaming Availability if TMDB        │
│       coverage is insufficient                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Key macro decisions baked in here

- **Monorepo, not polyrepo.** One repo, multiple packages. Pnpm workspaces (assumed, ADR-0001 confirms).
- **API surface is internally tRPC.** End-to-end type safety, no codegen, fits solo dev. (Confirmed in ADR-0003.)
- **Recommendation engine is a clean module (`packages/ml`).** It MUST be importable as a pure module from any caller — Next.js API route, future public REST/GraphQL layer, future RN app. This boundary preserves the option to license API access later (PROJECT.md §revenue).
- **Tag-based scoring carries Phase 1A.** No ML model training in MVP. AniList's tag taxonomy is the secret weapon — rich, well-curated, public. Embedding models come in Phase 2.
- **Pre-compute personal recs nightly.** Page load = key lookup, not a model invocation. Group recs are computed on-demand from pre-computed taste vectors (cheap intersection).
- **Postgres + pgvector, not a separate vector store.** One database, one bill, one backup story. Pinecone / Weaviate are a Phase 2+ consideration only if pgvector hits scale limits.
- **Inngest, not custom cron.** Type-safe, retries, observability, free tier. Sync jobs are well-understood; don't roll our own.

---

## What we rejected

- **Polyrepo (separate web / api / ml repos).** Wrong scale for a solo dev. Monorepo with workspaces gives clean separation without the overhead of multi-repo dependency management and cross-repo PRs.
- **Microservices.** No. Solo dev, MVP. One Next.js app + one job-runner + one DB. Microservices is a Phase 3+ consideration if specific components need independent scaling.
- **REST or GraphQL public API as the internal surface.** REST = lots of hand-typed types and client-server drift. GraphQL = excellent for complex relational queries but adds codegen complexity, schema management, and learning curve. tRPC nails internal type safety with zero codegen. A REST or GraphQL public API can be layered on top later when productizing — it doesn't have to be the internal interface.
- **Live ML inference for personal recs at request time.** Latency risk + cost + complexity. Pre-compute nightly hits the latency budget (<500ms p95) trivially. Live inference is a Phase 2+ optimisation.
- **A separate vector database (Pinecone / Weaviate / Qdrant) in MVP.** pgvector is more than enough for the data volumes we'll have in Phase 1A and 1B. Adding a vector DB adds operational complexity, cost, and a sync story we don't need yet.
- **Self-hosted everything.** Costs solo-dev time we don't have. Vercel + Supabase / Neon + Inngest is the Phase 1A stack default.
- **Content collected via web scraping.** TMDB and AniList both have official APIs with sane terms. Scraping is fragile and legally grey.

---

## Why

The shape above optimises for:

1. **Solo-dev velocity.** Type-safe end-to-end (tRPC), one DB to operate (Postgres + pgvector), one job runner (Inngest), one hosting platform for the web app (Vercel). Minimal moving parts.
2. **Defensible moat preservation.** `packages/ml` is the prospective product. Keeping it as a clean module from day 1 means a future public API can use the same code without rewriting.
3. **Cross-medium recommendations.** The architecture supports ingesting from TMDB AND AniList into a unified taxonomy in Postgres. Theme-based scoring runs on the unified data, not per-source.
4. **Phase 1A's hard cut-line.** No ML training, no live inference, no vector DB, no microservices, no public API surface. All of those are deferred. The architecture LEAVES ROOM for them but doesn't include them.
5. **Privacy compliance from day 1.** Postgres makes data-deletion endpoints easy. tRPC makes per-procedure scoping straightforward. POPIA + GDPR are bake-in requirements (PROJECT.md §scope), and this stack accommodates them without heroics.

---

## What would change our mind

- **Volume / scale.** If Phase 1A unexpectedly catches and we have 100k+ users, pgvector will hit limits. Migrate to a vector DB then, not now.
- **Recommendation latency proves insufficient.** If pre-compute is too stale (e.g., users want recs to reflect a rating they just gave), we add an event-driven re-compute via Inngest, then live inference if that's not enough.
- **API resale becomes the primary revenue.** If the recommendation engine becomes the product before the consumer app does, we extract `packages/ml` into a separate service with its own API surface. Today it's a module; tomorrow it might be its own deployable.
- **TMDB watch-provider data has insufficient coverage.** Switch to RapidAPI's Streaming Availability API (paid). Architectural impact: minimal, just a different sync source.
- **A specific feature need breaks the monorepo assumption.** E.g., if mobile and web teams diverge enough that shared code becomes net-negative. Solo dev for now, so unlikely.

---

## Related

- `PROJECT.md` — product scope, Phase 1A cut-line, revenue model
- `docs/decisions/QUEUE.md` — pending stack-selection ADRs (0001–0011) that refine the choices in this overview
- `CLAUDE.md` §2 (architectural invariants) — derives from this overview; if this changes, those rules need updating

---

_This ADR is the strawman. Phase 1's first task is for the new session + human to walk through it together, push back on anything wrong, and finalise — then move to the queue of detail-level stack ADRs._

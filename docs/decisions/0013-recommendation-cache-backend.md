# ADR-0013: Recommendation cache backend

**Status:** Accepted
**Date:** 2026-05-04
**Supersedes:** —

## What we chose

Postgres (the same Neon instance from ADR-0005) is the cache for pre-computed personal recommendations in Phase 1A. A single `user_recommendations` table keyed by `user_id` with a `JSONB` payload column, populated by the nightly Inngest job from ADR-0007. No separate cache service.

## What we rejected

- **Redis (Upstash or similar)** — sub-ms reads, but adds another service, another bill, another secret, and a cross-store consistency story for cache invalidation. Overkill for a per-user key-value lookup at MVP scale.
- **In-memory cache on the Next.js server** — doesn't survive deploys and doesn't share across function invocations on Vercel. Wrong fit for pre-computed data.
- **Vercel KV / Edge Config** — viable but couples us to Vercel and adds a third data store when Postgres is already the source of truth.

## Why

Pre-computed recommendations are fundamentally a key-value lookup keyed by `user_id`. The read path is one logged-in user fetching their own row; an indexed `SELECT` returning a `JSONB` payload is sub-10ms on a free Neon instance and well under the <500ms p95 personal-rec budget from ADR-0008.

Keeping the cache in Postgres collapses three concerns into one: cache invalidation on user actions (rating, watch-entry change) becomes a single `UPDATE` in the same transaction as the trigger event, no cross-store consistency problem. Backups, connection pooling, secrets, and the operational surface stay aligned with ADR-0005 and ADR-0006.

The migration cost if we later need Redis is small — the call site is one function in `packages/ml` reading by `user_id`. Pinning Redis pre-emptively trades zero current benefit for ongoing operational cost. Defer until measured need.

## What would change our mind

- Pre-computed-rec read p95 exceeds the 500ms budget under realistic load.
- We need a TTL / eviction model that Postgres can't express cleanly (current pre-compute pattern doesn't need one — entries are overwritten by the nightly job).
- We add other cache use-cases (session data, rate-limit counters, hot key-value reads from middleware) where Redis is genuinely better and the second store starts paying for itself.
- Connection-pool pressure from cache reads starts crowding out write traffic on the primary Postgres instance.

## Related

- ADR-0005 (Postgres host — Neon)
- ADR-0006 (vector store — same Postgres + pgvector)
- ADR-0007 (job orchestration — Inngest writes the cache)
- ADR-0008 (ML inference approach — pre-compute pattern this cache serves)
- PROJECT.md §Phase 1A scope
- CLAUDE.md §2 (architectural invariants)

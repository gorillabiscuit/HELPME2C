# ADR-0008: ML inference approach

**Status:** Accepted
**Date:** 2026-05-04
**Supersedes:** —

## What we chose

We chose pre-computed personal recommendations nightly via Inngest, stored in cache (Redis or Postgres). Group recommendations are computed on-demand from pre-computed taste vectors.

## What we rejected

- **Live inference per request** — risky latency and cost; defer until pre-compute is provably stale enough to hurt user experience.
- **Hybrid (pre-compute + live re-rank)** — optimization for Phase 2+ if needed, not Phase 1A.
- **Hosted ML serving (Modal / Replicate)** — only relevant when we have actual trained ML models; not applicable to Phase 1A's rule-based scoring.

## Why

HelpME2C's Phase 1A uses tag-based scoring with AniList's tag taxonomy as the primary signal, blended with user rating preferences. This is rule-based logic, not ML model inference.

Pre-computing personal recommendations nightly means:
- Page load = a fast key lookup, not a compute operation.
- Group recommendations are a vector intersection on pre-computed taste profiles, sub-100ms even for large groups.
- We hit our performance targets (<500ms p95 for personal recs, <2s p95 for group recs) without complex ML serving.

This approach aligns with our Phase 1A focus on shipping a working product quickly. When user testing shows tag-based scoring is insufficient, we'll graduate to embedding-based recommendations in Phase 2, at which point we can re-evaluate live inference or a dedicated ML serving platform.

## What would change our mind

- User testing reveals tag-based scoring produces poor recommendations that impact retention.
- Pre-compute staleness becomes a UX problem (users want recs to reflect ratings they just gave immediately).
- We need to train and serve custom embedding models, which calls for dedicated ML infrastructure.

## Related

- ADR-0000 (depends on / influences)
- ADR-0007 (job orchestration)
- PROJECT.md §Phase 1A scope
- CLAUDE.md §2 (pre-compute architecture)

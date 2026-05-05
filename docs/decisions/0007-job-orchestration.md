# ADR-0007: Job orchestration / scheduling

**Status:** Accepted
**Date:** 2026-05-04
**Supersedes:** —

## What we chose

We chose Inngest as the job orchestration and scheduling service for HelpME2C.

## What we rejected

- **Trigger.dev** — strong competitor with similar feature set, but Inngest's event-driven model is a better fit for our patterns like "user rated a title → recompute their recs."
- **Vercel Cron + Vercel Functions** — works for simple scheduled tasks, but lacks retries, observability, and queue management we need for reliability.
- **Self-hosted BullMQ** — operational complexity too high for solo dev; we should not manage a separate job queue infrastructure.
- **Plain cron on a VPS** — same problem; operational overhead with minimal benefits over a managed service.

## Why

HelpME2C has several background jobs in Phase 1A:

- Nightly: refresh title metadata from TMDB / AniList
- Nightly: refresh streaming availability per region
- Nightly: pre-compute personal recommendations per active user
- On-write: invalidate cached recommendations when a user rates or changes a watch entry

Inngest provides type-safe, event-driven jobs with built-in retries, observability, and a free tier that covers MVP scale. Its event model naturally maps to "something happens, trigger a background job" patterns, which is exactly what we need. The developer experience is strong for a Next.js app, and we can integrate it directly into `apps/web` without extra infrastructure.

## What would change our mind

- Inngest's pricing becomes prohibitive at MVP scale.
- Trigger.dev releases a feature that is materially better for our patterns.
- We decide to use a fully self-hosted stack and can absorb the operational cost.

## Related

- ADR-0000 (depends on / influences)
- ADR-0008 (ML inference approach)
- PROJECT.md §Phase 1A scope

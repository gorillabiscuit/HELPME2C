# ADR-0015: API deployment shape — tRPC inside Next.js

**Status:** Accepted
**Date:** 2026-05-04
**Supersedes:** —

## What we chose

The tRPC server (settled by ADR-0003) lives **inside `apps/web`** for Phase 1A. Routers are at `apps/web/src/server/router.ts`, exposed via a Next.js Route Handler at `apps/web/app/api/trpc/[trpc]/route.ts`. There is no separate `apps/api` deployment. Server Components call procedures in-process via the tRPC server caller; client components and the browser hit `/api/trpc/...` over HTTP. One Next.js app, one Vercel project, one URL.

This ADR also removes the `apps/api/` directory placeholder from the repo. When and if extraction is needed, it gets created fresh alongside a superseding ADR.

## What we rejected

- **Separate `apps/api` process from day one** — physically isolates API from rendering, but doubles deployments, secrets, env vars, and CI surface; introduces CORS, version-skew failure modes, and shared-cookie auth complexity; loses Server Components' in-process caller superpower; pays operational cost for a Phase 1A product with no second consumer.
- **Empty `apps/api/` placeholder directory with a stub README** — the prior `apps/api/CLAUDE.md` already invited deletion at the start of Phase 2. Keeping an empty directory just to mark intent is clutter; the intent now lives in this ADR's "What would change our mind" section.
- **Pinning a non-Next.js framework (Hono, Fastify) for an eventual extracted API** — premature; the right framework depends on what the extraction is for, which we don't know yet.

## Why

[ADR-0003](0003-api-surface.md) settled the protocol (tRPC). This ADR settles only the deployment shape, and the deployment shape that makes sense for Phase 1A is "the simplest one that doesn't paint us into a corner."

The corner-painting risk is low because [CLAUDE.md §2](../../CLAUDE.md) already pins the invariant that matters: `packages/ml` is a pure module with no coupling to Next.js or any HTTP framework. tRPC routers in `apps/web/src/server/` are thin functions that call into `packages/ml` and return data. Moving those routers to a freestanding `apps/api/` later is mechanical copy-paste, not a rewrite. The moat is in `packages/ml`, not in the deployment topology.

The benefits of co-locating in `apps/web` for Phase 1A are real and immediate: atomic deploys (impossible to ship a stale frontend against a new backend), no CORS, no cookie-sharing dance for the auth provider chosen in [ADR-0004](0004-auth-provider.md), Server Components calling procedures without HTTP round-trips, and one Vercel project to monitor. The cost — that recommendation compute and page renders share function execution slots — is largely hypothetical because [ADR-0008](0008-ml-inference-approach.md) pre-computes recommendations nightly via Inngest; the read path is a fast Postgres lookup per [ADR-0013](0013-recommendation-cache-backend.md).

## What would change our mind

Concrete signals that would trigger extraction to `apps/api/` (and a superseding ADR):

- The Phase 2 mobile app ships and we want a stable, versioned API URL distinct from the marketing/web URL.
- The public REST/GraphQL API revenue product (per [PROJECT.md §revenue](../../PROJECT.md)) becomes real and demands its own deployment lifecycle.
- Recommendation compute starts measurably degrading page-render p95 latency, and the fix is "give the API its own function pool."
- We hit a Vercel function-timeout or memory ceiling that a separately-configured API service could relax.

If any of these fires, the extraction is: create `apps/api/`, copy routers from `apps/web/src/server/`, point `apps/web`'s tRPC client at the new URL, set up CORS + shared-cookie auth, write the superseding ADR. Days of work, not weeks.

## Related

- ADR-0003 (API surface — tRPC, the protocol)
- ADR-0008 (ML inference — pre-compute, why shared function slots is a low risk)
- ADR-0013 (Recommendation cache backend — fast read path)
- CLAUDE.md §1 (repo structure — `apps/api` line removed by this ADR)
- CLAUDE.md §2 (cross-package import direction — `apps/api` clause removed by this ADR)
- PROJECT.md §revenue (public API as future product)

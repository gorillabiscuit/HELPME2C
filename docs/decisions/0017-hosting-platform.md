# ADR-0017: Hosting platform (Vercel for Phase 1A with lock-in firewall)

**Status:** Accepted
**Date:** 2026-05-05
**Supersedes:** —

## What we chose

Vercel for Phase 1A hosting of `apps/web`. Standard Next.js deployment using the **Node.js runtime** (not Edge Runtime), no Vercel-specific features adopted at the application level. Postgres lives on Neon ([ADR-0005](0005-database-postgres-host.md)), background jobs on Inngest ([ADR-0007](0007-job-orchestration.md)), recommendation engine in [`packages/ml`](../../packages/ml/CLAUDE.md) — all external to Vercel and host-agnostic.

The application code stays portable: a host migration to Cloudflare Workers (via `@opennextjs/cloudflare`), self-host on Fly.io / Railway / Render, or AWS Amplify is a deploy-config change at the host level, not an application rewrite. The forbidden-features list below is what makes that promise hold.

## What we rejected

- **Cloudflare Workers** — cheaper at scale and edge-everywhere, but Next.js compatibility historically required the `@opennextjs/cloudflare` adapter with rough edges; cold-start improvements are real but unnecessary for our latency budget. Worth revisiting when Vercel pricing or scale warrants migration.
- **Self-host on Fly.io / Railway / Render** — full control with no proprietary features, but more ops surface for solo dev. The right answer if Vercel pricing becomes a problem at scale.
- **AWS Amplify / Netlify** — Vercel-likes with similar trade-off shape, no clear win for us.
- **Self-host on a raw VPS** — too much ops work for solo dev velocity at Phase 1A.

## Forbidden Vercel-specific features (the lock-in firewall)

These are banned at the application level. The whole point of this ADR is that adopting any of them silently converts a portable deployment into a Vercel-locked one. Adding to this list requires no ADR; removing from it does.

- **`@vercel/kv`** — use Postgres (per [ADR-0013](0013-recommendation-cache-backend.md)) or external Redis if needed.
- **`@vercel/blob`** — use S3-compatible storage when/if image or file hosting is needed.
- **`@vercel/edge-config`** — use Postgres or external config.
- **`@vercel/postgres`** — already not using; we use Neon direct per [ADR-0005](0005-database-postgres-host.md).
- **`@vercel/analytics`, `@vercel/speed-insights`** — use Plausible / PostHog / Umami / similar vendor-agnostic tools when analytics lands (planned ADR).
- **Vercel Edge Runtime** — Node.js runtime only. Also matches our actual technical needs: `pg` driver, Inngest SDK, and `packages/ml` all expect Node APIs.
- **ISR / Vercel-specific cache strategies that depend on Vercel's edge cache infrastructure** — standard Next.js caching only (`fetch` cache, `revalidate` on Server Components, etc, all of which work on any host).
- **Any `unstable_*` Next.js or Vercel API** — if it's not stable, we don't depend on it.
- **Any other `@vercel/*` package** — except what comes transitively with `next` itself (those are part of Next.js, not opt-in lock-in).

Standard `<Image>` from `next/image` is allowed: Vercel intercepts optimization on its platform, but the import is host-agnostic. Just no Vercel-specific loader options.

## Why

Solo dev with no users yet. Vercel's value is the smoothest deploy story for Next.js — `git push` → live URL — which compounds across Phase 3+ ticket work. Pricing concerns don't bite at our scale: free tier covers MVP traffic; cost only becomes real once we have users to monetize, at which point we have signal to justify the migration.

The lock-in critique that prompted this ADR is real but neutralizable. Lock-in only happens if you adopt the proprietary features. Forbidding them at the contract level (this ADR + a banned-patterns reference in [apps/web/CLAUDE.md](../../apps/web/CLAUDE.md)) keeps the application code host-agnostic.

The forbidden-features list is the actual safety net. Without it, this ADR is just "we picked Vercel" and the lock-in surface slowly grows over time as someone reaches for `@vercel/kv` because it's convenient. With the list, the rule is explicit, reviewable in PRs, and enforceable.

This decision is consistent with the project's broader anti-vendor-lock-in stance: `packages/ml`'s clean-module invariant ([CLAUDE.md §2](../../CLAUDE.md)), shadcn's code-ownership model ([ADR-0016](0016-component-library.md)), and the API-deployment-shape extraction path ([ADR-0015](0015-api-deployment-shape.md)). Each of those preserves optionality at a different layer; this ADR preserves it at the deployment layer.

## What would change our mind

- Bandwidth / function-execution costs at scale exceed an alternative's by a meaningful margin (e.g. >2× difference at projected traffic).
- A genuine need for true edge compute (sub-50ms global p95 for procedures) materializes — Cloudflare Workers becomes the obvious move.
- Vercel changes pricing or behavior in a way that materially impacts the project (e.g. surprise bandwidth bills, credentials revocation, or service-level changes).
- We want to consolidate on Cloudflare for some other reason (e.g. using Cloudflare R2 + Workers + D1 as a coherent stack).
- A deployment region or compliance feature Vercel doesn't offer becomes required (e.g. EU-only data residency for a GDPR scope).

## Related

- ADR-0002 (Next.js)
- ADR-0005 (Postgres on Neon — host-agnostic)
- ADR-0007 (Inngest jobs — host-agnostic)
- ADR-0013 (Recommendation cache backend — Postgres, NOT Vercel KV)
- ADR-0015 (API deployment shape — tRPC inside Next.js, Node runtime)
- ADR-0016 (Component library — shadcn code-ownership model is the same anti-lock-in logic)
- CLAUDE.md §2 (`packages/ml` host-agnostic invariant)
- apps/web/CLAUDE.md §banned-patterns (`@vercel/*` and Edge Runtime forbidden — this ADR is the reason)
- PROJECT.md §revenue (vendor flexibility supports future productization)

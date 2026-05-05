# ADR-0005: Database (Postgres host)

**Status:** Accepted
**Date:** 2026-05-04
**Supersedes:** —

## What we chose

We chose Neon as the managed Postgres provider for HelpME2C.

## What we rejected

- **Supabase** — attractive if we were using Supabase Auth, but we chose Clerk for authentication and therefore do not need the integrated auth/storage bundle.
- **Self-hosted Postgres** — operational tax is too high for a solo dev and not needed for Phase 1A.
- **PlanetScale** — MySQL-only and incompatible with our pgvector requirement.
- **AWS RDS / Aurora** — enterprise-grade but too complex and costly for MVP scale.
- **Vercel Postgres** — effectively Neon under the hood; using Neon directly gives cleaner billing and avoids an extra abstraction.

## Why

HelpME2C requires Postgres 15+ and pgvector support for the recommendation engine boundary in `packages/ml`. Neon provides a managed Postgres experience with low operational overhead while keeping our database provider separate from authentication.

Because we chose Clerk for auth in ADR-0004, using Neon avoids paying for Supabase Auth and keeps the DB decision aligned with our requirement for pgvector, branching, backups, and connection pooling. Neon is the best fit for a solo dev building an MVP that needs a reliable managed database without unnecessary vendor coupling.

## What would change our mind

- We decide to adopt Supabase Auth or another integrated auth+DB provider.
- Neon’s pricing or feature limits become unfavorable at MVP scale.
- We need globally-distributed read replicas or a provider-specific feature Neon cannot provide.

## Related

- ADR-0000 (depends on / influences)
- ADR-0004 (auth provider)
- ADR-0006 (vector store)
- PROJECT.md §Phase 1A scope
- CLAUDE.md §2 (Postgres + pgvector requirement)

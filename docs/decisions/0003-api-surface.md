# ADR-0003: API surface

**Status:** Accepted
**Date:** 2026-05-04
**Supersedes:** —

## What we chose

We chose tRPC for the internal API surface.

## What we rejected

- **REST** — while universally understood, it would require hand-typed types or code generation for a type-safe internal API, which is unnecessary for our solo-dev MVP.
- **GraphQL** — powerful for complex queries, but its schema and codegen overhead is not worth it for an internal-only API in Phase 1A.
- **RPC over plain HTTP (no framework)** — avoids framework dependencies but misses the type safety and developer ergonomics we need.

## Why

HelpME2C needs an internal API that is fast to build, type-safe, and easy to maintain. tRPC gives us end-to-end TypeScript safety between the frontend and backend without introducing extra schema generation or boilerplate.

This aligns with the architectural shape in `0000-architecture-overview.md` and keeps the recommendation engine boundary in `packages/ml` clean. The backend can expose pure functions from `packages/ml` through tRPC routers in `apps/web`, and a future public REST or GraphQL API can be layered on top later without changing the core recommendation logic.

## What would change our mind

- Public API access becomes a priority before the internal app ships.
- A non-TypeScript client needs a first-class internal API surface.
- We decide to standardize on GraphQL across multiple products.

## Related

- ADR-0000 (depends on / influences)
- PROJECT.md §revenue model
- CLAUDE.md §2 (API surface is internally tRPC)

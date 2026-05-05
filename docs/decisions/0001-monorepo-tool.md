# ADR-0001: Monorepo tool

**Status:** Accepted
**Date:** 2026-05-04
**Supersedes:** —

## What we chose

We chose `pnpm workspaces` as the monorepo tool for HelpME2C.

## What we rejected

- **Turborepo** — adds remote caching and task pipelining, but is overkill for a solo dev and introduces extra operational complexity.
- **Nx** — powerful and opinionated, but the onboarding curve and framework-specific patterns are unnecessary for this MVP-focused project.
- **Plain npm / yarn workspaces** — functional, but `pnpm` is faster and provides better disk efficiency via a content-addressable store.

## Why

`pnpm workspaces` provides lightweight workspace management with strong performance and simple dependency handling. It fits the solo-dev velocity requirement from `PROJECT.md` by avoiding heavyweight tooling while still supporting the multi-app/package layout in `CLAUDE.md` and `0000-architecture-overview.md`.

This project needs a robust monorepo setup without introducing additional infrastructure or learning overhead. `pnpm` supports workspace filtering (`pnpm dev --filter=@helpme2c/web`), efficient installs, and good compatibility with TypeScript and Next.js, which makes it the best choice for Phase 1 and the initial bootstrap.

## What would change our mind

- Build times become a daily friction point for local development.
- The team grows beyond 3 developers and needs remote caching / task pipelining.
- We want code generation for repeated patterns that Nx generators would help automate.

## Related

- ADR-0000 (depends on / influences)
- PROJECT.md §Phase 1A scope
- CLAUDE.md §1 (Repo structure)

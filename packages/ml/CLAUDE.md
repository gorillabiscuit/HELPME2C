# packages/ml — package-specific CLAUDE.md

Inherits from root `CLAUDE.md`. **The most rule-heavy package in the repo.** Read carefully before writing code here.

---

## Why this package is special

This is the prospective product moat (`PROJECT.md` §revenue). The recommendation engine is what makes HelpME2C defensible — group recs with ghost-profile inference + cross-medium theme-based scoring. If this becomes the differentiator, we may eventually sell API access to it as a separate product.

That has implications:

1. **`packages/ml` MUST be importable as a pure module from any caller.** No coupling to Next.js. No coupling to a specific HTTP framework. No coupling to Vercel-specific runtime APIs. Pure TypeScript that runs in Node.
2. **The public surface area should be small and stable.** A small number of well-defined exports — `recommendForUser`, `recommendForGroup`, `scoreCompatibility`, `inferGhostProfile`, `extractTasteVector`. These are the contract a future public API ships against. Adding to this list is fine; renaming or changing semantics requires an ADR.
3. **Tests are mandatory and use Approach B (sub-agent isolation per CLAUDE.md §8.1).** No exceptions. Rubber-stamp tests written in the same conversation as the implementation will hide real bugs that ship to a future paying customer.

## What lives here (Phase 1A)

- **Tag-overlap scoring.** Compute personal recommendations from AniList tag taxonomy + user's ratings.
- **Group compatibility scoring.** Given a list of users with taste vectors, compute a ranked title list with per-user compatibility scores.
- **Taste vector extraction.** From a user's watch history + ratings, derive a taste vector (a representation that the scoring functions consume).
- **Cross-medium taxonomy normalisation.** Helpers that map TMDB keywords to AniList tags (or to a unified internal taxonomy — to be designed in Phase 2 when we have the data).

## What does NOT live here

- HTTP / API routing. That's in `apps/web/app/api/trpc/*` — tRPC routers IMPORT this module and expose its functions.
- Database access. This module operates on plain TypeScript objects passed in by the caller. The caller (a tRPC router or batch job) is responsible for fetching data from Postgres and passing it in. This is so:
  1. Tests can run without a database
  2. The module can be re-used by a future public API without dragging Postgres assumptions
- React / UI / rendering. This is server-side / pure-logic code only.

## Banned patterns specific to this package (in addition to root §3)

- **No HTTP framework imports.** No `next`, no `express`, no `fastify`, no `trpc`. tRPC routers import THIS module, not the other way around.
- **No direct database / ORM imports.** No `pg`, no Prisma, no Drizzle. Data comes in as plain objects via function arguments.
- **No React / DOM / RN imports.** Pure server-side logic.
- **No Vercel-specific imports** (e.g., `@vercel/edge`). Pure Node.
- **No file I/O** (`fs.readFile` etc) without an ADR. The taxonomy data should be loaded by the caller and passed in, not read from disk by this module.
- **No mutable global state.** Functions are pure. Caches at this layer are pure-function memoisation only (e.g., `lru-cache`).

## Testing requirements

Per `CLAUDE.md §8.1`:

- **All non-trivial functions in this package use Approach B (sub-agent isolation).**
- Tests live in `packages/ml/src/**/*.test.ts` next to the code (Vitest convention).
- Tests use realistic fixture data — small but representative title metadata, mock user histories.
- Tests assert on RANKINGS not on absolute scores (scores are sensitive to weighting; rankings are the actual contract).
- Edge cases that MUST be tested: empty user history (cold start), single user in group (degenerate group), user with no overlapping tags with any title in the candidate set, group with conflicting tastes (one member loves X, another hates X).

## Public exports

Define and document in `packages/ml/src/index.ts`. Anything not exported from `index.ts` is internal — callers may not reach in.

## Versioning

Once a function is in `packages/ml/src/index.ts` and consumed by `apps/web`, treat its signature as a contract. Breaking changes require:

- An ADR
- A migration plan for callers
- A `BREAKING CHANGE vs <ticket>` flag per CLAUDE.md §4

## Performance budget

Per PROJECT.md success metrics:

- Personal recommendation function: <50ms p95 (since recs are pre-computed by Inngest, the function itself runs offline in a job — but should still be fast for the job runtime)
- Group compatibility scoring: <500ms p95 for a 5-user group computed at request time
- Taste vector extraction: <100ms p95

Profile if you suspect slowness; don't assume.

---

## Why these rules

The recommendation engine is the moat. Treating it as a clean module from day 1 — pure inputs, pure outputs, no coupling to the consumer app's framework choices — is what makes future productization possible without rewriting. Every shortcut taken here costs us optionality on the revenue side.

When in doubt, treat this package as if you're writing a library you'll publish to npm — even though you won't (yet).

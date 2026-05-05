# ADR-0009: Streaming availability data source

**Status:** Accepted
**Date:** 2026-05-04
**Supersedes:** —

## What we chose

We chose TMDB watch providers API for Phase 1A, with an upgrade path to RapidAPI Streaming Availability if coverage gaps become problematic.

## What we rejected

- **RapidAPI Streaming Availability** — paid, comprehensive coverage (~$20–50/mo at MVP scale), but TMDB is sufficient for Phase 1A and avoids unnecessary cost upfront.
- **JustWatch unofficial API / scraping** — TOS prohibits, fragile, legally grey. No.
- **Manual curation** — doesn't scale and is error-prone.

## Why

HelpME2C needs streaming availability data to show users "where to watch" a recommended title. TMDB's watch providers API provides this data via their official, stable API, which aligns with our use of TMDB for TV/film metadata.

For Phase 1A, TMDB coverage is adequate, and the API is free (within reasonable limits). If user testing reveals significant gaps (e.g., missing major platforms in key regions), we can upgrade to RapidAPI's paid service without architectural changes. This keeps our MVP lean while leaving room for improvement.

## What would change our mind

- Coverage gaps in TMDB significantly hurt the "where to watch tonight" UX.
- Affiliate revenue justifies the paid tier for better data.
- TMDB changes their API terms or pricing in a way that makes it less viable.

## Related

- ADR-0000 (depends on / influences)
- PROJECT.md §Phase 1A scope
- CLAUDE.md §4 (stop-and-ask for external API calls)

# Search-coverage harness

On-demand diagnostic that measures how well `titles.search` surfaces titles
people actually look for. It runs a ~1000-title corpus through the **real**
`titles.search` procedure and classifies each result.

This is **not** the CI regression test. The fast, hermetic regression test lives
at `apps/web/src/server/routers/titles.search.test.ts` (PGlite, seeded trap
cases, runs in `pnpm test`). This harness is the broad, live-data sweep you run
by hand when you want a coverage picture across the whole catalog.

## What's here

- `recognition-corpus.ts` — ~180 curated, cross-audience titles (prestige TV,
  sitcoms, K-drama, Bollywood, kids, classic + modern anime, telenovela, …).
  Sourced independently of the sync distribution so a miss is a real signal.
- `search-coverage.ts` — the runner. Pulls ~800 popularity-ranked titles from
  the catalog (a matching/ranking test) + the recognition corpus (a coverage
  test), runs the real search, and classifies each outcome:
  - `covered` — catalog had it and search surfaced it
  - `rescued_by_fallback` — wasn't in catalog; live TMDB ingest backfilled it
  - `franchise_collapsed` — a season/part query returned the parent (by design)
  - `matching_bug` — in the catalog but search missed it
  - `coverage_gap` — genuinely not in the catalog
- `coverage-report.md` / `coverage-results.json` — generated outputs (gitignored).

## Running it

The search procedure's on-demand fallback **writes** to the DB (it upserts TMDB
results). Always run against a disposable Neon branch so the dev/prod catalog is
never mutated:

```bash
# 1. create a throwaway branch of the dev DB (Neon console or MCP) and copy its
#    connection string
# 2. from apps/web:
cd apps/web
DATABASE_URL='<branch-connection-string>' \
  pnpm dlx tsx --env-file=.env.local scripts/search-coverage/search-coverage.ts
# 3. read scripts/search-coverage/coverage-report.md
# 4. delete the branch when done
```

The inline `DATABASE_URL` overrides the one in `.env.local` (Node's `--env-file`
does not clobber an already-set variable), so the rest of the env — e.g. the
TMDB key used by the ingest fallback — still loads.

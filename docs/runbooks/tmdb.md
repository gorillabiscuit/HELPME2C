# Runbook: TMDB (The Movie Database)

**What it is:** content metadata source for TV and film, plus watch-provider
data per region. Per [ADR-0009](../decisions/0009-streaming-availability-data-source.md).

## What breaks if it's down

- The nightly TMDB Inngest sync fails its `fetch-discover-page` and per-show
  fetch steps. Inngest retries the function `retries: 3` times with backoff;
  if all retries exhaust, the cron fails and is visible in Inngest's
  dashboard.
- Existing data in our `titles`, `tags`, and `streaming_availability`
  tables is unaffected — TMDB is a sync source, not a runtime read source.
  **No user-visible impact for short outages**, just stale data.
- A future "search for a title to add" UI that hits TMDB live for new
  titles outside our cache will break. Not in scope for Phase 1A.

## Manual fallback

For the sync: wait for TMDB to recover and re-run `processTmdbTvShow` /
`fetchTmdbTvDiscoverPage` for any backfill needed. Both are exported from
`apps/web/src/inngest/functions/tmdb-sync.ts` and are directly invokable.

For staleness during prolonged outage: not a real problem in days. If TMDB
were down for weeks (extremely unlikely), AniList or a manual upload would
be the bridge — neither wired yet.

## Status page

https://status.themoviedb.org/

## How we tell it's TMDB and not us

- Sentry errors with messages like `TMDB /tv/<id>... → 502` from
  `processTmdbTvShow`'s `tmdbGet` helper → TMDB-side.
- 401/403 responses → our `TMDB_READ_ACCESS_TOKEN` is invalid/expired/revoked.
- 429 responses → rate-limited; we're hitting too many parallel requests.
  Mitigation: Inngest's per-show `step.run` calls are sequential, so this
  shouldn't happen in normal operation.
- Specific endpoints failing (e.g. `/tv/{id}/watch/providers` only) →
  TMDB-side per-endpoint outage; the rest of the sync still works for
  metadata even if streaming providers don't refresh.

## Rate limits

TMDB has historically allowed ~50 requests/sec per API key on the free tier,
no monthly cap. We're not close to this — one cron run is 2 fetches × 20
shows × up to 100 pages, sequentially distributed across the per-page
function executions. Inngest handles backpressure naturally.

## Cost signals

- Free for non-commercial use. We're under the non-commercial cap right now.
- Commercial use requires a contract — not yet relevant; check before
  alpha-launch / monetisation per [PROJECT.md §revenue](../../PROJECT.md).

## Key rotation

`TMDB_READ_ACCESS_TOKEN` (the v4 bearer token; preferred over the v3 API key):

1. https://www.themoviedb.org → Settings → API → "Generate new" or revoke
   the existing token.
2. Update env var in Vercel + local `.env.local`.
3. Redeploy.

`TMDB_API_KEY` (v3, kept for legacy compatibility but currently unused in
sync code) — same rotation flow.

## Endpoints we use

- `GET /discover/tv?sort_by=popularity.desc&page={n}&language=en-US`
- `GET /tv/{id}?append_to_response=keywords&language=en-US`
- `GET /tv/{id}/watch/providers`

Image URLs assembled with the `https://image.tmdb.org/t/p/w500` prefix —
not metered separately, but they hit TMDB's CDN. Vercel's image proxy
caches them.

## Reference docs

- [TMDB API docs](https://developer.themoviedb.org/docs)
- [TMDB attribution requirements](https://www.themoviedb.org/about/logos-attribution) — must
  surface "powered by TMDB" credit in the UI when consuming their data
- [ADR-0009](../decisions/0009-streaming-availability-data-source.md)

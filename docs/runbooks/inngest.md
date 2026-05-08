# Runbook: Inngest

**What it is:** job orchestration and scheduled cron. Per [ADR-0007](../decisions/0007-job-orchestration.md).

## What breaks if it's down

- The nightly TMDB sync cron at 03:00 UTC doesn't fire — title data goes
  stale, new shows don't appear, status changes (Returning Series → Ended)
  aren't picked up. **Not user-visible until staleness compounds across
  multiple missed runs.**
- Any future event-triggered jobs (e.g. recompute-recs-on-rating) don't
  fire. User actions that depend on async work feel broken (rating saves
  but recs don't update).
- The `/api/inngest` endpoint inside `apps/web` is unaffected — Inngest's
  outage means its own infrastructure can't deliver to us, but the
  endpoint still exists and is healthy from our side.

## Manual fallback

For the TMDB sync specifically: `processTmdbTvShow(showId)` and
`fetchTmdbTvDiscoverPage(page)` are exported as pure async functions
from `apps/web/src/inngest/functions/tmdb-sync.ts`. They can be invoked
directly from a one-off CLI or admin route to backfill, regardless of
Inngest's status.

For event-triggered jobs added later: design them with a "this is
async; the user might not see results immediately" UX from day 1, so an
Inngest outage just shows "still pending" rather than appearing broken.

## Status page

https://status.inngest.com/

## How we tell it's Inngest and not us

- Inngest Dashboard → Functions → recent runs all "Failed" → us (likely
  a deploy that broke `/api/inngest`).
- Inngest Dashboard → Events → no recent events arriving → could be us
  (no triggers being sent) or them (event ingestion down).
- Cron didn't fire at the expected time but no events in the dashboard
  either → them.

## Local dev

The local Inngest dev workflow uses `npx inngest-cli@latest dev` running
alongside Next.js. Required env: `INNGEST_DEV=1` in `apps/web/.env.local`
(production must NOT have this — it puts the SDK into cloud mode against
the local dev server, which won't reach prod's Inngest Cloud).

For end-to-end local testing, also set `INNGEST_BASE_URL` if Inngest CLI
is on a non-default port (default is 8288).

## Cost signals

- Free plan: 50k function runs/month, 1k step runs/day, 50 concurrent
  steps.
- **Step-run budget per nightly cron** (post 2026-05-08 batching refactor):
  - TMDB sync: 100 pages × (1 fetch + 2 batches of 10) = ~300 step runs
  - AniList sync: 50 pages × (1 fetch + 5 batches of 10) = ~300 step runs
  - Recommendations: 1 fan-out + 1 per user (~3 today)
  - **Combined: ~600 step runs/day**, comfortably within 1k/day free tier.
- The earlier per-show `step.run` shape burned ~4,500 step runs/cron (4×
  the free cap) and silently truncated each night — see LEARNED.md
  2026-05-08 entry on why this masquerades as a sync code bug.
- Watch: Inngest Dashboard → Usage. If a batch fails wholesale (rare —
  per-item errors are caught inside the batch), only that batch retries,
  not the whole page.
- Paid: starts at $20/mo for 200k function runs.
- Hard budget alerts: not yet wired up. Should be wired before alpha launch.

## Key rotation

`INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` (production only):

1. Inngest Cloud Dashboard → app → Manage → "Rotate Event Key" / "Rotate
   Signing Key."
2. Update env vars in Vercel.
3. Redeploy.

`INNGEST_DEV` is not a secret; it's a local-dev mode flag. Never set in prod.

## Cron schedule

Defined in `apps/web/src/inngest/functions/tmdb-sync.ts`:
- `tmdb-sync-tv-all` runs `0 3 * * *` (03:00 UTC daily).
- Fans out one event per page → up to 100 per-page sync invocations.

To pause cron temporarily: comment the cron trigger and redeploy. To stop
permanently: ADR-driven decision.

## Reference docs

- [Inngest docs](https://www.inngest.com/docs)
- [ADR-0007](../decisions/0007-job-orchestration.md)

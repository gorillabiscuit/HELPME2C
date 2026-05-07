# Runbook: Vercel

**What it is:** the hosting platform for `apps/web`, including edge,
serverless functions, the proxy/middleware, and the production domain
(`helpme2c.wouterschreuders.com`). Per [ADR-0017](../decisions/0017-hosting-platform.md).

## What breaks if it's down

- The entire app — `helpme2c.wouterschreuders.com` returns 5xx or times out.
- All tRPC procedures (they live inside the Next.js app on Vercel).
- The `/api/inngest` endpoint — Inngest can't deliver scheduled jobs to an
  unreachable handler. Inngest queues retries (up to ~24h) and replays once
  Vercel is back, so cron lag rather than data loss.
- The `/api/webhook/clerk` endpoint — Clerk retries with backoff for ~24h.
  Same shape: lag rather than loss.
- Sentry dashboards remain reachable; PostHog reachable. We can still see
  what was broken, just not visit the live site.

## Manual fallback

There isn't one in Phase 1A. Vercel-only hosting per ADR-0017 with a
documented "lock-in firewall" (no `@vercel/*` packages, vendor-neutral
service choices) — but no parallel deploy target. A multi-region/multi-host
deploy is deferred until post-launch (see ADR-0017 §"What would change our
mind").

If Vercel has a multi-hour outage during a critical moment:

1. Confirm via status page (link below) that it's them, not us.
2. Communicate on whatever public surface we have (Twitter, status page).
3. Wait it out.

## Status page

https://www.vercel-status.com/

Subscribe to email updates from there for incidents.

## How we tell it's Vercel and not us

- All requests to `helpme2c.wouterschreuders.com` failing → Vercel-side.
- Specific routes failing while others work → app-side (check Sentry).
- Status page shows an incident affecting our region (typically `fra1`).
- `curl -sI https://helpme2c.wouterschreuders.com/` returns nothing or non-Vercel
  origin signature.

## Cost signals

- Hobby plan: free, 100GB-h compute, 100GB bandwidth, 1M edge requests/mo.
- Pro: $20/user/mo with much higher ceilings.
- Watch: bandwidth on the dashboard's "Usage" tab as TMDB poster-loaded
  pages start hitting cache misses at scale.
- Hard budget alerts: not yet wired up — recommended action when bandwidth
  consistently exceeds 50% of the free tier.

## Key rotation

Vercel doesn't issue a long-lived API token in our deploy path — deploys go
through `pnpm dlx vercel --prod` using OAuth in `~/.vercel/auth.json` per
the human's machine. To rotate:

1. https://vercel.com/account/tokens → revoke any tokens listed.
2. Re-run `pnpm dlx vercel login` from a fresh terminal.

Env vars on the Vercel project are managed via dashboard or `vercel env`
CLI. Rotating any application secret means: update the env var in Vercel +
trigger a redeploy.

## Reference docs

- [Vercel CLI](https://vercel.com/docs/cli)
- [Monorepos on Vercel](https://vercel.com/docs/monorepos)
- [ADR-0017](../decisions/0017-hosting-platform.md) — why Vercel, and the lock-in firewall

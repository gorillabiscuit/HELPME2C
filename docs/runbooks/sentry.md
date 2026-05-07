# Runbook: Sentry

**What it is:** error tracking and tracing. Per [ADR-0010](../decisions/0010-observability-stack.md).

## What breaks if it's down

- We stop seeing new errors and traces in Sentry.
- The app continues to work — Sentry's client SDK fails gracefully if its
  ingest endpoint is unreachable; events are dropped rather than surfaced
  as user-facing errors.
- During the outage we're flying blind for new bugs. Vercel logs are still
  available as a coarser fallback, plus PostHog session replays for
  user-facing JS errors.

## Manual fallback

Vercel logs (via `pnpm dlx vercel logs`) capture serverless function
errors with stack traces. Less ergonomic than Sentry's UI but adequate
for diagnosing a known incident during an outage.

PostHog session replay captures client-side user actions and (configurably)
errors — useful for understanding what users were doing when something
broke.

## Status page

https://status.sentry.io/

## How we tell it's Sentry and not us

- Drop in error volume on the Sentry dashboard, but Vercel logs still show
  errors → Sentry ingestion-side.
- Sentry SDK throwing in the stack itself (would surface in Vercel logs) →
  SDK or config bug; check that `NEXT_PUBLIC_SENTRY_DSN` is set.
- DSN-shaped errors (401 from ingest) → invalid or rotated DSN.

## Privacy + PII

Per [ADR-0012 §6](../decisions/0012-privacy-compliance.md): Sentry is
configured with explicit PII redaction. Email addresses, IP addresses, and
user identifiers MUST NOT be sent to Sentry. The redaction is wired in
`apps/web/sentry.{client,edge,server}.config.ts`. If you see actual emails
in a Sentry event, that's a privacy bug — file it before continuing.

EU region per ADR-0012 §1 (`*.ingest.de.sentry.io` DSN).

## Cost signals

- Developer (free) plan: 5k errors / 10k performance units / 50 replays
  per month, 7-day retention.
- Watch: events on Sentry dashboard. Burst events from a deploy regression
  can blow past the free tier in a day.
- Paid (Team): from $26/mo with 50k errors and 30-day retention.
- Hard budget alerts: not yet wired up.

## Key rotation

`NEXT_PUBLIC_SENTRY_DSN`:

1. Sentry → Project → Settings → Client Keys → "Create new client key" or
   revoke the existing one.
2. Update env var in Vercel + local `.env.local`.
3. Redeploy.

`SENTRY_AUTH_TOKEN` (used for source-map upload during prod build, currently
commented out per `.env.example`):

1. Sentry → Settings → Auth Tokens → revoke + create new.
2. Update env var in Vercel only (not used locally).
3. Redeploy.

The DSN is designed to be embedded in browser JS — it's "public-safe" in
the sense that it can't be used to read sensitive data, only to send
events. Treating it as semi-secret is still good hygiene.

## Reference docs

- [Sentry docs](https://docs.sentry.io/)
- [Next.js + Sentry](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [ADR-0010](../decisions/0010-observability-stack.md), [ADR-0012 §6](../decisions/0012-privacy-compliance.md)

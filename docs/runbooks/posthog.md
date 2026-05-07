# Runbook: PostHog

**What it is:** product analytics + session replay. Per [ADR-0010](../decisions/0010-observability-stack.md).

## What breaks if it's down

- We stop receiving event data and session replays.
- The app continues to work — PostHog's client SDK degrades gracefully on
  ingest failures; events are buffered locally and either retried or dropped.
- No user-visible impact.

## Manual fallback

None needed for short outages. If product analytics matter for a specific
shipped flow during a long outage, fall back to:
- Vercel access logs for raw page-view counts.
- Sentry breadcrumbs for the user actions immediately before errors.

Neither replaces PostHog's funnel/cohort views, but neither is critical
during an outage.

## Status page

https://status.posthog.com/

## How we tell it's PostHog and not us

- Drop in event volume on the PostHog dashboard but Vercel access logs
  still show traffic → PostHog ingestion-side.
- Specific event types missing while others work → wiring bug on our side.
- 401/403 from ingest in the browser console → invalid project key.

## Privacy + consent

Per [ADR-0012 §3](../decisions/0012-privacy-compliance.md): PostHog is
**capture-opt-in by default**. The consent banner's "Analytics" toggle
gates `posthog.capture()` — until the user explicitly opts in, no events
are sent.

Session replay is a separate toggle within Analytics consent. PostHog's
masking config is configured to redact form fields containing PII (names,
emails, addresses). Verify masking before enabling on a new flow.

EU region per ADR-0012 §1 (`https://eu.posthog.com` host).

## Cost signals

- Free plan: 1M events/mo, 5k session recordings/mo, 1-year retention.
- Watch: events + recordings on the dashboard. Session replays are the
  faster ceiling — they accrue per page-view if enabled.
- Paid: starts at usage-based pricing past the free tier; rough rule is
  $0.00031/event past 1M.
- Hard budget alerts: not yet wired up.

## Key rotation

`NEXT_PUBLIC_POSTHOG_KEY`:

1. PostHog → Project Settings → "Project API Key" → reset.
2. Update env var in Vercel + local `.env.local`.
3. Redeploy.

The project key is designed to be embedded in browser JS and is
write-only (it can send events but cannot read data). Rotation is a low-stakes
operation but worth doing if it leaks alongside other keys.

`NEXT_PUBLIC_POSTHOG_HOST`: not a secret; the EU region URL is fixed
(`https://eu.posthog.com`).

## Reference docs

- [PostHog docs](https://posthog.com/docs)
- [Capture API](https://posthog.com/docs/libraries/js)
- [ADR-0010](../decisions/0010-observability-stack.md), [ADR-0012 §3](../decisions/0012-privacy-compliance.md)

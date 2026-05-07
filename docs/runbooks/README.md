# Per-vendor runbooks

One page per third-party dependency. The point is not exhaustive vendor
documentation — it's enough to answer three questions in a hurry:

1. **What breaks if this vendor is down?** What's the user-visible impact?
2. **What's the manual fallback?** Can we keep operating in some degraded
   mode while the vendor recovers, or do we just have to wait?
3. **Where do we look to confirm it's the vendor and not us?** Status page,
   our own observability, log signatures.

Each runbook is intentionally short — under ~100 lines. If a runbook starts
growing into a multi-page guide, that's a sign the vendor is significant
enough to warrant its own ADR or on-call doc, not a longer runbook.

## Index

- [Vercel](vercel.md) — hosting, edge, deploys (per [ADR-0017](../decisions/0017-hosting-platform.md))
- [Neon](neon.md) — Postgres + branching (per [ADR-0005](../decisions/0005-database-postgres-host.md), [ADR-0019](../decisions/0019-orm.md))
- [Clerk](clerk.md) — auth + sessions + user webhooks (per [ADR-0004](../decisions/0004-auth-provider.md))
- [Inngest](inngest.md) — job orchestration + cron (per [ADR-0007](../decisions/0007-job-orchestration.md))
- [TMDB](tmdb.md) — TV/film metadata + watch providers (per [ADR-0009](../decisions/0009-streaming-availability-data-source.md))
- [Sentry](sentry.md) — error tracking + tracing (per [ADR-0010](../decisions/0010-observability-stack.md))
- [PostHog](posthog.md) — product analytics + session replay (per [ADR-0010](../decisions/0010-observability-stack.md))

AniList runbook will land alongside the AniList sync work in M2.

## Conventions

- **Status page** links go to the vendor's official status page. If a vendor
  doesn't have one, that's noted explicitly — outages have to be inferred from
  our own signals.
- **Cost signals** capture the free-tier ceiling and the first paid step.
  "Something to watch" not "exact pricing" — pricing pages are authoritative.
- **Key rotation** is the procedure for revoking + reissuing the vendor's
  primary credential after a leak. Rotation should be possible from the
  vendor's dashboard without code changes (env-var-only update).
- **No on-call paging** is wired up in Phase 1A. These runbooks are for
  manual reference during incidents, not for automation.

## When to update

- A new vendor is added → add a runbook in the same PR as the dep.
- A vendor's status page URL changes → update the runbook.
- A vendor outage exposed a failure mode we hadn't documented → capture it
  under "What breaks" and link the post-mortem if there is one.

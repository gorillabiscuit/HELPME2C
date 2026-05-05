# ADR-0010: Observability stack

**Status:** Accepted
**Date:** 2026-05-04
**Supersedes:** —

## What we chose

For Phase 1A:

- **Sentry** for application errors (frontend + server). Free tier (5k errors/month) as the MVP starting point.
- **PostHog** for product analytics + session replay. Consent-gated: PostHog only fires after the user opts in via the cookie consent banner (per ADR-0012). Session replay configured with strict masking — all input fields, auth flows, and any element marked sensitive are masked by default.
- **Vercel built-in logs** for runtime visibility, **drained to Axiom** for retention beyond Vercel's hobby/pro retention window. Axiom is wired via Vercel's native log-drain integration in Phase 1A.
- **OpenTelemetry traces deferred to Phase 2.** Trigger: ML inference complexity (per ADR-0008's Phase 2 work) when latency-spread becomes hard to debug from Sentry + Vercel logs alone.

Set up day 1, before users exist.

## What we rejected

- **Datadog** — comprehensive but expensive; overkill for solo MVP.
- **LogRocket / FullStory** — alternatives for session replay only; PostHog bundles analytics + replay in one bill, fewer vendors to manage.
- **Self-hosted observability (Grafana + Loki + Tempo)** — operational tax a solo dev should avoid.
- **Better Stack (Logtail) as the log drain** — viable Vercel integration, but smaller free tier (1GB / 3-day retention) than Axiom (500GB/mo). Axiom buys more headroom for the same zero cost.
- **Self-managed log drain (S3 + Athena / DuckDB)** — cheap but adds ops burden we explicitly want to avoid.
- **OpenTelemetry in Phase 1A** — premature without the trace volume to justify it.

## Why

Phase 1A is solo-dev shipping an MVP. The observability stack needs to be:

1. **Cheap or free at MVP scale** — every chosen tool is free at the volumes we'll hit before launch.
2. **Compliance-aware from day 1** — PostHog session replay can capture PII if not configured carefully. Strict masking + consent-gated firing closes that gap. This is the explicit interaction with ADR-0012 (GDPR / POPIA).
3. **Low ops burden** — three managed services (Sentry, PostHog, Axiom) with native Vercel integrations. No infrastructure to operate.
4. **Forward-compatible with Phase 2's deeper observability needs** — OpenTelemetry is the obvious next layer when ML inference branches deep enough that we need to see where time goes inside `packages/ml`.

Vercel's built-in log retention is too short for incident forensics (1 hour on Hobby, 1 day on Pro). The Axiom drain solves this without adopting a heavier observability platform.

## What would change our mind

- **Sentry free tier exceeded** — at 5k errors/month, we either fix the noise sources or upgrade. Cost trigger, not architecture.
- **PostHog free tier exceeded** — 1M events/month is generous; if we exceed it before product-market fit, something is wrong with our event hygiene before something is wrong with the choice of tool.
- **Axiom free tier exceeded** — 500GB/mo log volume implies serious traffic; revisit at that point.
- **ML inference complexity arrives** (Phase 2 trigger) — adopt OpenTelemetry traces; Sentry has tracing but it's not where it shines.
- **A specific Datadog feature becomes essential** — unlikely while solo, but the migration path is clean from this stack.

## Related

- ADR-0000 — architecture overview
- ADR-0008 — ML inference approach (Phase 2 OTel trigger)
- ADR-0012 — GDPR / POPIA compliance (PostHog consent + masking dependency)
- PROJECT.md §Phase 1A scope (observability listed as in-scope)
- CLAUDE.md §3 (banned patterns — no third-party scripts without an ADR; this IS the ADR)
- CLAUDE.md §4 (stop-and-ask for analytics / tracking pixels — covered here)

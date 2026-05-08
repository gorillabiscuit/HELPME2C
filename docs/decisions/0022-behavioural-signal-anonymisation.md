# ADR-0022: Behavioural-signal anonymisation on account deletion

**Status:** Accepted
**Date:** 2026-05-08
**Supersedes:** —

## What we chose

On account deletion, BEFORE the FK-cascade hard-deletes a user's `watch_entries`, COPY the rating + watch-behaviour signal into a separate `anonymous_watch_signals` table tagged with a per-deletion **random UUID** generated server-side via `randomBytes`/`randomUUID`. The UUID is created in-memory at deletion time and **never stored anywhere else** — it tags the copied rows so "these N entries came from the same anonymous person" survives, but no rejoin path back to the original user exists.

Concrete shape:

```
anonymous_watch_signals (
  id                    uuid PK,
  anonymous_user_id     uuid NOT NULL,           -- random per deletion, ungenerable
  title_id              uuid NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  kind, status, rating, current_episode,         -- mirrors watch_entries
  original_created_at   timestamptz NOT NULL,    -- preserves temporal profile
  original_updated_at   timestamptz NOT NULL,
  anonymised_at         timestamptz NOT NULL DEFAULT now()
);
```

Account-delete route ([apps/web/src/app/api/account/delete/route.ts](../../apps/web/src/app/api/account/delete/route.ts)) runs `anonymiseWatchSignals(clerkId)` BEFORE `delete from users`, then the existing FK cascade kills the originals. Sentry's `includeLocalVariables` is **disabled globally** — see [Why](#why) — so a thrown error in the anonymisation path can't accidentally co-resident `clerkId` and `anonymousUserId` in a stack frame.

`rec_feedback` is **not yet anonymised** — same pattern, deferred until the rating-tuning consumer ships (no current consumer means the signal isn't read anywhere, so the deferral has no current cost).

## What we rejected

- **NULL out `watch_entries.user_id` (SET NULL FK)** — keep the row, sever the link in place. Rejected because every query that reads watch_entries (notably the rec engine) would have to remember to filter NULLs, error-prone over time. A separate table makes the read-side intent explicit.
- **Hash the user_id and store the hash on the anonymised rows** — deterministic mapping creates a rejoin path: anyone with the original user_id could reproduce the hash and find the rows. ADR-0012 §2 explicitly requires "no rejoin path." A random UUID is the only design that satisfies that.
- **Skip anonymisation entirely (current pre-2026-05-08 behaviour)** — GDPR-compliant via cascade hard-delete, but loses aggregate rec-engine signal across user churn. Per [PROJECT.md §revenue](../../PROJECT.md), the rec engine is the moat; protecting its signal across churn matters.
- **Synchronous transactional COPY-then-DELETE** — the Neon HTTP driver doesn't support multi-statement transactions. Two separate statements means a retry edge case (see [Retry semantics](#retry-semantics)). We accept that edge case rather than switching DB drivers.
- **Enable Sentry `includeLocalVariables: true`** — convenient for debugging, but a thrown error in `anonymiseWatchSignals` would capture both `clerkId` and `anonymousUserId` in the same frame, creating an audit trail mapping user → anonymous data via Sentry. Disabled globally; specific cases that need richer context can use `Sentry.captureException(err, { extra: { ...redacted } })`.

## Why

[ADR-0012 §2](0012-privacy-compliance.md) is the framing decision. Two requirements thread together:

1. **Right-to-erasure (legal):** identifying data must be gone. Hard-delete via FK cascade satisfies this.
2. **Moat preservation (product):** the rec engine improves with aggregate behavioural signal. Hard-deleting everything loses that signal across churn.

The chosen design preserves the signal as **co-occurrence within a single anonymous user** (X and Y were rated together by the same person, weight equally) without preserving **identity** (which person rated X). Co-occurrence is what collaborative-filtering algorithms use; identity is what GDPR forbids retaining.

The random UUID is the linchpin. Generated server-side at deletion time, used in a single SQL `INSERT … SELECT`, then the variable goes out of scope and is garbage-collected. There is no log entry, no Sentry breadcrumb, no audit row mapping user → anonymous_user_id. ADR-0012 §2: "Once the deletion job runs, the data is unlinkable."

The Sentry `includeLocalVariables` disablement is the defence-in-depth piece. The anonymisation guarantee depends on the random UUID being write-once-then-discarded; capturing local variables on exception would silently break that. Pre-PR sweep #3 caught this before it could matter — the fix is documented in the same branch as the schema and route changes (commits `f805668` + `5c1f9a5`).

The COPY happens BEFORE the user-row delete (not after) so the cascade kicks in only after the signal has been preserved. If COPY fails, the route logs to Sentry and proceeds with identifying-data deletion anyway — the GDPR obligation outranks the moat optimisation.

### Retry semantics

The Neon HTTP driver doesn't support multi-statement transactions, so COPY and DELETE are two separate SQL statements. The window between them is small (single-route, single-await) but non-zero.

| Path | Outcome |
|---|---|
| Both succeed | Anonymised + identifying data gone. Happy path. |
| COPY succeeds, DELETE fails (network glitch) | Anonymised data exists; identifying data still present. Retry: COPY again under a NEW random UUID (duplicating the user's contribution to aggregate signal); DELETE proceeds. Final state: duplicated anonymous signal, no PII. |
| COPY fails | Sentry-logs, DELETE proceeds, identifying data gone, no anonymised signal preserved. The legal obligation is met; the product optimisation is missed. Recoverable only if the user re-creates an account and re-rates everything, which is fine. |

The duplicate-signal edge case is acceptable for v1 — it slightly inflates one user's contribution to aggregate signal, no PII risk. If churn ever scales to where this becomes statistically meaningful, the fix is to gate the COPY on a per-user "anonymisation already done" marker (which itself would need careful thought to avoid creating a rejoin path).

## What would change our mind

- **Material observation that random UUIDs leak via timing or covariates** — the anonymous_user_id in JSON exports + observed delete-event timing in some external log could in principle correlate. We considered this hypothetical; the absence of a deletion-event log + the random nature of UUIDs make this implausible. Re-evaluate if we add per-deletion observability.
- **The rec-engine consumer reading anonymous_watch_signals demonstrably underperforms** — hypothesis: anonymised signal isn't enough to beat fresh signal from active users, so the moat preservation isn't worth the schema complexity. Roll back to cascade-hard-delete-everything. Bar: actual measurement, not speculation.
- **GDPR regulator guidance specifies that random-UUID-tagged rows still constitute personal data** — possible in an extreme reading; would force us to drop even the co-occurrence signal. Bar: actual guidance from ICO / CNIL / DPC, not theoretical concern.
- **Schema cost becomes prohibitive at scale** — hypothesis: anonymous_watch_signals grows large enough that read queries against it become slow. Mitigation: add a retention window (e.g. drop after 24 months of anonymised_at), since collaborative-filtering signal naturally decays in usefulness over time.

## Related

- [ADR-0012](0012-privacy-compliance.md) — privacy-compliance framing. §2 is the parent of this ADR; this ADR is the implementation detail.
- [ADR-0008](0008-ml-inference-approach.md) — rec engine; the consumer of anonymous signal once written.
- [ADR-0010](0010-observability-stack.md) — Sentry config; the `includeLocalVariables: false` constraint originates here as a privacy guard for this ADR.
- [PROJECT.md](../../PROJECT.md) §revenue — the moat motivation.
- [CLAUDE.md](../../CLAUDE.md) §2 — real-deletion invariant; this ADR provides the concrete implementation that satisfies it.

# ADR-0021: Streaming availability — ranking vs filter

**Status:** Proposed
**Date:** 2026-05-07
**Supersedes:** —

## What we chose

Use TMDB streaming-availability data as a **post-ranking filter**, not as
a ranking signal. Specifically:

1. **Personal and group recommendations are ranked purely on theme relevance**
   (tag overlap, taste vector, etc. per [ADR-0008](0008-ml-inference-approach.md)).
   Streaming availability does not contribute to the score.
2. **Once the ranked candidate set is produced**, optionally filter it by
   "available on the user's connected providers" — a boolean `available?`
   gate, not a continuous signal.
3. **On title detail pages**, surface streaming availability with a
   prominent `last verified` timestamp so the user can judge freshness.
4. **On click-through to a provider**, no extra verification step. Accept
   that a small fraction of click-throughs will land on "no longer
   available" — that's a vendor-side reality, not a bug we can solve at
   acceptable engineering cost.

This is the middle path between the three reviewer-flagged options. It
preserves streaming as a core product feature (per PROJECT.md scope)
without letting stale data drive bad recommendations.

## What we rejected

- **Use streaming as a ranking signal** (continuous score input, e.g.
  "+0.2 if available on Netflix"). Stale data would push items into
  recommendations that the user can't actually watch. The reviewer
  flagged this directly: "Recommending something a user can't watch is
  the worst possible UX." Even with `last_verified` timestamps, ranking
  signal that mixes confidence with relevance is hard to debug and easy
  to get wrong.
- **Drop streaming entirely from the product** (informational only on
  detail pages, no filter, no ranking influence). Conflicts with
  [PROJECT.md](../../PROJECT.md) Phase 1A scope ("Filter recommendations
  by user's connected subscriptions" — explicitly in scope). Streaming
  availability is one of the four problems we said existing trackers
  fail at; dropping it from the recommendation surface defeats half the
  value prop.
- **Verify-on-click** (re-fetch from TMDB at the moment the user clicks
  through). Adds latency on the most user-visible action; complicates
  error handling (provider unknown? Recently removed? Rate-limited?);
  hits TMDB rate limits if the click distribution is uneven. The
  marginal accuracy gain over our nightly sync is small for the
  engineering cost.

## Why

The reviewer's central concern — "stale streaming data + ranking signal
= recommending unwatchable content" — is real and should be respected.
But the conclusion isn't to drop streaming entirely. It's to use it as a
**filter**, not a **ranking input**.

The asymmetry matters:
- A **stale filter** can produce a false negative — a title is filtered
  out even though the user could actually watch it. The user just doesn't
  see it. Mildly annoying.
- A **stale ranking signal** can produce a false positive — a title is
  recommended *because* it's "available on Netflix" but it's actually
  been pulled. The user clicks through and hits "no longer available."
  Maximally annoying — it makes the rec engine look broken.

Filter-only neutralises the false-positive case at the cost of accepting
false negatives. False negatives degrade silently; false positives degrade
loudly. For an MVP rec engine we'd rather degrade silently.

The `last_verified` timestamp on detail pages is the trust contract.
Users who see "available on Netflix · last verified 8 hours ago" can
decide whether to trust it. That's better than implicit confidence in a
data point we can't realistically verify in real time.

This stance is reversible — if user testing shows that "filter only"
results in an empty recommendation list (because nothing's available on
the user's providers), we can revisit. Concretely it means M5 (streaming
availability surface) ships with `last_verified` prominent and a
filter toggle, not a "+streaming" weight in the rec score.

## Required engineering changes

Most of the schema is already correct. The work is small:

1. Surface `streaming_availability.updated_at` (already in the schema
   per `apps/web/src/server/schema/streaming.ts`) as `last_verified` on
   the title detail page.
2. When implementing the rec engine in M4, **do not include streaming
   provider availability in the score function**. Keep it strictly
   post-ranking.
3. The "filter by user's connected subscriptions" UI in M5 applies after
   ranking, on the candidate set the rec engine returns.
4. Background re-verification cadence stays at the existing nightly
   TMDB cron (no new infrastructure).

## What would change our mind

- **User testing shows the filter regularly empties the recommendation
  list** because no candidates are on the user's providers — relax to
  "show all, mark unavailable" rather than excluding entirely.
- **Click-through accuracy data after launch shows >5% of click-throughs
  land on unavailable titles** — invest in verify-on-click as a
  click-time freshness check before opening the provider URL.
- **Streaming-as-ranking-signal proves provably better in user studies**
  for the couch co-watcher archetype — re-decide. Given the asymmetry
  argument above, the bar is high.
- **A vendor offers a real-time availability API** (vs TMDB's cached
  watch-providers endpoint) — re-evaluate verify-on-click as cheap.

## Related

- [ADR-0009](0009-streaming-availability-data-source.md) — TMDB as the
  streaming data source
- [ADR-0008](0008-ml-inference-approach.md) — ML inference approach (where
  the rec scoring lives)
- [ADR-0020](0020-group-rec-strategy.md) — group rec strategy (ranking
  applies to groups too; streaming is filter-only there as well)
- [ROADMAP.md](../ROADMAP.md) — M4 personal recs, M5 streaming surface
- [PROJECT.md](../../PROJECT.md) §scope — streaming availability in scope

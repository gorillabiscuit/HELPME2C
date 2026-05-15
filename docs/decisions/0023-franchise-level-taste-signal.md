# ADR-0023: Franchise-level taste signal

**Status:** Proposed
**Date:** 2026-05-14
**Supersedes:** —

## What we chose

Treat the **franchise** as the atomic unit of taste signal, not the
individual title row. The `/taste` ranked-list UI groups
`watch_entries` by `franchiseKey` (from `apps/web/src/server/lib/franchise.ts`)
and the recommendation engine aggregates per-franchise before building
the taste vector.

Concretely:

1. **UI surface** (`/taste` Ranked tab): one accordion row per franchise.
   Collapsed view shows the canonical entry (lowest `franchiseSpecificity`)
   plus the franchise's effective rating (= **mean** of rated seasons).
   Expanded view shows all seasons the user has rated, plus
   "Haven't seen" placeholders for catalog seasons the user has no
   entry for. Seasons sort by `releaseYear ASC`. Drag-to-reorder
   operates on franchise rows; within-franchise ordering is not a
   user-visible concept.

2. **Engine input** (`apps/web/src/inngest/functions/recommend.ts` and
   `recommend-group.ts`): before calling `extractTasteVector`, group
   the user's rated entries by `franchiseKey` and fold each group into
   a single synthetic row: `rating = mean(seasons.rating)`, with the
   tags from the canonical entry's title. This means a user who rated
   three AoT seasons 10/10 each contributes the SAME signal weight as
   a user who rated just AoT 10/10 once.

3. **"Haven't seen" representation**: absence of a `watch_entries` row.
   No new `watch_status` enum value. The catalog table is queried at
   accordion-expand time to enumerate "all seasons of this franchise."

4. **Removal semantics**: removing a franchise row deletes ALL of the
   user's entries for that franchise. Removing a single season from
   inside the accordion deletes just that entry. Both routes through
   the existing `watch.remove` mutation (called once per affected
   `titleId`).

## What we rejected

- **Per-season independent taste signal** (status quo) — produces
  triple-counting bias toward franchises with many rated seasons.
  Rec quality degrades silently; users with long anime histories
  see other long-history anime over-represented in recs.
- **New `watch_status = 'unseen'` enum value** — schema migration cost,
  duplicates `plan_to_watch` semantically, and absence-of-entry is
  functionally equivalent for engine purposes.
- **`franchise_id` column on `titles`** — the right long-term shape
  (AniList's `relations` graph would populate it), but it's a
  structural data investment. The string-heuristic `franchiseKey` from
  `apps/web/src/server/lib/franchise.ts` is already in production use
  across recommendations, search, group recs, and bridges. Promote to
  a column when the heuristic stops scaling, not before.
- **Max instead of mean for franchise rating** — too charitable; "I
  loved the first season but hated the rest" should not surface as a
  10/10 franchise.
- **Within-franchise drag reordering** — drag is for taste signal;
  ranking S1 above S2 isn't a meaningful expression of taste preference.
  Add only if user feedback demands it.

## Why

The `watch_entries` schema was designed when "tracking" was the primary
verb (M2 + M3 in `docs/ROADMAP.md`). Each season was tracked separately
because users actually watch seasons separately. That model is correct
for the **library** surface — users want to mark per-episode progress,
per-season ratings, per-season notes.

But **taste signal** has a different unit. When a user says "I love
Attack on Titan," they mean the franchise as a property, not a
particular season's craft. The rec engine should match the user's
mental model: one franchise = one signal.

The cosmetic problem (rank list cluttered with seasons) is the
visible symptom. The deeper problem is that the engine triple-counts.
A user with three rated AoT seasons pushes AoT's tags (`shounen`,
`tragedy`, `military`) three times harder into their taste vector
than a single-season favourite. Recs skew toward "more of the same
long-running franchise" — exactly the failure mode PROJECT.md's
moat-2 (cross-medium theme-based taxonomy) is meant to counter.

The mean aggregation matches how users describe their taste in plain
language ("the experience overall"). Mode-of-aggregation can change
without an API break if mean turns out to skew recs (e.g., to
median or score-weighted-by-recency). The franchise-as-unit decision
is the load-bearing one.

This ADR does NOT cross the `packages/ml` boundary per CLAUDE.md §4.
The aggregation happens in `apps/web` (Inngest cron + tRPC reader)
BEFORE the `extractTasteVector` call. `packages/ml` continues to
consume `RatedTitle[]` with the same contract — the input shape is
unchanged, just the upstream data prep differs.

## What would change our mind

- **Mean turns out to mis-rank franchises** with mixed-quality seasons
  (e.g., user with S1=10/S2=5/S3=10 sees the franchise undervalued at
  8.3, when their actual feeling is "the franchise is great, S2 was a
  blip"). Move to median, or to score-weighted-by-recency-and-rating.
- **Users explicitly ask for per-season taste signal** ("I want my
  recs to know I specifically love S3 of Black Mirror, not the show
  as a whole"). Revisit; possibly expose a "treat as separate works"
  toggle per franchise.
- **Franchise heuristic starts producing false positives** at scale —
  "Boruto" and "Naruto" treated as same franchise, or "Steins;Gate"
  and "Steins;Gate 0" collapsed. Promote `franchise_id` to a real
  column populated from AniList's `relations` graph.
- **Add flow stays one-title-at-a-time and feels slow** — users
  pick S1, then have to come back and pick S2/S3 to mark them seen.
  Consider auto-creating franchise placeholder rows.

## Related

- [ADR-0008](0008-ml-inference-approach.md) — ML inference approach
  (extractTasteVector is the consumer of this signal)
- [ADR-0013](0013-recommendation-cache-backend.md) — cache backend
  (per-user rec payload re-computes when entries change)
- [PROJECT.md](../../PROJECT.md) §moats — moat-2 (cross-medium taxonomy)
  is the rec-quality angle this protects
- [ROADMAP.md](../ROADMAP.md) — M4 (personal recs) and M3 (signal
  gathering) — this clarifies the relationship between the two
- `apps/web/src/server/lib/franchise.ts` — the heuristic this depends on

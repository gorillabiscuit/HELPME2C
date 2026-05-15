# ADR-0024: Bipolar rating semantics

**Status:** Proposed
**Date:** 2026-05-14
**Supersedes:** —

## What we chose

The 1-10 rating column on `watch_entries` carries **bipolar** semantics:
1-3 means *disliked*, 4-6 means *mixed/neutral*, 7-9 means *liked*,
10 means *loved*. The recommendation engine converts the rating to a
**signed weight** in the range `[-1, +1]` using the formula:

```
signedWeight = (rating - 5.5) / 4.5
```

So:

| Rating | Signed weight | Interpretation |
|---|---|---|
| 1 | -1.00 | hated |
| 3 | -0.56 | disliked |
| 5 | -0.11 | leaning negative |
| 6 | +0.11 | leaning positive |
| 7 | +0.33 | liked |
| 9 | +0.78 | strongly liked |
| 10 | +1.00 | loved |

Low-rated titles now **subtract** their tags from the user's taste
vector. A title rated 2/10 actively *repels* future recommendations
with similar themes, instead of weakly attracting them as the old
positive-only formula did.

UX-wise, every rating widget gets face iconography (Frown / Meh /
Smile + Loved variant) so users understand what their number means
when they pick it. No separate "Dislike" button.

## What we rejected

- **Keep the rating as positive-only** (old behaviour) — collected
  half the picture. Users who rate 1/10 are giving strong negative
  signal we threw away as "weak positive."
- **Add a separate `disliked` boolean column** on `watch_entries` —
  schema migration for a signal the existing rating column already
  carries. Users would face two affordances for the same act ("rate
  2/10 OR thumbs-down?"), inviting inconsistency.
- **Asymmetric midpoint at 5** (formula `(rating - 5) / 5`) — rating
  10 maps to +1.0 but rating 1 maps to -0.8. Felt unbalanced. The
  symmetric 5.5 midpoint maps both extremes to ±1.0.
- **Hard veto on tags from disliked titles** (instead of subtractive
  weight) — too aggressive. A single 1/10 rating shouldn't permanently
  blacklist every show sharing one of its tags. Signed weights produce
  a gradient.
- **Iconography only at the extremes** — leaving 4-6 unmarked. Decided
  to label all three zones (Disliked / Mixed / Liked) so users
  understand the whole scale, not just the dramatic ends.

## Why

This decision unblocks the "dislike signal" that PROJECT.md flagged
as a strong signal-gap. The old engine read rating 1 as a small
positive contribution (`1/10 = 0.1`), so a user telling us "I hated
this" produced almost no useful signal. Now it produces strong
negative signal.

The bipolar interpretation also matches how every public rating
platform works. IMDB, Letterboxd, Rotten Tomatoes — when a user picks
2/10, they mean "I disliked this," not "I liked this a tiny bit."
Treating ratings linearly-positive was a misread of user mental models.

Existing user data is reinterpreted retroactively. A user who rated
a show 1/10 a month ago WAS expressing dislike; they were just being
ignored. After this change, their rating starts shaping recs the way
they meant it to. We surface this via a one-time soft notice so
users who rated 1-3 as "ok but unimpressed" can adjust to 4-6.

This is a UI + engine change with no schema migration. The `rating`
column stays unchanged. Only the engine's interpretation function
changes. Per CLAUDE.md §4, this is a `packages/ml` boundary change —
explicit user go-ahead recorded in the 2026-05-14 session.

## How this composes with future collaborative-filter signal

Phase 2+ will likely add a collaborative-filter pass — "users who
disliked X also disliked Y" — to capture universal taste patterns
that no single user has data for. The architecture supports adding
this without revisiting today's bipolar formula:

```
finalScore(candidate, user)
  = personalScore(candidate, user.tasteVector)          // (A, today's bipolar engine)
  + collabAdjust(candidate, user) * confidenceWeight    // (C, future)

confidenceWeight(candidate) = f(rated_user_count_for_candidate)
```

Where `confidenceWeight` is near-zero when we have few users with
feedback on a candidate (so A dominates) and grows as data
accumulates (so C contributes meaningfully). The bipolar A signal
remains the per-user backbone regardless.

## What would change our mind

- **Users report confusion** about what a 5/10 means — neutral or
  slight-dislike? Consider shifting the midpoint to exactly 5 with
  the asymmetric formula, OR explicitly labelling 5 as "neutral."
- **Recs become too defensive** after disliked titles — too many
  candidate tags get suppressed, reducing diversity. Damp the
  negative contribution (e.g., multiplicative `0.5` on the negative
  half) while keeping positives at full weight.
- **Anchor signal feels redundant** with bipolar ratings — the
  anchor pathway in extractTasteVector adds a positive `1.0` for
  ≥9 mean franchises on top of the rating contribution. If
  double-counting top-rated franchises distorts recs, drop the
  anchor pathway entirely and let bipolar ratings carry the signal.
- **Collaborative data quality is poor at scale** — the blend
  proposal above (Phase 2+) assumes meaningful collab signal at
  high user counts. If those patterns turn out noisy, fall back to
  per-user bipolar only.

## Related

- [ADR-0008](0008-ml-inference-approach.md) — ML inference approach
  (this change adjusts the per-rating contribution formula)
- [ADR-0023](0023-franchise-level-taste-signal.md) — franchise-level
  taste signal (mean of signed weights works correctly under bipolar
  semantics; no change to franchise aggregation needed)
- [PROJECT.md](../../PROJECT.md) §moats — dislike signal was a
  recognised gap; this ADR closes it

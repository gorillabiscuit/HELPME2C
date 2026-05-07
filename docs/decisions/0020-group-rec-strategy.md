# ADR-0020: Group recommendation strategy

**Status:** Proposed
**Date:** 2026-05-07
**Supersedes:** —

## What we chose

For Phase 1A group recommendations (M7 in [ROADMAP.md](../ROADMAP.md)),
**Average Without Misery (AWM) with a soft disagreement penalty, plus a
heavy UX transparency layer**:

```
group_score(item) =
  if any member's predicted score < veto_threshold:
    excluded
  else:
    mean(member_scores) - λ · stddev(member_scores)
```

Starting parameters, to be calibrated against the offline eval harness:
- `veto_threshold = 5/10` (the AWM "no-veto" floor)
- `λ = 0.5` (the disagreement penalty weight)

UX transparency layer: every group recommendation surfaces its own
explanation — "recommended for both because [theme overlap, predicted
scores, agreement signal]." Carrying weight on the algorithm alone is
known to underperform; in user studies, transparency consistently moves
satisfaction more than the choice of aggregation function.

A multi-session fairness layer (across sessions, balance "who wins")
is **deferred to Phase 1B** — it requires session history we don't have
in v1.

## What we rejected

- **Pure averaging / additive utilitarian** — easiest to ship, ranked
  near-bottom in academic studies for couch-couple satisfaction. Produces
  lowest-common-denominator output (everyone's "fine," no one's excited).
  Failure mode is exactly the headline this product wants to avoid.
- **Pure least-misery (MIN aggregation)** — solid floor, too conservative
  ceiling. A single picky member dictates every session; cold-start
  members produce noisy floor signal. Good as a component, not a strategy.
- **Borda count / ordinal voting** — robust to scale-calibration drift
  but needs a pre-ranked candidate set, which is exactly what the rec
  engine is meant to produce. Architectural mismatch.
- **Multiplicative aggregation** — extreme version of least-misery without
  a configurable threshold; too conservative for entertainment recs.
- **Disagreement-aware on its own** (no veto floor) — strongest in
  isolation per Masthoff & Gatt 2006, but skips the "no veto member is
  overruled" property couch couples rely on. AWM + disagreement combines
  both.

## Why

The primary archetype in [PROJECT.md](../../PROJECT.md) is the **couch
co-watcher**. That archetype's psychology favours "no one hates it" over
"someone loves it" — but pure least-misery is too conservative for a
*discovery* product. AWM combines averaging's "mostly happy" property
with least-misery's veto floor without inheriting either's worst case.
Adding a disagreement penalty is what the academic literature most
consistently endorses (Masthoff 2011 *Group Recommender Systems*; Masthoff
& Gatt 2006 on disagreement-aware aggregation).

The UX transparency layer matters more than the algorithm. Lab studies
consistently find that an explained recommendation feels good even when
the algorithm is mediocre, while an unexplained recommendation feels
arbitrary even when the algorithm is excellent. This product's tagline
("recommended for both because…") leans into the strongest empirical
lever; the algorithm just needs to not be obviously wrong.

We accept that v1 will be visibly imperfect on edge-case groups (anime+TV
mixed couples especially, where cross-medium signal is weakest). The
mitigation is the **offline eval harness** (see "Required before code"
below), not algorithm sophistication.

## Required before any group-rec code lands

Per the 2026-05-07 reviewer feedback, group recs are research-grade and
ship badly when treated as engineering. Before M7 implementation:

1. **Synthetic-group eval harness** in `packages/ml/`:
   - Compatible couple, diverse couple (bridgeable), anime+TV mixed
     couple, family-with-constraint, incompatible couple
2. **Per-strategy metrics** computed on synthetic groups: mean/min predicted
   satisfaction, stddev (disagreement), count of items where every member
   scores ≥7/10, theme diversity.
3. **Parameter sweep** of `λ` and `veto_threshold` on the harness; pick
   the dominant point, document it here.
4. **UX explanation copy** drafted alongside the algorithm, not after.

The harness lives in `packages/ml/` (per [ADR-0008](0008-ml-inference-approach.md)
boundary), runs in CI on the rec engine, produces a one-page report per
parameter sweep.

## What would change our mind

- **User testing signals couples want peak excitement over safety** — drop
  or raise the veto threshold; reduce λ; consider switching to a different
  base aggregator.
- **Cold-start groups consistently fail** because predictions are too
  noisy for AWM filtering — fall back to a "diverse picks" mode that
  shows N items per member with cross-recommendations, relaxing the
  group-aggregation constraint.
- **Anime+TV mixed couple case (the differentiator) breaks AWM** because
  the floor excludes too many cross-medium candidates — separate
  cross-medium-mode that relaxes the floor in exchange for explicit
  "this is your bridge pick" UX framing.
- **Multi-session sessions show heavy "same member wins" complaints** in
  feedback → promote the deferred fairness layer from 1B to 1A.

## Related

- [ADR-0008](0008-ml-inference-approach.md) — ML inference approach (where
  group rec scoring runs)
- [ADR-0013](0013-recommendation-cache-backend.md) — cache backend (group
  recs cached per group, invalidated on member taste-vector changes)
- [PROJECT.md](../../PROJECT.md) §archetypes — couch co-watcher as primary
- [ROADMAP.md](../ROADMAP.md) — M7 group recommendations

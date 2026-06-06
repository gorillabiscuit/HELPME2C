# ADR-0026 — Theme vocabulary: faceted architecture

**Status:** Accepted
**Date:** 2026-06-06
**Related:** ADR-0020 (group rec strategy), ADR-0022 (behavioural signal anonymisation)

---

## What we chose

Restructure the theme vocabulary from a flat slug list into a five-facet architecture. Each title is tagged independently per facet; facets are orthogonal and scored separately in matching.

The five facets:

| Facet | What it captures | Matching role |
|---|---|---|
| **A — Topical Themes** | What the story is about | Ranked preference signal |
| **B — Structural Arc** | How the story is shaped (arc direction, pacing, protagonist arc) | Ranked preference signal |
| **C — Affective Texture** | Tonal register — how it feels to watch | Ranked preference signal |
| **D — Content Intensity** | Violence/sexual content presence | Veto filter (not a ranking signal) |
| **E — Gratification Profile** | Hedonic vs. eudaimonic affordance | Tie-breaker / session-state overlay |

The existing vocabulary (as of 2026-06-06) is predominantly Facet A. Slugs are not removed; they are reclassified into the facet they belong to.

Slugs added in the initial implementation (see implementation notes below for full list and priority order).

The two Content Intensity flags (Facet D) are implemented as boolean fields on the content record, **not** as entries in the theme slug array. This preserves the architectural distinction: slugs are preference signals; content flags are veto filters.

---

## What we rejected

### Option A: Keep the flat vocabulary, add more slugs

Rejected because seven independent research frameworks (affective narratology, AllMusic/Spotify mood taxonomy, hedonic-eudaimonic theory, Plutchik's circumplex, cognitive narratology, IMDb/Letterboxd folksonomy analysis, Netflix taste-community clustering) all independently conclude that mixing topical, tonal, structural, and gratification dimensions into a single scoring dimension makes matching worse, not better. Two shows can share topical slugs (`found-family`, `grief-and-loss`) while being completely different viewing experiences (*Succession* vs *Ted Lasso*). The flat model cannot resolve this.

### Option B: Add explicit Schwartz values axis, moral foundation scores, SDT need-satisfaction labels

Rejected. These are receiver-dependent constructs (viewer × content outcomes, not work properties). They cannot be reliably extracted from a synopsis by an LLM, and encoding them as content tags would be the recommender system prejudging the viewing experience for a specific viewer profile. They belong in the user preference model, not the content vocabulary. See "What not to add" section in `research/synthesis-vocabulary.md`.

### Option C: Add Big Five trait tags to content ("cerebral", "high-openness-content")

Rejected for the same reason. Big Five traits are viewer attributes. `cerebral` as a content tag encodes an editorial judgement that varies by viewer. What IS extractable as a work property — narrative complexity — is already covered by `nonlinear-storytelling` and `slow-burn`.

### Option D: Use Reagan six-way emotional arc typology (Cinderella, Oedipus, Man in a Hole, etc.)

Rejected. Fine-grained arc labels require full-text sentiment analysis across the entire work, not synopsis reading. Inter-rater reliability at synopsis level is too low to make these useful as controlled vocabulary. Replaced by the coarser, more reliable `arc-ends-uplifting` / `arc-ends-downbeat` distinction.

---

## Why

The research spike (33 items, `research/narrative-theme-taxonomy/`) identified the core problem: the current vocabulary conflates axes that predict different aspects of viewer satisfaction and that need to be scored differently in two-person aggregation.

Concretely, the two-person use case (ADR-0020) requires:

1. **Least-misery on Facet D (content vetoes).** If one partner vetoes graphic violence, any title above threshold is excluded entirely before ranking. This only works if content intensity is tracked separately from preference signals — mixing `war-and-its-toll` (topical) with `violence-present` (intensity flag) means the veto logic has no clean handle.

2. **Ending direction as a dedicated axis.** `arc-ends-uplifting` vs `arc-ends-downbeat` is a dimension where preferences frequently diverge in pairs and where least-misery is the right operator. It cannot be recovered from topical slugs.

3. **Tone as a matching axis independent of topic.** Two people can agree on topic preferences (`found-family`, `class-conflict`) but want opposite tonal registers. Without Facet C, the recommender cannot distinguish the *Fleabag* audience from the *Schitt's Creek* audience even though both shows are broadly "family/relationship comedy with heart."

---

## Implementation notes

**Priority 1 — ship together as initial facet rollout:**

- `tone-brooding` (C) — heavy, atmospheric, melancholic register
- `tone-bittersweet` (C) — mixed joy/sorrow; poignant-autumnal
- `tone-rousing` (C) — energetic, propulsive, uplifting register
- `tone-playful` (C) — light, fun, comedic without being absurdist or dark
- `arc-ends-uplifting` (B) — emotional direction of ending is positive
- `arc-ends-downbeat` (B) — ending is tragic, bleak, or unresolved-negative
- `protagonist-transforms` (B) — central character materially changes

**Priority 2 — ship once veto-filter infrastructure exists:**

- `violence-present` (D) — as boolean field, not a slug
- `sexual-content-present` (D) — as boolean field, not a slug
- `slice-of-life` (A) — anime/K-drama catalogue gap
- `isekai` (A) — anime catalogue gap; highly formulaic, easy to extract

**Priority 3 — defer until vocabulary is stable:**

- `anthology-structure` (B)
- `cosy-mystery` (A)
- `affords-comfort-viewing` (E)
- `ensemble-conflict` (A)
- `affords-catharsis` (E) — extraction confidence too low at synopsis level; wait for editorial signal

**Existing slugs requiring hint updates (low priority, no schema change):**

- `slow-burn` — logically Facet B (pacing), currently grouped under Texture in the hints file; update grouping comment only
- `nonlinear-storytelling` — hint clarification: add "or deliberately withheld cause-and-effect"
- `character-study` — add "NOT a biographical work" to disambiguate from `biographical-portrait`
- `biographical-portrait` — add "about a specific named real person or historical figure"
- `existential-horror` — hint expansion: acknowledge both ideas-driven and visceral-dread readings

**Extraction validation requirement:** Before shipping any new facet to production, run two independent Haiku extraction passes on a sample of ≥ 50 titles and compute Cohen's kappa per new slug. The affective-narratology research explicitly warns that prototype labels (tone facets in particular) have lower LLM inter-rater agreement than topical themes. Target kappa ≥ 0.6 before shipping; below 0.5 means the slug definition needs tightening.

---

## What would change our mind

- Empirical evidence that the flat vocabulary produces equivalent matching quality (measured by joint watch rate proxy) — i.e., the facets don't actually improve recommendations in practice.
- Discovery that extraction kappa for Facet C or E slugs is consistently below 0.5 even after prompt refinement, making those facets noise rather than signal. In that case, drop those facets and fall back to editorial tagging for tone.
- A shift to full collaborative filtering (behaviour-only matching) that makes synopsis-extracted tags redundant — at that point the vocabulary becomes secondary to interaction signals.

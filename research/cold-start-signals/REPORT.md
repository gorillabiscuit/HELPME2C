# Cold-start signals for HelpME2C — research report

**Date:** 2026-05-17
**Prepared by:** Claude (Opus 4.7) — autonomous run
**Status:** Research deliverable, not a design ticket. The boxed callout
at the end is intended as the basis for a ticket.

---

## TL;DR

Twelve candidate onboarding signals were evaluated against three
constraints from CLAUDE.md and PROJECT.md: GDPR floor, privacy-by-default
("materially improves rec quality", not "might"), and the rule-based
scoring constraint in `packages/ml/src/recommendation.ts`. **Four
signals clear the bar. Eight don't.**

| Signal | Currently asked? | Tier | One-line reason |
|---|---|---|---|
| **Anchor picks (count)** | Yes ("5 or 6") | **MUST-ASK** — but reshape to 3 min / 5 suggested / 10 max | Netflix=3, Pinterest=5, Letterboxd=4; literature agrees marginal value plateaus 7–10. Current floor is slightly too high. |
| **Household composition** (solo / partner / family) | No | **MUST-ASK** | Directly load-bearing for the primary archetype (couch co-watcher); cannot be recovered from individual behaviour per Google co-watching research. |
| **Streaming providers** | Yes, but later | **MUST-ASK + move to onboarding** | An unwatchable rec is a 1/5 rating, not a missing one. JustWatch/Reelgood put it in onboarding. Hard filter, no ML needed. |
| **Region (upgrade to country)** | Yes, as `eu`/`row` | **SHOULD-ASK** at country granularity, IP-defaulted | TMDB `watch_region` is mandatory per-country. Pre-fill from IP; one-tap correction. |
| Birth date (store the date, not just verified=true) | No (only `ageVerified=true` stored, per ADR-0012) | **DON'T-ASK** | Demographics are *predicted by* ratings, not the reverse. 8–17pp signup drop. No rule-based scoring path. Keep ADR-0012 posture. |
| Specific city | No | **DON'T-ASK** | (age + sex + city) is a canonical quasi-identifier; k-anonymity fails fast. No scoring path. |
| Gender | No | **DON'T-ASK** | Weak predictor when isolated; literature shows it amplifies stereotypes. BlurMe finding: gender is already latent in ratings — collecting it just amplifies bias. |
| Mood / context at signup (light/dark, slow/fast) | No (deferred to 1B in PROJECT.md) | **DON'T-ASK** | Mood is session-scoped not user-scoped. Capture at request time in Phase 1B if at all. Deferral is correct. |
| Watch pace (hours/week) | No | **DON'T-ASK** | Self-reported pace is inaccurate (well documented). Derive from anchor-pick runtime/episode counts. |
| Medium balance preference (% anime/TV/film) | No | **DON'T-ASK** | Fully reconstructible from medium distribution of anchor picks. Asking imposes the category dichotomy that HelpME2C is built to dissolve. |
| Prior medium exposure ("seen any anime?") | No | **NICE-TO-HAVE** | Picks reveal it (zero anime anchors = newcomer). Differentiated newcomer experience can ship as a content surface, not a question. Promote if testing shows anime-naive users get unparseable recs. |
| Free-text "what are you in the mood for tonight" | No | **DON'T-ASK** (1A) | Without LLM, keyword-matching damages quality. Highest Art. 9 risk (accidental sensitive disclosure). Phase 2 reconsider. |

**Headline:** the Phase 1A onboarding flow should be three questions —
anchor picks, household, streaming providers — plus a one-tap country
confirmation. Everything else is data-hoarding under the privacy-by-
default bar.

---

## 1. Per-signal evaluation

Each signal has a full evidence file in [`raw/`](./raw/). The summaries
below are one paragraph per signal, anchored to the constraints box.
Citations live in the raw files; only the most load-bearing ones are
inlined here.

### MUST-ASK (4)

#### 1.1 Anchor picks — keep, but reshape to 3 / 5 / 10

[Full file →](./raw/onboarding-anchor-count.md)

Anchor picks ARE the primary signal in `packages/ml/src/recommendation.ts`.
The question is the *number*, not the signal. Industry has converged
tightly: Netflix asks 3 ([Netflix Help Center](https://help.netflix.com/en/node/100639)),
Pinterest asks 5 ([Appcues](https://www.appcues.com/blog/casey-winters-pinterest-user-onboarding)),
Letterboxd asks 4, Spotify asks 3+. The academic literature
([Rashid et al., IUI 2002](https://cs.fit.edu/~pkc/apweb/related/rashid-iui02.pdf);
[Cremonesi et al., RecSys 2012](https://www.researchgate.net/publication/254464296);
[Sepliarskaia et al., RecSys 2018](https://dl.acm.org/doi/10.1145/3240323.3240352))
shows the marginal-value curve is steep 0→3, meaningful 3→7, flat after
~10. Drop-off literature is unforgiving: multi-step form completion peaks
at 3 steps (62%) and drops to 44% past 5 ([Userpilot benchmarks](https://userpilot.com/blog/onboarding-checklist-completion-rate-benchmarks/)).
The current copy ("Five or six is plenty to start") sets the floor too
high. **Recommendation:** 3 minimum / 5 suggested / 10 cap, Pinterest-
style "Pick 5" copy with a visible counter and a "Done" CTA from pick 3
onward. Also nudge for diversity ("Add something from a different
genre?") — group-rec quality benefits more from across-genre breadth
per user than from more picks per user
([An entropy empowered hybridized aggregation technique, ScienceDirect 2020](https://www.sciencedirect.com/science/article/abs/pii/S0957417420308617)).

#### 1.2 Household composition (solo / partner / family) — ADD

[Full file →](./raw/household-composition.md)

The primary archetype is couch co-watcher, and group rec is one of the
two named moats in PROJECT.md. Co-viewing is the dominant mode:
~80% of CTV viewing is shared, partner is the top co-viewer at 59%
([MNTN Research](https://research.mountain.com/insights/better-together-an-exploration-of-co-viewing-on-ctv/);
[IAB OTT Co-Viewers Report](https://www.iab.com/news/56-ott-co-viewers-report-talking-brands-products-see-watching-tv/)).
The recsys literature shows co-viewing preferences cannot be recovered
by averaging individual signal ([Google Research — Co-Watching YouTube](https://research.google.com/pubs/archive/46602.pdf)),
which Netflix's profile architecture is built around. A four-option
radio (`solo`/`partner`/`family`/`household`) costs one tap, isn't an
Article 9 special category, and routes deterministically into three
group-aggregation strategies already shipped in the codebase:
`family-with-constraint` (least-misery) for family, average-with-floor
for partner, no aggregation for solo. Without this signal, the engine
has no principled way to choose. **Recommendation:** add as MUST-ASK,
one radio, with the "why we're asking" line "So we know whether to
recommend for you alone, with someone, or for a household."

#### 1.3 Streaming providers — MOVE EARLIER

[Full file →](./raw/streaming-providers.md)

PROJECT.md already names "filter by user's connected subscriptions" as
a planned feature. The placement decision is the open question.
[JustWatch](https://support.justwatch.com/hc/en-us/articles/25403490091421-Understanding-Provider-Filters-in-the-JustWatch-App)
and [Reelgood](https://www.cloudwards.net/how-to-use-reelgood/) — the
two canonical comparison products — both put this in onboarding because
an unwatchable rec is structurally a 1- or 2-star rec: the user pays the
cognitive cost of evaluation without the payoff of resolution. The 4/5
success metric punishes this directly. Median household uses ~4 services
([MNTN](https://research.mountain.com/trends/the-average-ctv-household-actively-uses-around-4-streaming-apps/));
Gen-Z/millennial households ~5 ([Deloitte Digital Media Trends 2025](https://www.deloitte.com/us/en/insights/industry/technology/digital-media-trends-consumption-habits-survey/2025.html));
churn is high (52% of millennials cancel an SVOD in any 6-month window)
so this cannot be inferred — it must be asked and easy to update. UX:
region-aware top-N picker (6–10 logos covers >90% of any region's
subscriber base), search/expand for the long tail. Cleanly composes with
rule-based scoring as a `streamableNow` filter post-scoring. Two-tier
recommended: hard filter for the main list; soft "Rent or buy" tail
section. **Recommendation:** MUST-ASK, move to onboarding step 4 (after
picks + household).

#### 1.4 Region — upgrade `eu`/`row` to ISO country, IP-defaulted

[Full file →](./raw/region.md)

The current `eu`/`row` binary is enough for the GDPR threshold gate
(ADR-0012 §5) but cannot drive the streaming-availability filter, which
requires per-country granularity via TMDB's `watch_region` parameter.
Netflix's "fewer than 10% of people in this anime-loving community are
actually in Japan" finding
([Netflix — A Global Approach to Recommendations](https://about.netflix.com/en/news/a-global-approach-to-recommendations))
is a strong argument that country is a *bad* taste prior — it should NOT
be wired into theme/tag scoring. But it IS load-bearing for availability
filtering and weak language priors. **Recommendation:** keep the
`eu`/`row` field for legal threshold purposes; add a separate
`country` (ISO-3166-1 alpha-2) pre-filled from IP geolocation with a
one-tap correction. Pinterest's IP-defaulted country lifted activation
5–10% ([Casey Winters / Appcues](https://medium.com/appcues/casey-winters-reveals-how-pinterest-perfected-user-onboarding-639fcc7486d7)).
This is upgrade-existing, not new-collection, so it's a SHOULD-ASK rather
than a MUST.

### NICE-TO-HAVE (1)

#### 1.5 Prior medium exposure ("Have you watched anime before?")

[Full file →](./raw/prior-medium-exposure.md)

Anchor picks already reveal exposure — zero anime in 5 picks = newcomer.
Crunchyroll, AniList, MAL, and Netflix don't ask this question; they
serve curated "starter" rows. Promote to SHOULD-ASK only if user testing
reveals anime-naive testers are getting unparseable recommendations
(e.g. "what is this Code Geass thing?"). For Phase 1A, the deferred
"Refine your taste" swipe mode in `apps/web/src/app/onboarding/page.tsx`
is the better place to address newcomer confusion if it shows up in
testing.

### DON'T-ASK (7)

For each, the headline reason. Full evidence in the raw files.

| Signal | Why not |
|---|---|
| **Birth date** [→](./raw/birth-date.md) | Demographics are *predicted by* ratings, not the reverse ([Sun et al.](https://csc.lsu.edu/~msun/publications/mswim-sigconf.pdf); [arXiv:2108.01014](https://arxiv.org/abs/2108.01014)). 8–17pp signup drop per Baymard / Foundry 2026. No rule-based scoring path. ADR-0012's "store only `ageVerified=true`" posture is the right one. |
| **City** [→](./raw/country-city.md) | (age, sex, city) is the canonical k-anonymity quasi-identifier triple. No rec-quality path. Re-identification risk on a small platform is non-trivial. |
| **Gender** [→](./raw/gender.md) | The BlurMe paper shows ratings already encode gender at 80%+ inference accuracy — asking just amplifies the latent signal. The Spotify gender-stereotype failure mode ([arXiv:2501.04420](https://arxiv.org/abs/2501.04420)) is the well-documented risk. Fails the Art. 5(1)(c) necessity test cleanly. |
| **Mood/context at signup** [→](./raw/mood-context-at-signup.md) | Mood is session-scoped, not user-scoped — capturing it once at signup gives a fingerprint that's stale in days. Spotify and Mubi both collect mood implicitly or editorially, not at signup. PROJECT.md's Phase 1B deferral is correct. |
| **Watch pace** [→](./raw/watch-pace.md) | Self-reported screen time is well documented to be inaccurate. Spotify and Netflix derive pace cohorts behaviourally. A derived equivalent (median runtime / max episode count over anchor picks) runs the same scoring path with strictly better signal. |
| **Medium balance preference** [→](./raw/medium-balance-preference.md) | Fully derivable from the medium distribution of anchor picks. Asking imposes the anime-vs-TV dichotomy HelpME2C is explicitly built to dissolve. |
| **Free-text mood "tonight"** [→](./raw/free-text-mood.md) | Without LLM, keyword-matching free text fails on negation, synonyms, and comparative phrasing — confidently-wrong boosts damage the 4/5 metric. Highest Article 9 risk (accidental sensitive disclosure). Open fields cost 5–15pp completion. Phase 2 reconsider if/when an LLM layer lands. |

---

## 2. Three onboarding flow designs

All three designs use the existing post-signup flow shape:
`/sign-up` → Clerk → `/age-check` → `/onboarding` → `/`.

### DESIGN A — Minimum viable signal (ship next week)

**Goal:** smallest possible change that lifts cold-start quality
materially without major engineering or schema work.

**Steps:**

1. `/age-check` (unchanged) — birth date + `eu`/`row` region for the
   legal gate. Stores `ageVerified=true` per ADR-0012; birth date
   discarded.
2. `/onboarding` step 1 — **the picker** (the current screen, retitled).
   Copy change only: "Pick 3 or more shows you've loved" with a counter
   and an explicit "Done — show me my recs" CTA enabled from pick 3.
   No upper hard-cap, but the CTA changes from "Done" to "Just a few
   more?" past pick 7 to gently slow over-picking. **No new schema.**
3. `/onboarding` step 2 — **household composition** (new). One radio:
   "How will you mostly watch?" — `Just me` / `With a partner` /
   `With family / kids` / `With housemates`. Skip button visible.
   Stores to new `users.household` enum column.
4. `/onboarding` step 3 — **streaming providers** (moved from settings).
   Region-aware top-8 grid + "Show more" search. Skip button visible.
   Stores to existing schema (already collected later — same plumbing,
   different placement).

**Skip behaviour:**
- Skipping household → default `solo`. Solo personal-rec surface, no
  Pairings prompt. User can change in settings.
- Skipping streaming → no streamability filter applied. User can change
  in settings.
- Picker is the only step a user genuinely *cannot* skip if they want
  any personalisation at all; current skip-to-home is preserved.

**What's NOT in Design A:**
- Country is not asked. We keep `eu`/`row` and accept that streaming
  filtering will be weaker than ideal for non-EU users (Design B fixes).
- No diversity nudge ("pick something from a different genre"); the
  scoring engine handles cross-medium via theme bridges already.
- No prior-exposure question. No mood. No anything else.

**Schema deltas:**

- Add `users.household` enum (`solo`/`partner`/`family`/`household`,
  default `solo`).
- That's it. Streaming providers already have schema; this is a
  placement change.

**Opt-in framing copy (verbatim suggestions):**

| Step | Copy |
|---|---|
| Picker | "Pick 3 shows you've loved. We use these to learn your taste. The more you pick, the smarter your recs — 5 is great, 10 is plenty." |
| Household | "How will you mostly watch on HelpME2C? We use this to know whether to recommend for you alone, with someone, or for a household. You can change this any time." |
| Streaming | "Which services do you have? We only recommend things you can actually watch tonight. Change any time in Settings." |

### DESIGN B — Rich signal (1A user testing says we need more)

Everything in A, plus:

5. **Country upgrade.** `/age-check` adds a country dropdown pre-filled
   from IP. Schema: add `users.country` (ISO-3166-1 alpha-2). The
   `eu`/`row` field stays for legal-gate compatibility but is now derived
   from country (single source of truth). One-tap correction; no extra
   click for users where IP is right.
6. **Diversity nudge in the picker.** After pick 3, if all three are in
   the same broad genre cluster (computable from TMDB genres
   deterministically — no ML), add a soft prompt: "Add something from a
   different genre? It helps us recommend across your range." Optional
   dismiss.
7. **Pairings seed.** If household = `partner`, after the picker, an
   optional "Tell us about your partner" mini-step asking for 2–3 of
   their favourite titles. Stored as a separate "partnership-baseline"
   taste vector so Pairings is useful from session one (ghost profile is
   still Phase 1B per PROJECT.md — this is the *registered-only* seed,
   not the ghost-profile version).
8. **Newcomer detection (passive).** If anchor picks contain zero anime
   AND user opens a title page for an anime title, surface a "New to
   anime? Try this curated starter set." inline banner. No question
   asked; behavioural trigger only. Promotes the
   `prior-medium-exposure` signal back to SHOULD-ASK status if
   testing shows it materially helps.

**What B does NOT add:** birth-date storage (ADR-0012 stays), gender,
city, mood at signup, watch pace, medium balance question, free-text.

### DESIGN C — Recommended (the one I'd actually ship)

**Design C is Design A with three additions from Design B.** This is
the version I'd ship if I had to commit today, anchored to PROJECT.md
moats and the 4/5 quality metric.

1. Everything in Design A.
2. **+ Country upgrade from B (item 5).** IP-defaulted, one-tap
   correction. The marginal cost is ~zero (auto-fill) and the marginal
   gain (proper streaming filter for non-EU users; defensible
   data-residency story per ADR-0012) is large. No reason not to.
3. **+ Diversity nudge from B (item 6).** Cheap deterministic logic on
   TMDB genres; lifts group-rec quality (one of two named moats) by
   producing more usable taste vectors per user. No new schema.
4. **+ Newcomer detection from B (item 8).** Behavioural, not a question
   — fits the privacy-by-default bar; ships as a content surface, not a
   prompt.

**Design C deliberately defers:** Pairings seed (item 7 in B). The
single-user MVP should establish that personal recs hit 4/5 quality
before adding partner-seed complexity; otherwise we can't tell which
part broke. Pairings seed becomes the lead post-MVP follow-up if
single-user testing succeeds.

**Schema deltas in Design C:**

- `users.household` enum (new)
- `users.country` ISO-3166-1 alpha-2 (new)
- `eu`/`row` becomes derived from `country` (still stored for
  legal-gate compatibility; consider migration to derive-on-read at
  ADR-update time)

**Order of operations in the onboarding flow:**

```
/sign-up (Clerk)
   ↓
/age-check     birth date + country (IP-defaulted), region derived
   ↓
/onboarding
   ├─ step 1   pick 3–10 shows (counter, "Done" from 3, diversity nudge after 3)
   ├─ step 2   household (single radio)
   └─ step 3   streaming providers (region-aware top-8 + search)
   ↓
/              personal recs surface
```

Each `/onboarding` step has a visible "Skip" link; skipping = sensible
default applied.

---

## 3. Measurability — does the signal earn its keep?

**Anchoring file:** `packages/ml/src/eval/` (read in full during this
research). The eval harness already exposes the building blocks needed:
`evaluateScenario`, `parameterSweep`, `EvalMetrics` over the five
ADR-0020 archetype scenarios. **What's missing for cold-start eval is a
fixture generator parameterised by signal availability.**

### Hypothesis form (the contract for each "should we keep this signal" decision)

For every signal that survives the design phase, the keep/drop decision
is framed as a one-line hypothesis:

> Given `<signal>` collected at onboarding, the cold-start recommendation
> quality metric improves by at least `<delta>` over the no-`<signal>`
> baseline, measured on `<scenario set>`, with `n ≥ 10` testers per
> condition.

Concrete examples:

- **Household:** "Given `household=partner`, group recommendations for a
  registered-user pair show `meanScore` ≥ 0.10 higher than the
  no-household-signal baseline on the `diverse-couple-bridgeable` and
  `family-with-constraint` fixtures."
- **Streaming providers:** "Given `user.providers`, the proportion of
  top-10 recs marked 'I'd actually watch this tonight' by testers
  improves by ≥ 15pp over the no-providers baseline (which produces
  unwatchable recs at known rates)."
- **Country (vs `eu`/`row`):** "Streaming-filter precision (recs the
  user can stream / recs shown) improves from `X` to `Y` ≥ 0.85 across
  10 testers in 5 different countries."

### Holdout strategy

The harness is offline / synthetic-fixture-based today. For cold-start
signal eval, we need **two layers**:

1. **Offline (synthetic) layer — augment `packages/ml/src/eval/fixtures.ts`.**
   Add a new fixture axis: per-archetype, generate paired scenarios
   `with_signal` vs `without_signal` for each MUST-ASK / SHOULD-ASK
   signal. Concretely:
   - `SCENARIO_COMPATIBLE_COUPLE_WITH_HOUSEHOLD` vs `..._WITHOUT_HOUSEHOLD`
     — same members, but the `_WITH_` variant carries household metadata
     that the (new) household-aware recommender uses to pick aggregation
     strategy.
   - `SCENARIO_FAMILY_WITH_PROVIDERS_FILTER` vs `..._WITHOUT_PROVIDERS_FILTER`
     — same family, but the candidate set is post-filtered in one
     variant and not the other.

   The harness's existing `parameterSweep` shape extends naturally —
   adding a third dimension (`signal_on` / `signal_off`) to the
   (`vetoThreshold`, `lambda`) grid. The added cells are cheap.

2. **Live (≥10 testers) layer — feature-flagged onboarding A/B.**
   Per PROJECT.md success metric ("4/5 quality rating from ≥10 testers"),
   the canonical live evaluation is a 10-person panel. Standing
   instrumentation:
   - Flag-gate each candidate signal (`household`, `providers_in_onboarding`,
     `country_upgrade`) behind a runtime flag.
   - Tester pool split 50/50 per flag (5 with signal, 5 without).
   - Same anchor-pick load on both sides to isolate the signal's effect.
   - Self-reported quality rating per top-10 rec, aggregated to
     `mean_rating_top10` per condition.
   - Survey-style "would you watch this tonight?" yes/no for streaming-
     filter scenarios specifically.

   Statistical caveat: n=10 is underpowered for anything but obvious
   effects. The bar for "keep" should be **directionally positive +
   no harm to drop-off conversion**, not "p<0.05 statistical
   significance". A 5pp drop-off cost is real and should NOT be
   accepted for an undetectable rec-quality gain.

### Metric (single number per condition)

The harness already produces `EvalMetrics` with `meanScore`,
`minScore`, `meanStddev`, `allHappyCount` (count of items where every
member scores ≥ 0.7), and `themeDiversity`. For cold-start signal eval,
the headline metric is:

> **`coldStartQuality = 0.5 × meanScore + 0.3 × (allHappyCount / topN) + 0.2 × min(themeDiversity / 5, 1)`**

Rationale:
- `meanScore` is the bulk of the signal — does the user like the recs
  on average?
- `allHappyCount` is the moat-relevant rate — for group recs, "all
  members happy" is the only outcome that matters.
- `themeDiversity` (normalised by 5 themes as a soft cap) prevents
  monoculture from gaming the score.

This composite is intentionally bounded `[0, 1]` so it can be reported
alongside the 4/5 tester quality rating ("composite score 0.78,
self-reported 4.2/5") without unit confusion.

### Success threshold (the "is this signal worth keeping" gate)

For each MUST-ASK signal added to onboarding, the bar is:

| Layer | Threshold |
|---|---|
| Offline (synthetic) | `coldStartQuality_with ≥ coldStartQuality_without + 0.05` across all 5 ADR-0020 archetype scenarios; no scenario regresses by > 0.02. |
| Live (n=10) | Self-reported quality `mean_rating ≥ 4.0` on a 5-point scale, AND no measurable drop-off cost > 5pp at the step the signal is added. |

If either layer fails, the signal moves to NICE-TO-HAVE and is reviewed
post-1A. The eval harness's `parameterSweep` reports can be regenerated
on every signal-change PR as a regression gate — this is the
"shouldn't ship if it breaks anything" hook.

### Concrete next step for the harness

A small, scoped addition to `packages/ml/src/eval/`:

1. New file `packages/ml/src/eval/cold-start-fixtures.ts` — paired
   `with_signal` / `without_signal` scenarios per signal.
2. New function in `harness.ts`: `signalAblation(scenarioPair, params,
   limit)` returning the delta in `coldStartQuality`. One paired
   comparison per signal.
3. New function `compositeScore(metrics: EvalMetrics): number`
   implementing the formula above. Adds one line to the existing
   metrics output; doesn't change any existing tests.
4. New test in `eval-harness.test.ts` asserting that adding a household
   signal to `diverse-couple-bridgeable` produces a non-negative
   `coldStartQuality` delta — a regression gate.

Estimated effort: half a day. No new dependencies. Reuses everything in
the existing harness.

---

## 4. RECOMMENDED MINIMUM-VIABLE ONBOARDING FLOW

This is Design C from §2, condensed enough to lift into a design ticket.

```
╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║   RECOMMENDED MINIMUM-VIABLE ONBOARDING FLOW (Design C, ticket-ready)║
║                                                                      ║
║   Step 0 — /age-check (existing, with one upgrade)                   ║
║   ─────────────────────────────────────────────────                  ║
║   - Birth date (existing) → validated against threshold, only        ║
║     `ageVerified=true` stored per ADR-0012.                          ║
║   - Country (NEW) — ISO-3166-1 alpha-2 dropdown, IP-defaulted,       ║
║     one-tap correction. Stored to `users.country`.                   ║
║   - `eu`/`row` derived from country (legal-gate compatibility).      ║
║                                                                      ║
║   Step 1 — /onboarding — anchor picks                                ║
║   ─────────────────────────────────────                              ║
║   - Copy: "Pick 3 shows you've loved. The more you pick, the         ║
║     smarter your recs — 5 is great, 10 is plenty."                   ║
║   - Visible counter; "Done — show me my recs" CTA enabled at         ║
║     pick 3.                                                          ║
║   - Soft diversity nudge after pick 3 if all picks share a broad     ║
║     TMDB genre cluster: "Add something from a different genre?"      ║
║   - Hard cap at 10 picks; the CTA reads "10 is plenty — show me      ║
║     my recs" at the cap.                                             ║
║                                                                      ║
║   Step 2 — /onboarding — household                                   ║
║   ──────────────────────────────                                     ║
║   - Single radio: Just me / With a partner / With family or kids /   ║
║     With housemates.                                                 ║
║   - "Why we're asking": "So we know whether to recommend for you     ║
║     alone, with someone, or for a household."                        ║
║   - Skip → default `solo`.                                           ║
║   - Stored to NEW `users.household` enum column.                     ║
║                                                                      ║
║   Step 3 — /onboarding — streaming providers                         ║
║   ────────────────────────────────────────                           ║
║   - Region-aware grid: top 6–8 providers for the user's country,     ║
║     "Show more" expand for the long tail.                            ║
║   - "Why we're asking": "We only recommend things you can actually   ║
║     watch tonight."                                                  ║
║   - Skip → no streamability filter applied; user can update in       ║
║     Settings.                                                        ║
║   - Stored using existing schema (placement change, not a new        ║
║     collection).                                                     ║
║                                                                      ║
║   Post-onboarding (Phase 1A, not in this ticket):                    ║
║   - Newcomer detection: if anchor picks contain zero anime AND user  ║
║     opens an anime title page, surface "New to anime? Curated        ║
║     starter set" inline. Behavioural trigger, no question.           ║
║                                                                      ║
║   What this ticket DOES NOT include:                                 ║
║   - Birth date storage as a feature (ADR-0012 stays).                ║
║   - Gender, city, mood at signup, watch pace, medium balance,        ║
║     free-text mood, prior-exposure question.                         ║
║   - Pairings partner seed (deferred — single-user MVP first).        ║
║   - Ghost-profile inference (Phase 1B per PROJECT.md).               ║
║                                                                      ║
║   Schema deltas (2):                                                 ║
║   - users.household enum (default 'solo')                            ║
║   - users.country ISO-3166-1 alpha-2 (default from IP)               ║
║                                                                      ║
║   Eval-harness deltas (1):                                           ║
║   - cold-start-fixtures.ts + signalAblation() + compositeScore()     ║
║     per §3 above.                                                    ║
║                                                                      ║
║   Estimated total step count visible to user: 4 steps                ║
║   (age-check → picks → household → streaming → home)                 ║
║                                                                      ║
║   Estimated time-to-personalisation for the median user: ~90s        ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## 5. Open questions for human review

The autonomous run flagged three things worth Wouter looking at before
this becomes a ticket:

1. **The mood-deferral comment.** The brief said mood/context is
   "explicitly deferred in `apps/web/src/app/onboarding/page.tsx`
   comment block". The actual deferral is in **PROJECT.md line 88**
   (Phase 1A OUT-of-scope: "Mood / context layer on recommendations →
   Phase 1B"). The onboarding page comment defers demographics,
   confidence meter, cross-cluster prompt, genre disambiguation, swipe
   refine — not mood specifically. The conclusion (DON'T-ASK at signup)
   stands either way, but the citation in the raw file is
   PROJECT.md-based, not the page comment.
2. **Whether to migrate `eu`/`row` to derive-from-country.** Design C
   keeps both columns for legal-gate compatibility but the cleaner
   shape would be: drop `users.region` after introducing
   `users.country` and derive on read. That's a schema migration on a
   populated table — CLAUDE.md §4 stop-and-ask territory. Listing it
   here so it doesn't get bundled into the design-C ticket silently.
3. **Pairings seed deferral.** Design B item 7 was deliberately dropped
   from Design C. The argument is "establish personal-rec 4/5 first,
   then add partner-seed complexity". Wouter may disagree — the moat
   is group rec, and we may be underestimating how much partner-seed
   accelerates that. Flagging for a human call.

---

## 6. Where to look next (for follow-on research)

- **Ghost-profile inference** for unregistered group members (Phase 1B
  per PROJECT.md). The signal set this report rules in (household,
  country, streaming) is also the right signal set for a ghost profile,
  which is helpful — same UX work, two product features.
- **Mood at request time** (Phase 1B). The deferral is correct, but
  when it lands, the framing should be "tell us about tonight" at the
  rec-list view, not "tell us about you" at signup. Spotify's chip-based
  mood pickers are the design reference.
- **Free-text + LLM** (Phase 2). When Phase 2 ML lands, free-text
  preference elicitation flips from DON'T-ASK to SHOULD-ASK. The Letterboxd
  "I want something like X but ___" pattern is the design reference.

---

_Files referenced: 12 per-signal evidence files in `raw/`; run log
in `RUN_LOG.md`._

# HANDOFF — cold-start onboarding redesign

**Purpose:** Single document a fresh Claude Code session can load to
implement the cold-start onboarding redesign decided 2026-05-17.

**Companion artefacts** (don't load all of these upfront — pull in as
needed):

- `research/cold-start-signals/REPORT.md` — full research report
- `research/cold-start-signals/raw/*.md` — per-signal evidence
- `research/cold-start-signals/RUN_LOG.md` — research-run audit trail

This file is the load-bearing summary. Everything below is decision +
context the next session needs to act.

---

## DECISIONS LOCKED (2026-05-17, by Wouter)

1. **Flow shape:** Design B-minus-Pairings-seed (functionally Design C
   from REPORT.md). Items in scope:
   - anchor-count copy reshape (3 / 5 / 10, "Done" CTA from pick 3)
   - household composition radio (new)
   - streaming providers moved from settings to onboarding
   - country upgrade (IP-defaulted ISO-3166-1, added in parallel
     to existing `users.region`)
   - soft diversity nudge after pick 3 (TMDB-genre-cluster based)
   - behavioural newcomer detection (banner on first anime-title view
     if anchor picks contained zero anime) — Phase 1A post-onboarding
2. **Pairings partner seed:** deferred. Establish personal-rec 4/5
   quality first, then add. Schema for partnership-baseline taste
   vector is NOT in this batch.
3. **Region schema:** keep `users.region` (`eu`/`row`) as the canonical
   legal-gate column per ADR-0012 §5. Add `users.country` as a separate
   ISO-3166-1 alpha-2 column. Both written on signup. No migration of
   the existing column.
4. **Ship order:** the anchor-count copy reshape ships first as its own
   tiny PR, ahead of the schema work. Cleanest A/B-able win.

---

## TICKETS, IN ORDER

### TICKET 1 — `HM2C-?` anchor-count copy reshape

**Scope:** copy + CTA-label logic only. No schema, no rec-engine
change. Estimated size: ~10 lines of code, 1 file.

**File to edit:** `apps/web/src/components/onboarding-flow.tsx`

**Changes:**

1. Subhead (around line ~188): replace
   > "Five or six is plenty to start; you can refine ratings and add
   > more anytime from *Your taste*."

   with
   > "Pick 3 to get started; 5 is great, 10 is plenty. You can refine
   > ratings and add more anytime from *Your taste*."

2. CTA label (around line ~280):
   - `ratedCount === 0` → "Skip for now" *(unchanged)*
   - `ratedCount > 0 && ratedCount < 3` → "Continue" *(unchanged shape)*
   - `ratedCount >= 3` → "Show me my recs" *(new branch)*

3. No hard cap on picks in this ticket — let the user keep going past
   10 if they want. The "Done" affordance from pick 3 is the soft cap.

**Tests:** the existing test suite has nothing pinning these strings.
A snapshot or text assertion can be added but isn't required for the
copy change to ship. Per CLAUDE.md §8.1, this is "Simple Logic" (or
arguably Scaffolding), Approach A is fine.

**Why this shape:** Netflix asks 3, Pinterest 5, Letterboxd 4. Marginal
rec-quality value plateaus after 7–10 ratings per the academic
literature (Rashid 2002, Cremonesi 2012). Multi-step form completion
peaks at 3 steps (62%) and drops to 44% past 5 — the current "5 or 6"
floor was slightly too high. Full evidence:
`research/cold-start-signals/raw/onboarding-anchor-count.md`.

**Diff tagging per CLAUDE.md §6:** both chunks are **Decision** —
copy decisions anchored to research, not mechanical. Reviewer should
read carefully.

---

### TICKET 2 — `HM2C-?` onboarding schema + flow expansion

**Scope:** the bulk of the redesign. Schema additions, two new
onboarding steps, streaming-provider step moved from settings.

#### Stop-and-ask gates this ticket trips (per CLAUDE.md §4)

- **Adding new top-level directory:** no
- **Schema migrations on existing tables:** `users` table — additive
  nullable columns only (`household` enum and `country` text). Per §4
  these are "usually safe" but still flag.
- **Changing consent / deletion / privacy-control flows:** YES — new
  persisted user preferences. Must update:
  - `/account/export` (DSAR Article 15/20) to include both new fields
  - `/account/delete` (Article 17) — hard-delete the new columns with
    the rest of `users` row (already covered by FK cascade — verify)
  - Privacy policy text to mention household + country collection
  - ADR-0012 §1 region note: country is added; `eu`/`row` is unchanged
- **Adding a new persisted user preference:** YES (per §4 bullet on
  consent/deletion flows). Confirm scope before coding.

#### Schema deltas

```sql
-- apps/web/drizzle/migrations/NNNN_add_household_country.sql
ALTER TABLE users
  ADD COLUMN household text NOT NULL DEFAULT 'solo'
    CHECK (household IN ('solo', 'partner', 'family', 'household')),
  ADD COLUMN country text;
-- country: NULL-able until user supplies. ISO-3166-1 alpha-2, 2 chars.
-- No CHECK constraint on country (too many valid codes); validate at
-- the application layer using a static lookup.
```

Drizzle schema update in `apps/web/src/server/schema/users.ts`:

```ts
household: text('household', {
  enum: ['solo', 'partner', 'family', 'household'],
}).notNull().default('solo'),
country: text('country'),  // ISO-3166-1 alpha-2; null until provided
```

#### New flow shape

```
/sign-up (Clerk, unchanged)
   ↓
/age-check  birth date + country (IP-defaulted, one-tap correction)
            region (eu/row) still asked or derived from country lookup
   ↓
/onboarding
   ├─ step 1   anchor picker (already in TICKET 1 shape)
   │           + soft diversity nudge after pick 3 if all picks in
   │           same TMDB-genre cluster
   ├─ step 2   household radio (NEW)
   └─ step 3   streaming providers (MOVED from settings)
   ↓
/  personal recs surface
```

#### Components to add / edit

| Path | Action |
|---|---|
| `apps/web/src/app/age-check/page.tsx` | Add country dropdown, IP-default via geolocation server action |
| `apps/web/src/app/api/age-verify/route.ts` | Accept + persist `country` |
| `apps/web/src/components/onboarding-flow.tsx` | Add step navigation: picker → household → streaming. Refactor `phase` state from `'intro' \| 'picker'` to `'intro' \| 'picker' \| 'household' \| 'streaming'`. |
| `apps/web/src/components/onboarding-household-step.tsx` | NEW — single radio component |
| `apps/web/src/components/onboarding-streaming-step.tsx` | NEW — region-aware top-N picker, reusing existing settings UI if possible |
| `apps/web/src/server/routers/me.ts` (or wherever) | tRPC mutations for `setHousehold`, `setCountry`, ensure `setProviders` is exposed at onboarding scope |
| `apps/web/src/server/schema/users.ts` | Add the two columns per drizzle snippet above |
| `apps/web/drizzle/migrations/*` | New migration file |
| `apps/web/src/app/api/account/export/route.ts` | Include new fields in DSAR output |
| `apps/web/src/app/account/privacy/*` (or wherever policy lives) | Mention household + country |

#### Diversity nudge (deterministic, no ML)

After pick 3, compute the set of TMDB top-level genres represented in
the anchor picks. If `|genres| === 1`, render a soft suggestion line:
"Add something from a different genre? It helps us recommend across
your range." Dismiss button. Does not block the "Show me my recs" CTA.
Implementation: pure function over the existing `anchor` data, no new
data fetch.

#### Streaming providers picker

- Region-aware top-N: 6–8 logos for the user's `country`. Sourced from
  TMDB watch-providers data already in the database per the streaming
  ADR (verify).
- "Show more" expands to search input + full list.
- Multi-select with chiclet display for selected.
- Skip button visible — defaults to no streamability filter.

#### Newcomer detection (Phase 1A post-onboarding addition)

If `user.anchors` contains zero anime AND the user navigates to an
anime title page, render an inline banner: "New to anime? Try this
curated starter set." Link to a curated anime list (TBD — separate
ticket to author the starter set). Behavioural trigger, no question
asked.

---

### TICKET 3 — `HM2C-?` eval-harness signal ablation

**Scope:** `packages/ml/src/eval/` additions to measure cold-start
signal value. Half-day estimate. No new dependencies.

**Files to add:**

- `packages/ml/src/eval/cold-start-fixtures.ts` — paired
  `with_signal` / `without_signal` scenarios per MUST-ASK signal.
- `packages/ml/src/eval/cold-start-fixtures.test.ts` — sub-agent-
  isolated tests per CLAUDE.md §8.1 Approach B (this is `packages/ml`,
  Approach B is mandatory).

**Functions to add:**

- `signalAblation(scenarioPair, params, limit)` → `{ withSignal: EvalMetrics, withoutSignal: EvalMetrics, delta: number }`
- `compositeScore(metrics: EvalMetrics): number` implementing
  `0.5*meanScore + 0.3*(allHappyCount/topN) + 0.2*min(themeDiversity/5, 1)`

**Tests:** assert that adding a household signal to
`diverse-couple-bridgeable` produces a non-negative `coldStartQuality`
delta — regression gate.

**Why:** per REPORT.md §3, the eval harness needs to be able to
ablation-test each signal so the keep/drop decision per signal has a
measurable answer. Without this, the 4/5 quality bar can only be
measured live with n=10 testers — too slow to iterate against.

---

## SCHEMA DELTAS (consolidated)

| Table | Column | Type | Default | Notes |
|---|---|---|---|---|
| `users` | `household` | enum | `'solo'` | One of solo/partner/family/household |
| `users` | `country` | text NULL | NULL | ISO-3166-1 alpha-2, IP-defaulted |

No changes to existing columns. `users.region` (`eu`/`row`) stays as-is.

---

## EVAL HARNESS DELTAS (consolidated)

- New file: `packages/ml/src/eval/cold-start-fixtures.ts`
- Two new exported functions in `harness.ts`: `signalAblation`,
  `compositeScore`
- One regression test added to `eval-harness.test.ts`

No changes to existing fixtures, metrics, or types.

---

## EVIDENCE INDEX

If the implementing session needs to back up a decision, the evidence
is here:

| Question | File |
|---|---|
| Why 3-min / 5-target / 10-cap? | `raw/onboarding-anchor-count.md` |
| Why household is MUST-ASK? | `raw/household-composition.md` |
| Why streaming providers in onboarding (not settings)? | `raw/streaming-providers.md` |
| Why country upgrade with IP default? | `raw/region.md` |
| Why don't we ask birth date as a feature? | `raw/birth-date.md` |
| Why don't we ask gender? | `raw/gender.md` |
| Why don't we ask city? | `raw/country-city.md` |
| Why don't we ask mood at signup? | `raw/mood-context-at-signup.md` |
| Why don't we ask watch pace? | `raw/watch-pace.md` |
| Why don't we ask medium balance directly? | `raw/medium-balance-preference.md` |
| Why don't we ask prior anime exposure? | `raw/prior-medium-exposure.md` |
| Why don't we ask free-text mood? | `raw/free-text-mood.md` |

---

## NO-FLY ZONE — DO NOT RE-DECIDE

These were considered and explicitly ruled out in the research run.
If the implementing session is tempted to add any of these, push back
and reference the raw file before re-opening the question.

| Don't add | Why not | Evidence |
|---|---|---|
| Gender question | BlurMe paper: 80%+ already inferable from ratings; collecting amplifies bias | `raw/gender.md` |
| Birth date as a feature (vs the existing ageVerified boolean) | Demographics are predicted *by* ratings; no scoring path | `raw/birth-date.md`, ADR-0012 §5 |
| City question | (age, sex, city) is a canonical k-anonymity quasi-identifier | `raw/country-city.md` |
| Watch-pace question | Self-reported pace is inaccurate; derive from anchor-pick runtime | `raw/watch-pace.md` |
| "Do you watch anime?" question | Anchor picks reveal it; use behavioural newcomer detection instead | `raw/prior-medium-exposure.md` |
| Medium balance % slider | Reconstructible from anchor pick distribution | `raw/medium-balance-preference.md` |
| Mood-at-signup question | Mood is session-scoped, not user-scoped; Phase 1B at request time if at all | `raw/mood-context-at-signup.md` |
| Free-text "what are you in the mood for" | Rule-based scoring can't usefully consume; Phase 2 with LLM | `raw/free-text-mood.md` |
| Pairings partner seed at onboarding | Wouter deferred; ship personal-rec 4/5 first | this file §DECISIONS LOCKED |

---

## OPEN QUESTIONS for the implementing session

1. **Geolocation source for IP-default country.** Vercel exposes
   `request.geo` on Edge; we're on Node-only runtime per
   `apps/web/CLAUDE.md`. Options: header sniffing (`x-vercel-ip-country`
   if Vercel sets it for Node), or a small server-only IP-lookup. Pick
   one and document in an ADR-update or short note.
2. **Reusing the settings streaming-provider picker.** Check what
   already exists in settings before building a new component for
   onboarding step 3. The Phase 1A goal is to *move* the surface, not
   to fork it.
3. **Privacy policy / ADR-0012 update.** The two new columns need a
   sentence each in the policy. ADR-0012 §5 mentions only "region";
   does country deserve a §5 amendment or just policy text?
4. **Test coverage for the new flow.** Per CLAUDE.md §8.1, anchor-count
   reshape is Approach A; new components Approach A is fine; any
   `packages/ml` work in TICKET 3 is Approach B (mandatory).

---

## DELIVERABLE-LEVEL ACCEPTANCE CRITERIA

For a "ship it" call on the full redesign (post all 3 tickets):

- [ ] Anchor-count copy + CTA reshape live, gated by no flag (TICKET 1)
- [ ] `users.household` + `users.country` migrated, no rollback needed
- [ ] `/onboarding` shows 3 steps: picks → household → streaming
- [ ] Diversity nudge fires when all 3 anchors are same TMDB genre
- [ ] Streaming step removed from `/settings/account` OR clearly
      labelled as "you already set this at signup, change here"
- [ ] `/account/export` returns both new columns in DSAR payload
- [ ] Anime newcomer banner fires on first anime title view for
      zero-anime-anchor users
- [ ] Eval-harness ablation shows `coldStartQuality` non-negative delta
      for each MUST-ASK signal added (TICKET 3)
- [ ] Privacy policy text reflects new collection
- [ ] 10-tester live panel: self-reported 4/5 quality rating on
      top-10 personal recs (PROJECT.md success metric)

---

_End of HANDOFF. Implementing session: load this file + the relevant
raw evidence file(s) + the file(s) you're about to edit. Skip the
33KB full REPORT.md unless you need it._

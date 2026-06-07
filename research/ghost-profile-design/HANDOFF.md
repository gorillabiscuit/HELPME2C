# HANDOFF — ghost-profile design (Phase 1B)

**Purpose:** Single document a fresh Claude Code session can load to
implement the ghost-profile feature once Wouter has decided on the
proposed defaults below.

**Status:** All decisions in this file are **proposed defaults**, not
committed choices. The implementing session must NOT presume Wouter's
approval — every `PROPOSED:` flag below needs sign-off before code.

**Companion artefacts** (don't load all of these upfront — pull in as
needed):

- `research/ghost-profile-design/REPORT.md` — full research report
- `research/ghost-profile-design/raw/*.md` — per-source evidence (11
  files, ~18k words, ~250 citations)
- `research/ghost-profile-design/RUN_LOG.md` — research-run audit trail

This file is the load-bearing summary. Everything below is decision +
context the next session needs to act, *once Wouter signs off on the
proposed defaults*.

---

## DECISIONS PROPOSED (awaiting Wouter sign-off, 2026-05-17)

**Anchored to Design C from REPORT.md.** Each item below is a proposed
default; Wouter should review and confirm/amend before any code lands.

### Locked-but-confirm

1. **Design shape:** Design C from REPORT.md. Five-input visual-picker
   battery (3 vibe tiles + 1 dealbreaker chip + 1 starred-pick flag +
   2 polarizing-pair-picks). ~60–90 seconds total interview time. Within
   the 5–8 well-chosen-questions sweet spot per Rashid 2002 /
   Christakopoulou 2016 / Sepliarskaia 2018.
2. **Architectural integration:** the ghost profile produces a
   `UserTasteVector` that plugs into the existing `recommendForGroup`
   aggregator (`packages/ml/src/recommendation.ts`) as one
   `GroupMember`. The aggregator's veto and lambda treatments are
   relaxed for the ghost member (lower veto weight, halved
   disagreement-penalty contribution) — implements the "limited
   transfer + always blend" recipe from
   `raw/cold-start-cross-user-transfer.md`.
3. **Legal basis:** legitimate interests (Article 6(1)(f)). Consent
   isn't available — the partner can't consent through the registered
   user. Documented LIA before shipping. See `raw/gdpr-non-user-data.md`
   §2.
4. **Article 14 delivery:** routed via the registered user. A required
   checkbox at the partner-add step: *"I confirm my partner knows I'm
   using HelpME2C to find things for us to watch."* Plus a standalone
   public Article 14 notice page at `/privacy/about-your-partner-profile`.
5. **Bounded scope:** content-axis allowlist enforced at the schema /
   TypeScript-enum level. No demographics. No special-category-proxy
   themes. See `raw/gdpr-non-user-data.md` §9.

### PROPOSED (default values; Wouter confirms or changes)

6. **PROPOSED retention default: 90 days of inactivity** before auto-
   delete of the ghost profile. Trade-off: less retention = more
   privacy-defensible; less retention = more user friction. Calibration
   conversation needed.
7. **PROPOSED deferral: claim/anonymise/delete-on-register UX is NOT
   in this batch.** Schema supports it; the flow is a separate future
   ticket. Counter-argument that it should ship with Design C: once a
   partner registers, *not* offering control is the worst possible UX.
   Confirm deferral or promote into scope.
8. **PROPOSED: curated chip-only dealbreaker vocabulary** (not
   free-text). Curated is safer per the CMB ethnicity-algorithm story
   in `raw/dating-app-question-batteries.md` §5; free-form is more
   expressive. Start curated and only relax if user testing demands.
9. **PROPOSED: ship order — eval harness first, then schema, then
   UX.** Layer 1 offline ablation (eval-harness extension) and Layer 2
   within-user pilot (existing users answer the battery about
   themselves) BOTH must pass thresholds before any partner-facing UX
   ships. See §EVAL THRESHOLDS below.

### Not in scope for this batch (deferred)

- The relationship-anchored "what's the vibe tonight?" session prompt
  (Design B item 5). Worth a follow-up research / design pass — see
  REPORT.md §Where to look next.
- The importance slider on a theme axis (Design B item 6). Subsumed
  by the "starred pick" mechanic in v1.
- Claim/anonymise/delete UX (per PROPOSED 7 above).
- Multi-partner ghost profiles (one registered user describing two
  housemates). v1 is single-ghost.
- Cross-medium-mode UX hooks for anime+TV-divergent ghosts
  (`raw/spouse-partner-modeling.md` §4 cross-medium bridge work).
- Live ghost A/B experiments (held until Layers 1 and 2 pass).

---

## TICKETS, IN ORDER

### TICKET 1 — `HM2C-?` ghost-profile eval-harness ablation

**Scope:** `packages/ml/src/eval/` additions. Estimated size: 1 day. No
new dependencies. **Must ship and pass before TICKET 2 lands.**

#### Stop-and-ask gates this ticket trips (per CLAUDE.md §4)

- **Touching the recommendation engine boundary (`packages/ml/*`):**
  YES. New fixtures + new harness function in `packages/ml/src/eval/`.
- **Tests use Approach B (sub-agent isolation, per CLAUDE.md §8.1):**
  YES — mandatory for `packages/ml/*`.

#### Files to add

| Path | Action |
|---|---|
| `packages/ml/src/eval/ghost-profile-fixtures.ts` | NEW — paired `withGhost` / `withoutGhost` scenarios per ghost shape (Design A subset, Design C full). |
| `packages/ml/src/eval/ghost-profile-fixtures.test.ts` | NEW — Approach B (sub-agent isolated). |
| `packages/ml/src/eval/harness.ts` | EDIT — add `ghostAblation(scenarioPair, params, limit) → {withGhost, withoutGhost, delta}` mirroring the shape of `signalAblation` proposed in the cold-start HANDOFF. |
| `packages/ml/src/eval/metrics.ts` | EDIT — add `ghostHappyRate` (proportion of top-N where ghost member's normalised score ≥ 0.6) and `coverageDelta` (does the ghost expand or contract the recommendable surface). |
| `packages/ml/src/eval/eval-harness.test.ts` | EDIT — add regression test: a vanilla "compatible couple" ghost scenario must produce non-negative `coldStartQuality` delta vs the no-ghost baseline. |

#### Fixtures to add

- `SCENARIO_GHOST_COMPATIBLE_COUPLE` — registered user + ghost; both
  taste-vectors lean prestige-drama. Ghost has 3 vibe picks +
  dealbreaker "no horror" + 2 pair-picks favouring "True Detective"
  over "Brooklyn Nine-Nine".
- `SCENARIO_GHOST_DIVERGENT_COUPLE` — registered user picks
  anime-leaning anchors; ghost has dealbreaker "no animated" + vibe
  picks favouring live-action drama. Tests the dealbreaker
  candidate-set exclusion path.
- `SCENARIO_GHOST_COLD_START_COUPLE` — registered user with minimal
  anchor history (≤ 2); the ghost is the dominant signal source. Tests
  the reduced-confidence ghost member treatment (veto-threshold
  override).
- `SCENARIO_GHOST_BRIDGEABLE_COUPLE` — registered user is anime-only;
  ghost has 3 TMDB-genre vibe picks; theme membership has bridges.
  Tests cross-medium scoring via the existing
  `sharedBridgeThemes` surface in `packages/ml/src/explain.ts`.

#### Headline metric (reused from cold-start research §3)

```
coldStartQuality = 0.5×meanScore + 0.3×(allHappyCount/topN)
                 + 0.2×min(themeDiversity/5, 1)
```

Two ghost-specific eval-only metrics:

- `ghostHappyRate` — proportion of top-N items where the ghost's
  normalised score ≥ 0.6 (lower bar than registered user's 0.7 because
  the ghost is reduced-confidence by design)
- `coverageDelta` — `topN_with_ghost / topN_no_ghost`. < 1.0 means the
  ghost is excluding candidates; > 1.0 means it's expanding by
  cross-medium bridging.

#### Decision gate

Per REPORT.md §Q3.4:

> `coldStartQuality_with_ghost ≥ coldStartQuality_no_ghost + 0.05`
> across all 4 ghost scenarios; **no scenario regresses by > 0.02.**

If the gate fails, the design parameters
(veto-threshold-for-ghost, lambda-adjustment-for-ghost, pair-pick weight)
must be swept until they pass, OR the design reduces to Design A
(no pair-picks).

**Why this ticket first:** the literature is unanimous that interview
battery design is the load-bearing UX work. We need to know the
ablation numbers BEFORE we ask users to fill in the battery — otherwise
we ship a UX that doesn't move recs.

---

### TICKET 2 — `HM2C-?` within-user ghost-battery pilot harness

**Scope:** Ask existing personal-rec users the ghost-profile battery
**about themselves**, measure how well the elicited profile reproduces
their actual personal recs. **Layer 2 from REPORT.md §Q3.4.** Estimated
size: 1–2 days.

#### Stop-and-ask gates this ticket trips

- **Processing user data without an explicit user action** (per
  CLAUDE.md §4): NO — explicit user action (filling in the survey)
  triggers everything. But this is at the boundary; confirm with Wouter
  that "in-app survey targeting existing users for a research pilot"
  counts as explicit.
- **Adding a new persisted user preference**: NO — pilot data is
  research-scoped, kept in a separate `ghost_pilot_responses` table
  excluded from the user's profile and from analytics fusion.

#### Files to add / edit

| Path | Action |
|---|---|
| `apps/web/src/app/pilots/ghost-battery/page.tsx` | NEW — opt-in pilot landing, links from /settings. |
| `apps/web/src/components/ghost-battery-form.tsx` | NEW — the actual battery component (will be reused for the partner-facing surface in TICKET 3 if pilot passes). |
| `apps/web/src/server/routers/pilots.ts` | NEW — tRPC procedure `submitGhostBattery` that stores response + computes the elicited `UserTasteVector`. |
| `apps/web/src/server/schema/pilots.ts` | NEW — `ghost_pilot_responses` table (PII-isolated, no FK to `users` beyond the userId for analysis, hard-deleted on user delete). |
| `packages/ml/src/eval/ghost-pilot-metrics.ts` | NEW — `recallAtK(elicitedRecs, actualPersonalRecs, k)` for the pilot's headline metric. |

#### Decision gate

Per REPORT.md §Q3.4:

> recall@10 against the user's actual personal recs ≥ 0.40 across
> ≥ 10 testers.

If the gate fails, the battery itself isn't extracting the right signal
and the design needs to be revised before any partner-facing UX ships.
This is the cheapest place to catch a fundamental design error.

**Why this ticket second:** the within-user pilot is the only validation
that's both GDPR-clean (users answer about themselves, full consent) and
scientifically informative. If a user can't reproduce their own personal
recs by answering the ghost battery about themselves, we have no
business deploying it against partners.

---

### TICKET 3 — `HM2C-?` ghost-profile schema + UX

**Scope:** the user-facing feature. Schema additions, partner-add flow,
aggregator integration, Article 14 disclosure surface. **Only ships if
TICKET 1 and TICKET 2 both pass their decision gates.** Estimated size:
1–2 weeks.

#### Stop-and-ask gates this ticket trips (per CLAUDE.md §4)

- **Schema migrations on existing tables:** `users`-adjacent — adds
  new `ghost_profiles` table with FK to `users`, not altering existing
  columns. New table is "usually safe" per CLAUDE.md §4 but still
  flag.
- **Changing consent / deletion / privacy-control flows:** YES,
  first-order. Must update:
  - `/account/export` (DSAR Article 15/20) to include the user's
    owned ghost profile(s)
  - `/account/delete` (Article 17) — cascade hard-delete ghost
    profiles on user delete (FK ON DELETE CASCADE)
  - New `/privacy/about-your-partner-profile` page (the Article 14
    notice for the partner)
  - New `/privacy/delete-non-user` self-serve flow for partners who
    want erasure without ever registering
  - Privacy policy update: ghost-profile feature, legitimate-interests
    basis, retention, recipients, rights
  - ADR-0012 amendment OR new ADR for the ghost-profile feature
    (departs from ADR-0012's "anonymise behavioural signal" pattern
    on user-delete — ghost profile must be hard-deleted, not
    anonymised)
- **Touching the recommendation engine boundary:** YES — aggregator
  consumes the ghost as a `GroupMember` with a new `confidenceLevel`
  flag. Must document the ghost-member parameter adjustments
  (veto-threshold override, lambda halving) in the ADR.
- **Adding a new persisted user preference:** YES — confirm scope
  before coding.
- **Adding new external ingress:** NO. No new webhooks.
- **Adding new top-level directory:** NO.

#### Schema deltas

```sql
-- apps/web/drizzle/migrations/NNNN_add_ghost_profiles.sql

CREATE TYPE ghost_profile_dealbreaker AS ENUM (
  'no_horror', 'no_gore', 'no_slow_burn', 'no_animated',
  'no_subtitles', 'no_real_life_crime', 'no_period_drama', 'no_anime'
);

CREATE TABLE ghost_profiles (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name          text,
  vibe_picks            text[] NOT NULL,
  starred_pick          text,
  dealbreaker_ids       ghost_profile_dealbreaker[] NOT NULL DEFAULT '{}',
  polarizing_pair_picks jsonb NOT NULL DEFAULT '[]',
  notice_sent_at        timestamptz NOT NULL,
  last_used_at          timestamptz NOT NULL DEFAULT now(),
  expires_at            timestamptz NOT NULL DEFAULT (now() + INTERVAL '90 days'),
  created_at            timestamptz NOT NULL DEFAULT now(),

  -- Length and allowlist constraints
  CHECK (cardinality(vibe_picks) BETWEEN 1 AND 5),
  CHECK (cardinality(dealbreaker_ids) BETWEEN 0 AND 2),
  CHECK (jsonb_array_length(polarizing_pair_picks) <= 2)
);

CREATE INDEX ghost_profiles_owner ON ghost_profiles(owner_user_id);
CREATE INDEX ghost_profiles_expires ON ghost_profiles(expires_at)
  WHERE expires_at < now();  -- partial index for the cleanup job

-- Static reference tables (populated by seed migration):

CREATE TABLE ghost_profile_vibe_tiles (
  id          text PRIMARY KEY,
  display     text NOT NULL,
  tag_ids     text[] NOT NULL,             -- which tags expand from this tile
  poster_url  text NOT NULL                -- visual exemplar
);

CREATE TABLE ghost_profile_polarizing_pairs (
  id              text PRIMARY KEY,
  left_title_id   uuid NOT NULL REFERENCES titles(id),
  right_title_id  uuid NOT NULL REFERENCES titles(id),
  axis            text NOT NULL,           -- the latent axis being probed
  axis_left_tags  text[] NOT NULL,
  axis_right_tags text[] NOT NULL
);
```

**Allowlist enforcement at the application layer.** The
`vibe_picks` text[] doesn't have a database CHECK constraint because
the curated list is in code, not in SQL. Use a Zod schema in
`packages/shared/src/schemas/ghost-profile.ts` that's enforced in the
tRPC mutation. Same pattern for `polarizing_pair_picks` ids.

Drizzle schema update in `apps/web/src/server/schema/ghost-profiles.ts`:
new file, mirrors the SQL above with `pgEnum`, `pgTable`, etc.

#### Components to add / edit

| Path | Action |
|---|---|
| `apps/web/src/server/schema/ghost-profiles.ts` | NEW |
| `apps/web/src/server/schema/users.ts` | NO CHANGE (FK is in ghost_profiles table only) |
| `apps/web/src/server/routers/ghosts.ts` | NEW — tRPC procedures: `create`, `update`, `delete`, `list` (per-owner) |
| `apps/web/src/server/routers/groups.ts` | EDIT — recompute group recs when a member's ghost profile is created/updated/deleted; surface ghost as a pseudo-member in the recs payload for the UX transparency layer |
| `apps/web/src/components/ghost-battery-form.tsx` | REUSE from TICKET 2 |
| `apps/web/src/components/add-ghost-cta.tsx` | NEW — the "Add a partner" CTA on the /groups/[id] page |
| `apps/web/src/app/groups/[id]/page.tsx` | EDIT — render ghost-member pill in the per-card transparency layer; surface "Tell us about your partner" CTA when group has only one member |
| `apps/web/src/app/privacy/about-your-partner-profile/page.tsx` | NEW — Article 14 notice for the partner |
| `apps/web/src/app/privacy/delete-non-user/page.tsx` | NEW — partner self-serve deletion |
| `apps/web/src/app/account/export/route.ts` | EDIT — include owned ghost profiles in DSAR payload |
| `apps/web/src/inngest/cleanup-expired-ghosts.ts` | NEW — daily job: `DELETE FROM ghost_profiles WHERE expires_at < now()` |
| `packages/ml/src/recommendation.ts` | EDIT — `GroupMember` gains optional `confidenceLevel: 'full' \| 'ghost'`; aggregator uses `confidenceLevel === 'ghost'` to relax veto threshold (proposed 0.3 vs 0.5) and halve disagreement-penalty contribution |
| `packages/ml/src/explain.ts` | EDIT — `RecExplanation` surface includes a "your partner probably likes X based on what you told us about [vibe]" string per-card when the ghost is a contributing member |
| `docs/decisions/0026-ghost-profile.md` | NEW ADR — captures the design choice, legal basis, retention default, aggregator-parameter adjustments |

#### Partner-add flow (Design C)

```
[on /groups/[id] when caller is owner AND group.members.length === 1]
      ↓
[Add a partner CTA]
      ↓
ghost-battery-form  (the same component from TICKET 2)
  ├─ Step 1: Vibe picker (3-tile minimum, counter, "Done" at 3, starring optional)
  ├─ Step 2: Dealbreaker chips ("Anything they'd refuse to watch?")
  └─ Step 3: Two pair-pick questions, fast-tap
      ↓
[Article 14 confirmation checkbox + Submit]
      ↓
tRPC ghosts.create → DB row → fire-and-forward recompute group recs
      ↓
Back to /groups/[id] — ghost member visible in the transparency pills,
recs rerendered.
```

#### Framing language (copy)

| Surface | Copy |
|---|---|
| Add-partner CTA | "Add a partner — 30 seconds, no account needed for them." |
| Battery intro | "Tell us about your partner so we can suggest things you'll both enjoy. We'll only use this to recommend within this group." |
| Picker headline | "Pick 3 vibes your partner is into. We'll show you couple-friendly picks based on this." |
| Importance prompt | "Tap one they especially love — we'll weight it heavier." |
| Dealbreaker chips | "Anything they'd refuse to watch?" |
| Pair-pick 1 | "Quick test — would your partner pick A or B?" |
| Article 14 confirm | "I confirm my partner knows I'm using HelpME2C to find things for us to watch. [See what we collect about them]" — checkbox-required to submit. |
| Per-card explanation | "Recommended because [you both like / your partner probably likes] X" — extends existing `sharedDirectTags`/`sharedBridgeThemes` |

#### Aggregator integration details

Per REPORT.md §Q3:

- `GroupMember.confidenceLevel = 'ghost'` triggers two parameter
  adjustments in `recommendForGroup`:
  - **Veto threshold for ghost member** = `params.vetoThreshold × 0.6`
    (so default 0.5 → ghost-effective 0.3). Implements
    "limited-transfer" — ghost shouldn't single-handedly veto a
    candidate based on partial/stated preference.
  - **Disagreement penalty contribution from ghost** is halved
    relative to a full member (the ghost member contributes
    `0.5 × variance` to the stddev calculation, not full variance).
- The ghost member's `UserTasteVector` is built deterministically
  from the elicited inputs by a new pure function
  `buildGhostTasteVector(input, vibeTileTable, pairTable)` in
  `packages/ml/src/ghost-profile.ts`. Unit tests use Approach B per
  CLAUDE.md §8.1.
- The dealbreaker chips generate a `forbiddenTagSet: Set<string>` that
  is applied **as a candidate-set filter before scoring** — not as a
  per-user veto. Rationale: a "no horror" dealbreaker should remove
  horror titles from the candidate set entirely, not show them and
  then per-user-normalise them out (which would mean the
  registered user's horror-tagged anchor points still pull the score
  before the dealbreaker bites).

#### What's deliberately NOT in this ticket

- Claim/anonymise/delete-on-register flow (PROPOSED 7 — deferred).
- The relationship-anchored session-prompt ("What's the vibe tonight?")
  — separate research and design pass.
- Multi-ghost (one user describing several housemates) — v1 is
  one-ghost-per-group.
- Cross-medium-mode UX hooks specifically tuned for anime+TV-divergent
  ghosts — falls out of the existing `sharedBridgeThemes` work; v1
  uses the existing surface unchanged.

---

## SCHEMA DELTAS (consolidated)

| Table | Action |
|---|---|
| `ghost_profiles` | NEW — primary feature table |
| `ghost_profile_vibe_tiles` | NEW — seed-populated reference |
| `ghost_profile_polarizing_pairs` | NEW — seed-populated reference, daily Inngest job to refresh from the existing registered-user corpus |
| `ghost_pilot_responses` | NEW (TICKET 2) — research-only, isolated from analytics, hard-deleted on user delete |

No changes to existing tables. Cascade-delete from `users` is wired
via FK ON DELETE CASCADE on `ghost_profiles.owner_user_id`.

---

## EVAL HARNESS DELTAS (consolidated)

- New file: `packages/ml/src/eval/ghost-profile-fixtures.ts` (TICKET 1)
- Two new harness functions: `ghostAblation`, `ghostHappyRate`,
  `coverageDelta`
- One new pilot-metric helper:
  `packages/ml/src/eval/ghost-pilot-metrics.ts` (TICKET 2) with
  `recallAtK`
- Two new regression tests added to `eval-harness.test.ts`

No changes to existing fixtures, metrics, or types.

---

## EVAL THRESHOLDS (decision gates)

| Layer | Gate |
|---|---|
| **Layer 1: Offline ablation** (TICKET 1) | `coldStartQuality_with_ghost ≥ coldStartQuality_no_ghost + 0.05` across all 4 ghost scenarios; no scenario regresses by > 0.02. |
| **Layer 2: Within-user pilot** (TICKET 2) | recall@10 against the user's actual personal recs ≥ 0.40 across ≥ 10 testers. |
| **Layer 3: Live n=10 with real ghosts** (post-TICKET 3) | Couples' self-reported quality on top-10 group recs ≥ 4.0/5, AND partner-add flow completion ≥ 70%. |

TICKET 2 only proceeds if TICKET 1 passes. TICKET 3 only proceeds if
TICKETs 1 and 2 both pass. If any layer fails: revise the design and
re-test, or reduce to Design A (drop pair-picks).

---

## EVIDENCE INDEX

If the implementing session needs to back up a decision, the evidence
is here:

| Question | File |
|---|---|
| Why 5–8 questions is the sweet spot? | `raw/interview-elicitation.md` |
| Why visual topic-picker for the vibe step? | `raw/pinterest-interests.md` |
| Why a dealbreaker chip — negative preferences? | `raw/dating-app-question-batteries.md` §8 (Jonason 2015), §9 lesson 2 |
| Why polarizing-pair-picks — pair-as-binary-search? | `raw/interview-elicitation.md` §3.4 (Sepliarskaia SPQ), §4 (Christakopoulou 25% lift) |
| Why an "importance" star instead of slider? | `raw/dating-app-question-batteries.md` §3 (OkCupid importance-weights), §9 lesson 5 |
| Why legitimate interests, not consent? | `raw/gdpr-non-user-data.md` §2 (EDPB Guidelines 05/2020) |
| Why Article 14 routed via the registered user? | `raw/gdpr-non-user-data.md` §5 (14(5)(b) read restrictively) |
| Why hard-delete on user-delete (departs from ADR-0012 anonymisation)? | `raw/gdpr-non-user-data.md` §6 (consent chain collapse) |
| Why bounded scope / special-category allowlist? | `raw/gdpr-non-user-data.md` §9 (OT v Vyriausioji C-184/20) |
| Why session-anchored, not persistent? | `raw/household-ctv-extra-members.md` §5 (Sun et al. 2017 co-watching) |
| Why per-profile-no-fusion is the industry default we're consciously breaking? | `raw/household-ctv-extra-members.md` §2 |
| Why limited transfer (only elicited specifics, not A's full vector)? | `raw/cold-start-cross-user-transfer.md` §5 (negative transfer / echo chamber / identification risk) |
| Why no stereotype bundling, every fact independent? | `raw/rich-stereotypes.md` §5–6 |
| Why no demographic questions about the partner? | `raw/pazzani-demographic.md` §5–6 (BlurMe; Sweeney's 87%) |
| Why interview battery is the moat-relevant work, not the inference math? | `raw/felfernig-knowledge-based.md` §5–6; `raw/interview-elicitation.md` §6 |
| Why the absence of competitors is itself a finding? | `raw/describe-a-non-user-industry.md` §6 |

---

## NO-FLY ZONE — DO NOT RE-DECIDE

These were considered and explicitly ruled out in the research run.
If the implementing session is tempted to add any of these, push back
and reference the raw file before re-opening the question.

| Don't add | Why not | Evidence |
|---|---|---|
| Demographic questions about the partner (age, gender, region) | Demographics are latent in ratings (BlurMe 80%); they amplify bias not signal; Sweeney 87% identification risk for a non-consenting subject | `raw/pazzani-demographic.md` §5–6, §7 |
| Free-text "describe your partner's taste" field | Cannot enforce special-category allowlist; aspirational-lie drift; CMB ethnicity-algorithm story | `raw/dating-app-question-batteries.md` §5 (CMB); REPORT.md §Q3.1 open question 3 |
| Stereotype bundling ("X-vibe partner also likes Y, Z, W") | Retraction asymmetry; bias amplification; the Spotify gender-amplification line | `raw/rich-stereotypes.md` §5 |
| Copy A's whole taste vector to B as prior | Negative transfer + echo chamber + identification risk per the cross-user transfer literature | `raw/cold-start-cross-user-transfer.md` §5 |
| Use A's behavioural data to infer B's profile | Same as above + GDPR cannot be defended (we'd be processing data about B with no source from B at all) | `raw/gdpr-non-user-data.md` §2 |
| Special-category preference axes (religion, politics, sexual orientation) | Article 9 + CMB lesson + OT v Vyriausioji on inferred special-category data | `raw/gdpr-non-user-data.md` §9 |
| Persistent shadow profile (no expiry) | Sun et al. co-watching paper: value is in the decision moment, not the archive; legal posture relies on time-bounded retention | `raw/household-ctv-extra-members.md` §5 |
| Anonymised retention of ghost profile on registered-user delete (the ADR-0012 pattern) | Consent / legitimate-interest chain collapses when the user leaves; nothing to anonymise toward | `raw/gdpr-non-user-data.md` §6 |
| Letting the ghost member single-handedly veto candidates with default thresholds | The ghost is reduced-confidence by construction; veto threshold must be relaxed | REPORT.md §Q3 architectural shape; `raw/cold-start-cross-user-transfer.md` §6 |
| Asking 10+ questions | Survey fatigue knee is 3–5; the sweet spot for in-app is 4–5 / for elicitation literature is 5–8; Match-shaped batteries fail completion | `raw/interview-elicitation.md` §5.1; `raw/dating-app-question-batteries.md` §8 |
| Surfacing the ghost profile output to the partner in literal form (if they later visit) | Impression-management risk from `raw/interview-elicitation.md` §5.5; let them claim/anonymise/delete, don't show them their registered-user's view of them | REPORT.md §Q3.4 |

---

## OPEN QUESTIONS for the implementing session

1. **The 90-day retention default.** Picked without an empirical
   anchor. 60/30/180-day calibration conversation needed with Wouter.
2. **Whether to ship claim-on-register UX with v1 or defer.** The
   schema supports it. Argument for shipping: not offering control to
   a partner who registers is a UX failure. Argument for deferring: v1
   user base is unlikely to surface this case for months. Wouter's call.
3. **Curated dealbreaker chip list — final vocabulary.** REPORT.md
   §Q3 design A proposes 8 chips: `no_horror`, `no_gore`,
   `no_slow_burn`, `no_animated`, `no_subtitles`,
   `no_real_life_crime`, `no_period_drama`, `no_anime`. The list
   should be reviewed by Wouter against the existing tag taxonomy and
   the special-category allowlist before TICKET 3 schema lands.
4. **Vibe tile pool composition.** REPORT.md §Q3 proposes
   pre-computing theme-separability against the existing registered-
   user corpus and picking the top-30-to-60 themes. The actual list
   needs a separate small offline run before TICKET 3 ships — it's a
   one-time data exercise but visible to users.
5. **Polarising-pair pool source.** Same — pre-compute the top-50
   information-gain pairs offline from the existing registered-user
   corpus. Separate Inngest job, daily refresh.
6. **Test coverage strategy for `packages/ml/src/ghost-profile.ts`.**
   Per CLAUDE.md §8.1, anything in `packages/ml/*` is Approach B
   (sub-agent isolation). Plan for spawning the test-writing sub-agent
   with *only* the spec, not the implementation file.
7. **ADR-0026 (ghost profile) vs amendment to ADR-0012.** This is a
   first-class architectural decision (legal basis, retention default,
   aggregator-parameter adjustments) — argues for its own ADR. Confirm
   with Wouter before drafting.
8. **The Article 14 notice page content.** A short, clear page at
   `/privacy/about-your-partner-profile` is operationally load-bearing
   for the LIA balancing test. Worth a short content-design research
   pass before drafting copy.

---

## DELIVERABLE-LEVEL ACCEPTANCE CRITERIA

For a "ship it" call on the full ghost-profile feature (post all 3
tickets):

- [ ] TICKET 1 eval-harness ablation passes
      (`coldStartQuality` delta ≥ 0.05, no regression > 0.02)
- [ ] TICKET 2 within-user pilot passes
      (recall@10 ≥ 0.40 across ≥ 10 testers)
- [ ] TICKET 3 `ghost_profiles` table migrated, no rollback needed
- [ ] `/groups/[id]` shows "Add a partner" CTA on single-member groups
- [ ] Ghost battery flow completes in under 90s for the median user
- [ ] Article 14 checkbox is required to submit; the linked notice
      page is live
- [ ] `/account/export` includes the user's owned ghost profile(s) in
      DSAR payload
- [ ] `/account/delete` hard-deletes owned ghost profiles (FK cascade
      verified)
- [ ] `/privacy/delete-non-user` flow is documented and accessible
- [ ] 90-day-inactive cleanup Inngest job runs and is observed in logs
- [ ] Vibe tile pool + polarising-pair pool are seed-populated
- [ ] ADR-0026 (or ADR-0012 amendment) is committed
- [ ] Privacy policy text reflects the feature
- [ ] 10-couple live panel: self-reported 4/5 quality on top-10 group
      recs + ≥ 70% partner-add completion (PROJECT.md success metric +
      partner-add flow gate)

---

_End of HANDOFF. Implementing session: load this file + the relevant
raw evidence file(s) + the file(s) you're about to edit. Skip the
~75 KB full REPORT.md unless you need it._

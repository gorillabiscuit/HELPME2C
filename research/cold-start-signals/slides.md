---
theme: default
title: Cold-start signals for HelpME2C
info: |
  ## Cold-start signals for HelpME2C
  Research report — what to ask new users, and what not to.

  Authored 2026-05-17. Full report at
  research/cold-start-signals/REPORT.md.
class: text-center
highlighter: shiki
lineNumbers: false
drawings:
  persist: false
transition: slide-left
mdc: true
---

# Cold-start signals

What to ask a new HelpME2C user — and what *not* to.

<div class="pt-12">
  <span class="px-2 py-1 rounded cursor-pointer text-sm" hover:bg="white op-10">
    Research run · 2026-05-17 · Wouter
  </span>
</div>

---

# The problem

A new user gives us nothing.

12 candidate onboarding signals were on the table. The job:

- Which ones **materially** improve recommendation quality?
- Which ones can we **derive** from what we already collect?
- Which ones are **data-hoarding** under privacy-by-default?

The cold-start success metric is fixed in PROJECT.md:

> A new user with 5–10 onboarding likes gets recommendations they
> consider non-trivially relevant (**4/5 quality rating from ≥10 testers**).

---

# The bar

Three constraints, in tension.

| Constraint | Source |
|---|---|
| **GDPR floor** — opt-in, "why we're asking" affordance | ADR-0012 |
| **Privacy-by-default** — "materially improves rec quality", not "might be useful" | CLAUDE.md §3 |
| **Rule-based scoring only in 1A** — every signal needs a deterministic path into `packages/ml/src/recommendation.ts` | CLAUDE.md, PROJECT.md |

If a signal can't make it through all three filters, it doesn't get
asked.

---

# TL;DR — the verdict

<div class="text-sm">

| Signal | Asked today? | Tier |
|---|---|---|
| **Anchor picks** (count) | yes ("5 or 6") | **MUST** — reshape to 3 / 5 / 10 |
| **Household composition** | no | **MUST** — add |
| **Streaming providers** | yes, late | **MUST** — move to onboarding |
| **Country** (vs `eu`/`row`) | no (binary region only) | **SHOULD** — IP-default |
| Prior medium exposure | no | NICE-TO-HAVE — derive from picks |
| Birth date as a feature | no | DON'T-ASK |
| Specific city | no | DON'T-ASK |
| Gender | no | DON'T-ASK |
| Mood / context at signup | no | DON'T-ASK |
| Watch pace (hrs/week) | no | DON'T-ASK |
| Medium balance % | no | DON'T-ASK |
| Free-text "tonight" mood | no | DON'T-ASK |

</div>

**4 ASKs. 7 DON'Ts. 1 maybe.**

---
layout: section
---

# The 4 that earned a seat

---

# Anchor picks — reshape

The signal is non-negotiable. The **number** is the design decision.

<div class="grid grid-cols-2 gap-4">
<div>

**Industry consensus:**
- Netflix: **3** (and *optional*)
- Spotify: **3+** (no cap)
- Letterboxd: **4** pinned
- Pinterest: **5**

**Literature:**
- Steep gain 0→3
- Meaningful 3→7
- Flat after ~10
  *(Rashid 2002, Cremonesi 2012)*

</div>
<div>

**Drop-off (Userpilot 2025):**
- 3 steps → 62% completion
- 4 steps → 53%
- 5+ steps → **44%**

**Recommendation:**
- 3 minimum
- 5 target
- 10 cap
- "Show me my recs" CTA from pick 3

**Current "5 or 6 is plenty"** sets the floor *slightly* too high.

</div>
</div>

---

# Household composition — ADD

Couch co-watching is the *primary* archetype.

<div class="text-sm">

- **~80%** of CTV viewing is shared (MNTN Research 2024)
- Partner = top co-viewer at **59%**, kids at 41% (IAB)
- Co-viewing preferences **cannot be recovered** by averaging individual signal — Google Research, "Challenges on the Journey to Co-Watching YouTube"

Netflix's profile architecture exists *because* household-signal
contamination is a measurable failure mode.

**One radio:** Just me / With a partner / With family or kids / With housemates.

**Routes deterministically into three group-aggregation strategies
already shipped in the codebase** (`family-with-constraint`,
average-with-floor, solo).

</div>

Without this signal, the engine has no principled way to choose.

---

# Streaming providers — MOVE EARLIER

An unwatchable rec is a 1/5 rating, not a missing one.

<div class="grid grid-cols-2 gap-4">
<div>

**Competing products put it in onboarding:**
- JustWatch — "My Services" filter, primary affordance
- Reelgood — "Check each service you have access to" at signup

**Median household:**
- ~4 services (MNTN)
- ~5 for Gen-Z/millennial (Deloitte 2025)
- 52% of millennials cancel an SVOD in any 6-month window

</div>
<div>

**Implementation:**
- Region-aware top-N picker (6–8 logos)
- "Show more" → search the long tail
- Hard filter for main list
- Soft "Rent or buy" tail

**No ML.** Joins post-scoring with TMDB watch-provider data.

</div>
</div>

PROJECT.md already names this filter as in-scope. Question was
placement, not whether.

---

# Country — upgrade `eu`/`row` to ISO

The current binary is enough for the legal gate. Not enough for
streaming availability.

- TMDB `watch_region` is **mandatory per-country**
- IP-default + one-tap correction = zero-cost UX
- Pinterest's IP-defaulted country lifted activation **5–10%**

<div class="text-yellow-600 text-sm mt-6">

**Important non-finding:** country is a **bad taste prior**.
Netflix's own anime example — "fewer than 10% of people in this
[anime-loving] community are actually in Japan." Country goes into
the **availability filter**, NOT into the theme/tag scorer.

</div>

---
layout: section
---

# The 7 that didn't

---

# DON'T-ASK — and why

<div class="text-sm">

| Signal | Headline reason |
|---|---|
| **Birth date as feature** | Demographics are *predicted by* ratings, not the reverse (Sun et al.). 8–17pp signup drop. No scoring path. ADR-0012 stays. |
| **City** | (age, sex, city) is the canonical k-anonymity quasi-identifier triple. Re-identification risk on a small platform is non-trivial. |
| **Gender** | BlurMe paper: 80%+ already inferable from ratings. Spotify-style stereotype amplification well-documented (arXiv:2501.04420). |
| **Mood at signup** | Session-scoped not user-scoped. Mood captured once is stale in days. Spotify/Mubi collect mood implicitly. |
| **Watch pace** | Self-reported screen time is inaccurate. Derive from anchor-pick runtimes. |
| **Medium balance %** | Reconstructible from anchor-pick distribution. Asking imposes the anime-vs-TV dichotomy HelpME2C exists to dissolve. |
| **Free-text "tonight"** | Without LLM, keyword-matching damages quality. Highest Art. 9 risk (sensitive disclosure). Phase 2 reconsider. |

</div>

---

# The "could go either way"

**Prior medium exposure** ("seen any anime?") — NICE-TO-HAVE.

- Anchor picks reveal it: 0 anime in 5 picks = newcomer
- Crunchyroll, Netflix, AniList don't ask
- Differentiated newcomer experience can ship as a **content surface**,
  not an onboarding question
- Promote to SHOULD-ASK only if user testing shows anime-naive users
  are getting unparseable recs

---
layout: section
---

# Three flow designs

---

# Design A — minimum viable

Ship this week. No country. No nudges. Just the three asks.

```
/sign-up → Clerk
   ↓
/age-check    (unchanged: birth date + eu/row)
   ↓
/onboarding
   ├─ picks       (reshape copy + CTA)
   ├─ household   (NEW, single radio)
   └─ streaming   (MOVED from settings)
   ↓
/
```

**Schema delta:** `users.household` enum.

That's it.

---

# Design B — rich signal

For 1A user testing failing the 4/5 bar.

Design A **plus**:

- Country upgrade (ISO + IP default)
- Diversity nudge after pick 3 if all same TMDB genre
- Pairings partner seed (`household=partner` → ask for 2–3 partner picks)
- Behavioural newcomer detection on first anime title view

---

# Design C — recommended

Design B **minus the Pairings seed**.

<div class="text-sm">

- Establish personal-rec 4/5 before adding partner-seed complexity
- If both ship and testing fails, can't attribute which part broke
- Pairings seed becomes the **lead post-MVP follow-up** if Design C succeeds

**Schema deltas (2):**
- `users.household` enum (default `'solo'`)
- `users.country` ISO-3166-1 alpha-2 (IP-defaulted)

**Estimated user-visible steps:** 4 (age-check → picks → household → streaming → home)

**Estimated time to personalisation:** ~90 seconds

</div>

---
layout: center
---

# Wouter's call (2026-05-17)

<div class="text-2xl mt-6">

**Flow:** Design B minus Pairings seed (≈ Design C)

**Schema:** `users.country` added in parallel to `users.region`

**Ship order:** anchor-count copy reshape **first**, as its own PR

**Pairings:** deferred until personal recs hit 4/5

</div>

---

# Measurability — does a signal earn its keep?

Building on `packages/ml/src/eval/` (the harness already exists).

<div class="grid grid-cols-2 gap-4 text-sm">
<div>

**Hypothesis form:**

> Given `<signal>`, cold-start quality improves by ≥ Δ over the
> no-signal baseline on `<scenarios>`, with `n ≥ 10` testers.

**Holdout:**
- Synthetic — paired `with_signal` / `without_signal` fixtures
- Live — flag-gated A/B, 5+5 testers

</div>
<div>

**Composite metric (bounded `[0,1]`):**

```
coldStartQuality =
  0.5 × meanScore
+ 0.3 × allHappyRate
+ 0.2 × min(themeDiversity/5, 1)
```

**Bar for "keep":**
- Offline: Δ ≥ 0.05, no scenario regresses by > 0.02
- Live: mean rating ≥ 4.0 AND no drop-off cost > 5pp

</div>
</div>

---

# Harness deltas — half a day

A scoped, no-dependencies addition.

```ts
// packages/ml/src/eval/cold-start-fixtures.ts
export const PAIRED_HOUSEHOLD: SignalAblationPair = {
  withSignal:    SCENARIO_DIVERSE_COUPLE_WITH_HOUSEHOLD,
  withoutSignal: SCENARIO_DIVERSE_COUPLE,
}

// packages/ml/src/eval/harness.ts
export function signalAblation(
  pair: SignalAblationPair,
  params: GroupScoreParams,
): { withSignal: EvalMetrics; withoutSignal: EvalMetrics; delta: number }

export function compositeScore(m: EvalMetrics): number
```

**One regression test** asserting non-negative ablation delta becomes
the CI gate against accidental signal regression.

---
layout: section
---

# Recommended minimum-viable flow

---

# The flow, in one slide

```
┌─────────────────────────────────────────────────────────────────────┐
│ Step 0  /age-check    birth date (validated, not stored)            │
│                       country (ISO, IP-defaulted, one-tap correct)  │
│                                                                     │
│ Step 1  /onboarding   "Pick 3 shows you've loved.                   │
│         · picks        The more you pick, the smarter your recs —   │
│                        5 is great, 10 is plenty."                   │
│                       Visible counter. "Done" CTA from pick 3.      │
│                       Soft diversity nudge if all 3 same genre.     │
│                                                                     │
│ Step 2  /onboarding   "How will you mostly watch?"                  │
│         · household   ◯ Just me  ◯ With a partner                   │
│                       ◯ With family or kids  ◯ With housemates      │
│                                                                     │
│ Step 3  /onboarding   "We only recommend things you can             │
│         · streaming    actually watch tonight."                     │
│                       Region-aware top-8 grid + "Show more".        │
│                                                                     │
│ →       /             Personal recs surface                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

# Open questions (human review needed)

1. **`eu`/`row` migration timing** — keep both columns now, derive
   from country later? CLAUDE.md §4 stop-and-ask territory.
2. **Pairings seed deferral** — right call, or are we underestimating
   how much partner-seed accelerates the moat?
3. **IP geolocation source** — header sniffing vs server lookup, given
   we're on Node-only runtime per `apps/web/CLAUDE.md`.

---
layout: center
class: text-center
---

# Done.

<div class="text-base text-gray-400 mt-6">

Full report: `research/cold-start-signals/REPORT.md`
Per-signal evidence: `research/cold-start-signals/raw/`
Implementing-session brief: `research/cold-start-signals/HANDOFF.md`
Run audit: `research/cold-start-signals/RUN_LOG.md`

</div>

<div class="text-xs text-gray-500 mt-12">
Run: 2026-05-17 · Wall-clock ~30 min · 6 sub-agents · ~80 cited sources
</div>

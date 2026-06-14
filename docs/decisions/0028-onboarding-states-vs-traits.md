# ADR-0028 — Onboarding captures durable taste; momentary state lives as live controls

**Status:** Proposed
**Date:** 2026-06-14
**Supersedes:** —
**Related:** ADR-0027 (reason feedback), ADR-0026 (faceted vocabulary), ADR-0020 (group rec strategy)

---

## Context

Reviewing the onboarding flow (the per-show "what made X click / what put you off X" questions and the "How adventurous are you feeling?" novelty slider) surfaced a recurring category error: **the flow freezes momentary, context-dependent state into a one-time persistent profile.**

Two concrete symptoms:

- **The per-show questions skew abstract/literary.** Options like *"the quiet, unspoken love at the heart of it"* or *"left me thinking about power, corruption and systems for days"* are film-critic register, not how a normal viewer experiences or recalls a show. They sit at the level of "why" people have the *least* reliable access to.
- **The novelty slider is in the wrong place.** Whether you want something familiar vs. adventurous is a *mood* — tired-after-work Tuesday vs. up-for-it Saturday night — not a permanent trait. Asking it once, in sign-up, out of context, with no visible effect, captures the wrong thing at the wrong time.

The unifying principle below resolves both.

---

## What we chose

**Governing principle:** Onboarding captures **durable** taste signal — chiefly the affective act (which shows you liked/disliked) and stable preferences. **Momentary / contextual state** (mood, novelty appetite, energy, who you're with) is *not* frozen into the profile during onboarding; it is exposed as **live, reversible controls at the point of use** (the recommendations surface), where the user sets it in-context and sees the effect immediately.

Concrete decisions that follow:

1. **Keep the per-show reason questions, but move the options *down the abstraction ladder.*** Options must describe the **visceral/sensory/affective** experience ("edge of my seat," "it terrified me," "the creature was unforgettable," "made me laugh") — not the **thematic/critic** level. Tighten the `generateInsight` prompt so it stops drifting into review-register for arty titles, and **add the missing spectacle/sensory option type** (the action, the visuals, the craft — the gap also flagged for Facet F in ADR-0027).

2. **Show the title's thumbnail + a playable trailer** on each per-show question. Recognition is more valid when the actual stimulus is present; the trailer re-activates a faded memory before we ask, converting "I don't remember" into real recognition.

3. **Add honest "no reason" escapes, kept distinct from "None of these fit."** Three different non-content answers, each a different signal:

   | Tap | Means | How it's used |
   |---|---|---|
   | "None of these fit" | Our options were wrong | Discovery — taxonomy gap (per ADR-0027) |
   | "I just liked it" / "It just didn't grab me" *(new)* | No reason exists / can't recall | Keep the affective act; **don't generalise** |
   | "I wasn't in the mood" *(dislike only, existing)* | Viewer state, not content | Quarantine — don't touch taste |

   Forcing a reason where none exists is the precise Wilson & Schooler harm; an explicit "I just liked it" is the *higher-quality* answer in that case.

4. **Tier the dislike escapes to avoid choice overload.** The dislike side legitimately needs more non-content outs than the like side (negative signal is more polluted by friction/mood). Show the *sharp* signals as visible options — concrete turn-offs ("too slow," "too dark," "couldn't stand the lead") and the **genre/format veto** ("this kind of show isn't for me," the highest-value scoped negative). Collapse the three non-content escapes (didn't-grab-me / wrong-mood / none-of-these) into one soft "not for me" for scoring purposes — they all resolve to "don't generalise" — keeping finer granularity only if it's free.

5. **Move the novelty / "How adventurous" slider out of onboarding → a live control on the recommendations surface.** Default to "Mixed"; **learn the resting position from where the user leaves the slider** (revealed preference) rather than a one-time question. It is a **re-rank lever over the already-computed candidate set** (familiar ↔ adventurous = a popularity/acclaim axis), ephemeral by default, with the last position remembered only as a starting default.

---

## What we rejected

- **Novelty appetite as a one-time onboarding setting** — freezes a state as a trait, answered out of context, effect invisible to the user.
- **Thematic/critic-level options as the default** — the least introspectively-accessible level, the most confabulation-prone, and the rarest actual viewing mode (eudaimonic/reflective is a minority of sessions).
- **Free-text "why" / forcing a reason** — confabulation (already rejected in ADR-0027).
- **A single undifferentiated "None of these fit" as the only escape** — conflates "options wrong" (discovery), "no reason" (expected), and "wrong mood" (state), which are three different signals.
- **Every dislike escape as its own visible button** — choice overload, defeating the low-friction goal.

---

## Why

- **State vs. trait (Mood Management Theory; Zillmann).** Media selection is dominated by current mood/context. Novelty appetite swings with it; capturing it as a persistent trait is invalid by construction. It belongs at the moment of choosing, against visible results.
- **Confabulation (Nisbett & Wilson 1977; Wilson & Schooler 1991; choice blindness, Johansson 2006).** People can't reliably report *why* they liked something, and forcing the report degrades the signal. Therefore: recognition over generation; allow "I don't know"; treat the affective **act** as the real signal and the "why" as optional gravy.
- **The abstraction ladder.** Visceral/sensory reports ("scared me," "couldn't look away," "the alien was cool") are reliable because they were *felt*; thematic reports are *constructed*. Meet viewers at the felt level.
- **Negativity asymmetry ("bad is stronger than good"; Rozin & Royzman, Baumeister).** Dislikes are often sharper and more articulable than likes — but also more polluted by friction and mood. Hence: capture the sharp dislike vetoes as strong signal, give the vague ones a soft "not for me" home, and provide more escapes on the dislike side than the like side.
- **Live controls.** Agency reduces psychological reactance; a visibly-acting control is legible and builds trust (folk-theories research); and where-they-leave-the-slider is revealed preference, which beats a stated one.
- **North Star.** "What do *we* watch *tonight*" is a per-occasion, two-person negotiation. A live novelty/mood control on the group recs view serves that directly; a frozen per-user profile cannot.

---

## Implementation notes

- **`generateInsight` prompt:** enforce visceral/affective register, ban critic language, add a sensory/spectacle option type. New theme slugs clear the ADR-0026 extraction-validation gate (κ ≥ 0.6).
- **Escapes:** add the two "no reason" options; record which escape in `reason_feedback_events` (ADR-0027) so the three signals stay distinguishable downstream even if collapsed in the UI.
- **Thumbnail + trailer:** reuse the existing trailer-preview component on the per-show question.
- **Novelty slider relocation:** remove the onboarding `novelty` phase and the at-onboarding `saveNovelty` write; surface the slider on the recommendations page as a re-rank lever; persist last position as a *default only*. **Dependency:** the candidate set must carry novelty diversity (both mainstream and deep-cut titles) or the lever does nothing.
- **§4:** touches the onboarding flow, the recommendations surface, and `generateInsight` (engine-adjacent) — needs sign-off; ship as separate tracer-bullet slices, not one PR.

---

## What would change our mind

- Live-slider usage is near-zero → people don't want a manual novelty control; rely on auto-learned novelty only.
- "I just liked it" dominates the picks → the per-show "why" has too little content yield to justify; drop it and lean entirely on the like-act + the title's own attributes.
- Thumbnails/trailers don't measurably reduce "none / just-liked" rates → the recognition-grounding hypothesis is weak; reconsider the per-show step.
- Tiered dislike escapes still cause mid-question drop-off → collapse further, or drop the dislike "why" entirely.

---

## Related

- ADR-0027 (reason feedback — this refines the question *content*, adds the "no reason" escapes, and reuses the feedback log)
- ADR-0026 (faceted vocabulary — Facet E "Gratification Profile" is the theoretical home of the novelty/mood axis; Facet F is the spectacle/sensory axis these options need)
- ADR-0020 (group rec strategy — the live novelty/mood control lives on the group recs view too)
- PROJECT.md (North Star)
- CLAUDE.md §4 (stop-and-ask: onboarding flow, rec surface, engine-adjacent prompt)
- [`preference-elicitation-research/report.md`](../../preference-elicitation-research/report.md)

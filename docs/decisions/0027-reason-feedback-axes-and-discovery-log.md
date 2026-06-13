# ADR-0027 — Reason feedback: missing axes, optional free-text capture, and a durable discovery log

**Status:** Accepted
**Date:** 2026-06-13
**Supersedes:** —
**Related:** ADR-0026 (faceted vocabulary), ADR-0012 (deletion/privacy), ADR-0022 (behavioural-signal anonymisation), ADR-0020 (group rec strategy), ADR-0024 (bipolar rating semantics)

---

## Context

The onboarding "what made this click / what put you off" screens ([`preferences.ts`](../../apps/web/src/server/routers/preferences.ts) `generateInsight`) offer LLM-generated reason chips, each bound to a slug in the theme vocabulary. Two recurring failures surfaced in manual testing:

- **Naruto (like mode):** every offered reason was a narrative/emotional theme (`underdog-rise`, `found-family`, `mentor-and-pupil`). There was no way to say "the fights and the power system are what I'm here for." The vocabulary has no action/spectacle/craft axis at all.
- **Real Housewives (dislike mode):** the offered reasons were all introspective content-property critiques. The honest, low-effort reaction — "this is lowbrow reality TV, not my kind of show" — had no home and fell through to "None of these fit," which is discarded.

Both are the same root cause: the vocabulary (even after ADR-0026's five-facet split) is **narrative-theme-centric** and cannot represent (a) spectacle/form as a positive draw or (b) a format/genre-level rejection. Worse, we only found these gaps by eyeballing screenshots — there is **no systematic mechanism** for discovering which axes the taxonomy is missing.

The relevance-gate trace (CLAUDE.md North Star): a taxonomy that cannot represent *why each half of a pair actually watches* (one for the fights, one for the family drama) cannot match them on it — so closing these gaps directly serves "help two people find shows they both want to watch."

---

## What we chose

1. **Add two missing facets to the ADR-0026 model — orthogonal, scored separately, not crammed into Facet A (Topical).**
   - **Facet F — Form / Mode.** Spectacle-driven ↔ story-driven, with action-craft / power-system design as a first-class *positive* draw. A ranked preference signal scored independently of topical themes (a beautifully choreographed fight has no topical equivalent in a prestige drama, which is exactly why it must not be a Topical slug).
   - **Format / genre veto.** "This kind of show just isn't for me" → a **format-scoped down-weight**, structurally a veto like Facet D (a categorical attribute + user veto, not a Topical slug). This is the single highest-value negative we can collect (see Why).

2. **Optional free-text capture, gated behind "None of these fit."** Tapping "None of these fit" (in either like or dislike mode) reveals an **optional** text box. It is never required, never gates progression, and submitting it empty is a valid completion. Its purpose is explicitly threefold — **(a) taxonomy-discovery radar, (b) state-vs-content-vs-friction routing, (c) voice/agency** — and explicitly **not** a trusted per-user preference vector. We harvest the *what* (the named axis the user reached for), never the introspected *why*.

3. **A durable, append-only reason-feedback log.** Every reason-answer event is recorded: title, mode, the question and options shown, the selected slugs *or* the "None of these fit" flag, any optional free text, and a timestamp. This sits **alongside** the existing preference-vector path (`saveInsight`), which stays unchanged. The vector is for scoring; the log is the substrate for evolving the taxonomy. The current design is lossy — `saveInsight` overwrites merged slugs and discards "None of these fit", mood-escape selections, and per-answer context — so there is nothing to learn from today.

---

## What we rejected

- **Spectacle as new Facet-A (Topical) slugs** — pollutes the cross-medium theme-matching moat (PROJECT.md §revenue); ADR-0026 already rejected mixing orthogonal axes into one scoring dimension. Spectacle gets its own facet or nothing.
- **Free text as a trusted preference signal / a required field** — reintroduces the Wilson & Schooler confabulation problem the chip design was built to avoid. The LLM-rec literature (PrefEval, ICLR 2025) quietly *assumes the stated preference is valid* and only tests whether the model tracks it — i.e. it operationalises the validity problem away. We will not bake that assumption into scoring.
- **Always-on free-text box** — adds cognitive load to the common path and invites confabulation on every answer. Gate it behind "None of these fit," where the taxonomy has *demonstrably* failed for that user and the open box is genuinely warranted.
- **Cosmetic free text with no destination** — a box whose contents are dropped. Captures nothing; fails the "log it for improvement" requirement.
- **Status-quo lossy persistence** — vector-only overwrite that discards the raw answer event. Cannot support discovery.

---

## Why

**The (a)/(b) split is the whole rationale for how free text is used.** There were always two distinct objections to free-text "tell us why": (a) the *mapping* problem — converting prose to system features was hard — and (b) the *introspection-validity* problem — the stated reason is confabulated and predicts future taste worse than the affective act (Wilson & Schooler 1991; sharpened by choice-blindness, Johansson et al. 2006). Real-time LLM analysis **dissolves (a) but does nothing for (b)**: an LLM that flawlessly structures a confabulated "why" yields high-fidelity confabulation. So free text is never trusted as a preference signal. But two uses *survive* (b) because they don't require the *why* to be valid — only the *what* to be named: **taxonomy discovery** (the text names a dimension our facets lack — e.g. "the fights," "it's trash reality TV") and **routing** (classify content-dislike vs wrong-mood vs friction). GATE (Li et al., ICLR 2025) corroborates that open elicitation "surfaces considerations users did not anticipate." Our full research read lives in [`preference-elicitation-research/`](../../preference-elicitation-research/report.md).

**The format veto is the strongest negative we can collect.** Mozilla's 2022 audit found item-level "Not interested" stopped ~11% of unwanted recommendations, while *scope-level* "Don't recommend this channel" stopped ~43% — roughly 4× better. A format/genre veto is the TV analogue of that channel-level control: a scoped, highly attributable, low-confabulation signal. Today it has no home and is discarded.

**The free-text box's UX value is real but narrow — claim only the defensible part.** The honest mechanism is the procedural-justice *voice effect* (Lind, Kanfer & Earley 1990): people feel heard and fairly treated when given a chance to express a view, *even when it does not change the outcome*. We do **not** claim it raises onboarding completion (unsupported) or that venting is cathartic (contested). Voice/agency is enough to justify an optional box.

**Logging everything is the substrate, and the discovery loop is the differentiator.** We found the spectacle and format-veto gaps by hand. A logged free-text-on-"None of these fit" stream, analysed offline by an LLM for recurring un-mapped dimensions, turns that into a standing radar for the *next* missing facet. Whether LLM-extracted-free-text signal can ever *beat* the bare affective act on forward satisfaction is, as of this writing, an open empirical question (no head-to-head exists) — so we adopt free text for discovery and voice now, and leave the door open to promote it to a scoring signal only if that experiment later supports it.

---

## Implementation notes

- **Data model.** New append-only `reason_feedback_events` table (or an additive extension of `rec_feedback`): `user_id`, `title_id`, `mode`, `question_shown`, `options_shown` (jsonb), `selected_slugs` (text[]), `none_of_these_fit` (bool), `free_text` (text, nullable), `created_at`. The scoring path (`saveInsight` → `userPreferences.preferences`) is untouched. **Schema migration touches populated tables / adds a table → §4 stop-and-ask + a Neon-branch dry-run when implemented.**
- **UX.** "None of these fit" → reveal an optional `<textarea>` with a "Skip" and a "Done" affordance; empty submit closes cleanly. Never blocks the *N of N* flow. Mirror the existing mood escape-hatch pattern (no slugs).
- **Privacy — ADR-0012 is law here.** Free text is user-generated content that may contain PII: it must be **hard-deleted on account deletion** and **included in the Article 15/20 export**. The offline discovery analysis is **background processing of user data** (§4) → needs its own go-ahead, an aggregate/anonymise step per ADR-0022, and a one-line privacy-notice that feedback may be analysed to improve the service.
- **Extraction validation.** Any new Facet F slug must clear the ADR-0026 gate (two independent Haiku passes, Cohen's κ ≥ 0.6) before shipping. The format/genre attribute is largely derivable from existing TMDB metadata; validate the *veto mapping*, not extraction.

---

## What would change our mind

- A clean head-to-head showing LLM-extracted free-text signal predicts forward satisfaction *better* than the bare like/dislike act → promote free text from discovery-only to a trusted scoring input.
- Free-text volume too low to drive discovery, or too PII-heavy to retain safely → drop the box, keep only the structured "None of these fit" event.
- Facet F extraction κ stays < 0.5 after prompt refinement → it is noise, not signal; drop it (same rule ADR-0026 applies to the tone facets).
- The format veto is rarely used or fully redundant with existing TMDB-genre metadata → fold it into a genre-level veto rather than maintaining a dedicated axis.

---

## Related

- ADR-0026 (faceted vocabulary — this adds Facet F + a format veto to that model)
- ADR-0012 (deletion / DSAR — governs free-text storage)
- ADR-0022 (anonymisation — governs the discovery analysis)
- ADR-0020 (group rec — the veto/least-misery operators these axes feed)
- PROJECT.md (North Star; §revenue moat)
- CLAUDE.md §4 (stop-and-ask: schema + engine boundary + background user-data processing)
- [`preference-elicitation-research/report.md`](../../preference-elicitation-research/report.md)

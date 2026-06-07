# Cold-start signals — research run log

**Run start:** 2026-05-17
**Mode:** autonomous (Wouter away ~3h)
**Operator:** Claude (Opus 4.7, 1M context)
**Output dir:** `research/cold-start-signals/`

---

## Brief (pre-committed)

Research 12 cold-start onboarding signals for HelpME2C. For each:

1. Predictive value for entertainment recommendation (cited)
2. GDPR / consent cost
3. UX / drop-off cost
4. Tier: MUST / SHOULD / NICE / DON'T-ASK

Then produce three onboarding flow designs (A: minimum-viable, B: rich,
C: recommended), and a measurability framework using the existing
`packages/ml/src/eval/` harness.

## Constraints (anchor everything to these)

- **GDPR floor**, opt-in with clear "why we're asking" affordance
- **Privacy-by-default** — bar is "materially improves rec quality",
  not "might be useful"
- **Phase 1A targets 4 archetypes** (PROJECT.md §target users)
- **Cold-start success metric:** 4/5 quality rating from ≥10 testers,
  with 5–10 onboarding likes
- **Rule-based scoring only** in 1A — deterministic logic only
- **Primary archetype:** couch co-watcher (group recs are the moat)

## Context already absorbed (read in this session)

| File | Key takeaway |
|---|---|
| `PROJECT.md` | 4 archetypes; primary is couch co-watcher. Phase 1A is web-only, registered-users-only group recs (no ghost profiles yet). Group rec + cross-medium are the moats. |
| `docs/decisions/0012-privacy-compliance.md` | GDPR floor. Hard-delete PII; anonymise behavioural signal. 3-toggle cookie consent. Age gate: EU 16+, RoW 13+. Region is `eu`/`row` only. |
| `docs/decisions/0022-behavioural-signal-anonymisation.md` | Random-UUID-tagged anonymous_watch_signals on deletion. No rejoin path. |
| `apps/web/src/app/onboarding/page.tsx` | Big comment block names what's been deferred from onboarding: demographics step, multi-bar confidence meter, cross-cluster prompt, genre disambiguation, "refine your taste" swipe mode. |
| `apps/web/src/components/onboarding-flow.tsx` | Current picker: search + 16-popular grid → click to rate 10/10 → "Continue" CTA. ~5–6 picks suggested in copy. |
| `apps/web/src/app/age-check/page.tsx` | Self-declared birth date + binary EU/RoW region; submit → /onboarding. |
| `apps/web/src/app/api/age-verify/route.ts` | Birth date validated against regional threshold; only the **fact** of verification is stored, not the date. Region stored on Clerk publicMetadata. |
| `apps/web/src/server/schema/users.ts` | Columns: `id`, `clerkId`, `displayName`, `region` (`eu`/`row`), `ageVerified`, `ageVerifiedAt`, `defaultPrivacy`, `previewAudioEnabled`, `createdAt`, `updatedAt`. No gender, no country, no household, no anything else. |
| `packages/ml/src/recommendation.ts` | Scoring consumes: `anchor picks` (full positive weight) + `rated titles` (bipolar weight [-1, +1]). Outputs ranked candidates. NO demographic feature in scoring today. Group rec uses Average-Without-Misery + soft disagreement penalty. |
| `packages/ml/src/eval/*` | Eval harness already exists. `parameterSweep` + `evaluateScenario` over 5 synthetic archetype scenarios. Metrics: `topN`, `vetoCount`, `meanScore`, `minScore`, `meanStddev`, `allHappyCount`, `themeDiversity`. ALL_HAPPY_THRESHOLD = 0.7. |

**Key constraint that emerged:** the scoring engine today only consumes
anchor picks + rated titles. ANY new signal we propose collecting must
have a clear, deterministic path into the scoring function — either as
a candidate filter, a re-weighting, or a tie-breaker — or it's
data-hoarding and gets DON'T-ASK by §3 banned-patterns logic.

## Execution plan

### Phase 1 — per-signal research (6 agents × 2 signals each = 12 signals)

Pre-committed batch_size = 4 parallel agents. Wave 1: 4 agents. Wave 2: 2 agents.

| Agent | Signal A | Signal B |
|---|---|---|
| A1 | Birth date (already collected) | Region — EU/RoW (already collected) |
| A2 | Specific country / city | Gender |
| A3 | Household composition (solo/partner/family) | Mood/context at signup (light/dark, slow/fast) |
| A4 | Watch pace (hours/week) | Medium balance preference (% anime vs TV vs film) |
| A5 | Prior genre/medium exposure ("seen any anime before?") | Onboarding anchor count (how many to ask for?) |
| A6 | Streaming providers at onboarding | Free-text "what are you in the mood for tonight" |

Each agent outputs to `raw/<signal-slug>.md`. Format mandated in the
agent prompt. Citations required for every non-obvious claim.

### Phase 2 — synthesis

Once all 12 signal files exist, write `REPORT.md`:

1. Top-level table — signal × tier × one-line reason
2. Per-signal detail — abbreviated from raw files with links
3. Three onboarding flow designs (A minimum-viable, B rich, C recommended)
4. Measurability framework — concrete eval-harness integration
5. Boxed-out "RECOMMENDED MINIMUM-VIABLE ONBOARDING FLOW" — ticket-ready

### Phase 3 — done

Update this RUN_LOG with final state, surface any sub-agent failures, exit.

## Sub-agent failures

_(updated during execution)_

**None.** All 6 sub-agents returned successfully on first invocation.

## Sub-agent timing

| Agent | Signals | Duration | Total tokens |
|---|---|---|---|
| Wave 1 — A1 | Birth date + Region | ~4m42s | 71,315 |
| Wave 1 — A2 | Country/city + Gender | ~4m07s | 76,988 |
| Wave 1 — A3 | Household + Mood | ~4m16s | 75,349 |
| Wave 1 — A4 | Watch pace + Medium balance | ~4m00s | 77,038 |
| Wave 2 — A5 | Prior exposure + Anchor count | ~6m14s | 102,343 |
| Wave 2 — A6 | Streaming providers + Free-text mood | ~4m19s | 69,128 |

Wall-clock total: ~25m for research; ~5m for synthesis. Well under
the 3h budget.

## Findings worth surfacing on hand-back

1. **The "5 or 6 is plenty" copy is mis-shaped.** Industry has
   converged on 3 minimum (Netflix), 5 target (Pinterest). Lowering the
   floor to 3 with a visible "Done" CTA is the single most impactful
   conversion lift available in the current flow.
2. **Streaming providers belongs in onboarding, not settings.** Two
   competing products (JustWatch, Reelgood) already do this. The 4/5
   metric cannot survive a stream of unwatchable recs.
3. **Household composition is the missing primary-archetype signal.**
   The codebase already implements three group-aggregation strategies
   (`family-with-constraint`, average-with-floor, solo); without
   household, the engine cannot choose between them.
4. **Mood-deferral comment discrepancy.** The brief said the mood
   deferral is in the onboarding page comment block; it's actually in
   PROJECT.md line 88. Conclusion unchanged; flagged for accuracy in
   REPORT.md §5.
5. **BlurMe paper is the strongest "don't collect gender" argument.**
   Gender is already 80%+ inferable from ratings — collecting it
   amplifies rather than informs.

## Status

- [x] Context files read
- [x] Plan written (this file)
- [x] Wave 1 agents launched (4 agents, 8 signals)
- [x] Wave 2 agents launched (2 agents, 4 signals)
- [x] All 12 `raw/*.md` files exist
- [x] REPORT.md written
- [x] Final pass complete

## Deliverables

- `research/cold-start-signals/REPORT.md` — 12-signal evaluation,
  three flow designs, measurability framework, boxed minimum-viable
  ticket-ready callout.
- `research/cold-start-signals/raw/*.md` — 12 per-signal evidence files,
  ~1k–1.5k words each, full citations.
- `research/cold-start-signals/RUN_LOG.md` — this file.

**Total output:** ~13 markdown files, ~22k words, ~80 distinct cited
sources. Read-only on the repo; no code modified.

## Run-end timestamp

2026-05-17. Hand back to Wouter.

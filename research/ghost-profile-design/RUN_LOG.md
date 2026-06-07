# Ghost-profile design — research run log

**Started:** 2026-05-17
**Mode:** Autonomous (no human gating)
**Wall-clock budget:** ~3 hours
**Deliverable:** REPORT.md + HANDOFF.md + raw/*.md

---

## Context loaded (read at start)

- `PROJECT.md` — moats #1 (group rec + ghost profile); Phase 1B deferral
- `packages/ml/CLAUDE.md` — package-specific contract; `inferGhostProfile`
  is named as an expected eventual public export
- `packages/ml/src/recommendation.ts` — `recommendForGroup` shape, taste
  vector contract; ghost profile must produce a `UserTasteVector`
  (`Map<tagId, number>`) to plug into the aggregator without surgery
- `packages/ml/src/explain.ts` — `sharedDirectTags` + `sharedBridgeThemes`
  surfaces the per-card explanation; ghost profile needs to feed
  these so the user can see *why* the partner is predicted to like X
- `apps/web/src/server/routers/groups.ts` — current group surface;
  `protectedProcedure` everywhere, `groupMemberships` table is the
  current shape (only registered users)
- `apps/web/src/app/groups/[id]/page.tsx` — current group UX
- `docs/decisions/0012-privacy-compliance.md` — GDPR floor; EU region;
  three-toggle consent; ADR-0012's "anonymise behavioural signal, hard-
  delete PII" is the load-bearing pattern
- `docs/decisions/0020-group-rec-strategy.md` — AWM + soft disagreement
  penalty + UX transparency; the algorithm ghost profile feeds into
- `packages/ml/src/eval/{types,harness}.ts` — the harness ghost-profile
  eval will extend; `signalAblation` shape is already in cold-start
  HANDOFF as the established pattern
- `research/cold-start-signals/REPORT.md` + `HANDOFF.md` — the
  cold-start research; HANDOFF style is the template
- `research/competitive-benchmark/REPORT.md` §gap-group — moat we're
  protecting

---

## Plan

### Phase 1 — Literature + industry research (parallel sub-agents, ~60 min)

Four batches of 2 items each, launched as 4 parallel sub-agents.

| Batch | Items | Output files |
|---|---|---|
| A | (1) Felfernig knowledge-based recsys; (2) Pazzani 1999 demographic + later confirm/contradict | `raw/felfernig-knowledge-based.md`, `raw/pazzani-demographic.md` |
| B | (3) Rich 1979 stereotypes + modern follow-ons; (4) Cold-start cross-user transfer (content-based-only) | `raw/rich-stereotypes.md`, `raw/cold-start-cross-user-transfer.md` |
| C | (5) Spouse/partner modeling in recsys + adjacent dating-app matching; (6) Knowledge-graph / interview-style elicitation in recommenders | `raw/spouse-partner-modeling.md`, `raw/interview-elicitation.md` |
| D | (7) Pinterest interests bootstrapping; (8) Industry "describe your friend/partner/child" precedent (likely null result) | `raw/pinterest-interests.md`, `raw/describe-a-non-user-industry.md` |

### Phase 2 — Privacy + consent framing (one sub-agent, ~30 min)

One sub-agent batch:
- `raw/gdpr-non-user-data.md` — Article 6 legal basis for processing
  data about a non-user described by a user; joint data subject
  pattern; DSAR + deletion implications; ICO/CNIL/EDPB precedents
- `raw/household-ctv-extra-members.md` — Hulu Family / Netflix profiles
  / Amazon Household: how the industry handles the "extra member"
  boundary; what defaults are responsible

### Phase 3 — Dating-app question batteries (one sub-agent, ~25 min)

- `raw/dating-app-question-batteries.md` — Hinge / Bumble / OkCupid /
  Tinder question shapes; what they ask, in what order, with what
  privacy framing; what generalises to a "describe your partner"
  battery

### Phase 4 — Synthesis (no sub-agent, ~45 min)

- Read all `raw/*.md`
- Write `REPORT.md` (Q1, Q2, Q3 + Design A/B/C)
- Write `HANDOFF.md` (Design C, ticket-ready, anchored to cold-start
  HANDOFF style)
- Final pass: every non-obvious claim has a citation

### Failure mode handling

- If a sub-agent fails: log under §failures here; proceed without
  blocking the others.
- If WebSearch returns thin results: the sub-agent escalates to
  WebFetch on specific URLs.
- If a per-source file ends up empty (no public material exists for
  that source): the agent says so explicitly in the file — null results
  are valid findings.

---

## Run log entries (filled as work proceeds)

### 2026-05-17 — Phase 1 launch

Launching 4 parallel sub-agents (batches A-D above). Each batch has
2 items; each item produces one raw/*.md file. Total: 8 files this phase.

### 2026-05-17 — Phase 1 complete

All 4 batches returned in ~5 minutes wall-clock. 8 raw files written:
- `felfernig-knowledge-based.md` (1005 w, 28 citations)
- `pazzani-demographic.md` (1210 w; flagged: Pazzani 1999 PDF was
  paywalled, methodology details sourced from citing surveys + Pazzani's
  UCI page)
- `rich-stereotypes.md` (1233 w, 10 citations)
- `cold-start-cross-user-transfer.md` (1597 w, 16 citations)
- `spouse-partner-modeling.md` (1736 w, ~20 citations)
- `interview-elicitation.md` (1950 w, ~20 citations)
- `pinterest-interests.md` (1153 w, ~20 citations)
- `describe-a-non-user-industry.md` (1259 w, 21 citations)

### 2026-05-17 — Phase 2 and 3 launched in parallel

Phase 2 (privacy + household-CTV) and Phase 3 (dating-app batteries)
have no dependencies on Phase 1 or each other — launched in parallel
rather than sequentially.

### 2026-05-17 — Phase 2 complete

- `gdpr-non-user-data.md` (2984 w, 24 citations) — load-bearing legal
  analysis; legitimate-interests-only as Article 6 basis; household
  exemption protects user not platform (Lindqvist/Buivids); Article 14
  routed via registered user; OT v Vyriausioji on inferred special-
  category data
- `household-ctv-extra-members.md` (2223 w, 25 citations) — industry
  convergence on per-profile-no-fusion; no commercial precedent for
  unconsented non-user profile fusion; Sun et al. CSCW 2017 on
  co-watching as negotiation not fusion

### 2026-05-17 — Phase 3 complete

- `dating-app-question-batteries.md` (3434 w, 39 citations) — bimodal
  industry split (Hinge end vs OkCupid end); 4-5 question sweet spot;
  Jonason 2015 on negative-preference asymmetry; CMB ethnicity
  cautionary tale on Article 9 axes

### 2026-05-17 — Phase 4 (synthesis) complete

Read all 11 raw files. Wrote:
- `REPORT.md` (8583 words; ~67 KB) covering Q1 literature review (9
  sources), Q2 privacy/consent framing (8 sub-questions), Q3 three
  concrete designs A/B/C with full UX/schema/eval treatment.
- `HANDOFF.md` (4023 words; ~30 KB) ticket-ready, anchored to Design C,
  in the style of `research/cold-start-signals/HANDOFF.md`. All
  Wouter-facing decisions flagged as `PROPOSED:` defaults requiring
  sign-off.

### Failures and caveats

- Phase 1 Pazzani file: original 1999 PDF unreachable
  (Springer paywall + nargund.com mirror down); specific accuracy
  numbers not quoted because they couldn't be verified. Methodology
  sourced from citing surveys (Burke 2011 AI Magazine, Frontiers 2024).
- Some raw files (notably dating-app, GDPR, household-CTV) exceeded the
  600-900 word target. Density-justified — these are load-bearing for
  the synthesis. Total raw ≈ 19.8k words, ~250 citations.
- No sub-agent crashed; no item was left unwritten.

### Totals

- 6 sub-agents (4 Phase 1 + 1 Phase 2 + 1 Phase 3) — all completed
  successfully, in parallel
- 11 raw files + REPORT.md + HANDOFF.md + this run log
- Total output ~32,400 words across all deliverables
- ~250 citations across all raw files
- Wall-clock: ~80 minutes start-to-finish (well under the 3-hour
  budget)


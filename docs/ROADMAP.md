# HelpME2C — Phase 1A roadmap

**Status:** living document, refined as we learn
**Last updated:** 2026-05-05

This is the sequenced milestone view of [Phase 1A scope](../PROJECT.md). It captures the build order and dependencies — **not the scope itself**. PROJECT.md remains the cut-line contract: anything outside the IN-scope list there requires explicit negotiation per [CLAUDE.md §4](../CLAUDE.md).

When [Linear](https://linear.app/wouterschreuders/project/helpme2c-996bf32f55cd/overview) is in regular use, individual tickets live there ([ADR-0018](decisions/0018-project-tracker.md)); these milestones become Linear projects or cycles. This file stays as the readable narrative — it complements the tracker, doesn't replace it.

---

## Sequenced milestones

Each milestone is meant to **ship to alpha testers** as it lands — not "complete everything before starting the next." Several can interleave once dependencies are satisfied.

### M1 — Foundation
- Auth (email + Google OAuth per [ADR-0004](decisions/0004-auth-provider.md))
- User profile model
- Observability wiring: Sentry, PostHog, Vercel logs (per [ADR-0010](decisions/0010-observability-stack.md))
- shadcn init + first primitives (per [ADR-0016](decisions/0016-component-library.md))
- Web shell + nav + layout
- Baseline GDPR consent + account-deletion endpoint stub

**Outcome:** logged-in user lands on an empty dashboard.

### M2 — Content database
- Postgres schema for titles + tags + theme taxonomy
- TMDB sync (TV + film) — first
- AniList sync (anime) — second
- Cross-medium taxonomy mapping — third (the moat-building work)
- Background jobs via Inngest (per [ADR-0007](decisions/0007-job-orchestration.md))

**Outcome:** titles are discoverable. Foundation for everything user-facing.
**Note:** largest single milestone; ships in slices (TMDB-only first, small dataset, then expand).

### M3 — Manual tracking
- Add title → list
- Status (Watching / Completed / On Hold / Dropped / Plan to Watch)
- Per-episode progress
- 1-10 rating
- Free-text notes
- Title detail page
- Privacy per list per title (public / friends-only / private)

**Outcome:** user can use HelpME2C as a basic tracker. Validates M2's title data is real.

### M4 — Onboarding (anchor flow)
Captured in detail during the mapping session.
- Demographics (region required, age, gender optional as soft prior)
- Anchor capture: rich search + thumbnail autocomplete + 16-card "Quick picks" grid (70% demographic-weighted + 30% wildcards, varied per visit)
- Multi-bar per-dimension confidence meter
- Cross-cluster prompt after 3 anchors share a tight theme signature
- Genre disambiguation step (skip if anchors are theme-diverse): three-bucket selector (no thanks / sure / love)
- "Refine your taste" swipe mode lives post-onboarding as voluntary entry point

**Outcome:** new user gets first taste vector in ~3 minutes.

### M5 — Personal recommendations (theme-based)
- Tag-overlap scoring blended with user ratings (per [ADR-0008](decisions/0008-ml-inference-approach.md))
- Pre-computed nightly via Inngest
- Cached in Postgres (per [ADR-0013](decisions/0013-recommendation-cache-backend.md))
- "Refine your taste" swipe mode as voluntary engagement on home page

**Outcome:** home page shows ranked personal recs. First piece of the moat is validated.

### M6 — Streaming availability surface
- TMDB watch-providers data integrated into title schema
- "Where to watch" panel on title pages
- User-connected subscriptions (manual checkboxes; no auto-detect)
- Filter recommendations by connected providers
- Architecture accommodates affiliate URL building per [PROJECT.md](../PROJECT.md) revenue model (impl deferred to Phase 1B)

**Outcome:** recs are actionable, not dead ends. Ships before users start showing the app to others.
**Parallelism:** can run partially in parallel with M5.

### M7 — Feedback loop
- Title rating (1-10) → drives taste vector
- Rec rating (terrible / bad / ok / good / terrific) → drives algorithm tuning
- In-app popup on revisit when there's an unrated recently-completed title
- Per-user-private rec ratings by default; opt-in to share

**Outcome:** the system starts learning per user. Foundation for the "system is getting smarter" narrative.
**Note:** email triggers + push notifications explicitly deferred to Phase 1B/2.

### M8 — Group recommendations
The differentiator. Captured in detail during the mapping session.
- Group creation UI + invite-by-link flow
- Persistent groups, multi-group support, named, editable membership
- Hard line on unregistered partner; honest copy "ghost profiles coming next phase"
- Minimal in-group privacy: members see group recs + display name/avatar only
- Group rec algorithm: weighted average with floor constraint (algorithm details pinned during this milestone)
- Per-member breakdown view (desktop) + collapsed mobile-responsive view
- Streaming intersection across members
- Group satisfaction aggregation from M7 feedback signals

**Outcome:** the differentiator ships. Couples can validate it.

### M9 — Import from MAL/AniList
- MAL XML import
- AniList GraphQL import
- Dedup against local title DB
- Progress UI
- Maps imported ratings into the user's taste vector

**Outcome:** power-user archetype can migrate. Tertiary archetype per PROJECT.md, but blocking for that segment.

### M10 — Privacy + GDPR hardening (final pass)
- Data export endpoint (real, working)
- Data deletion endpoint (genuinely deletes within 30 days per [ADR-0012](decisions/0012-privacy-compliance.md))
- Privacy controls per list/title finalized
- Cookie + analytics consent flow (GDPR-compliant)
- Account deletion flow

**Outcome:** GDPR-compliant before any non-friends-tester user lands.

### M11 — Launch readiness
- Performance budgets met per [PROJECT.md](../PROJECT.md) (<800ms title page p95, <500ms personal recs p95, <2s group recs p95)
- Accessibility audit (WCAG 2.1 AA)
- Error states polished
- Empty states polished
- Alpha tester onboarding for first 10-20 testers

**Outcome:** shippable.

---

## Parallelism + dependency notes

- **M1** and **M2** can land mostly in parallel after the first day or two — content DB sync is its own backend stream.
- **M4** onboarding can be built with stub data while **M2** is still ramping up its full sync.
- **M6** streaming can start as soon as **M2** has TMDB watch-providers data; doesn't need to wait for **M5**.
- **M9** import is independent of M5-M8 once **M3** schema is stable.
- **M10** privacy hardening runs as a continuous track from **M1** onwards, finalized before launch.

---

## Explicitly deferred to Phase 1B+

Per [PROJECT.md](../PROJECT.md) cut-line, confirmed during the mapping session:

- Ghost profiles for unregistered group members → 1B
- Mood / context layer on recommendations → 1B
- Daily comparative pairs (on roadmap; needs M5+M7 live first) → 1B
- Behavioral mental-state inference → speculative, Phase 2+ at earliest, may never ship
- Email feedback trigger + transactional email infrastructure → 1B
- React Native mobile app → 2
- Push notifications → 2
- ML model training (rule-based scoring carries 1A) → 2
- Affiliate revenue integration (architecture accommodates) → 1B
- Public API as a product → 3
- Social graph / follows → 1B
- Manga / light novel tracking → out of product scope entirely
- Real-time / WebSocket group sessions → 2 if data shows demand
- Content recommendations from synopsis (NLP/embeddings) → 2

---

## Maintenance

- Refine this file as scope is learned, but PROJECT.md remains the contract.
- When a milestone completes, mark it ✅ and link the relevant Linear cycle.
- When a deferred item moves into 1A, update both this file AND PROJECT.md (per [CLAUDE.md §4](../CLAUDE.md) stop-and-ask).
- Mapping-session details for M4 onboarding and M8 groups are captured inline above; future similar sessions go inline too unless they grow large enough to warrant their own design doc.

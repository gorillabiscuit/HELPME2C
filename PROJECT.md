# HelpME2C — product brief

> **Working name. Possibly placeholder.** "HelpME2C" reads as "help me to see / choose." Final brand naming is a Phase 2+ concern, not Phase 1A.

---

## What this is

A **cross-medium, theme-based recommendation engine** for TV and anime. Matches viewers to shows based on character arcs, narrative tropes, and themes — not flat genre or popularity rankings. Built around two differentiators that no existing platform solves well:

1. **Group recommendations** — find what 2+ people will both enjoy, including when one of them isn't a registered user (ghost profile from demographic + explicit-preference inputs)
2. **Cross-medium taste bridging** — help anime watchers find non-anime shows their non-anime-watching partner will enjoy, and vice versa, through a unified theme-based taxonomy

## What this is NOT

- Not an anime tracker that happens to also track TV. Medium-agnostic from day 1.
- Not a manga / light-novel reading platform. Anime / TV only. We may *display* "the story continues in [novel]" as informational metadata, but no manga progress tracking or recommendations.
- Not a watch-history-only tracker. Tracking is necessary scaffolding; recommendations + group discovery are the value.
- Not a streaming aggregator. We surface streaming availability to make recommendations actionable, but we're not competing with JustWatch — that's table stakes.

---

## The problem

Existing trackers (MyAnimeList, AniList, Simkl, Trakt) solve watch logging well but fail at:

1. **Recommendation quality.** Most rely on weak collaborative-filtering signal (completion + numeric rating) without investing in ML or richer taxonomy.
2. **Group discovery.** No platform solves "what do we watch together tonight."
3. **Cross-medium continuity.** Anime fans bridging into TV (and vice versa) get nothing — taxonomies are mostly siloed.
4. **Cold start.** New users get no value until they've manually built a large list.
5. **Streaming availability inline.** Users have to leave the platform to find where to watch.

The combination of (2) + (3) + theme-based recs is where the product wins.

---

## Target users

Four archetypes, in priority order:

1. **The couch co-watcher.** Watches with a partner or household. Group recommendations are the reason they sign up. Lower medium-specific depth — "what should we watch tonight" is the question. **Primary archetype.**
2. **The anime watcher with a non-anime partner.** Wants to find non-anime shows their partner will love (ideally with anime sensibilities they'd recognise). Or wants the inverse — TV shows that anime fans will get on with.
3. **The casual watcher.** Doesn't maintain a formal list today. Watches across Netflix, Crunchyroll, Prime. Attracted by "what should I watch tonight" simplicity and good cold-start UX.
4. **The power tracker.** Already on MAL/AniList with 200+ titles tracked. Migrates if (and only if) recommendation quality is materially better. Import path is critical for retention. **Tertiary** — they validate the platform but they aren't who we build for first.

---

## Success metrics

### Phase 1A (MVP launch)

- Functional: every Phase 1A scope item shipped, accessible to a public web URL
- Cold-start: a new user with 5–10 onboarding likes gets recommendations they consider non-trivially relevant in user testing (target: 4/5 quality rating from ≥10 testers)
- Group recommendation: a 2-person registered-user pair gets a ranked list of titles with measurable quality (≥3/5 average satisfaction in testing)
- Performance: title page load <800ms p95; personal recs <500ms p95; group recs <2s p95

### Post-MVP (Phase 2+ if launched)

- Retention: 7-day retention >25%, 30-day retention >12% (median for content platforms is mid-teens; we beat that with group recs as differentiator)
- Group session adoption: ≥20% of weekly active users initiate at least one group session
- Streaming click-through: ≥30% of recommendations result in a "Watch on [platform]" click (precursor to affiliate revenue)

Numbers are aspirational; refine after launch with real data.

---

## Phase 1A scope (MVP cut-line)

**The cut-line is the hardest part of this brief. Hold it.** Anything not on this list is Phase 1B or 2.

### IN scope (Phase 1A)

- **Auth + user profile.** Email + Google OAuth. Profile page with watch list, ratings, demographics (optional, used for ghost profiles).
- **Manual tracking.** Add a title, set status (Watching / Completed / On Hold / Dropped / Plan to Watch), per-episode progress, rating (1–10 scale), free-text notes. Anime + TV only.
- **Import from MyAnimeList and AniList.** XML / GraphQL. The tertiary archetype (power tracker) needs this to even consider switching.
- **Content database.** Local Postgres copy of titles synced from TMDB (TV + film) and AniList (anime). Title metadata + tags + theme taxonomy + streaming availability per region.
- **Personal recommendations.** Theme-based scoring using AniList tag overlap as the primary signal, blended with user-rating preferences. No ML model in Phase 1A — rule-based scoring is fine. The ML layer comes in Phase 2.
- **Group recommendations: registered users only.** 2–5 registered users per group. Intersection of taste vectors, weighted average with floor constraint (no member should hate the result). No ghost profiles in Phase 1A.
- **Streaming availability.** Per title, per region, sourced from TMDB watch providers. "Where to watch" panel on each title page. Filter by user's connected subscriptions.
- **Web app only.** Next.js. Mobile (RN/Expo) is Phase 2.
- **Privacy controls.** Public / friends-only / private per list, per title. Data export endpoint, data deletion endpoint. **GDPR-compliant from day 1** (legal requirement, not optional). See ADR-0012 for the full compliance approach.
- **Observability.** Sentry for errors, PostHog for product analytics + session replay, Vercel logs.

### OUT of Phase 1A — explicit deferrals

- **Ghost profiles** for unregistered group members → Phase 1B
- **Mood / context layer** on recommendations → Phase 1B
- **React Native mobile app** → Phase 2
- **Push notifications** (episode drops, group invites) → Phase 2
- **ML model training** (collaborative filtering, embedding models) → Phase 2 (rule-based scoring carries Phase 1A)
- **Affiliate revenue integration** → Phase 1B (architecture must accommodate; implementation deferred)
- **Public API as a product** → Phase 3 (the architecture must keep this possible — see §architecture-overview ADR — but no implementation in Phase 1A)
- **Manga / light novel tracking** → Out of product scope entirely. We may *display* cross-media metadata ("the story continues in [novel]") but never track or recommend manga.
- **Real-time / WebSocket group sessions** → Phase 2 if data shows demand; async is sufficient for MVP
- **Social graph / follows** → Phase 1B
- **Content recommendations from synopsis** (NLP/embeddings) → Phase 2

---

## Revenue model (informs architecture, not built in 1A)

1. **Affiliate links.** Primary near-term revenue. User clicks "Watch on Netflix" → affiliate-tracked link → Netflix pays a commission on new sign-ups. Implementation = Phase 1B; **architecture must accommodate** affiliate URL building per platform/region from day 1 (the streaming availability schema stores raw URLs or sufficient info to construct them, so adding affiliate codes later is a transformation not a re-fetch).
2. **API resale.** If recommendation quality becomes our defensible moat, license API access to third parties (other apps, streaming platforms wanting better in-app recommendations). Implementation = Phase 3; **architecture must accommodate** by keeping the recommendation engine as a clean module separable from our own API surface.
3. **Acquisition.** Build a defensible product, get users, sell. Architectural implication: clean code, good docs, observable system, low ops burden — i.e. things any acquirer's tech-due-diligence team would check.

No subscription. No ads in MVP. No in-app purchases.

---

## Defensible moats

In rough order of strength:

1. **Group recommendation with ghost profile inference.** Novel — no platform has this. Hard to copy fast (requires ML / heuristic work + the data taxonomy). Phase 1B for full ghost profile, Phase 1A proves the registered-user version.
2. **Cross-medium theme-based taxonomy.** Combines AniList tag depth (best in anime) with TMDB keywords (decent for TV) into a unified theme space. Building this taxonomy is a one-time Phase 1A investment and becomes a structural advantage.
3. **Streaming availability + recommendations in one surface.** Operationally easy to copy; defensibility is from the previous two moats, not this one.

---

## Open product decisions (deferred to Phase 1B+)

These are noted so they don't get re-litigated in Phase 1A:

- Final scoring model for group recommendations (weighted average vs. plurality vs. veto-based)
- Onboarding survey design (number of titles, taxonomy breadth, demographic depth)
- Privacy taxonomy (just public/private, or finer-grained?)
- Whether to expose internal taste-vector dimensions to power users
- Final brand name (working: HelpME2C)
- Pricing model if any tier of the product becomes paid in future

---

_Last updated 2026-05-03. Distilled from product brief by previous-session Claude. Refine in Phase 1A as more is learned. Treat this document as the contract for what's in MVP and what isn't — anything outside the IN-scope list above requires explicit negotiation per CLAUDE.md §4 (stop-and-ask)._

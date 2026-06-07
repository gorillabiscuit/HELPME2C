# Title-page UX for HelpME2C — research report

**Date:** 2026-05-17
**Prepared by:** Claude (Opus 4.7) — autonomous run
**Companion files:** `RUN_LOG.md`, `HANDOFF.md`, per-platform evidence in `raw/`
**Status:** Research deliverable. The HANDOFF doc proposes a default
direction but does **not** presume Wouter's decisions.

---

## TL;DR

The current `/titles/[id]` page is a single max-w-3xl column: hero →
Tags → BridgeCard grid ("More shows with the same themes") → Where to
watch. The cross-medium recommendation moat is well-surfaced via the
BridgeCard grid. The **group-recommendation moat is completely absent**
from the title page, and **no competing platform we surveyed has a
group-rec entry point on its title pages**. That gap is HelpME2C's
biggest design opportunity.

Three other findings shape the redesign:

1. **Relations vs Recommendations should be distinct sections.** Both
   AniList and MyAnimeList keep franchise siblings (Relations: prequel,
   sequel, side story) as a different section from thematic
   recommendations. HelpME2C currently suppresses franchise siblings
   from the BridgeCard grid (per ADR-0023) but has nothing to replace
   them with — an under-built area visible to any anime-trained user.
2. **Where-to-watch should be one-line in the hero AND a full card
   below.** JustWatch's whole product is built around this; Apple TV+
   confirms the "Ways to Watch" pattern; HelpME2C's current placement
   (bottom of page) leaves the answer to "can I watch this tonight?"
   buried until scroll. A one-line summary under the hero ("Streaming
   on Netflix · 3 other options") + the existing detailed card lower
   on the page is the cheapest hierarchy win.
3. **Themes deserve first-class chips.** Letterboxd's Nanocrowd
   nanogenres sit inline with genres as clickable theme pages. HelpME2C
   already has the theme data — splitting Themes / Tags / Cast-and-demo
   visually mirrors this and reinforces the cross-medium story (themes
   cross TV↔anime; genres mostly don't).

The three redesign directions proposed below — A (Letterboxd-like),
B (TMDB-like), C (Co-watching first, anime-aware) — converge on a
small overlap and diverge on what the title page is **for**. **The
recommended direction is C**, anchored to the couch co-watcher
archetype and the unique moat opportunity.

---

## 1. Per-platform summary

Full evidence per platform in `raw/<slug>.md`. One-paragraph rollups
with the load-bearing finding:

| Platform | One-line key takeaway | Raw file |
|---|---|---|
| **Letterboxd** | The hero band is information-dense without being cluttered; "Mentioned by" (human-curated lists containing this title) is the closest existing pattern to a group-rec entry point. | [letterboxd.md](./raw/letterboxd.md) |
| **IMDb** | Survives despite legendary clutter because the right-rail facts (rating, votes, popularity, runtime) are stable and high-density; the "Top 250" badge + the 1-10 IMDb rating remain the platform's recognition tokens. | [imdb.md](./raw/imdb.md) |
| **TMDB** | Ships two rec carousels with opaque labels ("Recommendations" vs "Similar") and zero in-page explanation — exactly the failure mode HelpME2C's `reasonHint`-on-BridgeCard is built to avoid. | [tmdb.md](./raw/tmdb.md) |
| **TasteDive** | The "Cross-category suggestions" pill-filtered grid is the closest existing analogue to HelpME2C's BridgeCard; multi-anchor input exists in the API but not in the UI — uncontested ground for HelpME2C's group rec. | [tastedive.md](./raw/tastedive.md) |
| **AniList** | The Relations rail (structural franchise siblings) is kept **distinct** from the Recommendations rail (thematic) — and AniList users still complain it's under-built, which is direct evidence the franchise-navigation gap is universal. | [anilist.md](./raw/anilist.md) |
| **MyAnimeList** | 12+ named relation types (Parent Story, Side Story, Alternative Version, Summary, Character, Spin-Off…) — the richest franchise vocabulary in the survey. The blue-on-grey dated aesthetic survives because the data density is the value proposition. | [myanimelist.md](./raw/myanimelist.md) |
| **JustWatch** | Availability is the hero — providers shown as logos above the fold, tagged Subscription/Free/Rent/Buy with prices, filterable by user's connected services. The whole product is the answer to "where can I watch this tonight?". | [justwatch.md](./raw/justwatch.md) |
| **Trakt** | Tracking-first, with "Lists containing this" (community-curated lists) as a prominent section — the only platform besides Letterboxd surfacing community-curated lists as a peer of algorithmic recommendations. | [trakt.md](./raw/trakt.md) |
| **Plex Discover** | "Watch from these locations" ribbon is positioned as a peer of the primary CTA; the friends-activity banner is the closest existing pattern to a group-rec UX — but Plex's default-on watch-history sharing backfired publicly. | [plex-discover.md](./raw/plex-discover.md) |
| **Watcha** | The 0–10 rating widget doubles as a **predicted-rating slot** ("you'll probably rate this 8.4") — the closest market analogue to a group-aware predicted score ("predicted for the 3 of you: 7.9"). | [watcha.md](./raw/watcha.md) |
| **Netflix in-app** | Actively **retreating** from the numeric "98% Match" toward tag chips (Jan 2024) — strong validation of HelpME2C's theme-tag + `reasonHint` direction over any numeric confidence score. The 2025 redesign is widely hated; do not mistake current Netflix for best practice. | [netflix.md](./raw/netflix.md) |
| **Apple TV+** | "Ways to Watch" structured panel is the closest big-platform analogue to HelpME2C's Where-to-watch card; "What is [title] about?" question framing is a free copywriting pattern; full-bleed editorial backdrops are **not** portable (requires editorial budget HelpME2C doesn't have). | [apple-tv-plus.md](./raw/apple-tv-plus.md) |
| **Crunchyroll** | Anime title pages use the **same shape** as Netflix/Disney+/Hulu TV pages — supports HelpME2C's decision to keep anime and TV pages visually unified, while still exposing anime-native cues (sub/dub indicator, simulcast NEW badge, source material) as conditional sections. | [crunchyroll.md](./raw/crunchyroll.md) |

---

## 2. Information-architecture patterns synthesised

### 2.1 Table-stakes sections (every title page has these)

Across all 13 platforms, every title page surveyed has:

1. **Hero band** — poster + title + primary metadata pipe (year, runtime, status)
2. **Synopsis** — short prose description
3. **At least one user-action button** — typically "Add to watchlist" or equivalent
4. **A "more like this" section** — even if poorly labelled (TMDB's two opaque rails, Crunchyroll's single "More Like This")
5. **A rating or score display** — community average OR personal rating
6. **Trailer** — either inline in the hero or in a "Media" section

HelpME2C currently has #1, #2, #3, #4 (well-built BridgeCard), and #6
(preview-modal). It does NOT have #5 (no community rating display, only
the user's own rating in the Add button state). **Adding an aggregate
rating display is optional** — Letterboxd has it, AniList has it, TMDB
has it — but it's mostly tangential to HelpME2C's value proposition.
Skip unless user testing demands.

### 2.2 Differentiator sections (the best title pages have these)

| Section | Where it appears | Why it matters for HelpME2C |
|---|---|---|
| **Themes / nanogenres as first-class chips** | Letterboxd (Nanocrowd nanogenres) | HelpME2C has the data; promoting Themes out of the Tags card is the cheapest moat-surface win |
| **Relations** (franchise siblings, structural) | AniList, MyAnimeList | The current BridgeCard suppresses franchise siblings (ADR-0023); the Relations gap is anime-fan-visible |
| **Community-curated lists** ("Mentioned by", "Lists containing this") | Letterboxd, Trakt | Closest existing pattern to human-anchored discovery; a peer of algorithmic recs |
| **Predicted user rating** | Watcha, Netflix (legacy Match %), Plex Discover (limited) | Watcha's framing is the most portable — and pluralisable to "predicted for the group" |
| **Friends activity** / co-watching context | Plex Discover, Letterboxd (friend reviews) | The closest existing pattern to HelpME2C's group rec moat; CRITICAL caveat: privacy defaults must be opt-in (Plex's default-on watch-history backfired) |
| **Source material + demographic badges** (anime) | AniList, MyAnimeList, Crunchyroll (partial) | HelpME2C's import pipeline already pulls this; cheap conditional render |
| **Cast headshots → filmography** | IMDb, Apple TV+ | Apple's quiet bet against algorithmic recs; viable Phase-2 cross-medium bridge (voice actors → multiple anime → live-action) |
| **One-line availability summary under the hero** | JustWatch (whole page), Plex Discover (ribbon), Apple TV+ ("Ways to Watch" panel) | Promote "Where to watch" out of the bottom of the page into a one-line strip in the hero |
| **Notify-me when available** | JustWatch | Free conversion mechanic for unavailable titles; aligns with HelpME2C's "you can't stream this here" failure mode |

### 2.3 Canonical top-to-bottom order

The consensus order across the eleven non-streaming-app platforms
(Letterboxd, IMDb, TMDB, TasteDive, AniList, MAL, JustWatch, Trakt,
Plex Discover, Watcha, Crunchyroll):

1. **Hero band** (poster + title + primary metadata + actions)
2. **Synopsis** (or in-hero for compact designs)
3. **Quick facts strip** (rating · year · runtime · status · cert)
4. **Cast / staff** (or skipped — Letterboxd promotes cast, TMDB has it, HelpME2C doesn't)
5. **Tags / themes / genres** (variable placement; HelpME2C has it mid-page)
6. **Where to watch** (variable — JustWatch puts it at top; HelpME2C puts it at bottom)
7. **Relations / franchise navigation** (AniList/MAL only — and even there it's mid-to-low)
8. **Recommendations / "Similar"** (almost always near the bottom)
9. **Reviews / community** (bottom; HelpME2C deliberately skips)
10. **Trivia / production / extras** (bottom; IMDb-heavy, HelpME2C should skip)

HelpME2C currently follows this order **except for Where-to-watch
placement** and the **missing Relations rail**. Section 3 below
proposes adjustments.

### 2.4 Series / season / episode navigation

Five patterns surveyed:

- **Tab strip with season selector** (Crunchyroll, Netflix, Apple TV+, Trakt) — clicking a season tab swaps the episode grid in place. Works at scale; HelpME2C doesn't need it Phase 1A because it doesn't host playback.
- **Inline episode list with collapsible seasons** (AniList for short series) — works for series with ≤4 seasons; gets unwieldy past that.
- **Per-episode page navigation** (MyAnimeList, IMDb) — each episode has its own page. Editorial burden; not viable for HelpME2C's auto-imported catalog.
- **"Season X" as a separate title row** (the current HelpME2C behaviour, deliberately collapsed in BridgeCard via franchise dedup) — works fine for browse; breaks the "ratings reflect the franchise" mental model that ADR-0023 corrects.
- **No episode UX at all** (Letterboxd) — Letterboxd treats series as a single page; episodes do not have their own rating surfaces.

HelpME2C's current behaviour: each season has its own `titles` row,
but the BridgeCard grid dedupes franchise siblings out (per ADR-0023).
This is **correct for "show me different shows like this one"** and
**wrong for "show me other seasons of this show"** — the missing
Relations rail.

### 2.5 Franchise navigation patterns

- **Hidden / suppressed** (HelpME2C today, deliberately; Letterboxd, which treats series as one entity) — works for the cross-medium discovery use case but leaves anime-fan expectations unmet
- **Dedicated Relations section with named relation types** (AniList: 12+ types; MAL: ~12 types) — the gold standard, but it requires structured relation data that HelpME2C doesn't yet have as a typed column
- **"More from this collection"** (Apple TV+, Netflix, Crunchyroll) — single rail showing all sequels/prequels/spin-offs without typing
- **Breadcrumb to series page** (Crunchyroll, Disney+) — works when each series has a canonical landing page

The recommendation for HelpME2C: **add a single "More in this
franchise" rail using the existing `franchiseKey` heuristic**. Cheap
(reuses the heuristic already in `apps/web/src/server/lib/franchise.ts`),
fills the anime-fan-visible gap, doesn't require an ADR change. The
right long-term shape is a `franchise_id` column populated from
AniList's `relations` graph (proposed but deferred in ADR-0023);
this rail is the cheap-now version.

### 2.6 Where-to-watch placement

| Placement | Platforms | When it's right |
|---|---|---|
| **Above the fold, as a hero strip** | JustWatch | When the user is HERE to answer "where can I watch this" — HelpME2C's couch co-watcher is in this exact situation |
| **Above the fold, as a peer of "Add to watchlist"** | Plex Discover ("Watch from these locations" ribbon), Apple TV+ ("Ways to Watch" panel) | When availability is treated as a first-class question, not a tangent |
| **Mid-page, as a card** | TMDB | When the page is metadata-first and availability is one of many facts |
| **Bottom of page, as a card** | HelpME2C today, Trakt, Letterboxd | When the page is critique-first or library-first; user has already decided to engage with the title |
| **Behind a tab or modal** | Letterboxd (modal), Netflix (no surface needed — they ARE the service) | When the platform's identity isn't "find what to watch" |

**Recommended HelpME2C placement:** one-line summary strip in the hero
(JustWatch-style, abbreviated) + full detailed card at the bottom
(current placement, unchanged). The hero strip costs ~20px and answers
the primary question for the couch co-watcher without scroll.

### 2.7 Anime-specific conventions

Borrowing from AniList, MAL, and Crunchyroll: HelpME2C's anime title
pages should add **conditional sections** when `mediaType === 'anime'`:

- **Source material badge** (Original / Manga adaptation / Light Novel adaptation / Game adaptation / Web Novel) — present in AniList and MAL; HelpME2C's import already has this field via AniList
- **Demographic badge** (shounen / seinen / shoujo / josei / kids) — present in MAL; available via AniList
- **Studio** — universal in anime references
- **Simulcast indicator** ("New episode Sundays 8:00 AM PT") — present in Crunchyroll, AniList; requires schedule data we don't currently sync
- **Japanese / romanised title** — present in AniList, MAL, Crunchyroll; HelpME2C has `originalTitle` already but renders it subtle
- **Manga link-out** — Crunchyroll attempts this; failed to ship cleanly; HelpME2C's PROJECT.md is explicit that we **display** cross-media metadata but don't track manga

The cross-medium framing on HelpME2C means **all** of these conditional
sections should look like peers of the regular title-page sections,
not anime-only ghettos. AniList and MAL succeed visually because they
treat anime data as the canonical case; HelpME2C should treat its
anime data and TV data as siblings.

---

## 3. Three redesign directions

Each direction is a different answer to "what is the title page **for**?".

### Direction A — "Letterboxd-like" (clean, opinionated, hero-heavy, review-prominent)

**The page is for forming an opinion about this title.**

```
┌───────────────────────────────────────────────────────────────┐
│  [backdrop image, blurred]                                    │
│  ┌────────┐                                                   │
│  │ poster │  Title (large)                                    │
│  │        │  Director · Year · Runtime                        │
│  │        │  ★★★★½  4.3/5  (12.4k ratings)                    │
│  └────────┘  [Add to list]  [Rate]  [Share]                   │
│              "synopsis line"                                  │
├───────────────────────────────────────────────────────────────┤
│  Themes  [thriller] [class] [parasitism] [seoul] [household]  │
│  Cast    [Song Kang-ho]  [Lee Sun-kyun]  [Cho Yeo-jeong]      │
├───────────────────────────────────────────────────────────────┤
│  ✦ Top reviews from friends and critics                       │
│    review 1                                                   │
│    review 2                                                   │
├───────────────────────────────────────────────────────────────┤
│  Mentioned by (curated lists)                                 │
│  [list 1]  [list 2]  [list 3]                                 │
├───────────────────────────────────────────────────────────────┤
│  Similar films  [BridgeCard grid — minimal explanation]       │
├───────────────────────────────────────────────────────────────┤
│  Where to watch (small footer card)                           │
└───────────────────────────────────────────────────────────────┘
```

- **What gets cut from current:** Tags card (collapsed into Themes chips). Where-to-watch deprioritised.
- **What gets added:** Aggregate rating display, cast section, reviews section, Mentioned-by curated lists section.
- **Primary action hierarchy:** Add to list → Rate → Share.
- **Effort:** M-L. Reviews require either a fresh feature build (no review schema today) or a "Top 3 comments from your network" surface (no social graph today). Curated lists is L.
- **What user-research question this answers:** "Do users come to HelpME2C to form an opinion before committing? Are reviews and lists what they want, or is it purely a discovery engine?"

### Direction B — "TMDB-like" (data-dense, table-stakes-complete, metadata-prominent)

**The page is the canonical fact sheet for this title.**

```
┌───────────────────────────────────────────────────────────────┐
│  ┌────────┐  Title  ·  Original Title  ·  Year                │
│  │ poster │  ★ 8.5/10 (1.2k) · 142 min · TV-MA · Status       │
│  │ [▶]    │  Director · Genres · Tags pipe                    │
│  │        │  [Add to list] [Rate] [▶ Trailer]                 │
│  └────────┘                                                   │
│  Synopsis (full, no truncation)                               │
├──────────────────────────────┬────────────────────────────────┤
│  MAIN COLUMN                 │  FACTS RAIL                    │
│  Cast carousel               │  Status: Released              │
│  Crew (director, writer)     │  Original Lang: Korean         │
│  Themes chips                │  Budget: $11.4M                │
│  Tags chips                  │  Revenue: $258.8M              │
│  "Recommendations" rail      │  Country: South Korea          │
│  "Similar Films" rail        │  Network/Studio: ...           │
│  User reviews (top 3)        │  External IDs (TMDB, IMDb)    │
│  Where to watch (full card)  │                                │
└──────────────────────────────┴────────────────────────────────┘
```

- **What gets cut from current:** Single-column layout (max-w-3xl); replaced by main + facts rail.
- **What gets added:** Cast, crew, two rec rails labelled differently, facts rail (status, language, budget, etc.), reviews.
- **Primary action hierarchy:** Add to list → Rate → Trailer.
- **Effort:** L. Two-column responsive layout, cast data import (TMDB has it, not currently pulled), reviews scaffolding.
- **What user-research question this answers:** "Do users want HelpME2C to be the canonical reference page for a title? Are they trying to learn about the title in depth, or about whether it fits them?"

### Direction C — "Co-watching first, anime-aware" (RECOMMENDED)

**The page is for deciding what to watch — alone or with someone.**

```
┌──────────────────────────────────────────────────────────────────┐
│  [optional muted backdrop, dimmed]                               │
│  ┌────────┐  Title                                               │
│  │ poster │  原題 (subtle, anime/foreign only)                   │
│  │ [▶]    │  TV · 2024 · 12 episodes · Ongoing                   │
│  │        │  ◐ Streaming on Netflix · 3 other options →          │
│  └────────┘                                                      │
│              [Add to list ▾]  [For our group ▾]  [▶ Trailer]     │
│              3-line synopsis with show-more                      │
├──────────────────────────────────────────────────────────────────┤
│  Themes   [tragedy] [revenge] [military] [super-power]           │
│           (clickable, navigate to theme page or cross-medium)    │
├──────────────────────────────────────────────────────────────────┤
│  Watching this together? (only if user has groups)               │
│  Predicted for you + Sarah:    8.1                               │
│  Predicted for you + family:   6.8  ⓘ kid's score is 4.2         │
│  [Pick this for movie night with Sarah]                          │
├──────────────────────────────────────────────────────────────────┤
│  More in this franchise (conditional, if franchiseKey matches)   │
│  [S1 — on your list]  [S2 — on your list]  [Movie — not watched] │
├──────────────────────────────────────────────────────────────────┤
│  More with these themes                                          │
│  [BridgeCard grid — keeps "Shares the X theme" subtitle]         │
├──────────────────────────────────────────────────────────────────┤
│  Anime details (conditional, mediaType === 'anime')              │
│  Source: Manga adaptation · Demographic: Shounen                 │
│  Studio: MAPPA  ·  Next episode: Sun 4:00 PM (your TZ)           │
├──────────────────────────────────────────────────────────────────┤
│  Where to watch (full detailed card — same as today)             │
│  Tags (cast / demographic / minor — collapsed by default)        │
└──────────────────────────────────────────────────────────────────┘
```

- **What gets cut from current:** Tags card moves to bottom and is collapsed by default (Themes promotes the most-discoverable chips into the top).
- **What gets added:**
  - One-line availability strip in the hero (JustWatch-style)
  - "For our group" CTA in the hero — opens dropdown of user's saved groups, predicts per-member scores using existing `recommendForGroup` engine
  - Themes section (separate from Tags), clickable chips
  - "Watching this together?" inline group-rec surface
  - "More in this franchise" rail (uses existing `franchiseKey`)
  - Anime details conditional section
- **Primary action hierarchy:** Add to list → **For our group (the moat)** → Trailer.
- **Effort:** M. Most pieces reuse existing data and engines:
  - Group rec: `recommendForGroup` already exists in `packages/ml`
  - Franchise rail: reuses `franchiseKey` heuristic, inverts the BridgeCard dedup
  - Themes chips: data already in DB (`themes` table, `tagThemes` join)
  - Anime conditional: AniList sync already pulls source-material / demographic / studio per ADR-0023's referenced data flow
  - Availability strip: derived from existing `streamingAvailability` data
- **What user-research question this answers:** "Does the title page make HelpME2C's primary archetype (couch co-watcher) feel served? Does the group prediction surface materially reduce 'we can never decide what to watch together' friction?"

### Comparison

| Dimension | Direction A | Direction B | Direction C |
|---|---|---|---|
| Identity | Letterboxd for cross-medium | TMDB for the user-facing app | The HelpME2C-specific moat-surface |
| Hero density | Low (opinion-led) | High (fact-led) | Medium (decision-led) |
| Primary CTA | Rate | Add to list | Add to list / For our group (peers) |
| Cross-medium moat | Buried in "Similar films" | One of many rails | **Promoted** ("More with these themes" stays prominent) |
| Group rec moat | Absent | Absent | **First-class hero CTA + inline surface** |
| Anime treatment | Same as TV | Same as TV | Conditional anime details section |
| Where-to-watch | Footer card | Mid-page card | Hero strip + bottom card |
| Engineering effort | M–L | L | **M** |
| Schema changes | Reviews | Cast, crew, reviews, facts | Optional franchise table (cheap-now uses heuristic) |

---

## 4. Where Direction C borrows from each platform

A quick provenance map for the redesign — so future-Wouter (or a
ticket reviewer) can see the chain of evidence:

- **Hero one-line availability strip** ← JustWatch (whole product is this), Plex Discover "Watch from these locations" ribbon, Apple TV+ "Ways to Watch" panel
- **"For our group" CTA** ← Watcha's predicted-rating widget (extended to plural), TasteDive's API-only multi-anchor capability (greenfield UI)
- **"Watching this together?" inline surface** ← Plex Discover's friends-activity banner (BUT with opt-in defaults to avoid Plex's backfire)
- **Themes as first-class chips** ← Letterboxd Nanocrowd nanogenres, Trakt's Lists pattern (community theme curation)
- **"More in this franchise" rail** ← AniList Relations, MyAnimeList Related Anime; both rated under-built by their own users — the floor is low, we just need to clear it
- **Anime conditional section** ← Crunchyroll's anime-native cues (sub/dub, simulcast); HelpME2C inherits the badge vocabulary but renders it as a sibling section, not an anime ghetto
- **3-line synopsis with show-more** ← Apple TV+'s "What is X about?" framing (without copying the literal question), Letterboxd's tight hero discipline
- **Keep BridgeCard with reasonHint** ← Netflix's retreat from Match % validates HelpME2C's explainability-over-numeric-confidence direction (Netflix 2024 redesign coverage)
- **Tags collapsed by default** ← TMDB hides keywords at bottom (validation that the tag-cloud is best deprioritised); Letterboxd shows themes as chips not a wall

What HelpME2C **deliberately does not borrow**:

- Aggregate community rating display — not load-bearing for HelpME2C's "find for you / find for us" framing
- Reviews / comments per title — moderation liability (per Crunchyroll's July 2024 review-bombing removal); registered-users-only doesn't help when group invites scale
- Full-bleed editorial backdrops — requires editorial budget; muted backdrop with subtle dim is the cheap alternative
- Autoplay video previews — battery / accessibility / GDPR concerns; the existing trailer-on-Play-button is correct
- Match % numeric score — Netflix's own retreat is the evidence
- Per-episode tracking checkboxes — overkill for registered-users MVP (Trakt has it; widely-known overkill for casual users)
- Right-rail facts column — works at IMDb/TMDB scale; HelpME2C's max-w-3xl single column is the right shape for couch co-watcher's mobile-first reality

---

## 5. Open questions for human review

The HANDOFF doc treats Direction C as the proposed default but flags
these for Wouter's call before any code work:

1. **Backdrop image — yes or no?** Adds a TMDB API field to sync, adds
   visual weight, and arguably distracts from the cross-medium framing
   (anime backdrops exist on AniList but are stylistically very
   different from TMDB TV/film backdrops — risk of inconsistency).
   The mock above shows it as **optional** (muted, dimmed); a tighter
   version would skip backdrops entirely.

2. **"For our group" — is the moat ready for a hero CTA?**
   `recommendForGroup` exists in `packages/ml`, but the user-facing
   group surface (creating groups, inviting members) is M-stage. If
   groups aren't user-creatable yet, the hero CTA needs to handle the
   "you don't have any groups yet → here's how to start one" state
   gracefully. Possibly Direction C's hero CTA is feature-flagged on
   user-has-groups.

3. **"Watching this together?" predicted scores — what does the math
   say?** The existing eval harness at `packages/ml/src/eval/` measures
   the algorithm's quality on 5 synthetic archetypes. Before the
   surface goes live, we should verify the per-group predicted scores
   are stable and not embarrassingly volatile on real user pairs.

4. **Themes as a separate section — does the editorial theme taxonomy
   support this UI?** Themes promotion only works if the themes
   surfaced are recognisable to the user. The current taxonomy
   (`themes` table) is editorially curated but small; a theme like
   "super-power" is fine, but a theme like "th:tragedy" rendered as a
   chip needs human-friendly naming. Check the `themes.name` field
   coverage before promoting Themes to the hero band.

5. **One-line availability strip — under hero or in hero?** The mock
   shows it inside the hero (`◐ Streaming on Netflix · 3 other options
   →`). An alternative is a separate strip immediately below the hero,
   like Apple TV+'s "Ways to Watch" peer-card pattern. The peer-card
   shape is slightly safer (doesn't crowd the title), but loses some
   of the "this is foundational to the decision" framing.

6. **Anime details placement.** Mock shows the anime conditional
   section between "More with these themes" and "Where to watch".
   Should it sit higher (right after Themes) so anime fans don't have
   to scroll past cross-medium content? Probably yes for the
   anime-heavy archetype; argue against if the cross-medium framing
   matters more than anime-fan-familiarity.

---

## 6. What changes for measurability

HelpME2C's success metric is "4/5 quality rating from ≥10 testers".
For a title-page redesign, that metric needs a per-page test:

- **Tester task:** "You're deciding what to watch tonight with your
  partner. Open the title page for [title]. Can you make a decision in
  under 60 seconds?"
- **Quality measure:** self-reported "did this page help me decide?" 1-5.
- **Direction C threshold:** ≥ 4.0 mean across 10 testers, with the
  "For our group" CTA used at least once per session by ≥ 6/10 testers.

The eval harness extension proposed in the cold-start research
(`packages/ml/src/eval/cold-start-fixtures.ts`) can be reused to
ablation-test the predicted group scores once they're surfaced — same
pattern (`with_signal` / `without_signal` paired fixtures), now
applied to "does seeing the predicted group score before clicking
'For our group' change the click-through rate?".

---

_End of REPORT. The HANDOFF doc translates Direction C into a
ticket-ready proposal, flagging open questions rather than presuming
Wouter's decisions._

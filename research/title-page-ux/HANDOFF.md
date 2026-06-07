# HANDOFF — Title-page redesign (Direction C, proposed)

**Purpose:** Single document a fresh Claude Code session can load to
implement the proposed title-page redesign — IF Wouter chooses
Direction C. The decisions below are **proposed defaults**, not locked.

**Companion artefacts:**

- `research/title-page-ux/REPORT.md` — full research synthesis,
  including the alternative Directions A and B
- `research/title-page-ux/raw/*.md` — 13 per-platform evidence files
- `research/title-page-ux/RUN_LOG.md` — research-run audit trail

---

## PROPOSED DEFAULTS (not yet locked by Wouter)

1. **Direction:** C — "Co-watching first, anime-aware". REPORT §3.
2. **Hero band changes:**
   - Add optional muted backdrop (TMDB backdrop field, dimmed)
   - Add one-line availability strip ("Streaming on Netflix · 3 other options →")
   - Promote "For our group" to a hero CTA, peer of "Add to list"
   - Original title surfaced subtly for anime / foreign-language only
3. **New mid-page sections, in order:**
   - **Themes** chips (clickable, navigates to theme page) — promoted out of Tags
   - **Watching this together?** group-rec surface — conditional on user having groups
   - **More in this franchise** — uses existing `franchiseKey` heuristic; cheap rail
   - **More with these themes** — existing BridgeCard grid, unchanged
   - **Anime details** — conditional `mediaType === 'anime'` section: source material, demographic, studio, simulcast/next-episode if available
   - **Where to watch** — existing card unchanged
   - **Tags** — moved to bottom, collapsed by default (cast-and-demo tags only)
4. **Cut from current:**
   - Nothing structural. Tags card is demoted, not deleted.
5. **Estimated effort:** Medium (1–2 weeks of focused engineering),
   broken into 3 tickets per §TICKETS below.

Wouter should review §OPEN QUESTIONS (last section) before locking
Direction C as the design.

---

## TICKETS, IN ORDER

### TICKET 1 — `HM2C-?` Hero-band changes (S, ~1-2 days)

**Scope:** the cheapest, highest-impact subset. No new schema, no
group-rec dependency.

**File to edit:** `apps/web/src/app/titles/[id]/page.tsx`

**Changes:**

1. **Availability strip in hero.** Compute a one-line summary from the
   existing `primaryByType` map already built in the route (line ~141).
   Render below the metadata pipe, above the synopsis. Format:
   `◐ Streaming on Netflix, Prime · 3 other options →`. The `→` is an
   anchor link to the existing Where-to-watch card (`#where-to-watch`).

2. **Original title surfacing.** Current code only shows
   `title.originalTitle` if it differs from `title.title`. Keep that
   condition, but render it more prominently when
   `title.mediaType === 'anime'` — anime fans expect to see Japanese
   titles. Visual: same line, smaller-weight, with native-script
   detection.

3. **Hero CTA hierarchy.** Re-order the actions row to:
   `[Add to list] [For our group] [▶ Trailer]`. The trailer Play
   overlay on the poster stays (it's working today via
   `PreviewOverlay`); the explicit `▶ Trailer` text button is the
   button-form for discoverability. The "For our group" CTA is
   feature-flagged behind `user.hasGroups` — when the user has no
   groups, this button is **hidden** in ticket 1; ticket 2 wires it up.

4. **Optional backdrop image.** Only render if `title.backdropUrl` is
   non-null. Visual: 100% width, 240px tall, blurred 4px, dimmed to
   ~30% opacity, the hero band sits on top. Requires syncing the
   `backdrop_path` field from TMDB — add to the sync function in
   `apps/web/src/inngest/functions/tmdb-sync.ts` (no migration needed
   if `titles.backdropUrl` already exists; check the schema). If the
   schema column doesn't exist, this is a small additive migration
   (`titles.backdrop_url text NULL`).

**Diff tagging per CLAUDE.md §6:** Hero copy and CTA ordering are
**Decision** (anchored to research). Availability strip computation
is **Logic**. Backdrop image add is **Scaffolding** (mechanical).

**Tests:** the existing test suite has no snapshots pinning the
title-page HTML, so no breaking-test risk. Add a smoke test for the
availability-strip computation — pure function over the streaming
data — in `apps/web/src/app/titles/[id]/page.test.ts` or a colocated
helper test.

### TICKET 2 — `HM2C-?` "For our group" + "Watching this together?" surfaces (M, ~1 week)

**Scope:** the moat. Group-rec UI on the title page.

**Files to edit:**

- `apps/web/src/app/titles/[id]/page.tsx` — fetch group data per user, compute predicted scores
- `apps/web/src/components/title-group-cta.tsx` (NEW) — the "For our group" dropdown CTA in the hero
- `apps/web/src/components/title-group-prediction-card.tsx` (NEW) — the inline "Watching this together?" surface
- `apps/web/src/server/routers/groups.ts` (or wherever group queries live) — verify a fetch-groups-for-user query exists; add if missing
- `packages/ml/src/recommendation.ts` — no changes; `recommendForGroup` is already there

**Changes:**

1. **Server-side data fetch.** In the title page route:
   - Fetch the user's groups (read-only).
   - For each group, compute the predicted group score for THIS title
     using `recommendForGroup` with the group's members' taste vectors.
   - Compute `perUserScores` to power the transparency layer ("kid's
     score is 4.2").

2. **`<TitleGroupCTA />` component.** Hero CTA. States:
   - `user has 0 groups`: button hidden (the Add-to-list and Trailer
     buttons fill the row).
   - `user has 1 group`: button reads "For [group name]"; click
     scrolls to the "Watching this together?" section below.
   - `user has 2+ groups`: button reads "For our group ▾"; click opens
     a dropdown of groups.

3. **`<TitleGroupPredictionCard />` component.** Mid-page section
   below Themes. Renders only if `groups.length > 0`. Per group:
   - Group name and avatar mash-up
   - Predicted score (0-10 scale, rendered as a 0-1 normalised value
     scaled to /10 for display)
   - Transparency layer: per-member normalised scores
   - CTA: "Pick this for movie night with [group name]" — adds the
     title to a shared group watchlist (Phase 1B; for now this can be
     a non-functional "Coming soon" button or a wire-up to existing
     `watch_entries` with a group_id).

4. **Privacy default.** Per Plex's backfire: the "Watching this
   together?" card should be **off** for users until they explicitly
   create a group. Group creation should default to "share with
   members of this group only" — never default-on for any wider
   audience. (Likely already the case in HelpME2C's existing groups
   feature; verify.)

**Stop-and-ask per CLAUDE.md §4:**
- This trips "Adding a new persisted user preference" gates if it
  introduces a new `groups.title_preferences` or similar table — flag
  before writing migrations.
- This trips "Touching the recommendation engine boundary" if you
  change `packages/ml/recommendation.ts`. You shouldn't need to; the
  group surface is a CONSUMER of the existing engine. Read-only is fine.

**Tests:** group-prediction logic is exercised by the existing eval
harness against the 5 synthetic archetypes. Add per-test fixtures
for the title-page surface — Approach A is fine for the React
components (state-based UI), Approach B for any new logic in
`packages/ml/` (but you shouldn't be touching it).

### TICKET 3 — `HM2C-?` Themes / Franchise / Anime sections (M, ~1 week)

**Scope:** the new mid-page sections.

**Files to edit:**

- `apps/web/src/app/titles/[id]/page.tsx` — add the new sections
- `apps/web/src/components/title-themes-section.tsx` (NEW) — clickable theme chips
- `apps/web/src/components/title-franchise-rail.tsx` (NEW) — "More in this franchise"
- `apps/web/src/components/title-anime-details.tsx` (NEW) — conditional anime cues
- `apps/web/src/server/lib/franchise.ts` — verify `franchiseKey` is exported (it is per ADR-0023); no changes needed
- `apps/web/src/server/schema/titles.ts` — verify `sourceMaterial`, `demographic`, `studio` columns exist; if not, additive migration (see schema deltas below)

**Changes:**

1. **`<TitleThemesSection />`.** Promotes the top 4-8 themes for this
   title (computed by joining `titleTags → tagThemes → themes`) into a
   row of clickable chips above the Tags card. Each chip links to a
   theme-detail page (does this route exist? — see Open Questions).
   Visual: similar to current Tag pills but distinct (e.g. outlined
   vs solid), with the theme name from `themes.name`.

2. **`<TitleFranchiseRail />`.** Inverts the BridgeCard dedup logic.
   Fetches all `titles` rows where `franchiseKey(title) ===
   franchiseKey(currentTitle)` AND `title.id !== currentTitle.id`.
   Renders as a small horizontal scroll rail (3-6 cards) with the
   user's current relationship to each ("on your list", "watching",
   "completed · 9/10", "not watched"). Click → that title's page.

3. **`<TitleAnimeDetails />`.** Renders only when `mediaType ===
   'anime'`. Fetches and displays:
   - **Source material** (Original / Manga adaptation / Light Novel
     adaptation) — from `titles.sourceMaterial` if present
   - **Demographic** (Shounen / Seinen / Shoujo / Josei / Kids) — from
     `titles.demographic` if present
   - **Studio** — from `titles.studio` if present
   - **Next episode countdown** — from `titles.nextAiringAt` (AniList
     provides this for ongoing simulcasts) — render as a countdown
     formatted in user's local timezone
   - All four fields gracefully degrade if data is missing (just hide
     the row).

4. **Tags card moves to bottom, collapsed by default.** A `<details>`
   element with summary "Show all tags". Don't delete the tag rendering
   — collapse it.

**Stop-and-ask per CLAUDE.md §4:**
- "Schema migrations that touch existing tables" — if any of
  `titles.sourceMaterial`, `titles.demographic`, `titles.studio`,
  `titles.nextAiringAt`, `titles.backdropUrl` don't exist, those are
  additive nullable columns (usually safe per §4) but flag anyway.

**Tests:**
- `franchise.test.ts` already exists and pins `franchiseKey` behaviour
  (Approach A). The franchise-rail is a thin Server Component over
  that — no new logic.
- Theme-chip click navigation is a UI test; smoke test in Playwright
  is sufficient.

---

## SCHEMA DELTAS (consolidated)

If Direction C ships in full, these columns may need to be added.
Check `apps/web/src/server/schema/titles.ts` for current state; if any
already exist (some likely do from AniList sync per ADR-0023), skip.

| Table | Column | Type | Default | Notes |
|---|---|---|---|---|
| `titles` | `backdropUrl` | text NULL | NULL | TMDB backdrop_path; for hero band optional backdrop |
| `titles` | `sourceMaterial` | text NULL | NULL | Original / Manga / Light Novel / Game / Web Novel — AniList-sourced |
| `titles` | `demographic` | text NULL | NULL | shounen / seinen / shoujo / josei / kids — AniList-sourced |
| `titles` | `studio` | text NULL | NULL | Primary studio name; AniList-sourced |
| `titles` | `nextAiringAt` | timestamptz NULL | NULL | Next-episode air time for ongoing simulcasts; AniList provides this |

All are additive nullable columns. No CHECK constraints required;
validation lives at the application layer. The TMDB and AniList sync
functions (`apps/web/src/inngest/functions/`) need to be extended to
populate these fields — check current state before assuming new code
needed.

---

## COMPONENT DELTAS (consolidated)

**New components (3):**

- `TitleGroupCTA` — hero CTA, dropdown of user groups
- `TitleGroupPredictionCard` — mid-page "Watching this together?" surface
- `TitleThemesSection` — clickable theme chips
- `TitleFranchiseRail` — "More in this franchise" rail
- `TitleAnimeDetails` — anime-conditional details

**Existing components touched:**

- `TitleDetailAddButton` — no changes; just sits in the new CTA row
- `BridgeCard` — no changes; renders inside the "More with these themes" section unchanged
- `PreviewOverlay` / `PreviewModal` — no changes; trailer Play stays on poster

---

## ACCEPTANCE CRITERIA

For Direction C to be considered shipped:

- [ ] Hero band renders one-line availability strip when streaming
      data exists
- [ ] Hero shows "For our group" CTA when user has ≥ 1 group; hidden
      otherwise
- [ ] Backdrop image renders dimmed when present; nothing shown when absent
- [ ] Themes chips row appears below hero, clickable
- [ ] "Watching this together?" card appears when user has groups,
      shows predicted score + per-member transparency
- [ ] "More in this franchise" rail appears when same-franchise siblings exist
- [ ] Anime details section appears only for `mediaType === 'anime'`,
      gracefully hides missing fields
- [ ] BridgeCard grid (the cross-medium moat) is unchanged and still
      labelled "More with these themes"
- [ ] Where-to-watch card is unchanged at the bottom; hero strip
      anchor-links to it
- [ ] Tags card is collapsed by default, expandable
- [ ] On a 10-tester panel: ≥ 4.0 mean rating on "did this page help
      me decide?" (per PROJECT.md success-metric framing)
- [ ] On a 10-tester panel: ≥ 6/10 testers used "For our group" CTA at
      least once

---

## OPEN QUESTIONS — Wouter's call before locking Direction C

1. **Is Direction C the right answer at all?** Directions A
   (Letterboxd-like, opinion-led) and B (TMDB-like, data-dense) are
   also viable, each optimised for a different question about
   HelpME2C's identity. REPORT §3 has the comparison. If A or B is
   preferred, this HANDOFF needs to be rewritten.

2. **Is the group-rec moat ready for a hero CTA?** Direction C's
   biggest bet is putting "For our group" in the hero, peer of "Add
   to list". This is right ONLY IF the group infrastructure (group
   creation, member management, predicted-scores rendering) is
   stable enough for 10-tester use. If groups are still pre-MVP,
   Direction C's hero CTA needs to be deferred to a follow-up ticket.

3. **Backdrop image — yes or no?** Adds a TMDB sync field and visual
   weight. Aesthetically it pushes HelpME2C toward "streaming app"
   identity; cleanly skipping backdrops pushes it toward "discovery
   tool" identity. Both are defensible.

4. **Themes section — does our taxonomy support promoting them?**
   Themes promotion only works if `themes.name` values are
   user-friendly. A theme rendered as "th:tragedy" doesn't work; a
   theme rendered as "Tragedy" does. Audit `themes.name` coverage
   before promoting.

5. **Anime details section placement.** Mock shows it between "More
   with these themes" and "Where to watch". For anime-heavy users it
   might belong higher (right after Themes). Tradeoff: cross-medium
   framing vs anime-fan familiarity. Defer to a UX call.

6. **"More in this franchise" rail — same heuristic, or fresh schema?**
   Direction C as written uses the existing `franchiseKey` heuristic
   (cheap, ADR-0023-approved). The cleaner long-term shape is a
   `franchise_id` column populated from AniList's `relations` graph.
   The cheap-now version is shipped first; the schema upgrade is a
   later ADR.

7. **Group-rec privacy default.** The "Watching this together?"
   surface defaults to OFF (no groups → no surface). When users create
   groups, the in-group sharing should default to "members only", NOT
   "friends" or wider. Confirm this matches existing groups feature
   behaviour; per ADR-0012, default-to-private is the rule.

8. **Where-to-watch as inline hero strip vs separate peer card.**
   Current mock shows it inside the hero (`◐ Streaming on Netflix ·
   3 other options →`). Apple TV+'s "Ways to Watch" panel uses a
   separate peer card. Both work; the inline version is tighter, the
   peer card is more discoverable.

---

## NO-FLY ZONE — DO NOT RE-DECIDE

These were considered and ruled out by the research:

| Don't add | Why not | Evidence |
|---|---|---|
| Aggregate community rating display | Not load-bearing for HelpME2C's "find for you / find for us" framing; takes hero real estate from the moat | REPORT §4 |
| Reviews / comments per title | Moderation liability; Crunchyroll's July 2024 review-bombing removal is the lesson | [crunchyroll.md](./raw/crunchyroll.md) |
| Full-bleed editorial backdrops | Requires editorial budget HelpME2C doesn't have | [apple-tv-plus.md](./raw/apple-tv-plus.md) |
| Autoplay video previews | Battery / accessibility / GDPR; trailer-on-Play-button is correct | [netflix.md](./raw/netflix.md) |
| Match % numeric score | Netflix is actively retreating from this toward tag chips | [netflix.md](./raw/netflix.md) |
| Per-episode tracking checkboxes | Overkill for registered-users MVP; Trakt is the cautionary example | [trakt.md](./raw/trakt.md) |
| Right-rail facts column | Works at IMDb/TMDB scale; HelpME2C's max-w-3xl single column matches couch co-watcher's mobile-first reality | REPORT §3 Direction B critique |
| Per-title comments / discussion | Moderation liability at registered-only scale; group invites scale the problem | [crunchyroll.md](./raw/crunchyroll.md) |
| Box office / production facts | IMDb-only; not relevant to HelpME2C's user job | [imdb.md](./raw/imdb.md) |
| "Notify me when available" feature | JustWatch-specific conversion mechanic; HelpME2C isn't a streaming-discovery service primarily | [justwatch.md](./raw/justwatch.md) — deferred to Phase 1B+ |

---

## EVIDENCE INDEX

If the implementing session needs to back up a decision, the evidence
is here:

| Question | File |
|---|---|
| Why one-line availability strip in hero? | [justwatch.md](./raw/justwatch.md), [plex-discover.md](./raw/plex-discover.md), [apple-tv-plus.md](./raw/apple-tv-plus.md) |
| Why "For our group" CTA is unique territory? | [tastedive.md](./raw/tastedive.md), [watcha.md](./raw/watcha.md) — multi-anchor exists in APIs, never in UIs |
| Why "Watching this together?" works (and how to NOT do it) | [plex-discover.md](./raw/plex-discover.md) — Plex's backfire |
| Why predicted group score? | [watcha.md](./raw/watcha.md) — the closest existing pattern, plural form is uncontested |
| Why Themes as first-class chips? | [letterboxd.md](./raw/letterboxd.md) — Nanocrowd nanogenres |
| Why "More in this franchise" rail? | [anilist.md](./raw/anilist.md), [myanimelist.md](./raw/myanimelist.md) — Relations vs Recommendations is the pattern |
| Why Anime details as a conditional section? | [crunchyroll.md](./raw/crunchyroll.md), [anilist.md](./raw/anilist.md), [myanimelist.md](./raw/myanimelist.md) |
| Why keep BridgeCard with `reasonHint`? | [netflix.md](./raw/netflix.md) — Netflix's Match% retreat validates explainability |
| Why NOT add reviews/comments? | [crunchyroll.md](./raw/crunchyroll.md), [trakt.md](./raw/trakt.md) — moderation cost |
| Why max-w-3xl single column? | [imdb.md](./raw/imdb.md) — IMDb redesign forum's anti-pattern lessons |

---

_End of HANDOFF. Implementing session: load this file + the relevant
raw evidence file(s) + the file(s) you're about to edit. The 60KB+
full REPORT.md is optional — only load it if you need to defend a
non-obvious choice or want to understand why Directions A and B were
not picked._

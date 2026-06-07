# Title-page UX research — run log

**Run start:** 2026-05-17 (second autonomous run of the day)
**Mode:** autonomous (Wouter away)
**Operator:** Claude (Opus 4.7, 1M context)
**Output dir:** `research/title-page-ux/`

---

## Brief (pre-committed)

Research title-page UX patterns across 13 competing platforms and
propose three concrete redesigns for HelpME2C's `/titles/[id]` page.
Anchor everything to:

- The codebase's actual current title page
- PROJECT.md moats (cross-medium bridges, group rec)
- The couch co-watcher primary archetype
- Phase 1A constraints (web only, no client-side external APIs)

## Constraints box

- Next.js App Router, Server Components by default
- No client-side TMDB/AniList calls; everything via tRPC
- Recommendation engine is the moat — surface it, don't bury it
- Trailer previews via YouTube embed (working today; preserve)
- GDPR floor; no auto-loaded third-party widgets
- Primary archetype = couch co-watcher

## Current title page (read into context)

Structure (top → bottom), single `max-w-3xl` column:

1. **Hero band**: 200px poster (with trailer Play overlay) | title block
   (h1 title, original title, metadata pipe-separated, synopsis,
   TitleDetailAddButton)
2. **Tags card**: up to 24 tag pills, sorted by weight DESC
3. **"More shows with the same themes" card**: 6-card BridgeCard grid
   (anime+TV mixed, deduped by franchise, "Shares the X theme" subtitle)
4. **"Where to watch" card**: streaming/free/rent/buy buckets for the
   user's IP-detected country + "available in N other regions" footer
   + "Last verified Xm ago" timestamp

What's **absent** vs typical title pages:
- Cast / crew
- Aggregate user rating (no community rating)
- Reviews / discussion
- Season/episode list or navigation
- Franchise navigation (actively suppressed from bridges per ADR-0023)
- Sharing
- **Group rec entry point** — the moat for the primary archetype, totally absent
- Theme explanations beyond a single "Shares the X theme" subtitle
- Public/private list visibility cue
- Cross-link to franchise siblings ("you watched S1; here are S2-3")

What's **present** that's HelpME2C-specific and shouldn't be lost:
- BridgeCard with theme-name subtitle (the moat)
- Cross-medium grouping (anime + TV in the same bridge grid)
- Franchise dedup (S1, S2, S3 of same show collapse to one slot)
- "Don't know it" soft signal (rec_feedback.unfamiliar)
- Trailer preview overlay on every poster, including bridges

## Execution plan

### Phase 1 — per-platform research (7 agents, 13 platforms)

**Wave 1 (4 agents):**

| Agent | Platforms | Why grouped |
|---|---|---|
| A1 | Letterboxd + IMDb | The canonical references — film world's most-cited title pages |
| A2 | TMDB + TasteDive | Our metadata source + a recsys-first competitor |
| A3 | AniList + MyAnimeList | Anime-specific conventions |
| A4 | JustWatch + Trakt | Availability-first vs tracking-first |

**Wave 2 (3 agents):**

| Agent | Platforms | Why grouped |
|---|---|---|
| A5 | Plex Discover + Watcha | Multi-medium aggregators |
| A6 | Netflix + Apple TV+ | Consumer streaming in-app title pages |
| A7 | Crunchyroll (solo) | Anime player + title page |

Each agent writes to `raw/<platform-slug>.md`. Format mandated in the
agent prompt. Citations required.

### Phase 2 — synthesis

1. `REPORT.md` — full document
2. `HANDOFF.md` — Direction C ticket-ready (without presuming Wouter's
   final yes/no)

### Phase 3 — done

Update RUN_LOG, hand back.

## Sub-agent failures

_(updated during execution)_

**None.** All 7 sub-agents returned successfully on first invocation.

One minor caveat flagged by agents:
- Trakt agent: direct WebFetch on trakt.tv returned 403 (Cloudflare).
  Reconstructed structure from API docs, support articles, forum
  threads, Trustpilot. All cited.
- Crunchyroll agent: several `crunchyroll.com/*` URLs returned 403
  (anti-bot wall). Hero-band detail composed from secondary sources
  (designer case studies, Help docs, third-party reviews, browser-
  extension descriptions). All cited.

Both caveats do not affect the load-bearing findings; both agents
covered enough secondary evidence to produce defensible files.

## Sub-agent timing

| Agent | Platforms | Duration | Total tokens |
|---|---|---|---|
| Wave 1 — A1 | Letterboxd + IMDb | ~5m04s | 67,368 |
| Wave 1 — A2 | TMDB + TasteDive | ~4m36s | 60,907 |
| Wave 1 — A3 | AniList + MAL | ~4m41s | 63,415 |
| Wave 1 — A4 | JustWatch + Trakt | ~4m32s | 61,771 |
| Wave 2 — A5 | Plex Discover + Watcha | ~4m08s | 61,411 |
| Wave 2 — A6 | Netflix + Apple TV+ | ~4m50s | 71,884 |
| Wave 2 — A7 | Crunchyroll (solo) | ~5m44s | 82,268 |

Wall-clock: ~25m research + ~10m synthesis = ~35m. Well under the
3h budget.

## Findings worth surfacing on hand-back

1. **No platform has a group-rec entry point on title pages.** Across
   all 13 surveyed: Letterboxd, IMDb, TMDB, TasteDive, AniList, MAL,
   JustWatch, Trakt, Plex Discover, Watcha, Netflix, Apple TV+,
   Crunchyroll — none. This is HelpME2C's biggest design opportunity.
2. **Watcha's predicted-rating widget pluralised → group prediction.**
   The closest market analogue to a group-aware predicted score.
3. **Netflix is actively retreating from "Match %" to tag chips.**
   Strong validation that HelpME2C's theme-tag + `reasonHint`
   direction is correct; do not add a numeric confidence score.
4. **AniList and MAL keep Relations vs Recommendations as DISTINCT
   sections.** HelpME2C's current BridgeCard suppresses franchise
   siblings (ADR-0023) without replacing them — anime-fan-visible gap.
   The `franchiseKey` heuristic already exists; the rail is cheap.
5. **JustWatch / Plex / Apple TV+ all promote availability to the
   hero.** HelpME2C's current bottom placement leaves the couch
   co-watcher's primary question unanswered until scroll.
6. **Crunchyroll comments removal (July 2024) is a HelpME2C signal.**
   Don't ship per-title comments; moderation liability at scale.
7. **Anime title pages don't need to be visually anime-specific.**
   Crunchyroll uses the same shape as TV streamers; HelpME2C should
   keep unified visuals but add conditional anime details (source
   material, demographic, studio, simulcast) when `mediaType === 'anime'`.
8. **Plex's friends-activity default-on backfired publicly.** Any
   "Watching this together?" surface in HelpME2C must default to
   opt-in per ADR-0012.

## Status

- [x] Context files read
- [x] Plan written (this file)
- [x] Wave 1 agents launched (4 agents, 8 platforms)
- [x] Wave 2 agents launched (3 agents, 5 platforms)
- [x] All 13 `raw/*.md` files exist
- [x] REPORT.md written
- [x] HANDOFF.md written
- [x] Final pass complete

## Deliverables

- `research/title-page-ux/REPORT.md` — 13-platform research synthesis,
  information-architecture patterns, three redesign directions (A
  Letterboxd-like, B TMDB-like, C co-watching-first), comparison
  table, open questions.
- `research/title-page-ux/HANDOFF.md` — Direction C as proposed
  default (not locked), 3-ticket breakdown (S/M/M effort), schema
  deltas, component deltas, no-fly zone, evidence index. Explicitly
  flagged that Wouter has not chosen a direction.
- `research/title-page-ux/raw/*.md` — 13 per-platform evidence files,
  ~1k–1.8k words each, full citations.
- `research/title-page-ux/RUN_LOG.md` — this file.

**Total output:** ~16 markdown files, ~30k words across all
deliverables, ~200 cited sources. Read-only on the repo; no code
modified.

## Run-end timestamp

2026-05-17. Hand back to Wouter.

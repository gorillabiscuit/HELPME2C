# AniList tags — raw research

**Date:** 2026-05-17
**Why this matters to HelpME2C:** AniList is our anime-side upstream — the `MediaTag` vocabulary is literally what HelpME2C's bridge logic reaches into when matching anime to the cross-medium themes we're growing from 41 to 200+. The structure of AniList's tag categories (Theme-* vs Cast-* vs Demographic vs Sexual Content) directly governs which tags should ever be eligible as bridge candidates and which must be blacklisted at the boundary.

All citations below are pulled live on 2026-05-17 against `https://graphql.anilist.co` (anonymous GraphQL endpoint), AniList's own documentation source (`github.com/AniList/docs`), and AniList's archived submission manual (`github.com/AniList/submission-manual-old`, archived 2019 but still the canonical written-down workflow).

---

## 1. Vocabulary structure

**Faceted, single-category.** Every tag belongs to exactly one `category` string. There is no parent/child hierarchy expressed in the API — the hierarchy is fully encoded in the category name itself ("Theme-Sci-Fi-Mecha" is a leaf category that happens to read like a path, but the API treats it as an opaque string).

The canonical schema for a tag, from `AniList/docs/docs/reference/object/mediatag.md`:

| Field | Type | Description |
|---|---|---|
| `id` | Int! | The id of the tag |
| `name` | String! | The name of the tag |
| `description` | String | A general description of the tag |
| `category` | String | The categories of tags this tag belongs to |
| `rank` | Int | **The relevance ranking of the tag out of the 100 for this media** |
| `isGeneralSpoiler` | Boolean | If the tag could be a spoiler for any media |
| `isMediaSpoiler` | Boolean | If the tag is a spoiler for this media |
| `isAdult` | Boolean | If the tag is only for adult 18+ media |
| `userId` | Int | **The user who submitted the tag** |

Source: <https://raw.githubusercontent.com/AniList/docs/master/docs/reference/object/mediatag.md>

Key observations vs other taxonomies in this research run:

- `rank` is **per-tag-per-title** (0–100), not a global popularity metric. Two tags on the same title can have different ranks; the same tag on two different titles can have different ranks. This is the per-title weight-voting mechanism quoted in the spec text itself.
- `userId` is preserved — every tag attachment is attributable to the user who first attached it.
- `description` is global to the tag (not per-title), so it's a single shared explanation across every media the tag appears on.
- `isMediaSpoiler` vs `isGeneralSpoiler` is a meaningful split: e.g., "Time Travel" is a general spoiler for some shows (Steins;Gate) but not others (Doraemon).
- No fields for: synonyms / aliases, deprecation, parent_id, related_tag_ids. AniList does not model tag relationships.

Genres are a *separate enum* of 19 values, queryable via `GenreCollection` — these are the high-level filters surfaced in browse UI (Action, Adventure, Comedy, Drama, Ecchi, Fantasy, Hentai, Horror, Mahou Shoujo, Mecha, Music, Mystery, Psychological, Romance, Sci-Fi, Slice of Life, Sports, Supernatural, Thriller). Live count confirmed via `{ GenreCollection }`. Genres are not user-extensible; tags are.

---

## 2. Vocabulary size + growth

**Live count (2026-05-17):** `{ MediaTagCollection { id name category isAdult isGeneralSpoiler isMediaSpoiler description } }` returns **423 tags** across **25 distinct categories**.

Breakdown by category (live, 2026-05-17):

| Category | Count |
|---|---|
| Cast-Traits | 73 |
| Sexual Content | 67 |
| Theme-Other | 57 |
| Theme-Game-Sport | 31 |
| Setting-Scene | 23 |
| Technical | 21 |
| Theme-Fantasy | 19 |
| Theme-Arts | 14 |
| Theme-Romance | 14 |
| Cast-Main Cast | 12 |
| Theme-Drama | 11 |
| Theme-Other-Organisations | 10 |
| Setting-Universe | 8 |
| Theme-Action | 8 |
| Theme-Arts-Music | 8 |
| Setting-Time | 7 |
| Theme-Slice of Life | 7 |
| Theme-Other-Vehicle | 7 |
| Theme-Game-Card & Board Game | 6 |
| Theme-Sci-Fi | 5 |
| Demographic | 5 |
| Theme-Comedy | 4 |
| Theme-Game | 3 |
| Theme-Sci-Fi-Mecha | 2 |
| Setting | 1 |

**Flag counts:**
- `isAdult=true`: 68 tags (all 67 Sexual Content + Hentai-adjacent)
- `isGeneralSpoiler=true`: 8 tags
- `isMediaSpoiler=true`: 0 (this is a per-title attachment flag, not a global tag property — it surfaces on `Media { tags { isMediaSpoiler } }` queries, not on `MediaTagCollection`)

**Growth rate:** AniList does not publish creation timestamps for tags via the API, so growth is hard to chart externally. The "old" submission manual was archived in Dec 2019 referring to fewer tags; the current 423 represents roughly 6+ years of moderated additions on top of whatever baseline. Average net adds appear to be a few dozen per year — slow, not bursty. The submission manual explicitly says "tags should not be ones that are often considered subjective, such as 'moe', and not as descriptive as eye color" which is a *quality ceiling*, not a quantity push.

Source: <https://raw.githubusercontent.com/AniList/submission-manual-old/master/tags/tag-management.md>

---

## 3. Editorial workflow

From the archived but still-canonical `tag-management.md`:

> "Tags for each entry are entirely user-managed, with all users being able to add tags and vote on their relevance to the work in question."
> "If you wish to submit a new tag, all you have to do is type in the name and submit — it'll then be looked into and approved or denied."
> "For the most part, all tags that users' request are discussed between a few moderators and sometimes users themselves before a decision on whether to include them or not is made."

And from `moderator/moderator-tools.md`:

> "The tags page allows you to approve or deny tag requests as well as alter the **name, description, adult toggle, default spoiler toggle**, and **sort category**."
> "Pending tags are tags that users' have submitted to be approved. You'll be able to see what work it was submitted on by clicking the appropriate link."
> "In most scenarios, pending tags should be discussed with other moderators before being approved."
> "Remember that the category must be set for anything approved, and that any denied tags must have the denial reason mentioned in the description, as well as making the user aware of the reason."

**Who can do what:**
- Any verified user can attach an *existing* tag to a media entry.
- Any verified user can vote a 0–100 weight on whether a tag *applies* to a specific media.
- Any verified user can *propose* a new tag (typed into the same UI; the proposal carries the media id where it was submitted).
- Proposed tags enter a pending queue. They're invisible to non-mods until approved.
- A small group of data moderators discusses and approves/denies. From `moderator-list.md` (archived Dec 2019, the public moderator roster at the time):

| Role | Count |
|---|---|
| Lead Anime | 2 (Taluun, Retui) |
| Anime moderators | ~12 (incl. specialists for Hentai, BL) |
| Lead Manga | 1 (Mex) |
| Manga moderators | ~14 (incl. specialist for BL) |
| Lead Developer | 1 (Josh) |
| Lead Social Media | 1 (matchai) |
| Community moderators | overlapping with above |

So total *active* moderation team size circa 2019: ~25 unique humans, with maybe 5–8 active on tag work at any given time. Current size is reportedly similar order of magnitude (forum threads confirm annual "Data Moderator Applications" rounds in 2021, 2023; no public exact roster). The 2023 community-moderator applications thread is `anilist.co/forum/thread/63204`, the 2023 data-mod thread is `anilist.co/forum/thread/69113` — both indicate ongoing intake of moderators rather than a static team.

**Time per tag:** not published. The "discussed between a few moderators" phrasing implies multi-day decision-making for any non-trivial proposal. Routine ones go through faster.

Source: <https://raw.githubusercontent.com/AniList/submission-manual-old/master/moderator-list.md>

---

## 4. Tooling

**For end users — per-title tag attachment + vote UI:**
- On any anime/manga entry page, a tag list appears at the bottom-left.
- Users can:
  - Add an existing tag (autocomplete).
  - Submit a brand-new tag (free-text → pending queue).
  - Vote the tag's relevance from 0–100 (this is the `rank` mechanism).
  - Mark a tag as a spoiler for this media (the "exclamation mark icon" per the manual).
  - Remove an incorrect tag (trash icon — but power is limited to prevent abuse).

> "The power of each users' vote is limited to restrict abuse. If you feel that tags have been added incorrectly, contact a moderator." — `tag-management.md`

The "limit" is undocumented but is presumably some form of weight-by-user-trust + cap on how much a single user can swing a rank.

**For moderators — tag-management panel:**
From `moderator-tools.md`:
- "Submissions" panel — overview of outstanding tag requests, data changes, reports.
- "Tags" panel — approve/deny, edit name/description/category, flip adult and spoiler toggles.
- "Pending Spoiler Tags" — any tag a user has marked as spoiler against a specific media goes here for confirmation.

**No bulk operations are described.** No audit log is exposed publicly. The `userId` field on `MediaTag` is the closest thing to an audit hook — you can see who submitted a tag, but not who voted what.

---

## 5. Quality measurement

The per-title rank is the central quality signal:

> "**rank** — The relevance ranking of the tag out of the 100 for this media" — AniList GraphQL schema, `MediaTag.rank`.

Mechanism (inferred from API behaviour, manual quotes, and forum threads):

- Each user-vote contributes to a weighted aggregate.
- The displayed `rank` (0–100) is some form of median or weighted-mean of user votes.
- Search/filter uses a `minimumTagRank` parameter (`docs.anilist.co/reference/query`) — clients can ask for "show me only media where tag X has rank ≥ N". Default in the AniList web UI is reportedly 18% (forum thread `Increase default tag percentage when browsing`, thread/54857; second thread `Unable to change the minimum tag percentage`, thread/63062 — both point to the same default but neither I could fetch the post bodies for, so this is best-known-from-search-snippets, not first-hand verified).

**Spam handling:**
- Vote power is capped per user (quoted above).
- Tags marked as spoiler automatically re-enter the pending queue for moderator approval (this means an attacker can't quietly mark every tag as a spoiler to hide them; mods get the queue and a paper trail).
- Adult-flagged tags are hidden from default search.

**Mod-vs-community resolution:**
- Moderators can override individual users' votes by removing tags.
- Mods can also adjust the tag's global `category`, `adult` toggle, and `default spoiler` toggle — effectively re-classifying a tag for *all* media it's attached to.
- No formal appeal process is documented; the path is "contact a moderator".

**Inter-annotator agreement:**
- Implicitly measured via vote convergence on `rank`. A tag with 100 votes that all cluster at 80–90 is high-confidence; one with 5 votes spanning 10–100 is low-confidence. The API doesn't expose vote-count or variance, only the aggregated `rank`.
- This is the **single biggest information gap for downstream consumers** — HelpME2C cannot distinguish "100 voters agree this is a Time Loop story at rank 90" from "3 voters with rank 90 mean". Both look identical at the `MediaTag.rank` boundary.

---

## 6. Failure modes

**Demographic-tags-as-content-tags (the canonical AniList complaint).**
The `Demographic` category contains exactly 5 tags, live-confirmed today:

- Josei — "Target demographic is adult females."
- Kids — "Target demographic is young children."
- Seinen — "Target demographic is adult males."
- Shoujo — "Target demographic is teenage and young adult females."
- Shounen — "Target demographic is teenage and young adult males."

These are **publication-target markers**, not content descriptors. But because they live in the same `MediaTag` namespace and surface in the same tag UI as Theme-Action and Cast-Traits, end users (and naive downstream systems) treat them as content tags. Confirmed in HelpME2C's own code at `apps/web/src/inngest/functions/recommend.ts:47-54`, which explicitly blacklists `Cast-Traits`, `Cast-Main Cast`, and `Demographic` from theme generation:

```ts
// AniList's taxonomy puts cast-makeup tags under "Cast-*", marketing
// demographic targeting under "Demographic", and adult-content flags
// ... (excluded categories)
'Cast-Traits',
'Cast-Main Cast',
'Demographic',
```

This is the right call — none of those categories describe what a show is *about*. They describe who it was *sold to* or who appears in it.

**Tag-warring on contentious titles.**
The per-title rank-vote is open to anyone. Popular contentious entries (e.g., a polarising new shounen series) attract vote swings. The cap on per-user vote-power dampens but doesn't eliminate this. No public dispute log exists.

**Slow approval of new tags.**
"A few moderators discuss" is the explicit workflow. There is no SLA. Forum threads complain about pending tags sitting for weeks. This is the price of quality control: the same friction that keeps "moe" and "blue eyes" out of the canonical vocabulary also slows down legitimate additions.

**Discoverability of similar tags.**
AniList's tag namespace has no synonym links. Live example: time-related concepts are split across three categories with no programmatic relationship:

| Tag | Category | Description (truncated) |
|---|---|---|
| Time Loop | Theme-Sci-Fi | A character is stuck in a repetitive cycle that they are attempting to break out of. This is distinct from a manipulating… |
| Time Manipulation | Theme-Sci-Fi | Prominently features time-traveling or other time-warping phenomena. |
| Time Skip | Setting-Time | Features a gap in time used to advance the story. |
| Travel | Theme-Other | Centers around character(s) moving between places a significant distance apart. |

A user searching for "Time Travel" finds *no exact match* — they have to know it lives under "Time Manipulation". Downstream consumers like HelpME2C either alias these themselves or miss bridges.

**Subjective / overly granular tags are explicitly rejected.**
> "Ideally, tags should not be ones that are often considered subjective, such as 'moe', and not as descriptive as eye color."

This is a *deliberate quality bar* — the moderation team has chosen to keep the vocabulary tight rather than let it sprawl into IMDb-keyword territory (47k uncurated). The cost: AniList has 423 tags where IMDb has 47k; the benefit: every AniList tag has a definition and a category. (See `imdb-keywords.md` in this run for the alternative model.)

---

## What this means for HelpME2C's upstream

Bridge-candidacy rules driven by category:

| AniList category | Bridge candidate? | Why |
|---|---|---|
| Theme-Action, Theme-Adventure, Theme-Comedy, Theme-Drama, Theme-Fantasy, Theme-Horror, Theme-Mystery, Theme-Romance, Theme-Sci-Fi, Theme-Slice of Life, Theme-Sports, Theme-Supernatural | **Yes** | These are what a show is about — exactly the surface area we want to bridge to film/TV themes. |
| Theme-Game-*, Theme-Arts-*, Theme-Other-Organisations, Theme-Other-Vehicle | **Yes, narrowly** | Specific enough to anchor a bridge (e.g., "Mecha" → giant-robot live-action). Be careful with one-off Theme-Other tags. |
| Setting-Universe, Setting-Scene, Setting-Time | **Yes, narrowly** | Setting-as-theme is a legitimate cross-medium bridge ("Post-Apocalyptic", "Dystopia", "Cyberpunk"). |
| Cast-Traits, Cast-Main Cast | **No** | Cast-makeup is not theme. Already blacklisted in `recommend.ts`. |
| Demographic | **No** | Publication target ≠ content. Already blacklisted. |
| Sexual Content | **No** | Adult-only / NSFW; out of scope for a general recommender. Already gated by `isAdult`. |
| Technical | **Maybe** | Style markers ("Achromatic", "4-koma") rarely bridge across mediums but a few might ("Anthology" if it exists). Review case-by-case. |

**Trust the `rank`.** Use `minimumTagRank` of at least 50 (probably 60–70 for bridge anchors) — anything below 50 is "a handful of users thought this *kind of* applies" and will produce noisy bridges. AniList itself defaults the browse UI to 18% which is too permissive for our purpose.

**Don't trust the lack of synonyms.** Time Loop / Time Manipulation / Time Skip are all separate AniList tags but represent overlapping HelpME2C themes. Maintain a curated synonym map at the HelpME2C boundary; do not assume AniList will ever add one.

**Inherit AniList's quality ceiling, don't try to exceed it.** AniList has spent a decade enforcing "no subjective / no overly-granular" with a paid-attention moderator team. We should not try to second-guess their no-list ("moe", "eye colour") by adding our own anime-side tags. The job is to bridge what's already there, not to expand the vocabulary on their side.

---

## Transferable to HelpME2C? — verdict per aspect

| Aspect | Transferable? | Notes |
|---|---|---|
| Vocabulary structure (single category per tag, no hierarchy) | **Yes** | Maps cleanly to HelpME2C's flat theme table. |
| Per-title weight voting (`rank` 0–100) | **Maybe later** | Strong mechanism but requires real user volume. Not viable in Phase 1A (single curator). Hold as Phase 2+ extension. |
| Moderator pending-queue + category-assignment workflow | **Yes** | If we ever open theme contributions to anyone beyond Wouter, this is the model: type the tag, mod sets category before approving. The "category must be set" rule from `moderator-tools.md` is exactly the discipline we'd want. |
| Per-tag descriptions (free-text, global) | **Yes — adopt immediately** | Every HelpME2C theme should have a one-sentence description. AniList's are 80–150 chars and read like a dictionary; that's the right voice. |
| Spoiler flags (general + per-attachment) | **Partial** | `isGeneralSpoiler` is useful (a few HelpME2C themes will be inherent spoilers — e.g., "Twist Ending"). The per-attachment flag is overkill for Phase 1A. |
| Adult flag | **Yes** | We need this anyway for any tag where the bridged film/TV side is 18+. |
| Subjective-tag rejection ("no 'moe'") | **Yes — adopt as a §3 banned-pattern of theme-bridge expansion** | "Cute girls doing cute things" is a vibe, not a theme. The discipline of refusing those is what stops 41 → 200 from becoming 41 → 2000 garbage. |
| User-submission UI with autocomplete | **Not yet** | Single-curator phase. Revisit when we open theme proposals to power users. |
| No synonyms in the canonical model | **Reject — do the opposite** | Maintain a curated synonym map at the bridge boundary. AniList's lack of synonyms is a known failure mode for downstream consumers; we're a downstream consumer. |

---

## Sources

- AniList GraphQL endpoint, live query 2026-05-17: `{ MediaTagCollection { id name description category rank isGeneralSpoiler isMediaSpoiler isAdult } }`
- AniList MediaTag schema: <https://raw.githubusercontent.com/AniList/docs/master/docs/reference/object/mediatag.md>
- AniList TagStats schema: <https://raw.githubusercontent.com/AniList/docs/master/docs/reference/object/tagstats.md>
- AniList tag-management manual (archived but canonical): <https://raw.githubusercontent.com/AniList/submission-manual-old/master/tags/tag-management.md>
- AniList moderator tools manual: <https://raw.githubusercontent.com/AniList/submission-manual-old/master/moderator/moderator-tools.md>
- AniList moderator list (Dec 2019 snapshot): <https://raw.githubusercontent.com/AniList/submission-manual-old/master/moderator-list.md>
- AniList docs site (rendered): <https://docs.anilist.co/reference/object/mediatag> (403 to most clients; backed by the GitHub source above)
- AniList Community Moderator Applications 2023: <https://anilist.co/forum/thread/63204>
- AniList Data Moderator Applications 2023: <https://anilist.co/forum/thread/69113>
- AniList forum: "'Tags' in the 'Genre' filter are so confusing!!!": <https://anilist.co/forum/thread/50473>
- AniList forum: "Unable to change the minimum tag percentage": <https://anilist.co/forum/thread/63062>
- AniList forum: "Increase default tag percentage when browsing": <https://anilist.co/forum/thread/54857>
- HelpME2C internal: `apps/web/src/inngest/functions/recommend.ts:47-54` (the demographic-block)

**Gaps and caveats:**
- All forum thread bodies returned 403 to WebFetch and curl (Cloudflare bot wall). Tag-warring detail, exact mod team size in 2026, and live tag-rank quality complaints from 2024-2025 are sourced from search snippets only, not first-hand reading. The structural claims (schema, manual, moderator list, live counts) are all primary-source.
- The "18% default" minimum tag rank in the AniList browse UI is search-snippet-confirmed but not verified against the live web UI in this run.

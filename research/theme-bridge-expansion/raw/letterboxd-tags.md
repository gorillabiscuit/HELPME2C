# Letterboxd tags + Showdown lists — raw research

**Date:** 2026-05-17
**Why this matters to HelpME2C:** Letterboxd is the closest live analogue to "what does a small editorial team actually do all day" for film. It's Auckland-based, founder-led, with a small core team and a layered editorial product (HQ-curated lists, a fortnightly Showdown competition, a Journal magazine, podcasts). It does **not** run a personalised recommender. It runs editorial. That's the model HelpME2C's curation function should be benchmarked against — not Netflix's ML, not IMDb's keywords-by-volume.

The big caveat going in: Letterboxd is *not* a tag-on-films system in the way AniList is a tag-on-anime system. Films inherit genres from TMDB; user tags on films exist but live alongside reviews and lists; the editorially interesting tag activity is on **lists**, not films. This file makes that distinction throughout.

---

## 1. Vocabulary structure

**Three separate tag-like surfaces, each governed differently:**

### (a) Genres — inherited from TMDB
- Films on Letterboxd display a fixed set of genres (Action, Drama, Comedy, etc.).
- These come from TMDB and Letterboxd does not allow user editing of film genre.
- Roughly 19 genres, mirroring TMDB's film genre list.
- Not a tag system; a fixed enum from upstream.

### (b) User tags on films, reviews, and diary entries
- Free-text, user-applied. Per Letterboxd's help docs ("How do tags work?", `letterboxd.zendesk.com/hc/en-us/articles/15179274026639-How-do-tags-work`, paywalled by Cloudflare to direct fetches but confirmed via search snippets and the Letterboxd Journal Tag Team post):

> "You can tag films (when reviewing and/or adding them to your diary) and curated lists. Use tags as you would on a blog or on X/Twitter — to add context to your content. Tags may reflect your own genre taxonomy, an occasion or festival, where/how/with whom you saw a film, the type or style of a list, or anything else you care to use them for."

- These are **personal organisation tools** — they don't aggregate into a public per-film tag cloud the way AniList does. My tag `with:mom` on a film is visible to me; you can find it via my profile or via a search of all `tag:with:mom` activity, but it's not on the film page as a property of the film.

### (c) List tags — the editorially interesting surface
- A user creates a list ("Best films I watched in lockdown") and tags it with keywords (e.g. `thriller`, `underseen`, `directorial-debut`, `personal`).
- These tags drive Showdown (see §3) and feed Letterboxd's "browse lists by tag" surface.
- The Showdown machinery *requires* a specific list tag chosen by HQ for each fortnight.

### Per-tag metadata
- **Nested tags supported**: `with:mom`, `with:dad`, `loc:cinema`, `fest:nzff2024`. The colon creates a faceted namespace that aggregates via `tag:with` searches. This is a clever, lightweight faceting model — no top-down hierarchy, but conventions emerge.
- **Stats-impacting tags**: a small reserved vocabulary that Letterboxd's stats engine reads. Per their docs:
  - `topstats` → builds the user's "All-Time Favorites" list on the All Stats page.
  - `allstats` → adds a featured list to the All Stats page.
  - `yir2023`, `yir2024`, etc. → adds featured lists to the Year-in-Review for that year.
- **Spoiler flag** exists on reviews/diary entries (`containsSpoilers`), but is not a per-tag property.
- **No NSFW flag at the tag level**; adult content is gated at the film level (`showAdultContent` user setting).
- **No tag descriptions.** Tags are bare strings; you discover what `topstats` means from documentation, not from the tag itself.

---

## 2. Vocabulary size + growth

**Genres:** 19 (inherited, fixed).

**Film tags + list tags:** uncountable / open vocabulary. Letterboxd does not publish a canonical tag list because every user makes their own. There is no `MediaTagCollection`-equivalent endpoint.

This is structurally the *opposite* extreme from AniList:

| | AniList | Letterboxd |
|---|---|---|
| Tag vocabulary | Closed (423) | Open (∞) |
| Tag governance | Moderator-approved | Unmoderated |
| Per-attachment weight | Yes (rank 0–100) | No |
| Per-tag metadata | Description, category, flags | None (except 3 reserved stats-tags) |
| Discoverability surface | Browse by tag, filter media | Browse lists by tag, Showdown leaderboard |

**Growth:** the *list tags* vocabulary grows organically with every new Showdown (each Showdown introduces 1 new canonical tag the editorial team coins) and with every user list. There is no curated growth process.

---

## 3. Editorial workflow

Letterboxd's editorial workflow is documented mostly through behaviour rather than published rules. The most concrete artefact is the Showdown system.

### Showdown — fortnightly editorial challenge

From the Showdown page intro (`letterboxd.com/showdown/`, live-fetched 2026-05-17):

> "Each fortnight we suggest a topic and challenge you to make (and tag) a list that meets our criteria. Every second Thursday after 8pm Pacific we publish a consensus from all submitted lists, and announce a new topic for the following fortnight. Lists can be any length but only the first ten films (and their ranking in your list) count towards the result."

Mechanics:
1. **HQ picks a topic.** A small editorial cohort at Letterboxd HQ (Auckland) picks a fortnightly theme. Recent topics live-confirmed from the Showdown page include:
   - "Best film detectives"
   - "Best contemporary costuming in film"
   - "Best directorial debuts by actors"
   - "Best video-game adaptation"
   - "Best ensemble casting"
   - "Best films with punctuation in title"
   - "Best underseen romance films"
   - "Best films set on islands"
   - "Best 3D films"
   - "Best scenes in movie theaters"
   - "Best LA noir films"
   - "Best underseen horror films"
   - "Best horror sequels"
   - "Best movie monologues 2.0"
   - "Best films with job-title titles"
   - "Best remakes, revisited"
   - "Best conspiracy thriller films"
   - "Creepiest kids in film"
   - "Best Japanese horror films"
   - "Best mockumentary films"
   - …78+ historical topics visible on the public page
2. **HQ coins a canonical tag** for the topic (e.g., `showdown-detectives`).
3. **Users make and tag lists** during the fortnight. The list must use the canonical tag to be eligible.
4. **Borda-style consensus**: only the first 10 films in each ranked list count. Films aggregate via their ranks across all participant lists.
5. **HQ publishes the consensus list** the following second Thursday.

This is editorial-as-game-mechanic. The work HQ does per Showdown is small (pick topic, coin tag, write up the result), but it produces dozens of high-quality community-aggregated rankings per year.

### HQ-curated "Official" lists
- The `/official/` profile is the home of curated lists explicitly maintained by Letterboxd staff and trusted community contributors (per search results for the Official Lists profile, fetched 2026-05-17).
- Individual staff members (e.g., Dave Vis, per public list ownership) maintain specific lists.
- The Letterboxd team also runs the "Top 250" list, the "Top 1000 narrative feature films" list, and various seasonal lists.

### The Journal (editorial magazine)
- `letterboxd.com/journal/` publishes interviews, festival coverage, lists, and "Life in Film" features.
- Editorial team confirmed via search results includes:
  - **Mitchell Beaupre** — Head of Editorial (per Critics Choice Association bio, search-snippet-confirmed).
  - **Gemma Gracewood** — editorial / podcast (also publishes the "Top 25" feature with Jack Moulton).
  - **Jack Moulton** — editorial.
  - **Brian Formo** — editorial (per Best in Show podcast transcripts).
  - **Mia Vicino, Aaron Yap, Ella Kemp** — appear as Journal contributors / podcasters.
- Founders **Matthew Buchanan** (CEO/Co-Founder) and **Karl von Randow** (CTO/Co-Founder) — confirmed live on `letterboxd.com/about/crew/` (the *only* two crew members the public crew page returns to unauthenticated clients; the rest of the team is gated). The meta-description of that same page reads:

> "Letterboxd is crafted by a small team in Auckland, Aotearoa New Zealand, with help from additional crew in Los Angeles, New York, Philadelphia, Delaware, Toronto and London. An extended team list (including editorial contributors) is on our official HQ page."

### Team size
- Wikipedia (`en.wikipedia.org/wiki/Letterboxd`, fetched 2026-05-17): "In September 2023, the company had 16 full-time and 12 part-time employees."
- Tiny acquired 60% in Sept 2023, valuing the company at ~$50–60M. Founders Buchanan and von Randow continue to lead it.
- Total team size by mid-2026 is reportedly slightly larger but still in the dozens, not hundreds. Compare: AniList runs entirely on volunteer moderators with maybe ~25 active humans.

### Editorial roles: paid vs volunteer
- Letterboxd's editorial team is **paid staff** (employed by Letterboxd Limited).
- The Patron tier directory and HQ accounts are paid by users to *join* — not paid by Letterboxd to do editorial work. HQ accounts (studios, festivals, podcasts) get a dashboard and the ability to publish "stories" but they're not editorial contributors to Letterboxd's voice; they're branded participants.
- Compare AniList where moderation is fully volunteer.

---

## 4. Tooling

### For a regular user tagging a film / list
- **Diary entry form** (live-confirmed in `/showdown/` HTML, which embeds the diary modal): the form has a `tags` field with the autocomplete URL `/s/autocompletetags` and placeholder `"eg. netflix"`. So tag autocomplete is built into the diary form. Live HTML attribute:
  ```html
  <input type="text" id="frm-tags" class="tag-input-field field" name="tags"
         placeholder="eg. netflix" data-url="/s/autocompletetags" />
  ```
- Autocomplete is per-user (your own tag history surfaces first) and global (popular tags also surface).
- Spoiler flag is a checkbox on the same form (`containsSpoilers`).
- Privacy selector on the diary entry (Anyone / Friends / You).

### For a Pro/Patron user managing tags
- A dedicated "Tags" section in profile lets Pro users manage and rename tags across all their content.
- Lists tab shows tagged lists as "folders" — letting Pro users use tags as folder substitutes.

### For HQ / editorial staff
- HQ accounts get a dashboard to publish "stories" (in-platform news articles) and "links" (off-platform content) into followers' activity feeds.
- The Showdown system is presumably driven by an internal admin UI that pins a topic + canonical tag and renders the leaderboard — but this is HQ-only, not publicly documented.

### Bulk operations
- Pro/Patron tier lets users bulk-add films to lists (`canBulkAddToLists` global flag in the Letterboxd JS confirms this is a paid feature).
- Free-tier users can't bulk-add.

### Audit log
- No public audit log.
- Stats pages indirectly serve as one — Pro users can see what they've tagged over time.

---

## 5. Quality measurement

There is **no per-tag-per-film weight voting** on Letterboxd. The quality signal lives somewhere else entirely:

### List-level Borda consensus (Showdown)
- For each Showdown, the consensus list is computed across all submitted lists: only top-10 from each, ranked.
- Films that appear in many lists at high positions win. This is a Borda count over user-submitted ordered ballots.
- Spam/sockpuppet handling: not documented publicly, but only registered accounts can submit lists; Showdown participants tend to be engaged Letterboxd users (self-selecting for non-spam).

### Like-counts on lists and reviews
- Every list and review has a like count. This is the dominant social-proof signal across the site.
- Editorial lists in `/official/` accumulate likes over years; trending lists surface them in the activity feed.
- Like-counts don't feed back into film-level metadata directly; they're a list-discovery signal.

### Average rating per film
- The five-star (with half-stars) rating is the canonical per-film quality signal. Computed by Letterboxd, displayed to all users.
- Pro users can see friends' average ratings as a filter.
- No tag-level rank equivalent.

### Spam handling at the tag level
- Letterboxd doesn't moderate tags. If a user tags a list `garbage`, that's their list, their tag.
- Spam comes in via review spam, fake accounts, etc. — handled by moderation team, not tag-system.

### Inter-annotator agreement
- Implicit through Showdown's Borda aggregation. If 500 users submit "Best film detectives" lists and 300 put *Chinatown* in the top 3, that's strong agreement.
- Implicit through list-level likes: highly-liked editorial lists become canonical.
- Letterboxd does not publish agreement metrics.

---

## 6. Failure modes

**Open tag vocabulary = no taxonomy.**
The good: anyone can tag anything any way. The bad: there is no shared vocabulary. Three users might tag the same kind of list `slow-cinema`, `slow_cinema`, and `slow cinema` (or `mubi-vibes`, `arthouse`, `tarkovsky-likes`). Discoverability of similar tags is essentially user-driven; there's no synonym layer. The Showdown machinery routes around this by *requiring* HQ's canonical tag — but outside Showdown, list-by-tag browse is messy.

**No tag descriptions = no shared definition.**
The reserved stats-tags (`topstats`, `allstats`, `yir2024`) are documented in help articles. Everything else is tribal knowledge. New users see other people's tags but don't know what conventions to follow.

**No per-tag weight = no relevance signal.**
A film tagged `noir` by one user shows up in `tag:noir` searches with no weighting. A film tagged `noir` by 10,000 users shows up identically. Without per-attachment weight, there's no way to surface canonical noir films via tag-search — Letterboxd works around this by routing canonical-noir queries through list-discovery and editorial lists, not through tag-search.

**Editorial bottleneck on canonical lists.**
The official Top 250, the seasonal lists, the Showdown results — all flow through HQ. Wait time for new lists is gated by editorial bandwidth, not community throughput. The Cultured Mag profile and Idealog interviews (search-snippet-confirmed) describe a deliberate "slow culture" stance at Letterboxd HQ: they specifically resist algorithmic recommendation and lean into editorial as differentiation.

**List spam / list-as-marketing.**
HQ accounts (studios, distributors) can publish lists that are effectively promotional. Letterboxd's defence is editorial labelling (HQ accounts are visually distinguished, can't have public watchlists, can't have favourite films) — i.e., quarantine rather than block.

**Tag-warring is not really a thing on Letterboxd** because tags don't aggregate to the film. The closest equivalent is review-bombing a film's rating, which is a different surface and which Letterboxd handles via flagging/moderation rather than the tag system.

**The "consensus" in Showdown is whatever the engaged minority votes.**
Showdown participation is in the low thousands of lists per fortnight on a 26M-user platform. Self-selecting cinephiles dominate. This is fine for editorial purposes — it produces interesting results — but the "consensus" is a particular slice of the community, not a representative sample. Letterboxd is honest about this implicitly by framing it as a "challenge", not a poll.

---

## What this means for HelpME2C

Letterboxd is a useful **negative example** as much as a positive one. The product question for HelpME2C is "how does one curator (Wouter) grow themes from 41 to 200+ without poisoning the engine?" Letterboxd's answer to a similar question is: *don't have a closed theme system at all; have an open tag system that nobody really uses for discovery, and put the editorial work into fortnightly curated competitions + a magazine.* This is a viable answer but it's a different product.

The transferable patterns:

1. **HQ-canonical-tag-per-topic.** Showdown's trick of coining one canonical tag per topic and using that as the join key is exactly the pattern HelpME2C should use for its bridge themes. One canonical theme slug, one description, no synonym proliferation. The synonym layer lives separately.
2. **Fortnightly cadence.** Letterboxd's 14-day Showdown cycle is a useful tempo. New themes shipping monthly would be too slow; weekly too noisy. Fortnightly forces editorial discipline without burnout.
3. **Top-10-only counting.** When aggregating user contributions to a theme (if we ever do), only the top-N counts. This is a Borda-style discipline that beats raw vote counts.
4. **Editorial leadership stays small.** Letterboxd at 16 full-time + 12 part-time runs the largest film social network on the planet. A small editorial cohort with strong taste beats a large content-moderation team. The HelpME2C single-curator phase is *not weird*; it's structurally similar to how Letterboxd's editorial voice was for years.
5. **Reject algorithmic recommendation as the spine.** Letterboxd's deliberate stance is editorial-first, list-driven, with algorithm in a supporting role. HelpME2C's value proposition (cross-medium theme bridges) is also editorial-first; it should resist being framed as "a smarter recommender" and lean into "a curated theme bridge map".

The patterns we should *not* transfer:

1. **Open user-tag vocabulary on films.** We have a closed theme system on purpose. The whole point of bridge themes is canonical anchors. Letting users tag freely would defeat it.
2. **No per-tag descriptions.** Inherit AniList's discipline here, not Letterboxd's lack of one.
3. **No per-attachment weight.** AniList's `rank` is the right call; Letterboxd's none-is-OK is wrong for our use case.

---

## Transferable to HelpME2C? — verdict per aspect

| Aspect | Transferable? | Notes |
|---|---|---|
| Open tag vocabulary on films | **No** | We're a closed theme system on purpose. |
| List-level tag system (Showdown-style) | **Yes — adopt for theme campaigns** | If we ever want community-aggregated rankings *within* a theme ("Top 10 conspiracy thrillers"), Showdown's mechanic is the template. |
| HQ-canonical-tag-per-Showdown | **Yes — directly applicable** | One canonical theme slug; synonyms live in a separate map. |
| Borda-style top-10 counting | **Yes — adopt if/when we do user aggregation** | Stops single-vote spam and forces real ranking work. |
| Fortnightly editorial cadence | **Yes** | The right tempo for a single-curator phase. |
| Nested tag namespaces (`with:mom`) | **Maybe** | Lightweight faceting via colon-convention. Could work for theme aliasing (`theme:detective-noir`, `theme:detective-cosy`) but introduces parsing complexity. Hold. |
| No tag descriptions | **No** | AniList's discipline beats this. Themes need descriptions. |
| No per-attachment weight | **No** | AniList's rank wins. |
| Genres inherited from upstream (TMDB) | **Already doing it** | HelpME2C uses TMDB for the film/TV side. Same model. |
| Stats-impacting reserved tag vocabulary | **Maybe** | A small reserved-tag namespace for HelpME2C theme metadata (e.g., `theme:emerging`, `theme:retired`) might be useful but is premature. |
| Editorial-first product positioning | **Yes — this is the differentiator** | Cross-medium theme bridges as a curated map, not as a black-box recommender. Matches Letterboxd's positioning relative to Netflix. |
| Auckland-style small-team scaling (16+12 humans, no algorithm) | **Yes — encouraging data point** | A single curator (Wouter) can credibly run the theme-bridge growth without scaling staff if the cadence and quality bar are right. |
| HQ-account publisher model (studios, festivals) | **Not yet — Phase 2+** | If HelpME2C ever opens curator-tier accounts to anime studios or streamers, the HQ model is a good template (dashboard, no public watchlist, branded stories). Not needed in Phase 1A. |

---

## Sources

- Letterboxd Showdown page, fetched 2026-05-17: <https://letterboxd.com/showdown/> (intro paragraph + 78+ recent topic titles confirmed in HTML)
- Letterboxd Crew page meta-description, fetched 2026-05-17: <https://letterboxd.com/about/crew/> ("crafted by a small team in Auckland, Aotearoa New Zealand…")
- Letterboxd Wikipedia entry, fetched 2026-05-17: <https://en.wikipedia.org/wiki/Letterboxd> ("In September 2023, the company had 16 full-time and 12 part-time employees")
- University of Auckland alumni profile on the founders: <https://www.auckland.ac.nz/en/news/2023/11/07/letterboxd-founders-smash-hit.html>
- NZ Herald on the Tiny acquisition: <https://www.nzherald.co.nz/business/hollywood-ending-letterboxd-founders-sticking-around-for-the-sequel-after-83m-deal/GRR62WY62JB2ZGUZFE3P4B6SKM/>
- Variety on Letterboxd founders selling: <https://variety.com/2023/digital/news/letterboxd-founders-sell-company-adding-tv-shows-1235746156/>
- Idealog on Letterboxd's small-team approach: <https://idealog.co.nz/venture/2023/02/letterboxd-the-kiwis-behind-cinemas-most-influential-platform>
- Cultured Magazine profile of founders: <https://www.culturedmag.com/article/2026/04/23/film-letterboxd-founders-matthew-buchanan-karl-von-randow/>
- Letterboxd help docs — "How do tags work?": <https://letterboxd.zendesk.com/hc/en-us/articles/15179274026639-How-do-tags-work> (search-snippet-confirmed; direct fetch blocked by Cloudflare)
- Letterboxd Journal — "Tag Team: how to optimize your Letterboxd activity with the simple art of the tag": <https://letterboxd.com/journal/tag-team-how-to-use-letterboxd-tags/> (search-snippet-confirmed; direct fetch blocked)
- Letterboxd Official Lists profile: <https://letterboxd.com/official/>
- Letterboxd HQ accounts page: <https://letterboxd.com/about/hq/>
- Letterboxd Pro/Patron page: <https://letterboxd.com/pro/>
- Mitchell Beaupre — Head of Editorial (via Critics Choice Association bio, search-snippet-confirmed): <https://www.criticschoice.com/2025/09/04/mitchell-beaupre/>
- Letterboxd Crew Faves of 2021 podcast transcript: <https://letterboxd.com/about/podcast-transcripts/episode-224-crew-faves-of-2021/>

**Gaps and caveats:**
- Full crew roster blocked behind JS-rendered authentication. Only co-founders (Matthew Buchanan, Karl von Randow) are visible to unauthenticated clients on `/about/crew/`. Named editorial staff (Mitchell Beaupre as Head of Editorial, Gemma Gracewood, Jack Moulton, Mia Vicino, Brian Formo, Ella Kemp, Aaron Yap) are confirmed from external bios + Journal bylines + podcast transcripts — but the *exact current* team-size in 2026 is not first-hand verified beyond Wikipedia's Sept-2023 figure (16 FT + 12 PT).
- Letterboxd help-centre and Journal articles return Cloudflare 403 to direct fetches; content above is search-snippet-confirmed. The structural claims (Showdown rules, Showdown topics list, tag autocomplete URL in the diary form, founders, Auckland HQ, Tiny ownership) are all primary-source from live-fetched HTML.
- Showdown participation volume (lists per topic) is not published; my "low thousands per fortnight" is inferred from the leaderboard granularity, not measured.
- No Letterboxd ADR or RFC equivalent exists publicly. Editorial workflow is reconstructed from behaviour + interviews, not from spec docs.

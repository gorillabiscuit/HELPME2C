# Platform: TMDB (themoviedb.org)

**One-line key takeaway:** TMDB renders the same metadata HelpME2C consumes from `/movie/{id}` as a single-column page with a hero band, top-billed cast carousel, a clearly-labelled "Recommendations" carousel (collaborative filtering) plus a weaker "Similar" carousel (keywords + genres), and a right-rail "Facts" panel — with keywords pushed all the way to the page footer as a tag cloud.

## Information hierarchy

### Above the fold (no scroll)
- Poster on the left, title + year + certification + release date + genres + runtime on the right.
- A circular user-score gauge (percentage, colour-coded green/yellow/red) with a row of action icons: list, heart (favourite), bookmark (watchlist), star (rate), plus a "Play Trailer" text link.
- Tagline immediately above the synopsis.
- Director/writer/creator credits sit directly under the synopsis (one or two named people, not a full crew dump).
- A "Where to Watch" / JustWatch line ("Now Streaming — View Offers") often sits just below the poster ([TMDB Talk on JustWatch placement](https://www.themoviedb.org/talk/62eb3ba2273648005d9c8845)).

### Mid-page (one scroll)
- "Top Billed Cast" — horizontal carousel of ten actors with headshots, character names, and a "Full Cast & Crew" link out.
- "Social" panel with tabs for Reviews and Discussions, showing counts.
- "Media" panel with tabs: Most Popular / Videos / Backdrops / Posters, each with a count badge.
- "Recommendations" — horizontal carousel of poster cards. Per TMDB staff, this uses collaborative filtering on user ratings + favourites and is "the very same method we use here on the website" ([Travis Bell, TMDB Talk](https://www.themoviedb.org/talk/59efc7fcc3a3680682004dba)).

### Bottom of page (deep scroll)
- A "Similar Movies" carousel below Recommendations, built from keyword and genre overlap — TMDB itself describes this as "an old, and largely not that great method" and steers consumers toward Recommendations instead ([TMDB Talk](https://www.themoviedb.org/talk/59efc7fcc3a3680682004dba)).
- The right-rail "Facts" stack: Status, Original Language, Budget, Revenue, plus original-title and (sometimes) network/keywords for TV.
- A dedicated "Keywords" tag-cloud section at the very bottom of the main column (verified on the live `/movie/496243-parasite` page) — these are clickable pill links into discovery queries, not part of the hero.
- Contribute / Edit prompts (logged-out users see "Login to edit").

## Sections present (top → bottom, with verbatim names)

1. Hero band — poster, title, metadata row, user score gauge, action icons, "Play Trailer"
2. Where to Watch (JustWatch "Now Streaming — View Offers" link)
3. Tagline + Overview
4. Top-line credits (director / writers — 2–3 names, not full crew)
5. Top Billed Cast (carousel)
6. "Full Cast & Crew" link
7. Social (Reviews / Discussions tabs)
8. Media (Most Popular / Videos / Backdrops / Posters tabs)
9. Recommendations (carousel)
10. Similar Movies (carousel)
11. Right rail: Facts (Status, Original Language, Budget, Revenue, Original Title)
12. Right rail: Keywords (tag cloud) — and a duplicate Keywords block at very bottom of main column
13. Right rail: Content Score, Top Contributors, Edit prompt

## Primary user actions (in visual prominence order)

1. Play trailer (text link adjacent to the user-score gauge)
2. Rate (star icon — opens a sliding 10-point rater)
3. Watchlist (bookmark icon)
4. Favourite (heart icon)
5. Add to list (list icon)
6. Click a "Where to Watch" provider tile (deep-links to JustWatch)
7. Click a poster in Recommendations / Similar / Top Billed Cast
8. Click a keyword pill to jump to a discovery search
9. Edit (only for logged-in contributors)

## How recommendations are surfaced

TMDB ships **two separate carousels** with deliberately different labels. "Recommendations" comes first and is a collaborative-filtering output over user ratings and favourites — TMDB staff are explicit that this is the better surface and the one used on the site itself. "Similar Movies" appears below it and is a content-based keyword/genre overlap, and TMDB staff openly describe it as legacy and weaker ([TMDB Talk thread, Travis Bell](https://www.themoviedb.org/talk/59efc7fcc3a3680682004dba)). Both render as horizontal carousels of poster cards with title, year, and user-score badge — no explanation of *why* a given title was recommended (no shared-keyword chips, no "because you also liked…"). The distinction between the two algorithms is visible to power users via the section headers, but a casual visitor has no in-page explanation of what the labels mean.

## How "where to watch" is shown

TMDB embeds JustWatch data as a "Now Streaming — View Offers" callout placed just below the poster in the hero band, so it sits in the first viewport on most desktops ([TMDB Talk](https://www.themoviedb.org/talk/62eb3ba2273648005d9c8845)). The link opens a JustWatch page in a new tab with Stream / Rent / Buy options, region-aware. TMDB does not expose this composite widget through the public API — the website uses JustWatch's branded UI directly, and consumers of the TMDB API have to hit `/watch/providers` and build their own widget. JustWatch's feed into TMDB is documented as at least 24h behind the JustWatch site itself for new releases.

## Logged-in vs logged-out

Logged-out users see all data but the action icons (rate, watchlist, favourite, list) prompt a sign-in modal on click. Edit / Contribute links are replaced with "Login to edit" CTAs. Logged-in users see their own rating reflected in the score gauge area and watchlist/favourite icons render as "active" state when toggled. The Recommendations carousel does **not** appear to personalise based on the logged-in user's history — it's the same global collaborative-filtering output for every viewer, anchored on this title only.

## Visible failures and complaints

The Google Play app reviews surface a recurring theme: list / watchlist / favourite functionality breaks with an unhelpful "Oops! Something went wrong. Please, try again later." error ([Trustpilot reviews, themoviedb.org](https://www.trustpilot.com/review/themoviedb.org); search summary covered in the TMDB UX search results). Multiple users complain the rating shown on TMDB sometimes mirrors Rotten Tomatoes critic scores rather than the TMDB community score, which erodes trust in the headline number on the page ([Firecore thread](https://community.firecore.com/t/tmdb-rating-is-just-rotten-tomatoes-10-bug/51367)). On Trakt forums, long-running complaints describe TMDB moderation as slow and unresponsive — wrong metadata gets stuck on title pages with no clear correction path ([Trakt Forums: "Let's talk about TMDB"](https://forums.trakt.tv/t/lets-talk-about-tmdb/14040?page=2)).

A separate complaint pattern: keywords are user-contributed and unmoderated for quality, which produces the bottom-of-page tag cloud (see live Parasite page — "dark comedy", "con artist", "social commentary", "oscar winner" sit next to dozens of less useful tags). TMDB itself notes that the Similar Movies carousel built on top of these keywords yields weak results ([TMDB Talk, Travis Bell](https://www.themoviedb.org/talk/59efc7fcc3a3680682004dba)), which is effectively an admission that the raw keyword corpus isn't a clean enough signal for content-based recs on its own.

## Wireframe-style description of the hero band

Two-column band, ~480px tall. Left column: poster image at fixed aspect, ~300px wide. Right column top-to-bottom: title in display weight with year in parentheses + small certification chip + release date + genre pill row + runtime, all on one wrap-friendly metadata line; below that the circular user-score gauge (percentage with a coloured ring) sitting in a row with five icon-button affordances (list, favourite, watchlist, rate, play-trailer text). Tagline in italic muted text. Three-to-four-line overview paragraph. One line each for director and writers. The JustWatch "Now Streaming on X" pill sits just below the poster in the left column, so the right column doesn't get cluttered with commerce.

## What HelpME2C could learn

**Keywords deserve more than a tag-cloud footer.** TMDB hides its richest signal — the keyword corpus that HelpME2C uses as the basis for its theme taxonomy — at the bottom of the page where it gets ignored. HelpME2C already does better than this with the dedicated Tags card in the mid-column, but the lesson is sharper than "put tags higher up": *the chips can be the entry point to cross-medium discovery.* TMDB doesn't let you click "dark comedy" and get TV + film + anime back; HelpME2C can, because its BridgeCard component is built around that exact pivot. The tags-as-navigation pattern is the moat made visible.

**Two clearly-labelled recommendation carousels is a viable pattern, but the labels must be honest.** TMDB ships "Recommendations" and "Similar" with zero in-page explanation of what the difference means, and the only people who know the answer are those who've dug through the staff forum. HelpME2C should not replicate this. If there are multiple rec strips (e.g. "More with the same themes" vs "Watched by similar groups" vs a future collaborative-filter), each needs a one-line micro-copy explanation under the heading — the kind of "why am I seeing this?" affordance TMDB pointedly lacks. The right-rail Facts pattern itself is borrowable for the title detail page: collapsible into the mid-page on mobile, fixed on desktop, with the cross-medium tag list pulled up into it.

**The missing surface: group entry points.** TMDB has zero group-rec affordance. There's no "watch with…" pivot, no "is this a couch-co-watch pick?" signal — the entire UX assumes a solo viewer. HelpME2C's second moat (group recs / ghost-profile inference) is wide open here precisely because every comparable title page in the market is single-viewer. Adding a "Will this work for our group?" button to the hero — sitting where TMDB puts "Play Trailer" — would be a category-distinct action that nobody else has, and the cost is small because the data is already inferable from the registered group context.

## Sources

- [Parasite (2019) on TMDB](https://www.themoviedb.org/movie/496243-parasite)
- [Inception (2010) on TMDB](https://www.themoviedb.org/movie/27205-inception)
- [TMDB Talk — Recommendations vs Similar explained by Travis Bell (TMDB staff)](https://www.themoviedb.org/talk/59efc7fcc3a3680682004dba)
- [TMDB Talk — How to get JustWatch link for media](https://www.themoviedb.org/talk/62eb3ba2273648005d9c8845)
- [TMDB Watch Providers API reference](https://developer.themoviedb.org/reference/movie-watch-providers)
- [TMDB Movie Keywords API reference](https://developer.themoviedb.org/reference/movie-keywords)
- [TMDB on Trustpilot — user complaints](https://www.trustpilot.com/review/themoviedb.org)
- [Firecore community — TMDB rating displaying Rotten Tomatoes value](https://community.firecore.com/t/tmdb-rating-is-just-rotten-tomatoes-10-bug/51367)
- [Trakt Forums — "Let's talk about TMDB" page 2](https://forums.trakt.tv/t/lets-talk-about-tmdb/14040?page=2)
- [TMDB Talk — Similar vs Recommended movies](https://www.themoviedb.org/talk/577a7576925141560600032d)
- [TMDB Movie Bible — Primary Facts panel fields](https://www.themoviedb.org/bible/movie)

# Platform: AniList

**One-line key takeaway:** AniList's title page is built around a content-dense, single-column scroll that treats the work as a *node in a franchise graph* — Relations, Characters, Staff, Tags, and Recommendations are co-equal first-class sections, every one of them clickable into another graph node.

## Information hierarchy

### Above the fold (no scroll)
- Wide cinematic banner image (the work's keyart) spanning the page width.
- Poster (left, overlapping the banner) + Romaji title + native script + English title stacked next to it.
- A status button cluster: **Add to List** (or current status label if logged in), an Edit icon, a heart Favourite, and the average score in a coloured chip.
- Inline metadata strip: Format (TV / Movie / OVA), Episodes, Status (Finished / Releasing), Season + Year, Average Score, Mean Score, Popularity.
- A tab strip immediately under the hero: **Overview / Watch / Characters / Staff / Reviews / Stats / Social**.

### Mid-page (one scroll)
- Description / synopsis with a "Read more" expander (descriptions are often long; expander prevents wall-of-text).
- **Relations** rail — small horizontal cards, each labelled with relation type (Prequel, Sequel, Side Story, Alternative, Adaptation, Source, Spin Off, Character, Summary, Contains, Compilation, Other) plus the format (TV, Manga, Light Novel, OVA, Movie).
- **Characters** grid — main and supporting characters paired with their voice actors. Each card splits left/right: character portrait + name on the left, seiyuu portrait + name + language flag on the right.
- **Staff** rail — director, composer, character designer, original creator etc., each with role label.

### Bottom of page (deep scroll)
- **Status Distribution** stacked horizontal bar — Current / Planning / Completed / Dropped / Paused, coloured by status.
- **Score Distribution** vertical bar chart (10/20/30 … /100 buckets matching AniList's 100-point internal scale).
- **Recommendations** grid — user-submitted "if you liked X, try Y" suggestions, each card showing a community vote count.
- **Tags** chips, ranked by community-voted relevance percentage, with spoiler tags hidden behind a "Show spoilers" toggle.
- **External & Streaming Links** — small icon-and-label chips out to Crunchyroll, Netflix, HIDIVE, official site, Twitter hashtag, etc.
- Studios / Producers list at the very bottom.

## Sections present (top → bottom, with verbatim names)

1. Banner + Cover + Title block (no heading, it's the hero)
2. Metadata strip (no heading)
3. Tab nav: Overview / Watch / Characters / Staff / Reviews / Stats / Social
4. Description
5. **Relations**
6. **Characters** (with "View All" link to the full Characters tab)
7. **Staff** (with "View All" link)
8. **Status Distribution**
9. **Score Distribution**
10. **Recommendations**
11. **Tags**
12. **External & Streaming Links**
13. **Studios** / **Producers**
14. (footer with sidebar of latest reviews/activity)

## Primary user actions (in visual prominence order)

1. **Add to List** / status button (Watching / Plan to Watch / Completed / Dropped / Paused / Rewatching) — the dominant primary action when logged in.
2. **Favourite** (heart icon).
3. **Score** the work (in the same dropdown as status).
4. Navigate into a **Relation** (sequel/prequel/side story) — visually a peer of the primary actions because the cards are large and clickable.
5. Click a **Tag** (filters Browse to that tag).
6. Click a **Recommendation** card (or vote it up/down).
7. Click an **External / Streaming Link**.
8. Tab into **Reviews** / **Stats** / **Social** (lower-priority deep dives).

## How recommendations are surfaced

AniList recommendations are **user-curated, community-voted, and explicitly directional**: any user can submit "if you liked X, you might like Y" pairings, and the community votes those pairings up or down. The card for each recommended work shows the destination poster, score, format, and a small vote tally that doubles as a quality signal — high-vote recommendations float to the top of the rail. There is no opaque algorithmic ranking; the system is sense-making by the userbase, in line with AniList's broader philosophy of treating metadata as a collaborative wiki. (See [Oreate AI write-up](https://www.oreateai.com/blog/understanding-anilist-the-criteria-behind-your-anime-recommendations/e122b584be802b80e2ccd3fe25e6b63b) on hybrid semantic-graph plus user-tag training.) Critically, recommendations are *separate from* Relations — the platform draws a clean line between "this is the same franchise" (Relations) and "this is a different work you might also enjoy" (Recommendations). HelpME2C currently collapses both into one concept and then suppresses Relations, which is the inverse of AniList's design.

## How "where to watch" is shown

There is no dedicated "Where to Watch" card with provider-by-region resolution. Instead, AniList uses a flat **External & Streaming Links** chip rail near the bottom of the page, where contributors add direct URLs to Crunchyroll / Netflix / HIDIVE / Funimation / official Twitter / official site / hashtag. The chips are global (not region-resolved) and undecorated — no logos for offer types, no price, no quality (HD/4K), no sub-vs-dub split. The streaming-availability data feeds the user via a third-party-extension culture (MAL-Sync, ALTA, Jerry) more than via AniList's own page UI. ([MAL-Sync](https://github.com/MALSync/MALSync); [ALTA](https://github.com/JeremGamingYT/ALTA).)

## Logged-in vs logged-out

Logged-out users see the full content of the page including every Relations / Characters / Tags / Recommendations section — AniList does not gate the catalog. What changes when logged in: the "Add to List" button becomes a live status chip (Watching / Plan to Watch / Completed / Dropped / Paused / Rewatching) reflecting the user's current state; the Score chip becomes editable; the Favourite heart toggles; the Status / Score Distribution charts overlay the viewer's own position; and Recommendations expose vote-up/vote-down affordances. The page does not visually collapse or hide content for logged-out users — this is a key difference from streaming-first products like Netflix, and a familiar pattern from open-catalogue sites (Wikipedia, IMDb).

## Anime-specific conventions

AniList's title page leans hard into anime-fandom conventions: every Character card includes a **voice-actor portrait with a language flag** (most commonly Japanese, but English, Korean, German etc. are surfaced when available), so the page is functionally a seiyuu directory. **Source material** is shown as a chip (Manga / Light Novel / Original / Visual Novel / Web Novel / Game) and an actual "Source" Relation links to the parent work — clicking "Source: Manga" on an anime page takes you straight to the manga's title page, which is the same shape with the inverse "Adaptation" relation pointing back. **Season + Year** (e.g. "Spring 2013") is a first-class filter, reflecting the cours/seasonal anime cadence. Opening / ending theme songs are *not* prominently surfaced on AniList — this is a notable gap vs MAL. There is no native sub/dub indicator on the page (sub-vs-dub is inferred from the language tag on the seiyuu card). The **Relations** rail is the centrepiece anime convention: per the [submission manual](https://github.com/AniList/submission-manual-old/blob/master/submission-form/relations.md), supported relation types are Source, Adaptation, Prequel, Sequel, Character, Alternative, Contains, Compilation, Side Story, Spin Off, Summary, Other, Parent — twelve+ named edge types, every one of them clickable. Reverse relations auto-populate, so the graph is bidirectional and consistent.

## Visible failures and complaints

The two recurring complaints are (1) **information density on small screens** — AniList's banner + poster + metadata + tab strip stacks awkwardly on phones, and the Relations rail with twelve possible relation types gets visually noisy when a franchise has 8+ siblings; (2) **the Recommendations system rewards popular pairings** and can leave niche works with sparse recs, which the community has flagged in forum threads such as [Anilist Recommendations](https://anilist.co/forum/thread/5787). The [Better prequel/sequel relations](https://anilist.co/forum/thread/82853) thread is the most relevant for HelpME2C — even AniList power users want the Relations display *improved further*, asking for chronological ordering, a true graph view, and clearer disambiguation between Side Story / Spin Off / Alternative. This is direct evidence that the franchise-navigation problem HelpME2C is trying to dodge is in fact a real, unsolved-even-on-the-best-tracker problem. The [Tags filter](https://anilist.co/forum/thread/50473) thread shows tags-vs-genres is also confusing to newer users: AniList has both, where Genres are a small fixed taxonomy (Action / Romance / Sci-Fi etc.) and Tags are an open, community-curated, percentage-weighted set with spoiler flags — power users love the granularity, casual users find it overwhelming.

## Wireframe-style description of the hero band

Full-bleed banner image (~280px tall on desktop) with subtle dark gradient overlay at the bottom for legibility. Cover-art poster card (~140×210px) sits left-aligned, vertically centred on the banner/content boundary, casting a soft shadow. Right of the poster: Romaji title (large, white-on-gradient), native Japanese title below (smaller, lighter), English title (smaller still). To the far right of that row, a primary "Add to List" pill button in the brand accent colour (a customisable user-themed blue/purple by default), with a smaller Favourite heart and Edit icon adjacent. Below the title row, a single horizontal line of pill-shaped metadata chips: Format · Episodes · Status · Season · Average Score · Popularity. Beneath the metadata, a thin tab nav bar (Overview / Watch / Characters / Staff / Reviews / Stats / Social) acts as the visual seam between hero and body.

## What HelpME2C could learn

The single most important takeaway is that **AniList treats Relations and Recommendations as separate sections with separate visual treatments, never collapsed**. ADR-0023's franchise-dedup-via-suppression is the right call for HelpME2C's cross-medium bridges (which are about thematic resonance, not sequel chains) — but suppressing franchise siblings from the bridges only works if HelpME2C *also offers a Relations affordance somewhere else on the title page*. Otherwise a logged-in anime fan on an Attack on Titan page sees zero way to navigate to Season 2, which is the most basic affordance every anime tracker offers. The cheap fix is a small "More in this franchise" rail that uses the TMDB/AniList relation data we already pull during import — it doesn't compete with the cross-medium bridges, it complements them. Frame the bridges as **Recommendations** (cross-medium, thematic, the moat) and the franchise rail as **Relations** (intra-franchise, structural, table stakes).

The second takeaway: AniList's tab strip (Overview / Characters / Staff / Stats / Social) is a viable IA pattern for a title page that has more than the page can reasonably fit. HelpME2C's current single max-w-3xl column is fine for MVP but won't scale once Characters, Staff, Reviews, Group Watch are all in play. Plan now for an Overview / Cast / Group / Stats tab decomposition. Note also that AniList shows **Status Distribution** and **Score Distribution** as visible charts on every page — these are cheap to render from data HelpME2C already has and they give the page social-proof texture that a poster-and-synopsis layout doesn't.

The third takeaway, smaller but worth flagging: AniList has **no group-watch affordance** anywhere on the title page. That's HelpME2C's second moat per PROJECT.md and is genuinely greenfield UX — there's no prior art to ape from. Position the "Start a group rec" CTA as a *peer of* "Add to List", not nested under settings. The hero band is the right home for it.

## Sources

- [AniList relation submission manual](https://github.com/AniList/submission-manual-old/blob/master/submission-form/relations.md)
- [AniList API Docs (data fields per anime page)](https://github.com/joshstar/AniList-API-Docs/blob/master/source/anime.rst)
- [Forum: Better prequel/sequel relations](https://anilist.co/forum/thread/82853)
- [Forum: 'Tags' in the 'Genre' filter are so confusing](https://anilist.co/forum/thread/50473)
- [Forum: Anilist Recommendations system discussion](https://anilist.co/forum/thread/5787)
- [Forum: MAL vs AniList](https://anilist.co/forum/thread/12751)
- [Oreate AI — Understanding AniList recommendation criteria](https://www.oreateai.com/blog/understanding-anilist-the-criteria-behind-your-anime-recommendations/e122b584be802b80e2ccd3fe25e6b63b)
- [Achriom — Best anime tracking apps 2026](https://www.achriom.com/blog/best-anime-tracking-apps/)
- [MAL-Sync — third-party AniList streaming integration](https://github.com/MALSync/MALSync)
- [ALTA — AniList Track Assistant for Crunchyroll](https://github.com/JeremGamingYT/ALTA)
- [AniList High-Contrast Dark Theme (community accessibility patch)](https://github.com/Reinachan/AniList-High-Contrast-Dark-Theme)
- [Forum: A true dark theme for AniList](https://anilist.co/forum/thread/38909)

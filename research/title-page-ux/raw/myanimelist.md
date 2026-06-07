# Platform: MyAnimeList

**One-line key takeaway:** MAL's title page is a **two-column data-density layout** — a tight left-sidebar metadata block flanking a long right-column scroll — that prioritises *catalog completeness* (every theme song, every voice actor, every related entry) over visual hierarchy, and despite a widely-criticised 2010s aesthetic it remains the de facto reference UX for anime fans because every fact you might want is on the page.

## Information hierarchy

### Above the fold (no scroll)
- Small poster (top-left of left sidebar, ~225px wide).
- Big numeric **Score** in a coloured box (e.g. "8.57") with "scored by N users" beneath, plus **Ranked #127** and **Popularity #1** and **Members 4,363,960** stacked alongside the score.
- A horizontal tab nav bar at the top of the right column: **Details / Episodes / Videos / Pictures / Stats / Forum / Clubs / Reviews / Recommendations / Interest Stacks / News / Featured / Featured (paid) / More**.
- A "Add to List" status dropdown (Watching / Completed / On-Hold / Dropped / Plan to Watch) — when logged in, this is bolted onto the left sidebar near the poster.
- Title (English + Japanese) at the top of the right column.

### Mid-page (one scroll)
- Left sidebar — **Alternative Titles** (Synonyms, Japanese, English, German etc.), then **Information** (Type, Episodes, Status, Aired, Premiered, Broadcast, Producers, Licensors, Studios, Source, Genres, Themes, Demographic, Duration, Rating), then **Statistics** (Score, Ranked, Popularity, Members, Favorites).
- Right column — **Synopsis** paragraph (no expander, just a wall of text), then **Background**, then **Related Entries** (the franchise siblings; see anime-specific section below), then **Characters & Voice Actors** with main characters first, then **Staff**.

### Bottom of page (deep scroll)
- **Opening Theme** list and **Ending Theme** list — every OP/ED with episode range and song title + artist. Anime-specific and unique to MAL (AniList doesn't surface this on the title page).
- **Streaming Platforms** list with logos (Crunchyroll, Netflix, HIDIVE, Hulu where applicable).
- **Available At** external-database links (AniDB, Wikipedia, official sites).
- **Resources** section (additional partner links).
- A **Score Stats** histogram (vertical bars, 1–10 with %-of-voters per bar).
- **Reviews** preview (top 2–3 with helpful counts) — linking to the Reviews tab.
- **Recommendations** preview (top user-submitted recs) — linking to the Recommendations tab.
- **Interest Stacks** (curated user lists that include the work).
- **News** entries — anime industry news referencing the title.
- **Forum Topics** — top discussion threads from the work's forum.

## Sections present (top → bottom, with verbatim names)

1. Title (English / Romaji + native script)
2. Tab nav: Details / Episodes / Videos / Pictures / Stats / Forum / Clubs / Reviews / Recommendations / Interest Stacks / News / Featured
3. **Synopsis**
4. **Background**
5. **Related Entries** (categorised by relation type — Sequel, Prequel, Side Story, Other, Adaptation, Spin-Off, Summary, Alternative Version, Alternative Setting, Character, Parent Story, Full Story)
6. **Characters & Voice Actors**
7. **Staff**
8. **Opening Theme**
9. **Ending Theme**
10. **Streaming Platforms** (sometimes labelled "Available At" / "Streaming")
11. **Score Stats** (vertical histogram)
12. **Reviews** (preview)
13. **Recommendations** (preview)
14. **Interest Stacks**
15. **News**
16. **Forum Topics** / **Recent Discussion**

Left sidebar, top to bottom: poster → **Add to List** dropdown → **Alternative Titles** → **Information** → **Statistics** → **Available At** / **Resources**.

## Primary user actions (in visual prominence order)

1. **Add to List** status dropdown (in the sidebar — visually small but functionally primary).
2. Read the **Synopsis**.
3. Click into a **Related Entry** (sequel/prequel/etc.).
4. Click a **Character** → arrives at character page with full seiyuu list.
5. Click a **Streaming Platform** logo to watch.
6. Click **Reviews** tab.
7. Click **Recommendations** tab.
8. Click a **Genre** / **Theme** / **Demographic** link in the Information block (filters search).
9. Click into the **Forum** for the title.

## How recommendations are surfaced

MAL's title page shows a **preview** of recommendations (3–5 cards) with a "View All Recommendations" link out to a separate `/anime/<id>/recommendations` page. Recommendations are **user-submitted with text justifications** — each rec is a card showing the destination work, an author byline, a "X people found this recommendation helpful" agreement count, and an upvote/downvote affordance. This is fundamentally a community wiki: any logged-in user with sufficient reputation can write a recommendation explaining *why* work Y is a good match for fans of work X, and other users vote on the quality of the recommendation. There is no opaque algorithmic ranking; ordering is by net helpfulness. The "Interest Stacks" feature added more recently (post-2022) provides a second recommendation surface — curated user-built lists with a theme (e.g. "Time loop anime", "Anime with unreliable narrators") — which is interestingly close to HelpME2C's theme-bridge concept, but it's a separate section and is not algorithmically generated.

## How "where to watch" is shown

MAL has an explicit **Streaming Platforms** section on the page, surfacing logos (not just text links) for Crunchyroll, HIDIVE, Netflix, Hulu, Shahid, and other regional partners. The display is global (not auto-resolved per the viewer's country), and unlike JustWatch-style decoration there's no offer-type breakdown (subscription / rent / buy / free-with-ads), no quality tier, and no price. Some regional licensees (e.g. Shahid for MENA, Bilibili for SEA) appear conditionally based on the title's licence map. Partnerships are commercial — Crunchyroll and HIDIVE deep-link out, so the section is monetised via affiliate referrals. Functionally this is **better than AniList** (which uses unstyled chips) but **worse than a JustWatch integration** (which offers per-country offer-type resolution).

## Logged-in vs logged-out

Logged-out users see almost the entire page — synopsis, related entries, characters, themes, streaming, score stats, recommendations preview — gated only by the Add to List affordance, which when clicked logged-out redirects to sign-in. Logged-in users get the status dropdown inline, can score the work (1–10 dropdown), can write a review, can upvote recommendations, can post in the title's forum, and see their own list status reflected in the sidebar. There is no personalisation of the *page content itself* based on the logged-in user — no "here's what your friends watched", no "based on your list" rail. The page is the same for everyone; only the affordances change. This is the polar opposite of streaming-first services and a key reason MAL still wins for "reference / encyclopedia" use cases.

## Anime-specific conventions

MAL is the platform that established many of the anime-page conventions other trackers copy. **Opening / Ending theme listings** are unique to MAL and AniDB on the title page — each OP and ED is listed with episode range ("Episodes 2-13") and song title plus artist, which is treated as core canonical data, not trivia. **Source material** appears as a labelled field ("Source: Manga" / "Light Novel" / "Original" / "Visual Novel") in the Information sidebar. **Demographic** is its own field (Shounen / Shoujo / Seinen / Josei / Kids), distinct from Genres and Themes — MAL is the platform that codified the three-tier *Genre / Theme / Demographic* split that AniList partially abandoned in favour of weighted tags. **Studios**, **Producers**, and **Licensors** are three separate fields. **Broadcast** day-and-time is surfaced for currently-airing shows. Sub-vs-dub is not natively indicated on the page; it's inferred from the Characters & Voice Actors block (which lists Japanese seiyuu by default; English VAs appear only when explicitly added). **Related Entries** uses an extensive relation taxonomy: Sequel, Prequel, Side Story, Parent Story, Summary, Spin-Off, Adaptation, Character, Alternative Version, Alternative Setting, Full Story, Other — the entries are shown in a flat HTML table with each relation as a row, not a graph. Compared with AniList's relation rail this is uglier but more comprehensive in disambiguation: MAL distinguishes "Parent Story" (the chronological main thread, accessible only from the side-story child) from "Side Story" (the supplemental work, accessible from the parent), where AniList collapses both directions under "Side Story" and uses the auto-reverse engine to derive the inverse. MAL also surfaces **Pictures**, **Videos**, and **News** as separate tabs — anime fandom expects production stills, PVs, and licence-announcement news, and MAL is the place fans look first.

## Visible failures and complaints

The most-cited complaint is **the mobile experience**. The site's responsive layout collapses the two-column desktop design into a vertical stack that puts the long Information sidebar *before* the synopsis, so on phones you scroll through fifteen rows of metadata before reaching what the show is about. [JustUseApp reviews](https://justuseapp.com/en/app/1469330778/myanimelist-official/reviews) and complaints-board threads consistently flag this as the single biggest UX problem; the Medium redesign critique frames MAL's mobile UI as feeling like "a basic web wrapper" with "no contrast, depth, and delight" and a layout where "Stats, lists, and menus were all stacked together with no visual hierarchy" ([source](https://medium.com/@selemskr/redesigning-myanimelist-giving-an-outdated-app-a-fresh-new-look-9e3414efa39b)). Secondary complaints: the title page's **information density is overwhelming for newcomers** — the Information sidebar has 15+ rows of facts, none of them visually prioritised; the **score-inflation problem** (bots and early raters distort the headline number) is a recurring rant on r/MyAnimeList and Trustpilot; and the **emoji-reaction system on reviews** is widely disliked. The aesthetic itself — blue-on-grey, narrow content column, dense typography — reads as 2008-era to a 2026 audience, but the *information architecture* is what keeps users on the site: every fact a fan might want is on one page, indexed, linked, and editable by the community. This is the real lesson — visual age has not killed MAL's traffic dominance (still ~5× AniList's, per [Similarweb](https://www.similarweb.com/website/myanimelist.net/vs/anilist.co/)), because the page *answers questions completely*. The blue-on-grey works *because* the information lives in a familiar, scannable grid where left-column-label / right-column-value is consistent — once you know the layout, the eye finds the field instantly.

## Wireframe-style description of the hero band

There is no cinematic hero band. The header is a thin breadcrumb ("Anime › Shingeki no Kyojin"). Below it, a tight two-column layout: left column (~225px wide) opens with the poster, a small "Add to List" pill, and immediately the **Alternative Titles** block. Right column (~700px wide) opens with the title (English + Japanese, ~24px), the tab nav strip (Details / Episodes / Videos / Pictures / Stats / Forum / etc.), and then a small "Score / Ranked / Popularity / Members" stat row in three pill chips, then the synopsis. There's no banner image — the poster is the only visual artwork above the fold. This is MAL's deliberate choice: the page is a reference document, not a marketing page.

## What HelpME2C could learn

The structural lesson: **anime fans expect 'where do I find the OP/ED?', 'what's the source manga?', 'who's the studio?', 'who's the seiyuu?' answered on the title page**. HelpME2C's current TV-and-film-centric layout (poster + synopsis + tags + bridges + where-to-watch) will feel *thin* to a MAL-trained user. The franchise dedup heuristic per ADR-0023 keeps the bridges clean — good — but a logged-in anime fan landing on Attack on Titan on HelpME2C will look for Season 2/3/4 and not find it. That's an unforced trust loss. Either show a small "Related Entries" rail with the AniList-style relation labels, or accept that HelpME2C is positioning as "we recommend cross-medium, go to AniList/MAL for franchise navigation" — but the latter only works if the UX explicitly frames itself that way (e.g. "Looking for sequels? View on AniList →").

The second lesson: **MAL's information density wins despite the aesthetic critique**. The Information sidebar (studio, source, demographic, premiered, producers, licensors) is exactly the metadata HelpME2C already has for anime via the AniList/MAL import path — surfacing it as a compact key-value block under the synopsis (rather than discarding it) costs almost nothing and signals to anime-fan users "this site treats anime as first-class, not as a TV-with-cartoons afterthought." The OP/ED listing is a stretch goal — HelpME2C doesn't currently have this data — but the simpler "Source: Manga (Hajime Isayama)" / "Studio: Wit Studio" / "Demographic: Shounen" lines are a cheap, high-trust win.

The third lesson: **MAL's tab strip is too long** (12+ tabs) and **AniList's tab strip is the right length** (5–7 tabs). HelpME2C should plan for an Overview / Cast / Group / Stats decomposition (4 tabs), not an Episodes / Pictures / News / Forum / Clubs sprawl. The Forum and News surfaces are MAL-specific community-platform features that HelpME2C explicitly is not building (per PROJECT.md scope) — don't be tempted to ape them.

A note on TV+anime users specifically: HelpME2C's hybrid TV+anime audience will divide. The TV-first user expects a streaming-app title page (poster, synopsis, where to watch, recs — the current layout is right for them). The anime-first user expects a MAL/AniList encyclopedia page (relations, characters, staff, themes, OP/ED). Building one page that serves both means *progressive disclosure*: TV-style hero up top, then optionally-expanded anime-fandom sections below the fold. Hiding the anime sections entirely for non-anime works is fine; hiding them for an actual anime would feel like the page is broken to a MAL-trained user.

## Sources

- [Sêlêm Merili — Redesigning MyAnimeList (Medium critique)](https://medium.com/@selemskr/redesigning-myanimelist-giving-an-outdated-app-a-fresh-new-look-9e3414efa39b)
- [MyAnimeList — Wikipedia](https://en.wikipedia.org/wiki/MyAnimeList)
- [Similarweb — MAL vs AniList traffic](https://www.similarweb.com/website/myanimelist.net/vs/anilist.co/)
- [JustUseApp — MyAnimeList Official reviews (mobile UX complaints)](https://justuseapp.com/en/app/1469330778/myanimelist-official/reviews)
- [Trustpilot — MyAnimeList user reviews](https://uk.trustpilot.com/review/www.myanimelist.net)
- [Complaints Board — MyAnimeList reviews](https://www.complaintsboard.com/myanimelist-b159182)
- [thecartdriver — I switched from MAL to AniList](https://thecartdriver.wordpress.com/2021/11/04/i-switched-from-using-myanimelist-to-anilist-and-heres-a-quick-review/)
- [Achriom — Best anime tracking apps 2026](https://www.achriom.com/blog/best-anime-tracking-apps/)
- [SaaSHub — MyAnimeList vs AniList](https://www.saashub.com/compare-myanimelist-vs-anilist)
- [Rigorous Themes — Best MyAnimeList alternatives 2024](https://rigorousthemes.com/blog/best-myanimelist-alternatives/)
- [MALgraph — third-party MAL statistics overlay](https://github.com/rr-/malgraph4)
- [Hernan4444 — MyAnimeList Database (relation taxonomy reference)](https://github.com/Hernan4444/MyAnimeList-Database)

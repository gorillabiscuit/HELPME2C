# Platform: Letterboxd

**One-line key takeaway:** Letterboxd treats the title page as a social object — the poster, a few aggregated stats, and then user-generated context (reviews, lists, diary entries) carry the page rather than studio-supplied metadata.

## Information hierarchy

### Above the fold (no scroll)
- Top nav (search, account, "Sign in / Create account" or avatar)
- Backdrop image (full-bleed, dimmed) of the film
- Poster (left, fixed aspect ratio)
- Title + year + original-language title (e.g. "Parasite 2019 기생충")
- Director credit ("Directed by Bong Joon Ho")
- Tagline (italic, small)
- Synopsis (3–5 lines, truncated)
- Trailer thumbnail / "Where to watch" CTA inline with the synopsis area
- Tab strip: Cast · Crew · Details · Genres · Releases
- Right-rail "actions" panel: Watch · Like · Watchlist · Log/rate · Add to list · Share — these are the green/orange action chips that define the brand

### Mid-page (one scroll)
- Cast grid (avatars + character names, dense, often 30–60 entries)
- Crew breakdown (director, writers, producers, DP, editor, composer, sound, costume, makeup)
- Studios / Country / Languages / Runtime
- Alternative titles (collapsible, dozens of languages)
- Tags: Genre chips + "Themes" chips (Nanocrowd-derived nanogenres, e.g. "Crime, drugs and gangsters")
- Releases section (theatrical / digital / physical per territory)
- Ratings histogram (the five-star scale, with a vertical-bar distribution and "X fans" count)

### Bottom of page (deep scroll)
- "Popular reviews" — top-liked reviews from the whole community, sorted by likes ([Letterboxd Reviews](https://letterboxd.com/reviews/popular/))
- "Reviews from friends" (logged-in only) — reviews by people you follow
- "Recent reviews" — chronological tail
- "Similar Films" — six tiles, Nanocrowd-algorithm-curated ([Nanocrowd × Letterboxd](https://nanocrowd.com/nanocrowd-letterboxd/))
- "Mentioned by" — curated lists by other users that include this film (e.g. "Films that made me cry on a plane")
- Footer

## Sections present (top → bottom, with verbatim names)

1. **Hero band** — poster + title + tagline + synopsis + actions panel
2. **Cast** — character/actor pairs in a dense grid
3. **Crew** — by role
4. **Details** — studios, country, languages, runtime, alt titles
5. **Genres / Themes** — genre chips + Nanocrowd nanogenre chips
6. **Releases** — global release dates per format
7. **Ratings** — five-star histogram + fan count
8. **Popular reviews** — top-liked community reviews
9. **Reviews from friends** — logged-in personalisation
10. **Recent reviews** — chronological tail
11. **Similar Films** — six tiles, algorithmic
12. **Mentioned by** — user-curated lists containing this film
13. Footer

## Primary user actions (in visual prominence order)

1. **Watch / Watched** — green toggle chip in the right rail; the canonical action
2. **Like** — orange heart, immediately next to Watch
3. **Watchlist** — clock icon, third in the chip row
4. **Log/Rate** — opens a modal with date, five-star rating, optional review, tags
5. **Add to list** — opens a list-picker modal
6. **Share** — copy link
7. **Trailer** — modal embed, surfaced near the synopsis
8. **Where to watch** — JustWatch-backed modal listing streaming providers, sorted by price; Pro users see filtered-to-favourites results ([JustWatch integration](https://letterboxd.com/journal/justwatch-integration/))

The action chips themselves have been criticised for low contrast — call-to-action buttons "don't stand out from the rest of the text" and the three-dot overflow menu (which hides "add to list" and trailer access on mobile) is "not immediately noticeable" ([UX Case Study](https://davisdesigninteractive.medium.com/letterboxd-a-ux-case-study-e0034805d48b)).

## How recommendations are surfaced

Letterboxd has exactly one algorithmic "similar films" rail near the bottom of the page — six tiles, no row of rows, no "because you watched" framing. The rail is powered by Nanocrowd's ViewerVoice platform, which clusters films by the *language audiences use in reviews* rather than by metadata co-occurrence. The same engine drives a "Themes" section higher up: genre chips like "Thriller" sit alongside nanogenre chips like "Crime, drugs and gangsters" or "High speed and special ops" — clicking a chip drops you into a list of films tagged with that nanogenre ([Film Feelings: Nanogenres](https://letterboxd.com/journal/film-feelings-nanogenres/)).

What's *missing*: there is no "people who liked X also liked Y" rail, no collaborative filtering surface, and no editorial "Letterboxd staff picks" rail on the title page. Editorial discovery happens via the **Mentioned by** section — user-curated lists that include this title. This is the platform's de facto human-curation lane: the recommendation is "here are six lists members built that featured this film," and the user clicks through to a list authored by another human with a stated theme. Letterboxd's community actively resists algorithmic discovery ("Letterboxd fans love how they can organically uncover new taste communities on a platform that leaves discovery free of algorithms" — [YouScan analysis](https://youscan.io/blog/how-letterboxd-is-reshaping-film-culture/)), so the platform keeps its one algorithmic rail short and unobtrusive.

## How "where to watch" is shown

Streaming availability is a **modal**, not a permanent section. A "Where to watch" link sits inline near the synopsis (and on Pro/Patron accounts, a small set of favourite-service icons render directly on the film page). Click the link and a JustWatch-powered modal opens, listing every provider in the user's country, sorted by price, with SD/HD/4K filters ([JustWatch integration announcement](https://letterboxd.com/journal/justwatch-integration/)). Free accounts see only featured services on the page itself; Pro and Patron users can pin favourite services and see them inline, plus filter their watchlist by service ([TWiT.tv comparison](https://twit.tv/posts/tech/justwatch-letterboxd-trakt-which-app-should-you-use-manage-your-watchlist)). The integration covers 30+ countries.

## Logged-in vs logged-out

Logged out: most of the page is the same — synopsis, cast, similar films, public reviews — but the right-rail action chips show "Sign in to log" prompts, and a sign-up nag sits over the actions panel. Logged in: action chips become live (Watch/Like/Watchlist toggles persist, the log modal opens for rating, the watchlist button changes state), a "Reviews from friends" section appears above community reviews showing only people you follow, ratings show your own star count alongside the aggregate, and your watch/like/list state shows on the poster as small badges. Pro/Patron unlocks favourite-service filtering on Where-to-watch, custom activity-feed filters, and an ad-free experience.

## Visible failures and complaints

Reviewers consistently flag three categories of Letterboxd UX failure. First: **action discoverability** — call-to-action buttons "are hard to distinguish and don't stand out from the rest of the text, and simple features like adding a movie to a new list or viewing a movie trailer are obscured and difficult for users to locate" ([Pratt design critique](https://ixd.prattsi.org/2025/05/letterboxd-disassembled-creating-a-design-system-for-movie-review-site-letterboxd/)). The three-dot overflow menu on mobile is the canonical example; trailers, list-add, and share live behind it and many users never find them. Second: **cross-platform inconsistency** — "the Letterboxd app is inconsistent across different platforms, with Android, iOS, and desktop versions all having different layouts and features" ([Margaritha Jessica case study](https://medium.com/@mjess.ux/ui-ux-case-study-redesigning-letterboxds-web-and-app-87c180d414da)).

Third: **friend-rec gaps**. Users on r/Letterboxd repeatedly ask why the site doesn't surface "what your friends rated this 5 stars" more prominently on the film page itself, given that the friend-activity feed is the main social hook. The platform deliberately leaves discovery "free of algorithms," but the cost is that personal-network signals are tucked into a small section below community reviews ([ScreenRant unpopular opinions roundup](https://screenrant.com/letterboxd-unpopular-opinions-reddit/)).

A recurring complaint on TrustPilot is **slow modal-heavy interaction** — logging a film is a four-state modal flow (open log → date → rating → review → tags → save) and feels heavy compared to a single inline "did you watch this?" prompt ([Letterboxd Reviews on TrustPilot](https://www.trustpilot.com/review/letterboxd.com)).

## Wireframe-style description of the hero band

A dimmed, full-bleed backdrop image runs edge-to-edge across the top ~40vh. The poster sits left, fixed at roughly 240×360px, slightly overlapping the backdrop bottom edge. The title is large serif-feeling sans, all caps, with the year inline. Directly underneath: director credit in muted green, then italic tagline, then a 4–5 line synopsis with "More" if truncated. To the right of the synopsis is a vertical column of action chips — Watch · Like · Watchlist · Log — rendered as small icon-and-label chips in the brand green/orange. Below this band sits a thin horizontal nav strip with anchor links to Cast / Crew / Details / Genres / Releases. No prominent star rating in the hero — the rating histogram lives further down. No streaming providers in the hero — that's the "Where to watch" modal trigger.

## What HelpME2C could learn

Letterboxd's most transferable pattern is the **separation of algorithmic and human-curated discovery into distinct, modestly-sized surfaces**: one "Similar Films" rail (six tiles, algorithm-driven, no explanation) plus one "Mentioned by" rail (curated lists that include this title, authored by other humans). For HelpME2C, the current BridgeCard grid is the algorithmic rail; what's missing is the human-curated lane. A "Mentioned in groups" or "Groups who co-watched this together" surface would map directly onto the group-recommendations moat — show the user real groups (or shareable list objects) that paired this title with cross-medium siblings. This costs almost nothing once group state exists, and it's the missing entry point to moat #2 on the title page.

Second: **Themes as first-class chips, not buried in a tags card**. Letterboxd's nanogenre chips sit inline with genre chips in the "Genres" section — they're clickable, they lead to other films tagged with the same nanogenre, and they explain themselves by name ("Crime, drugs and gangsters" is self-evident in a way that "tag_5172" is not). HelpME2C's current title page has a Tags card that conflates genre, demographic, and theme tags; splitting them visually (Genres on top, Themes underneath, demographic/cast tags hidden in a "Details" accordion) would mirror Letterboxd's hierarchy and reinforce the cross-medium recommendation story — themes are the thing that crosses TV↔anime, not genres.

Third: **what NOT to copy**. Letterboxd's modal-heavy logging flow, the three-dot overflow menu hiding key actions, and the low-contrast action chips are documented anti-patterns. HelpME2C's add-to-watchlist button should be inline and high-contrast, not a four-step modal. The streaming-providers-as-modal pattern is also worth questioning — for a small recsys app where streaming availability is a *primary* decision factor (the whole point is "what should we watch tonight"), surfacing providers inline as a strip in the hero (Netflix · Crunchyroll · MAX badges with prices) is more decision-supportive than hiding them behind a click. Letterboxd can afford to bury it because their users come for the social/film-criticism side; HelpME2C users come for the recommendation, and "where can we actually watch this in the next 20 minutes" is the question that closes the loop.

## Sources

- [Letterboxd film page: Parasite (2019)](https://letterboxd.com/film/parasite-2019/)
- [Nanocrowd × Letterboxd announcement](https://nanocrowd.com/nanocrowd-letterboxd/)
- [Film Feelings: using nanogenres to find similar films](https://letterboxd.com/journal/film-feelings-nanogenres/)
- [JustWatch integration announcement](https://letterboxd.com/journal/justwatch-integration/)
- [Letterboxd: A UX Case Study (Davis Design Interactive)](https://davisdesigninteractive.medium.com/letterboxd-a-ux-case-study-e0034805d48b)
- [Letterboxd Disassembled (Pratt IXD)](https://ixd.prattsi.org/2025/05/letterboxd-disassembled-creating-a-design-system-for-movie-review-site-letterboxd/)
- [UI/UX Case Study: Redesigning Letterboxd (Margaritha Jessica)](https://medium.com/@mjess.ux/ui-ux-case-study-redesigning-letterboxds-web-and-app-87c180d414da)
- [Letterboxd Reviews on TrustPilot](https://www.trustpilot.com/review/letterboxd.com)
- [ScreenRant: 10 Unpopular Opinions About Letterboxd](https://screenrant.com/letterboxd-unpopular-opinions-reddit/)
- [How Letterboxd is reshaping film culture (YouScan)](https://youscan.io/blog/how-letterboxd-is-reshaping-film-culture/)
- [JustWatch vs Letterboxd vs Trakt (TWiT.tv)](https://twit.tv/posts/tech/justwatch-letterboxd-trakt-which-app-should-you-use-manage-your-watchlist)
- [Letterboxd: How UX design concepts shape the interface (Bootcamp)](https://medium.com/design-bootcamp/how-ux-design-concepts-shape-the-letterboxd-interface-4ef0ff0acbc0)
- [Letterboxd FAQ — logs, diary, friends](https://letterboxd.com/about/faq/)
- [Letterboxd popular reviews](https://letterboxd.com/reviews/popular/)

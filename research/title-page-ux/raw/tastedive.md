# Platform: TasteDive (tastedive.com)

**One-line key takeaway:** TasteDive's title page is a recommendation *result* page first and a metadata page a distant second — the entire layout is organised around a "shows like X" promise, with cross-category strips (Movies / Shows / Books / Music / Games / Podcasts) under one filterable header, like/dislike/meh voting on every card, and almost no first-class metadata — and the multi-anchor "I like X, Y, Z" model that maps onto HelpME2C's group-rec problem lives in the API but is barely surfaced in the web UI.

## Information hierarchy

### Above the fold (no scroll)
- Title, air years (or release year for film), a 5-point average score (e.g. `4.3/5`), and a short editorial-style description.
- Cover/poster image to the side of the metadata block.
- A like / dislike / meh button row with vote counts — this is the primary action on the page.
- Save-to-list and "write a review" affordances next to the vote row.

### Mid-page (one scroll)
- A "Cross-category suggestions" header with category filter pills (Movies, Shows, Books, Music, Games, Podcasts, People, Places, Brands).
- Recommendation cards rendered as poster + title + year + per-card like/dislike/meh — the same vote primitives as the hero, so the act of training the recommender is identical at every depth of the page.
- The filter pills mean a single page can flip between "shows like Review" and "movies like Review" without a navigation event — cross-medium is collapsed into one surface.

### Bottom of page (deep scroll)
- "Lists with [title]" — user-generated themed collections that include the title (e.g. "Dark / Absurd / Weird / Trippy Shows — 234 shows"), with thumbnails and creator attribution.
- "Liked by" / "Disliked by" community panels showing user avatars.
- Footer with ToS, Privacy, social links.

## Sections present (top → bottom, with verbatim names)

1. Title hero (cover image, title, year(s), `x/5` score, description)
2. Like / Dislike / Meh vote row + Save to list + Write a review
3. Cross-category suggestions (filterable header with category pills)
4. Recommendation grid (per the active filter — defaults to same medium)
5. Lists with [title] — user-curated themed lists
6. Liked by / Disliked by (community avatars)
7. Footer

Note: there is essentially **no Facts/credits panel**. No director, no cast carousel, no runtime in a structured table, no budget, no original-language, no production company. Compared to TMDB or Letterboxd, TasteDive deliberately strips the metadata layer down to make room for recs and votes.

## Primary user actions (in visual prominence order)

1. Like / Dislike / Meh on the title itself
2. Click a category filter pill to switch the recommendation grid medium
3. Click a recommended poster card
4. Like / Dislike / Meh on a recommendation card (training the recommender)
5. Save to list
6. Write a review
7. Open a user-curated "list with this title"
8. Sign in (logged-out users hit this constantly, especially on save / list / review actions)

## How recommendations are surfaced

The page *is* the recommendations. Unlike TMDB where recs are one of ten sections, TasteDive treats the title as an anchor and the entire surface below the hero is "things like this." The "Cross-category suggestions" header is the conceptual centrepiece — it lets a single user flip between media types without leaving the page, so a person on a "shows like Review" page can pivot to "movies like Review" or "books like Review" in one click. This is the cross-medium promise made architectural: the rec strip is medium-agnostic, the filter is the medium selector ([reviewer commentary: cross-category suggestions section on each page](https://itcamefromtheinternet.com/blog/tastedive-review/)). Per-rec explanations are thin — there's no "shared themes" chip set, no "because you also liked X" link-back; the "why" is implicit in the anchor title at the top of the page. Reviewers note this works well when the anchor is clear, but "doesn't always yield results" when the catalogue is thin in the cross-category direction ([It Came From The Internet review](https://itcamefromtheinternet.com/blog/tastedive-review/)).

The multi-anchor input model exists but is mostly an **API capability**, not a first-class web feature. The TasteDive API accepts a comma-separated list with per-item type operators like `music:underworld, movie:harry potter, book:trainspotting` ([TasteDive API docs](https://tastedive.com/read/api)). The web search bar on the homepage prompts "Find music recommendations similar to ___" — a single-anchor field. So the conceptually most-interesting feature for HelpME2C's group-rec problem (multiple anchors → one recommendation set) lives one layer down from where most users will ever see it.

## How "where to watch" is shown

It mostly isn't. TasteDive's title pages don't surface streaming provider tiles as a structured row in the way TMDB / JustWatch / Letterboxd do — the focus is "what's next to watch" rather than "where to watch this." Reviewer write-ups note the platform's role as discovery-first, leaving the watch-providers question to the user's own search ([It Came From The Internet review](https://itcamefromtheinternet.com/blog/tastedive-review/); [Make Tech Easier](https://maketecheasier.com/tastedive-better-show-recommendations/)). On some pages an embedded trailer or music video appears, which is the closest analogue to a "play" affordance. This is a notable omission given that "where can we watch this together right now?" is the single most common follow-up question after a recommendation lands.

## Logged-in vs logged-out

Logged-out users can use the site fully for browsing — search, click into a title, see recommendations, see lists. The Qloo era explicitly removed ads and let logged-out users interact ([Qloo acquisition coverage](https://www.prnewswire.com/news-releases/qloo-the-leading-artificial-intelligence-platform-for-culture-and-taste-acquires-tastedive-300794951.html); [SaaSHub TasteDive page](https://www.saashub.com/tastedive-reviews)). Voting (like / dislike / meh) is the primary gated action — anonymous votes don't persist into a profile, so the recommendation quality plateau hits fast without an account. Saving a title to a list and writing a review require sign-in. The footer CTA on category pages reads "Sign in to save your discoveries, create inspiring lists" — clearly the conversion hook. Registered users get "more personalized recommendations as the system learns their preferences over time" per the Wikipedia entry ([TasteDive — Wikipedia](https://en.wikipedia.org/wiki/TasteDive)).

## Visible failures and complaints

The most-cited complaint historically was that recommendations didn't cross categories — you'd search a TV show and only get more TV shows. This has been partially addressed via the "Cross-category suggestions" section on each page, but the reviewer who praised the fix also wrote: "This feature isn't perfect, and doesn't always yield results" ([It Came From The Internet review](https://itcamefromtheinternet.com/blog/tastedive-review/)). Coverage in less-popular media types (especially anime, podcasts, brands) is thin enough that the filter pills will sometimes return empty grids.

Search relevance is the second recurring complaint: a search for "Shogun" returned a 1990 play in the Music category rather than the well-known novel or the FX series, because the search ranking didn't seem to weight popularity ([It Came From The Internet review](https://itcamefromtheinternet.com/blog/tastedive-review/)). This is a critical failure for a recommendation product because the anchor-selection step is upstream of everything else — a wrong anchor poisons the entire recommendation grid that follows. User-submitted catalogue entries also produced fragmented records (e.g. books split into parts), addressed through ongoing curation but still visible on long-tail items.

The Qloo era brought funding and a B2B refocus — the company has raised $25M Series C in early 2024 and added a self-service Taste AI interface aimed at SMEs ([AlleyWatch on the $20M follow-on round](https://alleywatch.com/2024/07/aqloo-behavioral-data-ai-intelligence-engine-consumer-preference-alex-eliasqloo-adds-20m-in-new-funding-for-its-ai-powered-consumer-insights-data-intelligence-engine/); [AdExchanger Series C coverage](https://www.adexchanger.com/ai/qloo-snags-25-million-in-series-c-funding-to-unravel-the-mystery-of-consumer-tastes/)). The consumer-facing TasteDive site has not seen a corresponding visible product investment — the UI is recognisably the same shape as the pre-acquisition site, and discussion on Product Hunt / SaaSHub treats it as a stable but quiet consumer surface rather than an actively-evolving product ([Product Hunt: TasteDive](https://www.producthunt.com/products/tastedive); [SaaSHub reviews](https://www.saashub.com/tastedive-reviews)). The interesting product energy has moved to Qloo's B2B Taste AI platform, not to refining the consumer title page.

## Wireframe-style description of the hero band

Single-column above the fold. Cover image left, ~200px wide. Right-of-image stack: title in display weight, then a thin metadata line (year(s), `4.3/5` score, primary category chip), then a 3–4 line description in muted body text. Directly under that stack and spanning the full content width, a horizontal action bar: three large vote affordances (like / dislike / meh) each with a numeric count, then secondary actions (Save to list, Write a review) as text buttons. No JustWatch row, no cast carousel, no facts table. The page immediately commits to its recommendation purpose — the next thing you see when you scroll a pixel is the cross-category filter row.

## What HelpME2C could learn

**The "filter the rec strip by medium" interaction is exactly the BridgeCard problem.** TasteDive's "Cross-category suggestions" with category-pill filters maps directly onto HelpME2C's "More shows with the same themes" grid. The lesson is that **the medium-filter belongs above the grid as a control surface, not as a sub-tab on a different page**. A user on a TV anchor page should be able to pivot to "anime with these themes" in one click without losing the anchor context. HelpME2C's tag-based linking is conceptually stronger than TasteDive's opaque "you might also like" (because the *why* is a chip the user can see and click), but the *control layout* — anchor at top, filterable cross-medium strip below — is worth borrowing wholesale.

**The vote primitives on every card are training data masquerading as UI.** Like / Dislike / Meh on the anchor *and* on every recommendation card means TasteDive is harvesting graded preference signal at every interaction depth. HelpME2C should consider whether the BridgeCard grid wants a lightweight per-card "more like this / less like this" signal — not a 5-star rating (high friction), but a binary or ternary tap. This feeds both the personal model and the group-rec moat because per-user disagreement signal is the raw material for ghost-profile inference.

**The multi-anchor model is the unbuilt feature.** TasteDive exposes comma-separated multi-anchor recommendations via API but doesn't promote it as a primary UI surface — the homepage is single-anchor, the title page is single-anchor. This is the entry point HelpME2C's group-rec moat occupies and TasteDive does not. A "Recommend for our group" button on the title page — taking the current title as one anchor and pulling each group member's recent likes as additional anchors — would be a category-distinct interaction that TasteDive theoretically could build but conspicuously hasn't. The Qloo acquisition has pulled the team's attention to B2B Taste AI, leaving the consumer multi-anchor surface uncontested.

## Sources

- [TasteDive homepage](https://tastedive.com/)
- [TasteDive movies category page](https://tastedive.com/movies)
- [Tastedive: Shows like Review (sample title page)](https://tastedive.com/shows/like/Review)
- [TasteDive API documentation — multi-anchor query syntax](https://tastedive.com/read/api)
- [TasteDive — Wikipedia](https://en.wikipedia.org/wiki/TasteDive)
- [Qloo acquires TasteDive — PR Newswire (2019)](https://www.prnewswire.com/news-releases/qloo-the-leading-artificial-intelligence-platform-for-culture-and-taste-acquires-tastedive-300794951.html)
- [Qloo acquires TasteDive — TechCrunch (2019)](https://techcrunch.com/2019/02/13/qloo-acquires-tastedive/)
- [Qloo $25M Series C — AdExchanger (Feb 2024)](https://www.adexchanger.com/ai/qloo-snags-25-million-in-series-c-funding-to-unravel-the-mystery-of-consumer-tastes/)
- [Qloo $20M follow-on — AlleyWatch (Jul 2024)](https://alleywatch.com/2024/07/aqloo-behavioral-data-ai-intelligence-engine-consumer-preference-alex-eliasqloo-adds-20m-in-new-funding-for-its-ai-powered-consumer-insights-data-intelligence-engine/)
- [TasteDive Review — It Came From The Internet (cross-category critique)](https://itcamefromtheinternet.com/blog/tastedive-review/)
- [TasteDive Review — Make Tech Easier](https://maketecheasier.com/tastedive-better-show-recommendations/)
- [TasteDive on Product Hunt](https://www.producthunt.com/products/tastedive)
- [TasteDive on SaaSHub](https://www.saashub.com/tastedive-reviews)

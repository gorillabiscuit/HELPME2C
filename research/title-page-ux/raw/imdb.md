# Platform: IMDb

**One-line key takeaway:** IMDb tries to be every kind of title page at once — encyclopaedia, review aggregator, ad surface, retailer — and the resulting layout is a cautionary tale in what happens when no section is allowed to lose to any other.

## Information hierarchy

### Above the fold (no scroll)
- Top nav (search, watchlist, sign-in)
- Breadcrumbs ("Home > Title")
- Title (large, all caps for film, year inline)
- Series/episode badges where applicable ("TV Series · 2011–2019")
- Maturity rating · year · runtime · genre badges (e.g. "R · 1994 · 2h 22m · Drama")
- The gold-star IMDb rating block — a clickable "★ 9.3/10" with vote count, sitting alongside a "Your rating" star prompt and a "Popularity" rank with trend arrow
- Trailer thumbnail (autoplaying or click-to-play) and a photo grid (2×2 stills) occupying the right half of the hero
- "Add to Watchlist" CTA (yellow, the only high-contrast button in the hero)
- A row of metadata icons (share, etc.)
- Often a banner ad above the title or between the hero and the next section

### Mid-page (one scroll)
- Top cast cards (avatars + role names, 8–12 visible with a "See all cast & crew" link)
- Director / Writers / Stars row (compact)
- "Videos" carousel — multiple trailers, clips, featurettes
- "Photos" carousel — production stills, posters
- Storyline section: full synopsis + plot keywords + genre tags + Motion Picture Rating box + parental-guide link
- For series: **Episodes** strip with a season selector, episode thumbnails, per-episode IMDb rating, air date
- "Did you know?" — trivia, goofs, quotes, crazy credits, connections, alternate versions, soundtracks

### Bottom of page (deep scroll)
- **User reviews** — featured review at top, sort dropdown (Featured / Most Recent / Top Rated / Most Helpful), "X user reviews" link
- **FAQ** — community-submitted questions (often the only place "is this OK for kids?" gets answered)
- **More like this** — horizontal rail of recommended titles with mini-ratings
- **Details** — countries of origin, language, also-known-as, release date, filming locations, production companies
- **Box office** — budget, opening weekend, gross US/worldwide, gross worldwide
- **Technical specs** — runtime, sound mix, colour, aspect ratio
- **Related news**
- **Contribute to this page** (edit links for the IMDb wiki layer)
- Multiple banner ads interspersed throughout
- Footer

## Sections present (top → bottom, with verbatim names)

1. **Hero band** — title, rating, watchlist CTA, trailer, photos
2. **Cast** (top cast on title page; "Cast & crew" is a separate full page)
3. **Videos** — trailers and clips carousel
4. **Photos** — stills carousel
5. **Storyline** — full plot, keywords, certificates, parental guide
6. **Episodes** (series only) — season selector + per-episode list with ratings
7. **Did you know?** — trivia, goofs, quotes, crazy credits, connections, alternate versions, soundtracks ([IMDb forum: Connections page](https://community-imdb.sprinklr.com/conversations/imdb-app-android-fire-devices/connections-page-on-app/5f4a7a158815453dba97539e))
8. **User reviews** — featured + sorted list
9. **FAQ** — community Q&A
10. **More like this** — algorithmic title rail
11. **Details** — origin, language, also-known-as, release dates
12. **Box office** — budget and gross
13. **Technical specs** — runtime, sound, colour, aspect ratio
14. **Related news**
15. **Contribute to this page**

## Primary user actions (in visual prominence order)

1. **Add to Watchlist** — yellow, the dominant hero button
2. **Rate** — click the "Your rating" star in the hero to give a 1–10 rating
3. **Play trailer** — the trailer thumbnail itself is the CTA
4. **See all photos** — opens the gallery
5. **Buy / Watch now** — Amazon/Prime CTA where applicable (IMDb is an Amazon property; the buy-on-Prime nudge is structurally privileged)
6. **Share**
7. **Edit / Contribute** — wiki-style edit links scattered on most sections

## How recommendations are surfaced

IMDb has a single **More like this** rail near the bottom of the page — a horizontal carousel of ~12 titles with mini-ratings overlaid on each poster. The algorithm is opaque: IMDb does not explain why titles appear, there is no "because you watched X" framing, and the list does not personalise to the viewer in any visible way ([IMDb help on More Like This](https://help.imdb.com/article/imdb/discover-watch/why-is-there-an-ad-shown-before-every-trailer/G3G4U7LM7SFN3BRQ)).

The much more interesting cross-link mechanism is **Connections**, nested inside "Did you know?". This is an editorial graph of film-to-film references: "X references Y", "X is featured in Y", "X is spoofed in Y", "X is followed by Y" ([Connections page on app](https://community-imdb.sprinklr.com/conversations/imdb-app-android-fire-devices/connections-page-on-app/5f4a7a158815453dba97539e)). It is human-curated and surfaces relationships an algorithm cannot infer — a parody, a homage, a sequel, a remake. This is structurally the closest thing IMDb has to "cross-medium" thinking; it lets a user trace a thread between a 1973 film and the 2019 anime that references it. It is buried behind two clicks.

IMDb also surfaces **Plot keywords** in the Storyline section — these are user-submitted tags like "dystopia" or "amnesia". Clicking a keyword leads to a list of every IMDb title tagged that way. This is functionally a theme-based recommendation lane, but it's labelled as metadata, not as a recommendation surface, so users don't read it that way.

## How "where to watch" is shown

IMDb's "Watch now" surface is structurally distorted by Amazon ownership. On many title pages a "Watch on Prime Video" CTA is integrated into the hero band, even when the title is available on multiple services. Users complain that competing services are de-emphasised or buried behind a "see all options" expander, and that the streaming-providers list is incomplete compared to JustWatch ([IMDb forum: Amazon ads ruining website](https://community-imdb.sprinklr.com/conversations/imdbcom/amazon-ads-ruining-website/68d7f0e9b4028071b93c5a1e)). There is no per-user filtering by connected services — IMDb cannot show "you have Hulu, here's the Hulu link first." This is a strategic decision (drive Amazon revenue), not a UX limitation, but the consequence is a worse decision-support experience than Letterboxd or JustWatch.

## Logged-in vs logged-out

Logged out: full page renders, ratings and reviews visible, Watchlist CTA prompts sign-in. Logged in: Watchlist toggle persists, "Your rating" star reflects your 1–10 vote, the hero shows a small "Marked as watched" state if applicable, and the Watchlist page becomes browseable. Personalisation is shallow — IMDb knows what you rated and watchlisted, but there is no "More like this, tuned for you," no friends/social graph reviews at the top of the User Reviews list, and no "people who watchlisted this also watchlisted Y" rail. The only meaningful logged-in delta on the title page itself is the star-rating input and the watchlist toggle state.

## Visible failures and complaints

The IMDb title page redesign rollout (2020–2024) generated thousands of complaints on the official community forum. The dominant theme is **information density collapse**: "takes up more space and is harder to find information," "I have to scroll three pages to find a release date," and "you have to scroll further to see the cast" ([IMDb forum: Updated Title page experience](https://community-imdb.sprinklr.com/conversations/imdbcom/introducing-updated-imdbcom-title-page-experience/60a40631c1307254c6cc1b0d)). The reference-view legacy layout (still accessible by URL hack) is widely preferred for research tasks because it packs more facts above the fold. Filmbodega and similar blogs document the URL hack to force-load the old layout ([Filmbodega: Get IMDb to show the old layout](https://filmbodega.com/blog/show-old-imdb-layout/)).

Users name the root cause as **mobile-to-desktop port**: "this is clearly a lazy port of the mobile layout to desktop, which has resulted in extremely excessive whitespace" — desktop users get massive poster cards and giant trailer thumbnails where they used to get dense fact tables ([Updated Title page experience, page 9](https://community-imdb.sprinklr.com/conversations/imdbcom/introducing-updated-imdbcom-title-page-experience/60a40631c1307254c6cc1b0d?commentId=60de7284b845766e19a0d529&page=9)). Pratt's IXD design critique reaches the same conclusion: "the overall interface appears cluttered, with numerous features lacking consistency and cohesion" and the platform's usability "seems unappealing" ([Pratt: UI/UX Case Study IMDb Revamp](https://ixd.prattsi.org/2024/12/ui-ux-case-study-imdb-web-mobile-revamp-youve-all-been-waiting-for/)).

The second dominant complaint is **ad density**. "Main banner advertisements take lots of unnecessarily much space" and "3 banner ads between sections, in addition to stuff in the right column" ([Ad blocking a very large portion of your content](https://community-imdb.sprinklr.com/conversations/imdbcom/ad-blocking-a-very-large-portion-of-your-content/65d40239ed7a464f968d808a)). IMDb's own ad-spec page documents an "Enhanced Title Page" ad unit that lets advertisers buy hero-band placement on specific title pages ([IMDb Enhanced Title Page ad spec](https://advertising.amazon.com/resources/ad-specs/imdb/etp)) — i.e. the hero band on a film page is literally inventory. Third recurring complaint: **anime/series rating integrity** — coordinated review-bombing campaigns on anime episodes are organised in Discord and consistently bypass IMDb's anti-spam ([IMDb Community: Attack on Titan/One Piece/Bleach ratings](https://community-imdb.sprinklr.com/conversations/data-issues-policy-discussions/ratings-attack-on-titan-one-piece-bleach/64f53cb635e0d576dc4a780c)). Anime treatment is otherwise minimal — IMDb has no anime-specific metadata (no studio-as-first-class, no MAL-style staff roles, no source-medium field).

## Wireframe-style description of the hero band

Backdrop image is full-bleed and dark-overlaid across the top. Left column: large poster (~300×450). Centre column: title in white serif, immediately below it a one-line metadata strip (maturity rating · year · runtime · genre chips), then a horizontal block containing the gold IMDb ★ rating with vote count, a "Your rating" call-to-action with empty stars, and a "Popularity" rank with a small up/down arrow. Below the metadata strip: the yellow **Add to Watchlist** button (the only saturated-colour CTA in the hero) and a small row of share/edit icons. Right column: a 2×2 grid of stills with a play-button overlay on the top-left tile (the trailer). A "See all" link sits at the bottom right of the grid. Beneath the hero, a thin nav strip lists in-page anchors (Cast & Crew · Reviews · IMDbPro · etc.) — though many users say they don't notice it.

## What HelpME2C could learn

The biggest lesson from IMDb is **what not to ship**. The "More Like This" rail is opaque and unexplained — for a recsys product where the recommendation logic IS the moat, HelpME2C should over-explain why a title appears (the reasonHint work in the bridge-card pipeline is the correct instinct). The hero band should not become ad inventory or a Watchlist-monoculture; HelpME2C's hero needs at least two CTAs of comparable weight: "Add to Watchlist" and "Recommend to a group," because group co-watching is the second moat. IMDb's failure to offer a single social/group surface on the title page is a hole HelpME2C can drive a feature through.

The transferable patterns are smaller but real. First: **the Connections graph**. IMDb's editorial film-to-film links (references, parodies, remakes, follows) are the closest analogue to HelpME2C's cross-medium theme bridges, and they prove the pattern is valuable enough that users dig two clicks deep to find it. HelpME2C should surface "Connections" or "Related titles" as a first-class section with a clear semantic label per link ("inspired by", "spiritual sequel to", "shares theme X with") — this is editorially expensive but cheap to render. Second: **Plot keywords as cross-link surface**. Clickable theme/keyword chips that route to "more titles with this theme" are already core to the HelpME2C model; IMDb proves users will click them when they're labelled clearly, even when they're buried in Storyline.

What is **Netflix-scale-only and not viable for HelpME2C**: per-user personalised "More like this" trained on watch history, multi-row rails ("Trending now", "Because you watched", "Top 10 in your country"), and dense FAQ/trivia/connections databases. These all rely on community contribution or huge training data and would dilute the page. The HelpME2C title page should stay closer to Letterboxd's spareness than IMDb's encyclopaedia density: one algorithmic cross-medium rail (the BridgeCard grid that already exists, with reasonHints), one human/group-curated rail (the missing group-recommendations entry point), one "where to watch" strip that filters by user-connected services, and a tight Themes chip section. Box office, technical specs, related news, parental guide, FAQ — all IMDb sections — should be omitted unless they earn their place.

## Sources

- [IMDb title page: The Shawshank Redemption](https://www.imdb.com/title/tt0111161/)
- [INTRODUCING: Updated IMDb.com Title page experience (community forum)](https://community-imdb.sprinklr.com/conversations/imdbcom/introducing-updated-imdbcom-title-page-experience/60a40631c1307254c6cc1b0d)
- [Updated Title page experience, page 9 (mobile-to-desktop port complaint)](https://community-imdb.sprinklr.com/conversations/imdbcom/introducing-updated-imdbcom-title-page-experience/60a40631c1307254c6cc1b0d?commentId=60de7284b845766e19a0d529&page=9)
- [Updated Title page experience, page 38 (later complaints)](https://community-imdb.sprinklr.com/conversations/imdbcom/introducing-updated-imdbcom-title-page-experience/60a40631c1307254c6cc1b0d?page=38)
- [Pratt IXD: UI/UX Case Study IMDb Web/Mobile Revamp (2024)](https://ixd.prattsi.org/2024/12/ui-ux-case-study-imdb-web-mobile-revamp-youve-all-been-waiting-for/)
- [Pratt IXD: Design Critique: IMDb Website (2023)](https://ixd.prattsi.org/2023/02/design-critique-imdb-website/)
- [Pratt IXD: IMDb Unlocked – Redefining Discovery, Reviews, and UX (2024)](https://ixd.prattsi.org/2024/12/imdb-redesign/)
- [Ad blocking a very large portion of your content (IMDb forum)](https://community-imdb.sprinklr.com/conversations/imdbcom/ad-blocking-a-very-large-portion-of-your-content/65d40239ed7a464f968d808a)
- [Amazon ads ruining website (IMDb forum)](https://community-imdb.sprinklr.com/conversations/imdbcom/amazon-ads-ruining-website/68d7f0e9b4028071b93c5a1e)
- [IMDb still a nightmare due to ad banners (IMDb forum)](https://community-imdb.sprinklr.com/conversations/imdbcom/imdbcom-still-a-nightmare-of-loading-and-navigation-issues-due-to-their-thoughtless-stupid-ad-banners/65cc2ae0ed7a464f968c72c4)
- [IMDb Enhanced Title Page ad spec (Amazon Ads)](https://advertising.amazon.com/resources/ad-specs/imdb/etp)
- [Standard Premium Title Page ad spec (Amazon Ads)](https://advertising.amazon.com/resources/ad-specs/imdb/premium-title-page-standard)
- [Filmbodega: Get IMDb to show the old layout](https://filmbodega.com/blog/show-old-imdb-layout/)
- [Attack on Titan / One Piece / Bleach ratings (review-bombing)](https://community-imdb.sprinklr.com/conversations/data-issues-policy-discussions/ratings-attack-on-titan-one-piece-bleach/64f53cb635e0d576dc4a780c)
- [Connections page on app (Did You Know? sub-feature)](https://community-imdb.sprinklr.com/conversations/imdb-app-android-fire-devices/connections-page-on-app/5f4a7a158815453dba97539e)
- [Redesigning IMDb (Samarth Sinha, Medium)](https://medium.com/@goingtobefamous18/my-first-redesign-imdb-d6a8750138ea)
- [IMDb App Redesign — A UX/UI Case Study (Tiffanie Liang)](https://medium.com/@tiffanieliang/imdb-app-redesign-a-ux-ui-case-study-2fd36971fabb)
- [IMDb Wikipedia](https://en.wikipedia.org/wiki/IMDb)

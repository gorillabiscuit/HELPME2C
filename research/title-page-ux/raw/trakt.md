# Platform: Trakt

**One-line key takeaway:** Trakt's title page is a *tracking control panel* — every section is in service of the user marking, rating, and re-marking what they watched, and the page rewards already-engaged power users rather than first-time visitors.

## Information hierarchy

### Above the fold (no scroll)
- Site chrome with a dark, dense theme — sidebar nav (Home, Movies, Shows, Calendar, Lists, Network, Profile).
- A large backdrop image of the title (fanart) with the poster and title overlaid in the foreground.
- A tight row of **tracking action buttons**: a purple "watched" check, **Watchlist**, **Collection**, **List** (add to a personal list), **Comment**, **Check in** (live-watching) ([Trakt support: How to Build Your Watched History](https://support.trakt.tv/support/solutions/articles/70000299304-how-to-build-your-watched-history)).
- A **1–10 personal rating** ring/picker (recently standardised to 5-star averages in the aggregate display, but personal ratings remain on the 1–10 scale per the Trakt forums).
- Aggregate Trakt community rating + count (e.g. "8.5 from 12,034 votes").
- Runtime, certification, release year.

### Mid-page (one scroll)
- Plot synopsis (short — a paragraph).
- **Cast & crew** with photos and roles.
- **People also watched** / **Related** — a horizontally scrolling rail of similar titles.
- **Lists containing this** — surfacing user-curated community lists (a defining Trakt section, much more prominent than on Letterboxd or JustWatch) ([Trakt forums: Discovering Official Lists](https://forums.trakt.tv/t/discovering-official-lists-feels-clunky/10412)).
- **Comments** (shouts) with filters for most liked / highest rated / lowest rated / newest ([Trakt forums: How Trakt Filters Comment Ratings](https://forums.trakt.tv/t/how-trakt-filters-comment-ratings/19208)).

### Bottom of page (deep scroll)
- Studios, language, country, genres (chips).
- Streaming availability (where-to-watch is shown but is *not* the primary affordance — it sits below community signal, deprioritised vs JustWatch).
- For TV shows: a **season grid with per-season watched %** (e.g. "Season 3: 8/10 episodes watched") and clicking into a season exposes per-episode rows with individual watched checks, ratings, and comments ([Trakt support: watched-history article](https://support.trakt.tv/support/solutions/articles/70000299304-how-to-build-your-watched-history)).
- For TV shows: the per-show "Progress" view computes percentage watched, episodes watched, and episodes remaining.
- **Activity from people you follow** — ratings/comments from followed users surface in-context (the social layer is opt-in but visible) ([Trakt forums: show activity from people you follow](https://forums.trakt.tv/t/show-what-people-you-follow-not-only-friends-have-rated-and-commented-on-shows-and-movies/808)).

## Sections present (top → bottom, with verbatim names)

1. Hero band (fanart backdrop, poster, title, year, runtime, certification)
2. Tracking actions row (Watched / Watchlist / Collection / List / Comment / Check in / Rate 1–10)
3. Aggregate community rating
4. Plot
5. Cast
6. Related ("People also watched")
7. Lists (community user-curated lists containing this title)
8. Comments (with filter dropdown: most liked / highest rated / lowest rated / newest)
9. Studios / language / country / genres
10. Where to watch (streaming providers, deprioritised)
11. (For shows) Seasons / Episodes with per-episode checkboxes
12. (For shows) Progress widget
13. Followed-user activity overlay

## Primary user actions (in visual prominence order)

1. **Mark as watched** (the purple check — Trakt's signature action; click for "now", click-and-hold for a specific date) ([Trakt support](https://support.trakt.tv/support/solutions/articles/70000299304-how-to-build-your-watched-history)).
2. **Add to Watchlist** (auto-removes once you mark watched).
3. **Add to Collection** (you physically own it / it's in your Plex library).
4. **Rate 1–10**.
5. **Add to a personal list** or follow a community list.
6. **Comment** (shout) or read existing comments.
7. **Check in** (announce live that you're watching it right now — broadcasts to profile / scrobbles).
8. (For shows) Mark individual episodes watched.

## How recommendations are surfaced

Trakt surfaces recommendations through three overlapping channels on the title page, none of which is the dominant element. First, a "People also watched" rail — collaborative-filtering-style, dense, image-heavy. Second, a **Lists containing this** section that exposes community-curated lists (e.g. "Best A24 horror", "1000 movies to see before you die") and is functionally a long-tail discovery surface unique to Trakt's power-user audience ([forum: Discovering Official Lists](https://forums.trakt.tv/t/discovering-official-lists-feels-clunky/10412)). Third, **followed-user activity** — when a user you follow rates or comments on the title, it surfaces in context. Recommendations dedicated to the user ("recommended for you") are not on the title page; they live in a separate Discover section which has historically been considered weaker than the lists-and-friends discovery surface.

## How "where to watch" is shown

Where-to-watch exists on Trakt title pages but is structurally *deprioritised* compared to JustWatch — it sits below cast, related, and lists, and is presented as a small grouped block of provider logos for the user's country. Trakt does not attempt JustWatch's per-tier price grid; it shows that the title is available on Netflix, Prime, etc, and links out. The opposite of JustWatch's stance: Trakt assumes you've already decided to watch it and is helping you track that fact, not helping you decide whether it's affordable. Many Trakt power users pair Trakt with Reelgood specifically for stronger availability, which Reelgood enables through a Trakt-sync integration ([TechHive: Reelgood vs JustWatch vs Plex](https://www.techhive.com/article/1428635/reelgood-vs-justwatch-vs-plex-battle-of-the-streaming-guides.html)).

## Logged-in vs logged-out

Logged-out users see the title page rendered read-only: synopsis, cast, related, lists, community rating, comments. None of the tracking affordances function — clicking Watched / Watchlist / Collection / Rate / Comment routes to a sign-in/sign-up flow. Logged-in free users get tracking and rating, but with usage limits introduced in Trakt's 2024 "Freemium" rollout (e.g. watchlist capped at 100 items, fewer personal lists, no advanced filtering) ([Trakt forums: Freemium Experience announcement](https://forums.trakt.tv/t/freemium-experience-more-features-for-all-with-usage-limits/41641)). VIP members ($30/year, [Trakt VIP page](https://trakt.tv/vip)) unlock unlimited lists, advanced filtering, Year-in-Review, All-Time Stats, profile-cover-from-title-page customisation, and ad-free browsing. The title page itself doesn't aggressively gate features inline, but the *value of* tracking a title compounds in VIP-only stats surfaces, which is where Trakt's paywall friction is most visible.

## Visible failures and complaints

The dominant 2024–2025 complaint, repeated across [Trustpilot](https://www.trustpilot.com/review/trakt.tv) (rated 1.9/5 "Poor") and the [Freemium announcement thread](https://forums.trakt.tv/t/freemium-experience-more-features-for-all-with-usage-limits/41641), is the **paywall regression**: long-time users report features that were previously free (large lists, advanced filtering, certain stat surfaces) being moved behind VIP, with VIP price itself increasing — one user citing the yearly subscription rising from a historic $1 to $6 and then to the current $30 tier. The freemium thread runs 20+ pages of mostly hostile feedback, and Trustpilot reviewers describe the new pricing as "doubling the price while removing features".

A second cluster of complaints, also visible on Trustpilot, is **UI regression**: a 2024 UI overhaul described by users as "20% finished and being forced onto everyone", with reported readability and density problems on the new title page in particular. Users on the forums explicitly compare against the previous denser layout and prefer it ([Trakt forums: New layout / rewatches](https://forums.trakt.tv/t/new-layout-rewatches/101970)).

A third, lower-volume complaint pattern is **community-list spam appearing on personal-list pages** (lists the user didn't create or like surfacing inline, [forum thread](https://forums.trakt.tv/t/lists-are-appearing-on-my-lists-page-that-i-did-not-create-or-like/103483)), and forum-moderation complaints about users being banned for critical feedback. Support response quality is described as poor across both Trustpilot and the forums.

## Wireframe-style description of the hero band

A wide cinematic fanart backdrop fills the top of the page, with a dark overlay gradient. Floating left-aligned over the gradient: the portrait poster (smaller than JustWatch's, roughly 15–18% width on desktop). Right of the poster: title in large display weight, year + runtime + cert in a small inline row beneath, and immediately below those a **horizontal toolbar of icon-buttons** for the tracking actions (watched / watchlist / collection / list / comment / check-in). Below that toolbar, the personal rating UI (1–10 picker) sits next to the community rating average. The visual centre of gravity is therefore not the poster or the synopsis — it is the tracking toolbar, which is the page's job.

## What HelpME2C could learn

**Transferable now (Phase 1A registered-users-only MVP).** The Watched / Watchlist / Collection trichotomy is a more honest model of user intent than a single "Add" button — HelpME2C's current page has only a save action, and conflating "want to watch" with "have watched" with "rewatched" loses signal the recommendation engine could use. The minimal version is two states ("want to watch" / "watched"), not three, because Collection is mostly a Plex/Kodi scrobble artifact. Trakt's **1–10 rating + community rating display** is also low-cost to add and gives the rec engine high-quality feedback; a 5-star or thumbs scale leaves rating discrimination on the table. The **click-and-hold-for-date** detail is genuinely clever — it lets the user record historical watches without a separate UI for backfilling — and would integrate naturally with HelpME2C's group-recommendation feature ("you watched this with X").

**Transferable later (post-MVP).** The **Lists containing this** section is Trakt's strongest discovery surface and is closest in spirit to HelpME2C's BridgeCard cross-medium theme model — lists are user-curated taxonomies, themes are platform-curated taxonomies, and both answer "what is this title *like*". A future HelpME2C feature could surface "themes this title belongs to" alongside or above BridgeCard recommendations, making the cross-medium framing legible at a glance. **Followed-user activity** is the social layer that makes Trakt sticky for power users and would naturally extend HelpME2C's group-recommendation differentiator into a "what your group is rating" surface — but only once there's a critical-mass user base; surfacing empty social rails at launch is a known anti-pattern.

**Overkill for a registered-users-only MVP.** Per-episode tracking with individual checkboxes is the right answer for a tracking-first product but the wrong default for a recommendation-first one — the screen real estate cost is high and the engagement loop assumes the user is actively scrobbling from Plex/Kodi/Infuse, which HelpME2C explicitly is not building toward. The VIP-tier feature wall (advanced stats, Year-in-Review, All-Time Stats, profile-cover customisation) is also a distraction — Trakt's freemium rollout is the single largest source of user complaint in 2024–2025, and replicating that monetisation model would import the same backlash. Most importantly: do *not* deprioritise where-to-watch as far down the page as Trakt does. Trakt can get away with it because its users have already committed to watching; HelpME2C's user is still deciding, and the §1A page is registered-only but still discovery-led, not tracking-led.

## Sources

- [Trakt VIP page](https://trakt.tv/vip)
- [Trakt support: How to Build Your Watched History](https://support.trakt.tv/support/solutions/articles/70000299304-how-to-build-your-watched-history)
- [Trakt support: How to Manage Your Watchlist & Personal Lists](https://support.trakt.tv/support/solutions/articles/70000376766-how-to-manage-your-watchlist-personal-lists)
- [Trakt forums: Freemium Experience — More Features for All with Usage Limits](https://forums.trakt.tv/t/freemium-experience-more-features-for-all-with-usage-limits/41641)
- [Trakt forums: How Trakt Filters Comment Ratings](https://forums.trakt.tv/t/how-trakt-filters-comment-ratings/19208)
- [Trakt forums: Discovering Official Lists feels clunky](https://forums.trakt.tv/t/discovering-official-lists-feels-clunky/10412)
- [Trakt forums: Show what people you follow have rated/commented on](https://forums.trakt.tv/t/show-what-people-you-follow-not-only-friends-have-rated-and-commented-on-shows-and-movies/808)
- [Trakt forums: New layout / rewatches](https://forums.trakt.tv/t/new-layout-rewatches/101970)
- [Trakt forums: Lists appearing that I did not create](https://forums.trakt.tv/t/lists-are-appearing-on-my-lists-page-that-i-did-not-create-or-like/103483)
- [Trustpilot — Trakt reviews (1.9/5 "Poor")](https://www.trustpilot.com/review/trakt.tv)
- [Trakt API documentation (pytrakt, movies)](https://pytrakt.readthedocs.io/en/latest/movies.html)
- [Moviebase: Understanding Trakt.tv Integration](https://moviebase.app/resources/trakt-integration-guide)
- [TechHive: Reelgood vs JustWatch vs Plex — Battle of the streaming guides](https://www.techhive.com/article/1428635/reelgood-vs-justwatch-vs-plex-battle-of-the-streaming-guides.html)
- [Slant: Trakt vs Letterboxd detailed comparison](https://www.slant.co/versus/19287/33805/~trakt_vs_letterboxd)
- [AlternativeTo: Best Trakt.tv alternatives](https://alternativeto.net/software/trakt/)

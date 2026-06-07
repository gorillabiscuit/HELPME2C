# Platform: JustWatch

**One-line key takeaway:** JustWatch is built around a single question — "can I watch this right now, on a service I already pay for, in my country?" — and every other affordance on the title page is subordinate to that answer.

## Information hierarchy

### Above the fold (no scroll)
- Site chrome: logo, top nav (Home, New, Popular, Lists, Sports, Guide), Sign In ([page inspection](https://www.justwatch.com/us/movie/parasite)).
- A short status line stating availability summary, e.g. "Currently on 7 streaming services & also available on disc" — answers the headline question before the user has scrolled at all.
- Poster + title + year + age rating badge + runtime.
- Aggregate ratings row: JustWatch score, user rating %, IMDb rating ([page inspection](https://www.justwatch.com/us/movie/parasite)).
- Country flag indicator (e.g. "🇺🇸 United States") that doubles as the region selector — this is the only filter that meaningfully changes the page's primary content.
- Watchlist button visible near the title for signed-in users.
- "Notify me" affordance attached to availability state (alerts when title arrives on a service, see [JustWatch help](https://support.justwatch.com/hc/en-us/articles/16722097805597-What-is-TV-Show-Tracking)).

### Mid-page (one scroll)
- The main "Watch Now" grid: streaming providers shown as colored logo tiles, bucketed by monetisation tier — **Subscription / Free (with ads) / Rent / Buy / Cinema**. Each tile carries quality (SD/HD/4K), CC availability, and price for transactional tiers ([page inspection](https://www.justwatch.com/us/movie/parasite); [Cloudwards](https://www.cloudwards.net/how-to-use-justwatch/)).
- Price grid: a single title can show as little as one row (one sub provider) or as many as a dozen (rent SD $2.99 / rent HD $3.99 / rent 4K $5.99 / buy SD $9.99 / buy HD $14.99, repeated per storefront).
- Trailer thumbnails — multiple YouTube embeds.
- Short synopsis paragraph.

### Bottom of page (deep scroll)
- Cast & crew with character roles.
- Genre tags.
- Production metadata (country, certification, runtime).
- "People who liked X also liked …" recommendation rail.
- A second rail filtered to "Similar titles available for free streaming" — recommendations *re-grounded* in the availability lens.
- Disc / physical-media purchase options (Amazon, Barnes & Noble).
- (On show pages) a "Watch Newest Episodes" rail and a season picker that exposes per-season counts and posters ([page inspection of The Bear](https://www.justwatch.com/us/tv-show/the-bear)).
- JustWatch streaming-chart position for the title (e.g. "ranked 108th, moved -15 places"), tying every title back to the JustWatch Top 10 ecosystem ([JustWatch charts coverage](https://medium.com/turn-on-press-play/justwatch-streaming-charts-2024-edition-5bc87a3e7d78)).

## Sections present (top → bottom, with verbatim names)

1. Header status line ("Currently on N streaming services & also available on disc")
2. Title block (poster, title, ratings, age, runtime, Watchlist)
3. **Watch Now** (provider grid bucketed Subscription / Free / Rent / Buy)
4. **Videos / Trailers**
5. **Synopsis**
6. **Cast**
7. **Director / Production details**
8. Genre tags
9. **People who liked X also liked …**
10. **Similar titles available for free streaming**
11. **Buy DVD or Blu-ray**
12. **Top in [Country]** chart-position widget
13. (For shows) **Watch Newest Episodes** and a per-season list

## Primary user actions (in visual prominence order)

1. Click a provider tile to deep-link out to Netflix/Disney+/Prime/etc.
2. Toggle the region flag to a different country.
3. Add to **Watchlist** (this implicitly turns on "Notify me" by default — see [JustWatch help](https://support.justwatch.com/hc/en-us/articles/16722097805597-What-is-TV-Show-Tracking)).
4. Filter the grid by **My Services** (only the providers the user owns) — set during onboarding ([JustWatch support: Provider Filters](https://support.justwatch.com/hc/en-us)).
5. Play a trailer.
6. Click into "Similar" rails.
7. Rate the title (small affordance).

## How recommendations are surfaced

Recommendations sit **below** availability and are themselves availability-aware. The primary rail is generic ("People who liked X also liked …") but a second, distinct rail is gated on monetisation tier — "Similar titles available for free streaming" — which is JustWatch reframing recommendation as a price/access problem rather than a taste problem. The platform also leans heavily on chart-driven discovery: the title page exposes the title's position in the JustWatch Top 10, and the home/browse surfaces double down on chart curation rather than personalised feeds ([JustWatch Streaming Charts](https://medium.com/turn-on-press-play/justwatch-streaming-charts-2024-edition-5bc87a3e7d78)). Personalised recommendations exist but are not the primary discovery mechanism — chart position, "what's new on your services", and provider-bucketed similar rails do most of the work ([Speaktip review](https://www.speaktip.com/mastering-streaming-search-the-ultimate-guide-to-justwatch-in-2024/)).

## How "where to watch" is shown

This *is* the page. A short header line ("Currently on N streaming services & also available on disc") answers the question above the fold; the **Watch Now** grid immediately below is the dominant visual element. Providers are rendered as **logo tiles, color-coded by brand**, grouped into four tier-buckets: Subscription (flatrate), Free (with ads), Rent, Buy. Each tile carries quality flags (SD / HD / 4K), CC availability, runtime, and — for transactional offers — the price. Rent and Buy tiers fan out into a small price matrix: the same title can appear as nine separate tiles (rent SD/HD/4K × buy SD/HD across three storefronts). Bundles and promo states render inline ("30 Days Free Then $11.99/month"). The user's IP-detected country drives the entire grid; flipping the flag to another country re-renders the grid with that region's providers. Setting **My Services** during onboarding from the 85+ supported providers narrows the grid to just the user's owned subscriptions, which converts the page from a marketplace into a "yes-you-can-watch-this / no-you-can't" answer ([JustWatch Provider Filters](https://support.justwatch.com/hc/en-us); [Cloudwards](https://www.cloudwards.net/how-to-use-justwatch/)). When a title is unavailable, the page degrades gracefully into a "Notify me when available" CTA rather than a dead-end ([JustWatch help on tracking](https://support.justwatch.com/hc/en-us/articles/16722097805597-What-is-TV-Show-Tracking)).

## Logged-in vs logged-out

Logged-out users still get the full availability grid — that's the public utility and SEO surface. What they lose is **My Services filtering** (the grid stays generic), **Watchlist + Notify me** (no personal queue, no email/push when the title arrives on Prime), **price-drop alerts**, and **rating persistence**. The Watchlist button is visible while logged out but routes to a sign-in wall on click. Logged-in users on mobile get push; logged-in users on web get email notifications ([Emusements review of JustWatch alerts](https://emusements.com/wanted-one-movie-and-tv-organizer-to-rule-them-all)).

## Visible failures and complaints

The dominant complaint pattern on [Trustpilot](https://www.trustpilot.com/review/www.justwatch.com) and Reddit is **data accuracy**: users report titles flagged as "on Netflix" or "on Prime" that aren't actually there, or whose availability has changed without the page updating. The licensing-feed model (data flows from streamers via the same pipeline that powers JustWatch's data product for the studios) is mostly real-time but lags during sudden delistings — and JustWatch's "Notify me when this becomes available" feature inverts this problem usefully (you can't always trust "yes", but "we'll tell you when it changes" is reliable).

A second cluster of complaints is **mobile-app reliability**: the AVS Forum and Trustpilot threads cite the iOS app crashing on Play-on-TV, broken sync, and inability to log out ([AVS Forum: Justwatch — Unimpressed](https://www.avsforum.com/threads/justwatch-unimpressed.3240014/); [Trustpilot reviews](https://www.trustpilot.com/review/www.justwatch.com)). Support response times are widely described as non-existent.

A third, structural complaint from power users in the [Reelgood vs JustWatch comparisons](https://www.techhive.com/article/1428635/reelgood-vs-justwatch-vs-plex-battle-of-the-streaming-guides.html): JustWatch's discovery surfaces are *minimalist to a fault* — no easy browse-by-genre on the title page, watchlist tucked into a secondary menu tab, single-percentage ratings vs Reelgood's multi-source rating panel. JustWatch wins on price-comparison clarity and country coverage; Reelgood wins on browse depth and Trakt integration. Many power users run both.

## Wireframe-style description of the hero band

Top-aligned horizontal status strip ("Currently on N streaming services & also available on disc"), then a two-column hero: left column is the poster (roughly 25% width on desktop, full-bleed top on mobile), right column is a tightly-packed metadata stack — title + year, age badge + runtime inline, a three-cell ratings row (JustWatch / user % / IMDb), country flag, and a Watchlist + Notify-me button pair. Below the hero, *immediately and without a separator card*, the Watch Now provider grid begins — no synopsis interposed. The synopsis is pushed below the trailer carousel, which makes the page's visual centre of gravity the row of provider logos rather than the title itself.

## What HelpME2C could learn

**On placement: yes, move Where-to-watch up — but only partially.** JustWatch's argument for top placement is that "where can I watch this" is the *highest-intent question* on the page; if a user already knows they want the title, every section above availability is friction. The status-line pattern is a strong compromise: a single line ("Streaming on Netflix and Prime in your region · 3 other options") *immediately under the hero* gives the answer without committing the full provider grid to the fold. The detailed grid (with prices, qualities, "available in N other regions") can still live further down. This costs roughly nothing in vertical space and converts the page from "discovery surface that *also* answers availability" to "answer page that *also* offers discovery" — which is what HelpME2C's BridgeCard recommendations actually want, because the user is more likely to act on a cross-medium recommendation if they've already confirmed the source title is accessible.

**On the Notify-me hook: this is a free conversion mechanic.** A user adding a title to a watchlist *because they can't watch it yet* is implicitly stating intent in a way that's much higher-signal than a generic "save for later". HelpME2C is registered-users-only by Phase 1A, so the obvious extension is: when a title isn't available in the user's region or on a service they've selected, surface "Notify me when this comes to [Netflix]" rather than just "Add to watchlist". This also gives the recommendation engine a behavioural signal it can't otherwise get (provider-specific desire).

**On the things to *not* copy:** JustWatch's information density on transactional tiers (the nine-tile rent/buy matrix) is overkill for the HelpME2C MVP and would clutter a recommendation-led page. The "My Services" filter is genuinely useful but assumes a long onboarding step JustWatch can justify only because it *is* the product — for a recs product, defaulting to "show all, dim the ones not on your services" is a softer version that doesn't punish users who haven't completed onboarding. And JustWatch's chart-position widget is a tail wagging the dog: it's only useful because JustWatch *is* the chart authority. HelpME2C should not pretend to be one.

## Sources

- [JustWatch — Parasite (1982) title page (inspection)](https://www.justwatch.com/us/movie/parasite)
- [JustWatch — The Bear title page (inspection)](https://www.justwatch.com/us/tv-show/the-bear)
- [JustWatch support: Provider Filters](https://support.justwatch.com/hc/en-us)
- [JustWatch support: What is TV Show Tracking](https://support.justwatch.com/hc/en-us/articles/16722097805597-What-is-TV-Show-Tracking)
- [Cloudwards: How to Use JustWatch in 2026](https://www.cloudwards.net/how-to-use-justwatch/)
- [Speaktip: Mastering Streaming Search — Ultimate Guide to JustWatch](https://www.speaktip.com/mastering-streaming-search-the-ultimate-guide-to-justwatch-in-2024/)
- [TechHive: Reelgood vs JustWatch vs Plex](https://www.techhive.com/article/1428635/reelgood-vs-justwatch-vs-plex-battle-of-the-streaming-guides.html)
- [Trustpilot — JustWatch reviews](https://www.trustpilot.com/review/www.justwatch.com)
- [AVS Forum — Justwatch: Unimpressed](https://www.avsforum.com/threads/justwatch-unimpressed.3240014/)
- [Emusements review of JustWatch + alerts](https://emusements.com/wanted-one-movie-and-tv-organizer-to-rule-them-all)
- [Letterboxd Journal: At Your Service — JustWatch integration](https://letterboxd.com/journal/justwatch-integration/)
- [JustWatch Streaming Charts: 2024 Edition (Medium)](https://medium.com/turn-on-press-play/justwatch-streaming-charts-2024-edition-5bc87a3e7d78)

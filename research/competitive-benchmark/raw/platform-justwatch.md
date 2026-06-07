# JustWatch — competitive benchmark (raw)

**Scope:** JustWatch is the leading "where to watch" streaming aggregator. HelpME2C plans to surface streaming availability inline (PROJECT.md), so JustWatch is the operational benchmark for that surface as well as a recommendation comparator.

**Date of capture:** 2026-05-17.
**Sources:** marked inline. WebFetch against `justwatch.com` returned only a German-locale home page with no signup-flow copy in markup; WebFetch against `enjins.com/case/justwatch/` worked (this is the only first-party-adjacent engineering write-up on their recommender). Several user-complaint sources are aggregator summaries (Trustpilot, app-store review aggregators) because direct WebFetch was blocked.

---

## 1. Signup signals — what does signup ask for?

- **Login providers offered:** email, Apple, Facebook, or Google ("To get started with JustWatch you can sign up with your email, Apple account, Facebook account, or Google account. By signing up, JustWatch will remember the shows you've liked or disliked and the services you're subscribed to." — [cloudwards.net guide](https://www.cloudwards.net/how-to-use-justwatch/)).
- **Country:** auto-detected at first visit (JustWatch runs as `/us/`, `/uk/`, `/de/` etc. country sub-paths — see the support article confirming availability in 60+ then 120+ then 140+ countries: [support.justwatch.com — "Where is JustWatch available?"](https://support.justwatch.com/hc/en-us/articles/360020987317-Where-is-JustWatch-available)). Users can override via the settings cog.
- **Streaming services:** asked during onboarding *or* later via the yellow settings icon in the header — "if you've just signed up, the website might ask you which services you have, otherwise, press the yellow icon in the upper right which will let you adjust your streaming services, country, language, and more." ([cloudwards.net](https://www.cloudwards.net/how-to-use-justwatch/)).
- **Taste quiz:** offered as the fastest way to seed the recommender — "The easiest way to get the algorithm trained quickly is to take a quick quiz that populates the screen with TV and movie titles and asks you to pick the ones you like." ([ecency.com — "Have you heard of JustWatch? Part 2"](https://ecency.com/cinetv/@failingforwards/have-you-heard-of-justwatch-part-2-how-to-get-recommendations-when-you-dont-know-what-to-watch)).
- **Could-not-verify:** exact field labels, microcopy, or the order of the onboarding steps. WebFetch against `www.justwatch.com/` returned home-page content with no signup form rendered server-side; the signup form is client-rendered behind an auth modal and is not in the HTML response.

---

## 2. Cold-start UX

- New users land on a country-localised home page already populated with the "New" / "Top 10" / "Popular" rails — no account required to browse ([WebFetch summary of justwatch.com/]).
- The cold-start signal stack is: (a) country (auto), (b) streaming services subscribed to (asked at signup or deferred), (c) a "pick titles you like" mini-quiz, (d) ongoing like / dislike / add-to-watchlist signals. "When you set up your account, you can help JustWatch curate content for you based on your interests by taking a quiz with TV and movie titles, and over time, your results get better based on shows you add to your watchlist and whether you mark that you 'like' or 'dislike' a title after watching it." ([clark.com — JustWatch review](https://clark.com/streaming-tv/justwatch-app-review/)).
- The recommender itself was rebuilt in early 2023 explicitly to deal with cold start at the title side — see §5.

---

## 3. Group-recommendation feature

- **"My Lists" / shared lists (Nov 2023):** "JustWatch's Lists feature allows users to create, share & import lists. Users can create and personalize their own lists or easily bring in ones they've already created on IMDb, and share these lists with friends and family to browse and discuss together." ([Every Movie Has a Lesson — "JustWatch adds new lists feature"](https://everymoviehasalesson.com/blog/2023/11/justwatch-adds-new-lists-feature-and-imports-your-imdb-lists); [Geek Alabama coverage](https://geekalabama.com/2023/12/05/justwatch-adds-new-lists-feature-and-imports-your-imdb-lists/)).
- **What "shared" means here:** sharing is link/list-based (export the list URL to friends). It is *not* a session-bound "join a group, get a joint rec feed for tonight" surface.
- **"Popular with friends" social signal:** JustWatch surfaces what is "new, popular and trending" community-wide rather than within a friend graph ([TWiT.tv — JustWatch vs Letterboxd vs Trakt](https://twit.tv/posts/tech/justwatch-letterboxd-trakt-which-app-should-you-use-manage-your-watchlist)). There is no friend graph in the Letterboxd / Trakt sense.
- **Explicit absence:** could not find a "group recommendation for tonight" / household / blended-profile surface on JustWatch. Their group play is shared *static* lists, not blended *active* recommendation. This is a gap HelpME2C can directly exploit.

---

## 4. Cross-medium scoring

- JustWatch's catalogue covers **movies, TV shows, and (a lot of) anime** — anime is treated as a first-class category with dedicated browse pages and filters: see `/us/lists/anime/tv-shows` and `/us/lists/anime/movies` plus the platform's filtering across "all of the major streaming services such as Netflix, Amazon Prime Video, Disney+, Hulu, Max, Apple TV+, Peacock, Crunchyroll, fuboTV, and Paramount+" ([JustWatch anime guides](https://www.justwatch.com/us/lists/anime/tv-shows)).
- Recommendations are *catalogue-wide* — the two-tower model (see §5) encodes title metadata uniformly across movies and TV; there is no public statement that movie-vs-TV is siloed. In practice the rec rail mixes both.
- **Caveat — could not verify:** whether the model down-weights cross-medium pairs (e.g. "movie → TV series" as a weaker signal than "movie → movie") or treats them symmetrically. No published ablation.

---

## 5. Recommendation algorithm

The single best primary-adjacent source is the **Enjins case study** ([enjins.com/case/justwatch](https://enjins.com/case/justwatch/)), written by the agency that partnered with JustWatch's in-house team to rebuild the recommender in early 2023.

**Architecture (verbatim summary):**

- "JustWatch redesigned their recommender around a flexible two-tower model that allowed the system to learn not only from user–title interactions, but also from rich title metadata such as genres, themes, actors, release dates, plot descriptions, and even visual signals like posters." ([Enjins / JustWatch case study](https://enjins.com/case/justwatch/)).
- Serving: **Approximate Nearest Neighbor search** for vector retrieval ("significantly improving performance while reducing operational costs").
- Three problems the rebuild targeted: **cold-start** (new titles with no interaction data), **popularity bias** (mainstream content swamping niche), and **scale efficiency**.
- Build vs buy: in-house, with the agency as accelerator. Quote attributed to CTO Dominik Raute: "Building inhouse, with the acceleration of a partner like Enjins that brought in expertise from multiple recommendation projects."
- Replaces an earlier collaborative-filtering system.

**Conference / talk record (older but relevant):**

- Dominik Raute & Christoph Hoyer at Snowplow Berlin Meetup #3, Nov 2016 — covered how Snowplow event data drives JustWatch's audience-segmentation infrastructure ([Snowplow Analytics blog](https://snowplowanalytics.com/blog/2017/01/31/roundup-of-snowplow-meetup-berlin-number-three/); [YouTube video](https://www.youtube.com/watch?v=7kG7U_0t9S4)). The talk frames how rec / ad signals share the same event pipeline.
- The JustWatch blog "Building JustWatch, Part 2: Audience as a Service" describes the data foundation: "anonymous user data from more than 100 million movie and TV show fans" including "individual movie taste (favorite genres, actors, directors) and purchase behavior (cinema going rate, favorite cinema, frequented streaming providers)" ([justwatch.com blog](https://www.justwatch.com/blog/post/justwatch-audience-as-a-service/)).

**Where the recommender plugs into the business model:** JustWatch's primary revenue is **JustWatch Media** — paid trailer retargeting for studios, using the same taste signals that power consumer recs ([Wikipedia: JustWatch](https://en.wikipedia.org/wiki/JustWatch); [JustWatch Media](https://media.justwatch.com/)). The Content Insights / Streaming Charts API products ([media.justwatch.com/content-insights](https://media.justwatch.com/content-insights)) sell the aggregate of the same signal set. So consumer recs are partly a by-product of building a sellable audience-intelligence layer.

**"TimeTravel" — could not verify.** The brief mentioned a JustWatch product called "TimeTravel"; searching `"JustWatch" "TimeTravel"` returned only movies titled *Time Travel* in their catalogue, not a product. JustWatch's analytics products that *did* surface are **Content Insights** (data API for studios) and **Streaming Charts** (daily-updated demand charts). It is possible "TimeTravel" is an internal codename or a deprecated product name; no public-web evidence found.

**TMDB relationship:**

- TMDB is the **upstream** for JustWatch's content metadata: "The metadata visible on JustWatch (posters, descriptions, cast etc.) is sourced from TMDb and IMDb with permission." ([TMDB forum thread](https://www.themoviedb.org/talk/616024f469eb900061e200f8)).
- JustWatch is the **upstream** for TMDB's `watch/providers` endpoint: "TMDB's feed from JustWatch is always going to be at least 1 day behind, as JustWatch is the one doing the matching and the matches have to be complete on their side before TMDB sees anything." ([TMDB forum thread on JustWatch feed freshness](https://www.themoviedb.org/talk/673f68df46541bbcd379ee55)).
- Practical implication for HelpME2C: if we consume `watch/providers` via TMDB, we are reading a 24h-stale snapshot of a snapshot. For UX claims like "available on Netflix tonight" this is a known soft spot — JustWatch users complain about it directly (see §6).

---

## 6. Visible failure modes

**Streaming-availability accuracy is the loudest, most consistent complaint.**

- Trustpilot reviewers (UK and US): "mistakes and wrong/out of date information everywhere"; "used to be fantastic" but "now invariably wrong or misleading"; "half a dozen times over the last month" the listed service didn't have the title. ([Trustpilot UK p.2](https://uk.trustpilot.com/review/www.justwatch.com?page=2); [Trustpilot US](https://www.trustpilot.com/review/www.justwatch.com)).
- One review claims the site is "nearly wrong 90% of the time as to where to watch certain seasons of shows" ([VPNVeteran review aggregator](https://vpnveteran.com/justwatch-review/)).
- TV-show metadata issues: "seasons switched, episode titles off, and available episodes listed as unavailable" ([Trustpilot summary](https://www.trustpilot.com/review/www.justwatch.com)).

**Recommendation complaints — small surface, low ceiling.**

- Reported on Trustpilot / Reddit / app-store reviews: "after spending time telling JustWatch about movies they had seen and the types they liked, first recommendations were for movies already seen and on a service they don't have" ([Trustpilot](https://www.trustpilot.com/review/www.justwatch.com)).
- Volume complaint: "recommendations are very limited, only recommending 5-10 movies/series" ([Trustpilot](https://www.trustpilot.com/review/www.justwatch.com)).
- The structural observation in the Reddit-favorites aggregator and TWiT comparison is more damning: **most users come for availability lookup, not for recommendations** ([redditfavorites.com — JustWatch](https://redditfavorites.com/services/justwatch); [TWiT.tv comparison](https://twit.tv/posts/tech/justwatch-letterboxd-trakt-which-app-should-you-use-manage-your-watchlist)). The recommender is a side surface, not the reason for the visit.

**Ads / monetisation friction:**

- Mobile app reviewers: "annoyed by so many ads that didn't even let them watch the start of the movie"; "forced to watch 2 ads before the trailer and then don't show the trailer"; "skip option but it doesn't actually work" ([JustUseApp review aggregator](https://justuseapp.com/en/app/979227482/justwatch-movies-tv-shows/reviews)).
- "$2.50/month to disable ads and provide a few extra filters" ([JustUseApp aggregator](https://justuseapp.com/en/app/979227482/justwatch-movies-tv-shows/reviews); see also [JustWatch Pro page](https://support.justwatch.com/hc/en-us/categories/360003699177-JustWatch-Pro)).

**UX criticism:**

- "Complaints that there's no easy way to browse by genre" ([review aggregator summary](https://redditfavorites.com/services/justwatch)).

---

## Summary read for HelpME2C

1. JustWatch's recommender is a credible modern two-tower system but is a **side surface, not the value prop**. Users come to JustWatch to answer "where can I watch X" and tolerate the recommendations as a by-product. This validates HelpME2C's bet that recommendation is the unmet need.
2. Their "group" story is **shared static lists**, not a blended live "what should we watch tonight" surface. HelpME2C's ghost-profile group recs target a real gap.
3. **Streaming-availability data is volatile and user-visible bad** even at JustWatch's scale, and TMDB's `watch/providers` is 24h stale on top of that. HelpME2C should treat availability claims as soft and design UI affordances accordingly ("checked X hours ago", "service may have changed").
4. The signup signal stack (country auto-detect → streaming services → like/dislike quiz) is the de facto industry pattern HelpME2C should match.

### Notable gaps in evidence

- Could not verify the exact JustWatch signup form fields (client-rendered behind auth).
- Could not verify a JustWatch product literally named "TimeTravel" — the brief may be conflating with Content Insights or a deprecated label.
- The Enjins case study gives architecture but **no published metrics** (no NDCG/recall/CTR uplift numbers). All performance claims are vendor-side, no third-party audit.

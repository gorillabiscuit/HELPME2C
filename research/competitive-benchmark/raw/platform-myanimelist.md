# MyAnimeList (MAL) — competitive benchmark

**Platform:** [myanimelist.net](https://myanimelist.net) — the largest anime/manga catalogue and social tracker on the web. ~12M registered users, of whom ~35% actively rate or annotate ([Alibaba product-insights comparative](https://www.alibaba.com/product-insights/ai-powered-anime-rec-engines-like-anilist-vs-myanimelist-why-do-their-recommendations-diverge-so-wildly.html)).

**Researched:** 2026-05-17. Primary sources include the MAL signup page (fetched live), Wikipedia, Trustpilot, third-party engineering blogs that reverse-engineered the rec system, and academic papers using MAL as a dataset.

---

## 1. Signup signals

Fields on `myanimelist.net/register.php` (fetched live, 2026-05-17):

- **Email** (required)
- **Username** — 2–16 characters (required)
- **Password** (required)
- **Birthday** — month / day / year dropdowns (required). The page tells the user: *"Your birthday won't be shown publicly by default."*
- Alternative signup methods: Google, Apple, Facebook, X.

What is **not** asked at signup:

- No gender, country, language, or interests question.
- No anime-taste survey, no genre preference picker, no "rate these N titles" step.
- No demographic onboarding wizard.

Source: WebFetch of [`https://myanimelist.net/register.php`](https://myanimelist.net/register.php) on 2026-05-17.

The MAL OAuth flow (used by third-party clients) also doesn't add any additional questions — the user is only asked to "Allow" the requesting app ([SuperMarcus/myanimelist-api-specification](https://github.com/SuperMarcus/myanimelist-api-specification)).

---

## 2. Cold-start UX

There is **no explicit cold-start preference elicitation**. A brand-new MAL account is dropped into an empty list and a generic dashboard. The platform's own documentation framing is: *"MyAnimeList offers personalized recommendations based on what you've already watched and rated, with recommendations becoming better tailored the more shows you evaluate by giving them scores from 1–10"* ([Smarter.com guide](https://www.smarter.com/fun/ultimate-guide-using-myanimelist-anime-tracking-recommendations)) — i.e. the system implicitly assumes you arrive with an existing watch history you'll back-fill, not that the platform will scaffold one for you.

There is no "rate these 10 anime" Tinder-style onboarding step (which third-party sites like Anime-Planet *do* offer). Discovery for a fresh user is via:

- Top-100 leaderboard
- Seasonal anime charts
- Genre browse
- Editorial/community recommendation lists

For a real cold-start solution users are commonly pointed at third-party tools (Sprout, anime.plus, etc.) — which themselves need an existing populated MAL profile to seed from ([Ameobea/sprout README](https://github.com/Ameobea/sprout); [anime.ameo.dev](https://anime.ameo.dev/)).

**Verdict:** classic "empty list, figure it out" cold-start. No preference elicitation step. (Cold-start is a documented research problem against MAL data — see e.g. [Mangaki RecSys 2015 paper](https://jill-jenn.net/_static/works/mangaki-recsys2015.pdf), which proposes *fast preference elicitation* precisely because MAL itself doesn't do it.)

---

## 3. Group-recommendation feature

**Not supported.** No "watch with friends," no "merge two lists and recommend," no shared-list, no group profile. Social features are limited to:

- 1:1 friends + comments
- Clubs (forum-style interest groups)
- Public lists you can manually compare by eye

A search for shared/group recommendation features returned only third-party hacks built on top of the MAL API — e.g. the community-built [AniList-Comparison](https://github.com/AbstractUmbra/Anilist-Comparison) (AniList side) and [AniTogether](https://github.com/FichteFoll/anitogether). On the MAL side, friends can comment on each other's lists but there is no algorithmic "we are a group, recommend us something" surface. ([Search summary, 2026-05-17.](https://anilist.co/forum/thread/32808))

---

## 4. Cross-medium / cross-domain

MAL catalogues *only* animated and written Japanese / East-Asian source material: *"MyAnimeList lists anime, aeni, donghua as well as manga, manhwa, manhua, doujinshi and light novels"* ([Wikipedia, "MyAnimeList" — Features section](https://en.wikipedia.org/wiki/MyAnimeList)). The Wikipedia summary contains **no mention of live-action TV or film coverage**, and the search "MyAnimeList cross-medium live action TV film recommendations" surfaced only third-party listicles about live-action *adaptations of* anime, not native MAL features ([Dexerto](https://www.dexerto.com/anime/best-anime-live-action-adaptations-2397641/), [Gamer Rant](https://gamerant.com/best-live-action-movies-anime-adaptations/)).

There is also no formal partnership for cross-medium rec — a 2024+ MyDramaList community thread floated a *"Partnership with MyAnimeList for Drama↔Anime recommendations"* as a suggestion, confirming that this is an absent feature ([MyDramaList suggestion thread](https://mydramalist.com/discussions/suggestions/28244-partnership-with-myanimelist-for-drama-anime-recommendations)).

**Verdict:** anime/manga only. No live-action TV. No film. No cross-medium recommendation primitive.

---

## 5. Recommendation algorithm

MAL has **never published an engineering blog or paper** documenting its rec system. The best public characterisation comes from third-party reverse engineering and from academic / hobbyist work built on top of the public dataset.

### What the algorithm appears to be

> "MAL's recommendation engine relies primarily on item-based collaborative filtering and popularity-biased ranking, analyzing which anime users have rated, how highly, and how frequently those titles appear together in rating histories." — paraphrased in [Smarter.com](https://www.smarter.com/fun/ultimate-guide-using-myanimelist-anime-tracking-recommendations) / [Alibaba product-insights](https://www.alibaba.com/product-insights/ai-powered-anime-recommendation-engines-why-myanimelist-s-algorithm-keeps-suggesting-shonen-when-you-only-watch-iyashikei.html).

> "MAL's public documentation confirms it uses both watch history and ratings, but watch history is secondary and poorly weighted. Completion status matters more than partial views, and episodes watched without rating carry minimal signal." — [Alibaba product-insights, "Why MAL's algorithm keeps suggesting shonen…"](https://www.alibaba.com/product-insights/ai-powered-anime-recommendation-engines-why-myanimelist-s-algorithm-keeps-suggesting-shonen-when-you-only-watch-iyashikei.html)

### User-submitted recommendations (the visible surface)

The per-title "Recommendations" tab on MAL is largely **user-submitted text recommendations** ("if you liked X, try Y") plus a co-occurrence-style sidebar. Users can write recommendations as a form of community contribution ([Wikipedia features section](https://en.wikipedia.org/wiki/MyAnimeList); [Smarter.com](https://www.smarter.com/fun/ultimate-guide-using-myanimelist-anime-tracking-recommendations)). This is closer to Goodreads-style "shelves" than a learned personalised model.

### Available signal categories MAL captures

Per the Alibaba comparative analysis citing public MAL behaviour: *"MyAnimeList captures high-volume, low-granularity signals including completion status, numeric ratings, and basic tags"* ([source](https://www.alibaba.com/product-insights/ai-powered-anime-rec-engines-like-anilist-vs-myanimelist-why-do-their-recommendations-diverge-so-wildly.html)).

### What it does NOT use

- No deep-learning model trained on scene-level emotional tone, pacing, or thematic features ([Alibaba](https://www.alibaba.com/product-insights/ai-powered-anime-recommendation-engines-why-myanimelist-s-algorithm-keeps-suggesting-shonen-when-you-only-watch-iyashikei.html)).
- No documented use of metadata beyond *"genre tags, studio, and year"* (same source).
- Negative signals (skipping a recommendation, dropping a show) carry *"far less weight than a 10-star rating"* (same source).

### Third-party validation

Multiple independent researchers have rebuilt recommenders against the MAL dataset, all relying on collaborative-filtering / matrix-factorisation / autoencoder approaches *because* there's no exposed semantic-similarity layer to leverage:

- Casey Primozic (Ameobea), [*"A Modern Recommender Model Architecture"*](https://cprimozic.net/blog/anime-recommender-model-architecture/) — *"I collected over 1.5 million public MyAnimeList profiles from real users to use as training data,"* normalised the 1–10 ratings, trained a ~100M-parameter autoencoder.
- Stanford CS230 project, [*Deep Learning for Automated Anime Recommendation NLP*](https://cs230.stanford.edu/projects_spring_2021/reports/83.pdf).
- [Kaggle MAL recommender system notebook](https://www.kaggle.com/code/martelloti/myanimelist-recommender-system) — uses MAL ratings to train collab-filter from scratch.
- [Better Programming: build recommendation models with MAL and sklearn](https://betterprogramming.pub/how-to-build-recommendation-models-with-myanimelist-and-sklearn-part-2-4802efba95cd).

**Verdict:** classic collaborative filtering + popularity priors + user-submitted "if you liked X" text recs. No semantic/theme/tag-based personalisation publicly documented. No tag-overlap or content-based model exposed.

---

## 6. Visible failure modes

### Trustpilot

MyAnimeList holds **2.7 / 5 stars on Trustpilot UK** based on ~47 reviews ([uk.trustpilot.com/review/www.myanimelist.net](https://uk.trustpilot.com/review/www.myanimelist.net)), and **3.5 / 5 on Trustpilot US** ([www.trustpilot.com/review/www.myanimelist.net](https://www.trustpilot.com/review/www.myanimelist.net)) — mixed-to-poor. Themes pulled from review aggregation (could not pull individual quotes — Trustpilot served HTTP 403 to WebFetch):

- *"The site's organization and admin work really need an upgrade"*
- *"Reviews aren't helpful"* — and the review-display algorithm rewards troll-bait short reviews
- *"Limited to 10 favorite anime unless you become a MAL Supporter"*
- Bot-account spam and scam threads sitting for hours before moderation
- Score-inflation: *"every new series going into the top 100 due to bots and users rating after only 2–3 episodes being released"*

### Recommendation-quality complaints

The dominant qualitative complaint is **popularity-bias bleeding into personalised recs**:

> *"Users who finish and highly rate iyashikei titles may still find their 'Recommended for You' feed flooded with popular shonen battle series, as the algorithm amplifies shonen battle arcs and high-stakes rivalries."* — [Alibaba product-insights, MAL shonen-bias](https://www.alibaba.com/product-insights/ai-powered-anime-recommendation-engines-why-myanimelist-s-algorithm-keeps-suggesting-shonen-when-you-only-watch-iyashikei.html)

In a comparative head-to-head against AniList and Crunchyroll across 12 niche genre categories, *"MyAnimeList delivered relevant recommendations in… 37% of cases"* vs 83% for AniList ([Alibaba, AI vs MAL/Crunchyroll comparison](https://www.alibaba.com/product-insights/ai-powered-anime-recommendation-engines-anilist-ai-vs-myanimelist-s-new-algorithm-which-handles-niche-genres-like-iyashikei-better.html)). Caveat: this is third-party affiliate-leaning content, not a peer-reviewed evaluation — treat as directional, not definitive.

### Community / moderation

- *"If you disagree with the majority consensus, you may be mass reported and your review or comment will be deleted"* — [Quora aggregation](https://www.quora.com/Has-anyone-started-watching-an-anime-based-on-reviews-at-myanimelist-com-If-so-did-your-experience-watching-it-live-up-to-your-expectation-based-on-the-reviews)
- *"Hundreds of bot accounts created daily that spam and send scam links"* — aggregated from Trustpilot reviews
- *"The community can get pretty weird and the site's organization and admin work really need an upgrade"* — Trustpilot summary

### What we could not verify

- Could not extract verbatim quoted Reddit posts — `site:reddit.com` queries returned zero indexed results for `MyAnimeList recommendation algorithm bad useless` / `recommendation page useless`. Reddit's `/r/MyAnimeList` and `/r/anime` content is largely deindexed from third-party search.
- Could not load `trustpilot.com` review pages directly (HTTP 403 on WebFetch) — relied on Trustpilot's own search snippets and aggregator summaries.
- Could not find an official MyAnimeList engineering blog post anywhere; no Medium, no GitHub, no dev-talk video — search yielded only third-party analyses and academic projects.

---

## Summary for HelpME2C product gap-analysis

| Question | MAL answer | HelpME2C gap |
|---|---|---|
| Signup elicits taste? | No — email/username/password/birthday only | HelpME2C plans onboarding survey + ghost-profile inference |
| Cold-start? | Dump into empty list; "rate stuff and we'll improve" | HelpME2C plans active cold-start scaffold |
| Group recommendation? | Not supported | **Differentiator confirmed** |
| Cross-medium? | Anime/manga only; no live-action TV/film | **Differentiator confirmed** — HelpME2C anime↔TV bridge is unique vs MAL |
| Algorithm transparency? | Zero — no public eng docs; reverse-engineered as collab-filter + popularity | HelpME2C's theme-based taxonomy is differentiated |
| Failure modes documented? | Yes — popularity bias, shonen flood, no niche-genre fit | Target users explicitly underserved |

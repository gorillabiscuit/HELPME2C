# HelpME2C — Competitive & State-of-the-Art Benchmark

**Date:** 2026-05-17
**Scope:** competitive landscape (9 platforms), state of the art (4 themes),
gap analysis vs HelpME2C's actual Phase 1A pipeline.
**Constraints anchoring the gap analysis** (per PROJECT.md, the ADRs read,
and CLAUDE.md): EU data residency, GDPR floor (UK GDPR / Swiss FADP /
CCPA-compatible), age 16+ EU / 13+ rest-of-world, Phase 1A scale (<1000
users), rule-based scoring only in 1A (no ML training infrastructure),
web-only, recommendation engine is the moat per PROJECT.md §moats. Skip
approaches that assume Netflix-scale data.

Every non-obvious claim cites a URL or paper in the raw files under
`research/competitive-benchmark/raw/*.md`. This is a synthesis document;
the raw files are the evidence.

---

## Contents

### Part 1 — Competitive landscape
- [MyAnimeList](#myanimelist) — Goodreads-style user-voted recs, no cold-start, no group, no cross-medium
- [AniList](#anilist) — same shape as MAL but with a richer tag taxonomy and a community thread literally titled "Recommendations page is useless"
- [Simkl](#simkl) — closest direct competitor; ships TV+anime+film, "Watch With Friends" is pure list-intersection, recs are paywalled and siloed per medium
- [Trakt](#trakt) — 2025 freemium pivot triggered a live migration event; staff admit recs are not personalised; no group features at all
- [Netflix](#netflix) — profile pollution + no "Our List" is the most-cited UX complaint; 3-show cold-start picker; thumbs-not-stars (200% lift); 2025 unifying foundation model
- [Spotify](#spotify) — 3-artist picker is the canonical cold-start UX; Blend (2 users) and Jam (~32 users) ship group rec but **do not disclose the aggregation function**
- [JustWatch](#justwatch) — like/dislike quiz + streaming services; two-tower rec model (2023) but recommendations are a side surface; availability data is volatile and visibly bad
- [Letterboxd](#letterboxd) — deliberately no personalised recs ("the platform is the recommender"); film-only; cottage industry of third-party Blends; cautionary tale on average-rating
- [Plex Discover](#plex-discover) — only signal at signup is "which streaming services do you have"; Discover Together is a social-feed not a group ranker; the 2023 privacy backlash is required reading before shipping any social feature

### Part 2 — State of the Art (deployable at <1000 users)
- [Cold-start methods](#sota-cold-start) — Pop×Ent picker + thumbs up/down/skip + MMR re-rank is the literature-endorsed Phase 1A stack
- [Tag vs CF vs hybrid](#sota-tag-cf-hybrid) — pure tag-overlap is the *correct* default below ~10k users with ≥50 ratings each; right next step is Burke's switching hybrid with item-based CF understudy
- [Group aggregation](#sota-group) — HelpME2C's AWM + soft disagreement penalty is the direct composition of Masthoff 2004 (AWM) and Amer-Yahia VLDB 2009 (relevance − λ·disagreement); defensible and mainstream
- [Cross-medium taste transfer](#sota-cross-domain) — HelpME2C's 41 hand-curated theme bridges sit in the same family as Kaminskas/Ricci emotion-tag bridges and Pandora's Music Genome Project; correct design point for the regime, but coverage at 41 is a prototype

### Part 3 — Gap analysis & top changes
- [Cold-start](#gap-cold-start) — **BEHIND competition** (Trakt has the strongest cold-start) **and behind SOTA** (no Pop×Ent, no MMR, no thumbs vocabulary)
- [Personal recs scoring](#gap-personal) — **AHEAD of every direct competitor** (MAL/AniList/Trakt/Simkl) on mechanism; **at SOTA** for the <1000-user regime per Pazzani/Lops/Pandora; structurally behind Netflix/Spotify foundation models but those don't apply at our scale
- [Group recs](#gap-group) — **AHEAD of everyone except Spotify** (Spotify ships group rec but doesn't disclose aggregation); **at SOTA** per Masthoff + Amer-Yahia composition; HelpME2C is the only TV+anime tracker with algorithmic group scoring + explanation layer
- [Cross-medium](#gap-cross-medium) — **AHEAD of everyone** in the benchmark; no competitor does theme-based cross-medium scoring; **rare-in-publication** integration per literature; **coverage** is the constraint
- [**TOP 3 CONCRETE CHANGES**](#top-3) — bordered callout at the end

---

# Part 1 — Competitive landscape

<a id="myanimelist"></a>
## MyAnimeList — Goodreads-style anime tracker with no algorithmic personalisation

| | |
|---|---|
| **Signup signals** | email, username, password, birthday. No demographics. No taste survey. ([raw](raw/platform-myanimelist.md)) |
| **Cold-start UX** | empty list, no preference elicitation. Discovery via top-100, seasonal charts, genre browse, user-curated lists. |
| **Group rec** | not supported. Only third-party hacks (e.g. [AniList-Comparison](https://github.com/AbstractUmbra/Anilist-Comparison), [AniTogether](https://github.com/FichteFoll/anitogether)). |
| **Cross-medium** | anime / manga / light novels only. No live-action TV / film. |
| **Algorithm** | never published. Reverse-engineered as item-based CF + popularity priors + user-submitted "if you liked X" lists. No engineering blog, no Medium, no GitHub presence. |
| **Visible failures** | Trustpilot 2.7–3.5/5. Dominant complaint: popularity / shonen bias floods personalised recs. "Recommended for You" feed flooded with shonen even for users rating iyashikei highly ([Alibaba product-insights comparative](https://www.alibaba.com/product-insights/ai-powered-anime-recommendation-engines-why-myanimelist-s-algorithm-keeps-suggesting-shonen-when-you-only-watch-iyashikei.html)). |

**One-line take:** the platform that *defines* anime tracking does no
algorithmic personalisation. Its rec surface is functionally a community
forum dressed up as recommendations.

<a id="anilist"></a>
## AniList — richer tag taxonomy, identical structural gaps

| | |
|---|---|
| **Signup signals** | OAuth2 + multi-step setup (could not directly verify form fields — Cloudflare blocked WebFetch). No verified taste survey at signup. ([raw](raw/platform-anilist.md)) |
| **Cold-start UX** | same empty-list pattern as MAL. Primary scaffold = bulk-import from MAL XML or AniDB JSON. |
| **Group rec** | not supported. Third-party only. |
| **Cross-medium** | anime / manga only. No live-action. |
| **Algorithm** | per-title recommendations are **user-submitted + community-voted** via the GraphQL `Recommendation` object — literally Goodreads shelves with upvotes. Personalisation surface = undocumented, leans tag-overlap per third-party analyses. |
| **Visible failures** | community thread titled [*"Recommendations page is useless"*](https://anilist.co/forum/thread/74446). Trustpilot 2.3/5 ("Poor"). |

**One-line take:** more transparent than MAL (the GraphQL surface exposes
the user-voted nature), but the same product: deep anime catalogue, no
algorithmic personalisation, no group rec, no cross-medium.

<a id="simkl"></a>
## Simkl — the closest direct competitor

This is HelpME2C's most analogous existing product. Simkl ships TV + anime
+ film as equal pillars and added a "Watch With Friends" feature plus
paywalled personalised recs in Dec 2024.

| | |
|---|---|
| **Signup signals** | email + username + password + SSO. No demographics, no taste survey. ([raw](raw/platform-simkl.md)) |
| **Cold-start UX** | no explicit elicitation. Documented solution: list import (14+ supported services). |
| **Group rec** | **Watch With Friends** — up to 3 friends, **pure intersection of "Plan to Watch" lists**, no algorithmic taste fusion. ([Simkl docs](https://docs.simkl.org/how-to-use-simkl/core-features/social-and-community/watch-party-with-friends)) |
| **Cross-medium** | **siloed per medium.** The Recommendations page renders separate sections for TV / anime / movies, with two engines (V1/V2) per medium. No cross-medium scoring. ([Recommendations doc](https://docs.simkl.org/how-to-use-simkl/core-features/search-and-discovery/recommendations)) |
| **Algorithm** | one engine is described as **"AI LLM-powered… crafts around 40 unique tag combinations for each media type"** ([launch blog](https://simkl.org/introducing-personalized-recommendations-on-simkl-a-game-changer-5d83046f2236)). Paywalled (PRO/VIP). 24h refresh cap. |
| **Visible failures** | Personalized recommendations were the **#1 most-requested feature for the platform's first ~10 years** — admitted in their own launch blog. iOS app criticised as "not a true native iOS app". No re-watch tracking primitive. |

**One-line take:** the only competitor that ships both anime+TV as equal
pillars AND a group feature. But the group feature is set-intersection,
the recs are paywalled and per-medium-siloed, and even the LLM-powered
engine is medium-internal tag clustering — not cross-medium.

<a id="trakt"></a>
## Trakt — strongest cold-start, weakest recs, mid-migration event

| | |
|---|---|
| **Signup signals** | email + username + password + display name + location + DOB/gender (optional) + **genre picker + "favourite movies and TV shows" picker** + IMDb/Letterboxd importer added Nov 2024. The most structured cold-start in the benchmark. ([Troypoint walkthrough](https://troypoint.com/trakt/); [@trakt 2024-11-16](https://x.com/trakt/status/1857854684104400993)) |
| **Cold-start UX** | the strongest of any TV/anime tracker — multi-step wizard seeds the dashboard. ([raw](raw/platform-trakt.md)) |
| **Group rec** | not supported at all. Only manual collaborative lists. Long-open feature request for a "find friends with similar taste" page. |
| **Cross-medium** | **functionally siloed.** Separate `/recommendations/movies` and `/recommendations/shows` endpoints; **no `/recommendations/anime`** — anime is shelved as TV ([SIMKL vs Trakt](https://docs.simkl.org/how-to-use-simkl/faq/frequently-asked-questions/simkl-alternatives/simkl-vs-trakt)). |
| **Algorithm** | least-documented in the benchmark. Trakt staff (Justin) admitted on the forum: *"It shouldn't be recommending things you've already seen"* — confirming the rec pipeline doesn't reliably consult the user's watched list ([forum thread](https://forums.trakt.tv/t/recommendations/9823)). |
| **Visible failures** | rich, repeated, well-documented. *"every single show that has some element of sci-fi just recommends me GoT and Walking Dead"* (benjick, [forum](https://forums.trakt.tv/t/if-you-like-x-recommendations-are-kinda-bad/9609)). **2025 freemium pivot** ($30→$60 VIP, 100-item watchlist cap) triggered a live migration to Simkl + Showly per [AlternativeTo coverage](https://alternativeto.net/news/2025/2/trakt-tv-has-set-stricter-limits-for-free-users-and-raised-vip-subscription-prices-by-100-/). Verbatim user quotes: *"That's low-key predatory marketing"* (LexTheOne, 100+ likes); *"from 2000 items in a list to only 100? byeee"* (Nevery_y, 74 likes). A **cottage industry of third-party AI rec replacements** ([Couchmoney](https://couchmoney.tv), [Gemini AI Stremio addon](https://stremio-addons.net/addons/gemini-ai-recommender)) exists *because* native Trakt recs are widely regarded as inadequate. |

**One-line take:** Trakt has the strongest cold-start UX in the benchmark
and the worst recommendation reputation. The 2025 freemium pivot is a
live migration event HelpME2C launch should consider.

<a id="netflix"></a>
## Netflix — the SOTA reference, with the cleanest unmet-need signal for group recs

| | |
|---|---|
| **Signup signals** | email + password + plan + payment + profile name. **No demographics asked.** Up to 5 profiles per account. ([raw](raw/platform-netflix.md)) |
| **Cold-start UX** | **"Choose 3 shows you like to start"** — a poster grid, single-tap, "Continue" CTA unlocks at 3 picks. No genres, no themes, no actors — just titles. ([UserOnboarding.Academy](https://useronboarding.academy/user-onboarding-inspirations/netflix-signup-onboarding)) |
| **Group rec** | **does not exist.** Profiles, "Extra Member" slots, Profile Transfer — all are *separate-account* solutions, not group recommendation. |
| **Cross-medium** | n/a — Netflix is single-medium (video). Anime is a first-class genre but no cross-medium bridging. |
| **Algorithm** | extensively published. Gomez-Uribe + Hunt TMIS 2015 paper ([ACM 10.1145/2843948](https://dl.acm.org/doi/10.1145/2843948)) is the canonical entry point. Basilico's [Artwork Personalization at Netflix](https://netflixtechblog.com/artwork-personalization-at-netflix-c589f074ad76) (2017) is the canonical contextual-bandit reference. 2025 direction: a **unifying Foundation Model** (autoregressive transformer treating user history as token sequence; pre-trained monthly, fine-tuned daily; orthogonal low-rank embedding alignment between training runs). 2017 thumbs-up/down replacement of 5-star ratings produced a **200% increase in ratings activity** ([Netflix newsroom](https://about.netflix.com/en/news/goodbye-stars-hello-thumbs)). |
| **Visible failures** | **profile pollution** is the most-cited UX complaint — and it's the single clearest signal that group rec is an unmet need. *"I'm not secretly very interested in Dragon Rider episodes without my kids present... we are missing an 'Our List' for when we are together"* (evanmoran, [HN 38943560](https://news.ycombinator.com/item?id=38943560)). Originals-pushing critique (rappatic: *"notoriously bad… seems to heavily push whatever 'original' they just dumped $100 million into"*). |

**One-line take:** Netflix has built the world's most sophisticated
single-user video recommender and explicitly declined to build group rec,
even though the loudest UX complaint at the world's largest streaming
service maps directly onto the missing group-rec surface. **This is the
clearest external validation of HelpME2C's group-rec moat.**

<a id="spotify"></a>
## Spotify — the canonical cold-start parallel, and the only competitor shipping algorithmic group rec

| | |
|---|---|
| **Signup signals** | email + DOB + gender + password + language. Demographics up front, unlike Netflix. ([raw](raw/platform-spotify.md)) |
| **Cold-start UX** | **"Choose 3 or more artists if you like"** — colourful artist-photo grid with multi-pick. Artists, not songs (artist = higher-information signal). Spotify Research's 2025 [Generalized User Representations](https://research.atspotify.com/2025/9/generalized-user-representations-for-large-scale-recommendations) post explicitly states that removing onboarding signals causes a **13.8% drop in recommendation-quality metrics on onboarding-aligned clusters**. |
| **Group rec** | **Blend** (2 → 10 users, daily shared playlist with a "taste match %") and **Jam** (real-time, ~32 participants). Both ship in production. **The aggregation function is not publicly disclosed.** PM Arjun Narayen: *"Blend is one of the first products we've developed that requires multiuser personalization, which has unique challenges"* ([Spotify Newsroom 2021-08-31](https://newsroom.spotify.com/2021-08-31/how-spotifys-newest-personalized-experience-blend-creates-a-playlist-for-you-and-your-bestie/)). |
| **Cross-medium** | music + podcasts + audiobooks via shared user-embedding pipeline + lightweight task heads. The Nazari et al. [music→podcast cold-start paper](https://arxiv.org/abs/2007.13287) (SIGIR 2020) is the most directly relevant industrial precedent for HelpME2C's TV↔anime mechanism. |
| **Algorithm** | **BaRT — Bandits for Recommendations as Treatments** (McInerney et al. RecSys 2018) is the canonical paper — contextual bandits that jointly learn *which recommendations* and *which explanations* each user responds to. Discover Weekly = collaborative filtering + NLP over text + audio analysis. Voyager (HNSW, 2023) replaced Annoy for ANN serving. |
| **Visible failures** | the **algorithmic rut**: *"average listener heard the same ~70 unique tracks across 80% of their listening sessions"* ([trending.fm analysis](https://trending.fm/blog/why-spotify-plays-same-songs/)). Hide-button reportedly ineffective; AI-generated music polluting Discover Weekly. |

**One-line take:** Spotify ships group rec (Blend + Jam) — but doesn't
disclose the aggregation function. HelpME2C is operating in genuinely
unsolved-in-public territory, even at the world's largest music
platform.

<a id="justwatch"></a>
## JustWatch — the operational availability benchmark, not the rec benchmark

| | |
|---|---|
| **Signup signals** | email / Apple / Facebook / Google + country (auto-detected) + which streaming services you subscribe to + **like/dislike quiz** to seed the recommender ([cloudwards.net guide](https://www.cloudwards.net/how-to-use-justwatch/); [ecency.com walkthrough](https://ecency.com/cinetv/@failingforwards/have-you-heard-of-justwatch-part-2-how-to-get-recommendations-when-you-dont-know-what-to-watch)). |
| **Cold-start UX** | strongest "I have these subs" signal of any platform; quiz on top. ([raw](raw/platform-justwatch.md)) |
| **Group rec** | **shared static lists** (Nov 2023, with IMDb-list import). Not a blended live "what should we watch tonight" surface. |
| **Cross-medium** | catalogue-wide two-tower rec model — movies, TV, anime mixed. No public statement of cross-medium scoring being explicit (e.g., movie→TV-series transfer weighted vs movie→movie). |
| **Algorithm** | rebuilt early 2023 around a **two-tower model + ANN serving** to target cold-start + popularity bias + scale ([Enjins case study](https://enjins.com/case/justwatch/)). TMDB upstream for metadata; JustWatch upstream for TMDB's `watch/providers` endpoint, which means recommendation availability data is **at least 24h stale** by the time HelpME2C consumes it via TMDB. |
| **Visible failures** | streaming-availability accuracy is the loudest, most consistent complaint ("wrong/out of date information everywhere", "nearly wrong 90% of the time as to where to watch certain seasons of shows"). Most users come for availability, not recs — *the recommender is a side surface.* |

**One-line take:** JustWatch is the JustWatch of recommendation — meaning,
it's the operational benchmark for availability-inline-with-recs but the
rec surface is itself a side effect of building a sellable audience-data
product. HelpME2C's bet that *recommendation* is the unmet need is
validated.

<a id="letterboxd"></a>
## Letterboxd — deliberately no personalised recs

| | |
|---|---|
| **Signup signals** | email + username + password. No country, no streaming services, no taste quiz. ([raw](raw/platform-letterboxd.md)) |
| **Cold-start UX** | "go to Popular, click the eye". No structured elicitation. |
| **Group rec** | **watchlist intersection ("In your Watchlist" filter)** since Feb 2016 — manual, pairwise-only, produces a list not a recommendation. **No native blend.** Third-party tools exist ([jjoej15/letterboxd-recs](https://github.com/jjoej15/letterboxd-recs), [recommendations.victorverma.com](https://recommendations.victorverma.com/watchlist-picker)) precisely because the slot is unmet. |
| **Cross-medium** | **film only**, TV "still on the way" (announced Jan 2024, not shipped as of Nov 2025), and when TV ships **it will be siloed**. Anime is film-only (no "returning" TV). |
| **Algorithm** | per-title "Similar Films" via [Nanocrowd ViewerVoice](https://nanocrowd.com/nanocrowd-letterboxd/) (review-text clustering, March 2022). 2023 weighted-average-rating update compresses extreme scores; academic paper documents [bias against niche genres](https://sol.sbc.org.br/index.php/webmedia/article/download/37951/37729). **No personalised "For You" rail exists, on purpose.** |
| **Visible failures** | the well-documented "average rating reflects Film-Twitter taste, not yours" failure mode — cautionary tale against ever surfacing a single global average as the primary signal. *"they have more data on my movie taste than anyone"* and yet no recs. |

**One-line take:** Letterboxd is deliberately not in the recommendation
business. The third-party Blend ecosystem is direct evidence of unmet
demand HelpME2C's group-rec surface can capture.

<a id="plex-discover"></a>
## Plex Discover — a privacy cautionary tale plus the only competitor with a Vionlabs-style mood/keyword taxonomy

| | |
|---|---|
| **Signup signals** | email + password (or Google/Apple SSO). After signup: streaming-services picker, that's it. No demographics, no genre, no taste quiz. ([raw](raw/platform-plex-discover.md)) |
| **Cold-start UX** | weakest in the benchmark (streaming services only). |
| **Group rec** | three confused features: **Watch Together** (synchronised playback, being sunset Feb 2025); **Discover Together** (friend activity feed, Nov 2023) — closest to group rec but it's a *trending-with-friends popularity cohort*, not a multi-user joint ranker; **shared library** (PMS access). **No multi-user joint recommendation engine.** |
| **Cross-medium** | siloed. Anime is a genre of TV/film, not first-class. Podcasts discontinued April 2022. Music (Plexamp) is not in Discover. |
| **Algorithm** | **Vionlabs** partnership (April 2023): 30+ predicted genres, 20+ AI-extracted moods, 65+ mood tags per video file (per-scene), 1,200+ descriptive keywords, scene-level fingerprint embeddings. No published RecSys paper; everything is marketing-tier. |
| **Visible failures** | **the 2023 Discover Together privacy backlash** — Discover Together auto-promoted shared-library users to "friends", defaulted watch history sharing to "Friends Only", and started sending "Week in Review" emails. Verbatim user quotes: *"I wonder how many people just had their week's porn selections emailed to their Plex friends"* ([404 Media](https://www.404media.co/plex-users-fear-discover-together-week-in-review-feature-will-leak-porn-habits-to-their-friends-and-family/)); *"This is the kind of thing that can end friendships, tear apart families, result in getting fired or even lead to physical harm"* (dmurph, [Plex Forum](https://forums.plex.tv/t/discover-together-and-week-in-review-emails-are-a-massive-breach-of-privacy-and-trust/860302)). Plex spokesperson admitted users *"may have clicked through these settings during the onboarding process without reading their selections"* — i.e., the defaults were technically opt-in but practically opt-out. |

**One-line take:** Plex Discover is the closest analogue for *how* a TV/film
discovery product layers ML on top of curated content. Its 2023 privacy
backlash is required reading before HelpME2C ships any social/group
feature: **defaults that auto-enrol users into sharing are reputationally
dynamite.**

---

# Part 2 — State of the Art (deployable at <1000 users)

<a id="sota-cold-start"></a>
## Cold-start recommendation

The literature's deployable Phase 1A stack:

1. **Pop×Ent picker** ([Rashid et al. IUI 2002](https://cs.fit.edu/~pkc/apweb/related/rashid-iui02.pdf)) — pick the 5–10 elicitation items by `popularity × rating-variance`. TMDB / AniList popularity + rating-spread gives a free entropy proxy. Pop×Ent consistently beats pure popularity, pure entropy, and personalised prediction-based selection. Pure entropy fails because high-entropy items are obscure and the user just says "haven't seen it".
2. **Thumbs up / down / haven't-seen-it**, not 5-star. Netflix's 2017 finding (200% lift in ratings activity) is empirical; the literature explanation is that 5-point cognitive load stalls users. Thumbs match how every successful cold-start UX (Netflix, JustWatch like/dislike, Spotify implicit) actually behaves.
3. **3-pick magic number.** Both Spotify and Netflix independently converged on 3 as the minimum to unlock personalisation. The Spotify Research 2025 [Generalized User Representations](https://research.atspotify.com/2025/9/generalized-user-representations-for-large-scale-recommendations) post quantifies onboarding-signal value at 13.8% rec-quality drop when removed — i.e., onboarding signals stay load-bearing even after warm-up.
4. **Tag-vector taste profile + MMR re-rank.** [Sen, Vig, Riedl "Tagommenders" (WWW 2009)](https://dl.acm.org/doi/10.1145/1526709.1526800) shows tag-based scoring competes with CF in low-data regimes. [Carbonell & Goldstein MMR (SIGIR 1998)](https://www.cs.cmu.edu/~jgc/publication/The_Use_MMR_Diversity_Based_LTMIR_1998.pdf) gives the diversity re-ranker (λ in 0.5–0.7 for cold-start slates, tightening toward 1.0 as signal accumulates).
5. **Popularity backoff for the first 1–2 sessions, with active decay.** The [RecSys 2025 paper on inherited popularity bias](https://arxiv.org/pdf/2510.11402) warns popularity injection during cold-start tends to *persist*; mitigation is to actively decay rather than passively let user signal overwrite.

**Do NOT collect age/gender as recommendation signals.** [Ekstrand et al. ECIR 2022](https://arxiv.org/pdf/2110.08353) and [Wang et al. 2025](https://arxiv.org/html/2508.20401v2) consistently show small lift + real fairness cost. Region is fine as an availability filter (JustWatch-style), not as a taste prior. This is also the GDPR-aligned default.

**Not deployable at Phase 1A:** two-tower neural retrieval (YouTube, RecSys 2019), transformer sequence models (SASRec, BERT4Rec), meta-learning (MeLU), GNN-based cold-start, LLM-as-recommender. The transferable *heuristics* they validate (item-feature primacy, diversity injection, offline-simulation-before-live, explicit-signal-early) do transfer down.

Full citations and verdicts: [raw/sota-cold-start.md](raw/sota-cold-start.md).

<a id="sota-tag-cf-hybrid"></a>
## Tag/content vs collaborative filtering vs hybrid

The literature's verdict on HelpME2C's pure-tag-overlap approach at Phase 1A scale: **defensible and literature-recommended**, not a stopgap.

- **Content-based recommenders structurally avoid new-item cold start.** [Pazzani & Billsus 2007](https://link.springer.com/chapter/10.1007/978-3-540-72079-9_10), [Lops/de Gemmis/Semeraro 2011](https://link.springer.com/chapter/10.1007/978-0-387-85820-3_3). The flip side is overspecialisation, which a high-quality tag vocabulary mitigates.
- **CF needs scale.** Sarwar et al. item-based CF (WWW 2001), Koren MF (IEEE Computer 2009), [Hu/Koren/Volinsky implicit-feedback CF (ICDM 2008)](http://yifanhu.net/PUB/cf.pdf). MovieLens-100K (~1k users × ~100 ratings/user) is the *minimum* dataset where CF tutorials reliably produce sensible results. Industry rule-of-thumb: meaningful CF signal arrives in the **5k–10k active-users with ≥50 ratings each** range. Below that, CF computes noise.
- **Burke's hybrid taxonomy** ([UMUAI 2002](https://link.springer.com/article/10.1023/A:1021240730564)) — 7 families: weighted, switching, mixed, feature-combination, feature-augmentation, cascade, meta-level. **The right family for HelpME2C's next step is switching with a CB-primary and an item-based-CF-understudy that activates above a per-user data threshold.** Not weighted (premature tuning), not cascade (over-engineered at this scale).
- **Tag taxonomy quality is the moat at low scale.** Pandora's Music Genome Project (~450 attributes + ~1,300 sub-genres, 30 musicologists over 5 years) is the canonical industrial demonstration that deep editorial tagging can power a recommender against CF-based competitors at scale. HelpME2C's TMDB-keyword-to-AniList-tag theme bridge is already a textbook **feature-combination cross-domain hybrid** per Burke + Cantador.
- **Implicit + explicit signal blending** (Hu/Koren/Volinsky confidence-weighting) is the right pattern for Phase 1B — keep explicit (bipolar ratings) and implicit (watch completion, dwell) as separate confidence-weighted channels. *Don't* default implicit-as-rating-zero.

**Operational refinements the literature endorses now**, in priority order:
1. Invest in tag/theme-bridge depth — highest marginal value per engineering hour at this scale
2. Log implicit signals now even if unused (Hu/Koren/Volinsky calibration needs historical depth)
3. Add explicit preference elicitation for new users (Felfernig knowledge-based-recommender line) before any CF investment

Full citations: [raw/sota-tag-vs-cf-vs-hybrid.md](raw/sota-tag-vs-cf-vs-hybrid.md).

<a id="sota-group"></a>
## Group recommendation aggregation

HelpME2C's current approach (per ADR-0020 and `packages/ml/src/recommendation.ts:recommendForGroup`):

```
groupScore = mean(norm_member_scores) - λ · stddev(norm_member_scores)
where any member_score < veto_threshold (0.5) excludes the item
λ = 0.5, per-user min-max normalisation
```

**Verdict from the literature: defensible, mainstream, and exactly the direct composition of two independent canonical lines.**

1. **Average Without Misery (AWM)** — [Masthoff "Group Modeling" UMUAI 2004](https://link.springer.com/article/10.1023/B:USER.0000010138.79319.fd), restated in the 2011/2015/2022 Handbook chapters. Foundational empirical study; humans spontaneously use Average, AWM, and Least Misery. Misery floor with `veto_threshold = 0.5` is Masthoff's standard parameterisation.
2. **Relevance-minus-disagreement linear combination** — [Amer-Yahia, Roy, Chawla, Das, Yu "Group Recommendation: Semantics and Efficiency" VLDB 2009](http://www.vldb.org/pvldb/vol2/vldb09-858.pdf). Founding paper for "an item is good for a group iff it's both relevant AND has low disagreement among members". They explicitly recommend the linear `relevance − λ · disagreement` form HelpME2C uses, and a Mechanical Turk study demonstrated it outperforms pure relevance.

The composition `mean(norm) − λ · stddev(norm)` evaluated only on the AWM-filtered subset is **not a novel invention** — it's the textbook composition. Sits **mid-spectrum** on the fairness↔utilitarian axis: utilitarian core (mean) + Rawlsian floor (veto) + Gini-like penalty (stddev). Encodes mild inequality aversion. Will not produce research-novel results but will not produce well-known failure modes either.

**Known failure modes** (all called out in ADR-0020 as well; mitigations in literature):
1. **Normalisation max dominated by single outlier** — mitigation: robust scaling (percentile/z-score) instead of min-max
2. **Cold-start members produce noisy floor signal** — mitigation: confidence-weighted veto threshold; shrink toward group mean for low-confidence members
3. **Global λ but heterogeneous disagreement-aversion** — mitigation: per-group λ via "adventurous" slider, or learned from thumbs feedback
4. **Cross-medium bridge candidates vetoed by anime/TV-asymmetric tastes** — already called out in ADR-0020; mitigation: relaxed "bridge mode"
5. **Sequential unfairness drift** — mitigation: [Stratigi et al. SDAA/SIAA/Average+ aggregators](https://link.springer.com/article/10.1007/s10844-021-00652-x), requires session history

**The single highest-leverage area to invest in is explanation.** [Tintarev & Masthoff 2011](https://link.springer.com/chapter/10.1007/978-0-387-85820-3_15) and the [Najafian/Tintarev line](https://dl.acm.org/doi/10.1145/3213586.3225231) both find empirically that **for groups, explanation moves perceived satisfaction more than the choice of aggregation function does**. A merely-OK aggregator with a good "recommended because both of you like X" explanation beats a sophisticated aggregator with no explanation. ADR-0020 already commits to this; the literature fully supports the prioritisation.

**Approaches HelpME2C should NOT adopt:**
- Pure Plurality, pure Copeland (Masthoff finds these produce misery more often)
- Pure Min (least-misery; one outlier dictates every choice, feels unfair across sessions)
- Personality-aware aggregation (Quijano-Sánchez TIST 2013) — requires Big Five personality data we don't collect and shouldn't

Full citations: [raw/sota-group-aggregation.md](raw/sota-group-aggregation.md).

<a id="sota-cross-domain"></a>
## Cross-domain / cross-medium taste transfer

HelpME2C's mechanism (41 hand-curated theme bridges; `scoreCandidate` cross-medium-only rule that theme bridges fire only for tags absent from taste; `findCrossMediumBridges` taste-agnostic per-title bridge query) sits in the same family as:

- [Kaminskas & Ricci "Location-Adapted Music Recommendation Using Tags" (UMAP 2011)](https://link.springer.com/chapter/10.1007/978-3-642-22362-4_16) and follow-ons — matching music to places via shared emotion-tag vocabulary
- [Shi, Larson, Hanjalic "Tags as Bridges between Domains" (UMAP 2011)](https://link.springer.com/chapter/10.1007/978-3-642-22362-4_26) — TagCDCF, the seminal "tags as cross-domain bridges" paper
- [Fernández-Tobías et al. UMUAI 2019](https://link.springer.com/article/10.1007/s11257-018-9217-6) — item-metadata-bridged cross-domain CF for cold-start users
- **Pandora's Music Genome Project** (editorial-attribute taxonomy as primary product mechanism) — the canonical industrial precedent
- **Netflix's altgenres** (Madrigal Atlantic investigation, 2014) — ~77,000 micro-genres built atop ~200 hand-tagged story attributes per title

The Cantador et al. handbook chapter ([Recommender Systems Handbook 2nd ed. Ch. 27, 2015](https://link.springer.com/chapter/10.1007/978-1-4899-7637-6_27)) is the formal taxonomy. HelpME2C is in the **type-level, no-overlap** cell — TV and anime are different media types, and our users do not span a separate ratings system in each domain. This is the cell where content-mediated bridges are essentially the only option without training data.

**The Nazari et al. [music→podcast cold-start paper (SIGIR 2020)](https://arxiv.org/abs/2007.13287)** is the most-cited industrial cross-medium cold-start study. They report up to 50% consumption lift for cold-start podcast users by leveraging music listening behaviour at Spotify scale. **Crucially they flag bias as a first-order concern**: a cross-medium bridge that "works on average" can still seriously misserve specific cohorts. Worth designing for: track per-user bridge confidence, demote cross-medium recommendations when the source-medium taste vector is sparse or thematically narrow.

**The 2025 survey ([Zhang et al. arXiv:2503.14110](https://arxiv.org/html/2503.14110v1)) names negative transfer as the dominant failure mode** of cross-domain methods: "directly aggregating representations independently derived from each domain may lead to negative transfer". **HelpME2C's editorial-curation approach sidesteps this entirely** — a human deciding "Tragedy in TV does correspond to Tragedy in anime" is doing the negative-transfer triage at curation time, not at runtime.

**Honest assessment of HelpME2C's hand-curated 41-bridge approach:**
- **Defensible** at scale (no user-overlap, no training, <1000 users) — the editorial-bridge family is the *correct* design point, not a compromise.
- **Not state-of-the-art** in the academic sense (SOTA is neural EMCDR/CDRNP/PTUPCDR or LLM-based zero-shot CDR), but those need user-overlap and training pipelines that don't exist at Phase 1A.
- **Coverage is the constraint.** AniList exposes ~1,000+ tags; TMDB exposes thousands of keywords. 41 themes covers a small fraction. Pandora reference: ~450 attributes + ~1,300 sub-genres took 5 years and 30 musicologists.
- **The specific integration is rare-in-publication.** Components (shared-tag bridges, editorial taxonomies, cross-domain content mediation) have been in the literature since 2006–2011, but the specific combination — TV ↔ anime via curated theme bridges with a deterministic cross-medium-only scoring rule, shipped as both personalised and taste-agnostic surfaces — is **not visible in the surveyed literature as a published end-to-end system**.

**Cheapest credible coverage-extension path** (Phase 1A-feasible):
1. **Instrument bridge utilisation and tag-coverage** to drive curation prioritisation. Curate the next 40 themes against measured demand, not intuition.
2. **`sentence-transformers` offline** to surface *candidate* cross-vocabulary matches a human curator then accepts/rejects. Preserves curation quality; can credibly carry coverage from 41 to 200+.

Full citations: [raw/sota-cross-domain.md](raw/sota-cross-domain.md).

---

# Part 3 — Gap analysis & top changes

<a id="gap-cold-start"></a>
## Cold-start: HelpME2C sits BEHIND competition and BEHIND state of the art

**Current HelpME2C** (per `apps/web/src/app/onboarding/page.tsx` and its top comment block): search + popular-titles grid (16 titles, `caller.titles.popular({ limit: 16 })`) + multi-pick + Save loop. The deferred-to-later list in that file is explicit and long: demographics step, multi-bar per-dimension confidence meter, cross-cluster prompt after 3 anchors share a tight theme signature, genre disambiguation, "Refine your taste" swipe mode — all blocked on the M4 rec engine.

| Dimension | HelpME2C | Best in benchmark | SOTA (deployable at <1k users) |
|---|---|---|---|
| Item-selection strategy | popularity (16 popular titles) | **Trakt** (genre picker + favourites picker + IMDb/Letterboxd importer) | **Pop×Ent** (Rashid 2002) — popularity × rating-variance |
| Vocabulary of feedback | add-to-list + 1–10 rating | Netflix thumbs-up/down/love (200% lift over 5-star) | thumbs / 3-option (up / down / haven't seen) |
| Magic-number elicitation | unspecified ("multi-pick") | Spotify "3 or more artists", Netflix "Choose 3 shows" | **3 picks minimum** with diminishing returns past ~10 |
| Diversity in cold-start slate | none documented | n/a (Spotify Discover Weekly does this on warm signal) | **MMR re-rank** (Carbonell 1998), λ=0.5–0.7 |
| Popularity backoff | implicit (popular grid) | Spotify implicit | explicit, with **active decay** per [RecSys 2025 inherited-popularity-bias paper](https://arxiv.org/pdf/2510.11402) |
| Demographics as taste prior | not collected (good) | n/a — Netflix doesn't either | **Don't** (Ekstrand 2022) — keep this default |

**Verdict:** HelpME2C is roughly at AniList/MAL/Letterboxd level (popular grid + manual list-building) and behind Trakt. The deferred multi-bar confidence meter and cross-cluster prompts are sophisticated, but the simple, low-cost wins — Pop×Ent, thumbs-not-rating, MMR re-rank — are what the literature says to ship *first*.

The **mechanism** (tag-vector taste profile fed into the engine) is at SOTA for the regime; the **elicitation UX** is behind both competition and SOTA. The good news: the underlying engine is ready, so the elicitation UX is a frontend-shaped problem, not an ML-shaped problem.

<a id="gap-personal"></a>
## Personal recs scoring: HelpME2C sits AHEAD of every direct competitor and AT SOTA for the regime

**Current HelpME2C** (per `packages/ml/src/recommendation.ts:recommendForUser` + `packages/ml/src/scoring.ts:scoreCandidate`): tag-overlap scoring with **bipolar signed weight** (ADR-0024: `(rating - 5.5) / 4.5` → `[-1, +1]`), **franchise-level aggregation** (ADR-0023: mean of seasons, no triple-counting), **cross-medium-only theme bridges** (cross-medium dimension fires only for tags absent from taste), **Elo-adjusted effective rating** (from pairwise comparisons), **blocked tag categories** (cast/demographic tags excluded from headline reasons), and pre-computed nightly via Inngest into a Postgres JSONB cache (ADR-0008, ADR-0013).

| Dimension | HelpME2C | MAL / AniList | Trakt / Simkl | Netflix / Spotify |
|---|---|---|---|---|
| Algorithm transparency | high — open-source-able, ADR-documented | none (no engineering blogs) | none (Trakt staff admit recs aren't personalised) | very high (Gomez-Uribe TMIS 2015, BaRT RecSys 2018) but proprietary models |
| Personalisation mechanism | bipolar tag-overlap + cross-medium theme bridges | user-voted "if you liked X" + popularity priors | popularity + genre overlap (Trakt); LLM tag clusters paywalled (Simkl) | foundation model / matrix factorisation / two-tower / bandits |
| Negative-signal handling | **bipolar signed weight subtracts disliked tags** (ADR-0024) | rating treated as positive only (1/10 = weak positive) | rating exists but not used per Justin Trakt-staff thread | thumbs-down explicit |
| Franchise vs per-season | **franchise-level mean** (ADR-0023) | per-season | per-season | per-season |
| Cold-start (item) | content-based → new items scorable on day 1 | popularity-based (slow) | popularity-based (slow) | two-tower handles via item features |
| Cold-start (user) | empty-vector short-circuit + popularity backoff | empty-list dump | wizard-seeded (best of group) | 3-pick picker (best of group) |
| Explanation surface | precomputed `reasonHint` for top 50 (`apps/web/src/inngest/functions/recommend.ts`) | n/a | n/a | partial (artwork personalisation, BaRT explanations) |
| Pre-compute / latency | nightly Inngest → Postgres JSONB cache (<500ms p95 target per ADR-0008) | unknown | unknown (24h refresh cap on Simkl) | real-time scoring at Netflix/Spotify scale |

**Verdict:**
- **AHEAD of every direct competitor on mechanism.** MAL/AniList don't have algorithmic personalisation in the modern sense; Trakt's recs are admitted-by-staff not personalised; Simkl's are paywalled and siloed-per-medium. HelpME2C's bipolar+franchise+cross-medium-bridge stack is the most sophisticated personal-rec engine in the TV+anime tracker space.
- **At SOTA for the <1000-user regime** per the Pazzani/Lops/Pandora literature. Pure content-based with rich tag vocabulary is the *correct* default at this scale; Burke's switching hybrid (CB-primary + item-based-CF-understudy) becomes live at ~5–10k users with ≥50 ratings each.
- **Structurally behind Netflix/Spotify** (foundation models, two-tower retrieval, BaRT bandits) — but those approaches need scale we don't have and won't have for many quarters. They are not Phase 1A or even Phase 1B options.

The only meaningful gap to SOTA at our scale is **active exploration** — the BaRT contextual-bandit pattern of jointly learning *which recommendations* and *which explanations* work. That's Phase 2+ territory.

<a id="gap-group"></a>
## Group recs: HelpME2C sits AHEAD of every direct competitor and AT SOTA

**Current HelpME2C** (per `packages/ml/src/recommendation.ts:recommendForGroup` + `packages/ml/src/explain.ts:explainGroupRecommendation`): AWM + soft disagreement penalty (`mean(norm) − λ · stddev(norm)`, λ=0.5, vetoThreshold=0.5) with **per-user normalisation**, **cold-start guard** (members with empty taste vectors abstain from veto, members with non-empty taste but no matches DO veto — the AWM mixed-medium failure mode), **structured explanations** (sharedDirectTags + sharedBridgeThemes + per-member reasons), and **deterministic tie-break** for reproducible eval.

| Dimension | HelpME2C | MAL/AniList | Trakt | Simkl | Letterboxd | Plex | Netflix | Spotify |
|---|---|---|---|---|---|---|---|---|
| Group rec exists? | **YES, algorithmic** | no | no | **YES, set-intersection only** | watchlist intersection only | "trending with friends" cohort signal | no | **YES, algorithmic** |
| Aggregation function | AWM + λ·σ (disclosed) | n/a | n/a | set intersection | manual | popularity cohort | n/a | undisclosed |
| Cold-start member handling | abstain-from-veto (true cold-start) vs veto-with-zero (cross-medium failure mode) | n/a | n/a | inapplicable | n/a | n/a | n/a | undisclosed |
| Explanation surface | structured RecExplanation + sharedDirectTags + sharedBridgeThemes | n/a | n/a | n/a | n/a | n/a | n/a | partial (taste-match %) |
| Cross-medium bridge in group context | **YES** (sharedBridgeThemes when ≥2 members bridge via same theme) | n/a | n/a | no | n/a | n/a | n/a | undisclosed |

**Verdict:**
- **AHEAD of every direct competitor.** MAL/AniList/Trakt/Letterboxd have no group rec at all. Simkl's "Watch With Friends" is set intersection of Plan-to-Watch lists, not an algorithmic ranker. Plex's Discover Together is a friend-popularity cohort, not a multi-user joint ranker.
- **Parity with Spotify on existence; AHEAD on transparency.** Spotify ships Blend (2 users) and Jam (~32 users) but doesn't disclose the aggregation function. HelpME2C's design is fully documented (ADR-0020 + code) and is the **direct composition** of Masthoff 2004 (AWM) + Amer-Yahia VLDB 2009 (relevance − λ·disagreement). **Defensible, mainstream, will not produce well-known failure modes**.
- **The explanation surface is the highest-leverage investment area.** [Tintarev & Masthoff 2011](https://link.springer.com/chapter/10.1007/978-0-387-85820-3_15) and [Najafian/Tintarev UMAP 2018](https://dl.acm.org/doi/10.1145/3213586.3225231) consistently find that **for groups, explanation moves perceived satisfaction more than the choice of aggregation function does**. HelpME2C's `explainGroupRecommendation` + `sharedDirectTags` + `sharedBridgeThemes` is the right architectural shape; the literature endorses doubling down here.

The largest unmet need confirmed by the competitive landscape: **profile pollution at Netflix** (evanmoran on HN: *"I'm not secretly very interested in Dragon Rider episodes without my kids present... we are missing an 'Our List' for when we are together"*) is the world's loudest signal that group rec is a real unmet need at the world's largest streaming service. HelpME2C is operating in genuinely-unsolved-in-public territory.

<a id="gap-cross-medium"></a>
## Cross-medium: HelpME2C sits AHEAD of everyone in the benchmark, with a rare-in-publication integration

**Current HelpME2C** (per `packages/ml/src/themes/mappings.ts` + `packages/ml/src/cross-medium.ts`): 41 hand-curated theme bridges (TMDB lowercase keywords ↔ AniList Title-Case tags), per-bridge strength 0–100, deterministic `findCrossMediumBridges` taste-agnostic per-title query, and the cross-medium-only scoring rule in `scoreCandidate` (theme bridges fire ONLY for candidate tags absent from the user's taste vector, preventing double-counting).

| Platform | Anime ↔ TV cross-medium scoring? | Mechanism |
|---|---|---|
| MyAnimeList | no | anime/manga only |
| AniList | no | anime/manga only |
| Simkl | **no** — explicit per-medium silos (separate sections + V1/V2 engines per medium) | tag clusters but medium-internal |
| Trakt | **no** — separate `/recommendations/movies` and `/shows` endpoints; no anime endpoint | shelved as TV |
| Letterboxd | no | film only |
| Plex Discover | no | anime as a TV genre, Vionlabs taxonomy is medium-internal |
| JustWatch | partial — catalogue-wide two-tower but no published cross-medium asymmetry | candidate set mixes TV+film |
| Netflix | n/a — single medium | within-video subgenres |
| Spotify | yes (music↔podcasts via [Nazari 2020](https://arxiv.org/abs/2007.13287)) | shared user-embedding pipeline + lightweight task heads |
| **HelpME2C** | **YES — explicit theme bridges + cross-medium-only scoring rule** | 41 hand-curated TMDB↔AniList theme bridges |

**Verdict:**
- **AHEAD of every TV/anime tracker in the benchmark.** This is the cleanest moat in the entire competitive landscape: nobody else does theme-based cross-medium scoring, not because it's a forgotten idea but because it requires editorial investment they have chosen not to make.
- **Rare-in-publication integration.** Per the SOTA cross-domain literature review: the *components* (shared-tag bridges, editorial taxonomies, cross-domain content mediation) have been in the literature since 2006–2011 (Berkovsky 2006, Shi et al. 2011, Kaminskas/Ricci 2011), but the **specific integration** — TV ↔ anime via curated cross-medium theme taxonomy, with a deterministic cross-medium-only scoring rule, shipped as both personalised and taste-agnostic surfaces — is not visible in the surveyed literature as a published end-to-end system.
- **Sidesteps negative-transfer** (the dominant failure mode in neural cross-domain methods per the 2025 survey). A human deciding "Tragedy in TV does correspond to Tragedy in anime" is doing negative-transfer triage at curation time, not runtime.
- **The constraint is coverage.** 41 themes against AniList's ~1,000+ tags and TMDB's thousands of keywords is a prototype level of coverage. Pandora's MGP reference point is humbling: ~450 attributes + ~1,300 sub-genres took 5 years and 30 musicologists.

---

<a id="top-3"></a>
```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│   TOP 3 CONCRETE CHANGES                                             │
│   ───────────────────────                                            │
│                                                                      │
│   1.  Upgrade onboarding to Pop×Ent picker + thumbs vocabulary       │
│       (up / down / haven't seen) + MMR re-rank in first 1–2          │
│       sessions, with active popularity decay.                        │
│                                                                      │
│       Effort: S (frontend + scoring kernel already exists)           │
│       Moat impact: indirect but load-bearing. The cross-medium       │
│       and group-rec moats only work when the engine has signal       │
│       to feed; today HelpME2C's cold-start UX is at AniList/MAL      │
│       level (popular grid + manual list-building), well behind       │
│       Trakt/Netflix/Spotify. Without this fix, users churn before    │
│       reaching the surfaces that differentiate.                      │
│                                                                      │
│       Literature anchor: Rashid IUI 2002, Netflix 2017 thumbs        │
│       (200% lift), Spotify 2025 Generalized User Representations     │
│       (13.8% rec-quality drop without onboarding signal).            │
│                                                                      │
│       ─────────────────────────                                      │
│                                                                      │
│   2.  Expand theme bridges from 41 → 200+ via                        │
│       sentence-transformers-assisted curation + per-bridge           │
│       firing-rate instrumentation.                                   │
│                                                                      │
│       Effort: M (one-shot offline embedding pass + UI for            │
│       curator accept/reject; instrumentation in recommend.ts)        │
│       Moat impact: HIGH and direct. Cross-medium theme bridging      │
│       is the cleanest moat in the entire competitive benchmark       │
│       — nobody else does it. But 41 themes is a prototype level      │
│       of coverage against AniList's ~1,000+ tags and TMDB's          │
│       thousands of keywords. Coverage is the gap between             │
│       "great architecture" and "great product".                      │
│                                                                      │
│       Literature anchor: Pandora MGP (~450 attributes,               │
│       30 musicologists, 5 years); Cantador et al. CDR Handbook       │
│       Ch. 27; sentence-transformers (Reimers & Gurevych) as          │
│       deployment-feasible accelerator that keeps human in loop.      │
│                                                                      │
│       ─────────────────────────                                      │
│                                                                      │
│   3.  Double down on group-rec explanation: ship the                 │
│       sharedDirectTags + sharedBridgeThemes UX prominently           │
│       and add confidence-weighted veto threshold to handle           │
│       cold-start members robustly.                                   │
│                                                                      │
│       Effort: M (UX work + one scoring-kernel refinement)            │
│       Moat impact: HIGH. HelpME2C is the only TV+anime tracker       │
│       with algorithmic group scoring + structured explanation.       │
│       Tintarev/Masthoff + Najafian/Tintarev literature is clear:     │
│       "for groups, explanation moves perceived satisfaction more     │
│       than the choice of aggregation function does." The             │
│       infrastructure exists (explainGroupRecommendation,             │
│       sharedDirectTags, sharedBridgeThemes); surfacing it as         │
│       first-class UX is the lever. Confidence-weighted veto          │
│       closes the most-cited AWM failure mode (cold-start members     │
│       producing noisy floor signal) without breaking the             │
│       Masthoff/Amer-Yahia foundation.                                │
│                                                                      │
│       Literature anchor: Tintarev & Masthoff RecSys Handbook         │
│       Ch. 15; Najafian/Tintarev UMAP 2018; Stratigi/Pitoura          │
│       confidence-weighting line.                                     │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Priority order is product-strategic, not engineering-order.** Change 1
is the unlock — without an onboarding that produces signal, the
downstream moats sit dormant. Change 2 is the moat defence — without
coverage growth, the cross-medium architecture stays a prototype. Change 3
is the moat doubling-down — without explanation as first-class UX, the
group-rec mechanism loses the user-satisfaction lift the literature
identifies as the highest-leverage area.

**What this report deliberately does NOT recommend:**
- Adopting collaborative filtering. Literature is unanimous it computes noise below ~5–10k active users with ≥50 ratings each.
- Adopting two-tower or transformer-based models. Phase 2+ at earliest; requires training infrastructure not in scope.
- Collecting age/gender for taste signal. Ekstrand 2022 + Wang 2025: small lift, real fairness/GDPR cost.
- Building a 5-star rating UI. Netflix's 200% lift on switching to thumbs is the empirical answer.
- Personality-aware group aggregation (Quijano-Sánchez). Requires Big Five data collection that's out of scope.
- Auto-enrolling users into social/group features (Plex Discover Together 2023 cautionary tale).

---

**Evidence base:** 13 raw research files under `research/competitive-benchmark/raw/`, ~250KB total, ~150 unique citations across competitive analyses and academic literature. Every non-trivial claim in this report cites or links to a raw file or an external URL. Notable evidence gaps are documented per raw file (most consistently: Reddit content is largely deindexed from third-party search; several primary signup pages return HTTP 403 to automated fetch).

**Run notes:** see `research/competitive-benchmark/RUN_LOG.md` for execution log including which queries failed and any flags for the human reviewer.

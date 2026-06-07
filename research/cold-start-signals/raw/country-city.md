# Signal: Specific country / city

**Currently collected:** No (`region` is captured at `eu`/`row` granularity per ADR-0012; no country, no city)
**Recommended tier:** SHOULD-ASK (country only) / DON'T-ASK (city)

## What it is

A free-form or ISO-3166-1 alpha-2 country code captured at signup or in account settings (e.g. "Where do you watch from?" → `NL` / `JP` / `US`). City is a sub-national locality (e.g. "Amsterdam"), typically captured as free text or via geocoding the user's IP. Country has ~250 possible values and is roughly self-evident to the user; city is open-vocabulary, identifying, and rarely volunteered without a strong "why we're asking" framing.

## Predictive value (literature / industry)

The strongest argument for country in entertainment recommendation is **streaming availability**, not taste. TMDB's `/watch/providers` endpoint is **per-country by design**: the API requires a `watch_region` parameter and the same title returns different provider lists across regions, because licensing is negotiated territory-by-territory ([TMDB Watch Providers API](https://developer.themoviedb.org/reference/movie-watch-providers); [TMDB Available Regions](https://developer.themoviedb.org/reference/watch-providers-available-regions)). The same is true for anime in particular: Crunchyroll, Netflix anime, Disney+, and local broadcasters all license per territory, and the gap is large — Crunchyroll's US library is the fullest, Europe gets 60–80% of it, and Latin America / Southeast Asia 40–60% ([Crunchyroll Availability by Country, 2026](https://geoleap.app/blog/is-crunchyroll-available-in-your-country); [Crunchyroll: Why can't I watch certain shows in my region?](https://help.crunchyroll.com/hc/en-us/articles/43269213267092-Why-can-t-I-watch-certain-shows-in-my-region)). Without country, HelpME2C cannot filter "available to watch right now" reliably — and recommending titles a user can't access is a direct hit to perceived rec quality.

On taste, the evidence for country meaningfully improving recommendations *beyond* what `eu`/`row` captures is weaker but real. Schedl et al.'s "Listener Modeling and Context-Aware Music Recommendation Based on Country Archetypes" (Frontiers in AI, 2021) evaluated on 1B+ listening records and found that country-aware models beat country-agnostic baselines, because "music preferences are strongly shaped by the cultural and socio-economic background of the listener, which is reflected, to a considerable extent, in country-specific music listening profiles" ([Schedl et al. 2021, Frontiers](https://www.frontiersin.org/journals/artificial-intelligence/articles/10.3389/frai.2020.508725/full); [arXiv:2009.09935](https://arxiv.org/abs/2009.09935)). Related work on culturally-aware recsys argues existing systems "often fail to consider the socio-economic, geographic, or cultural variations between countries and regions, thereby limiting their ability to understand user preferences accurately" ([Towards Global, Socio-Economic, and Culturally Aware Recommender Systems, arXiv:2312.05805](https://arxiv.org/html/2312.05805v1)).

Industry data backs this for TV specifically. Statista's cross-market data shows clear genre-mix differences within "EU/ROW" buckets: comedy dominates in France/Germany/UK/US, documentaries skew Finnish, and anime is the dominant genre in Japan at 22% share — Korean dramas, telenovelas, and J-content each cluster regionally ([Statista, Most Popular TV Content Genre by Country](https://www.statista.com/chart/31290/most-popular-tv-content-genre-by-country/); [Global Streams, Local Currents, arXiv:2502.19043](https://arxiv.org/html/2502.19043v1)). Netflix's localization playbook is built on this: dubbing-preference differs (JP/FR/DE prefer dubs), and 90% of global demand concentrates around Turkey/Japan/India/Sweden specialisations ([Netflix Localization Strategy, Weglot](https://www.weglot.com/blog/netflixs-localization-strategy)). The lift over `eu`/`row` is therefore plausible but modest for taste alone — the dominant value of country is the streaming-availability filter.

City adds essentially nothing on top of country for entertainment recs. No academic paper or industry case study found indicates city-level recommendation lift in TV/film; streaming is national-rights, not municipal. City would only matter if HelpME2C ever surfaced cinema showtimes or local events — out of scope for Phase 1A.

## GDPR / consent cost

Country of residence is **not** a special category under Art 9 — that list is closed (race, ethnicity, political opinion, religion, trade-union, genetics, biometrics, health, sex life, sexual orientation) ([Art. 9 GDPR](https://gdpr-info.eu/art-9-gdpr/); [ICO Special Category Data](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/what-are-the-rules-on-special-category-data/)). It is ordinary personal data, processed under Art 6. Legitimate interest is plausibly available given the necessity test ("can't show accurate streaming availability without it"), though consent is the cleaner basis for a privacy-first product and aligns with the project's GDPR floor in CLAUDE.md §2. Data minimisation (Art 5(1)(c)) still applies: only collect if it materially improves the service ([ICO Data Minimisation](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/data-minimisation/)) — which streaming availability satisfies.

City changes the calculus materially. Under k-anonymity analysis, **age + sex + city is the canonical quasi-identifier triple** that re-identifies most individuals — the Latanya Sweeney 87%-of-US-population finding rests on exactly this combination ([k-anonymity, Utrecht Data Privacy Handbook](https://utrechtuniversity.github.io/dataprivacyhandbook/k-l-t-anonymity.html); [k-anonymity, Wikipedia](https://en.wikipedia.org/wiki/K-anonymity)). The ICO explicitly flags location as a primary identifier that combines with other quasi-identifiers via the "mosaic effect" ([ICO Anonymisation Guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/how-do-we-ensure-anonymisation-is-effective/)). A `city + age_band + viewing_history` row is harder to anonymise than `country + age_band + viewing_history`, and the rec-quality lift to justify the extra identifiability is nil.

Neither field triggers cookie-banner obligations on its own, but city-level retention should appear in the privacy notice and DPA records-of-processing if collected.

## UX / drop-off cost

Baymard's body of work is clear: **every extra signup field hurts conversion, and "the fewer fields, the better"** ([Baymard, 19 Ways to Simplify Sign-Up](https://baymard.com/blog/simplifying-sign-up); Baymard's checkout research finds the average form has ~15 fields when 6–8 is optimal). Drop-off per field is variously cited at 8–50% per field, with 81% of mobile users abandoning forms perceived as "too long" ([Build Grow Scale, Mobile Form Abandonment](https://buildgrowscale.com/reduce-form-abandonment)). Baymard specifically calls out sensitive fields (phone, gender, birth date) as conversion-killers unless explained — and recommends making them optional with a visible "why we're asking" rationale.

Country is the cheapest of demographic fields: it's a single dropdown the user can answer in two seconds, it's not perceived as sensitive in the way gender or birth date are, and it has an obvious self-evident rationale ("so we can show you what's actually streamable where you live"). NN/G's EAS framework ("Eliminate, Automate, Simplify") would say: automate it where possible — geo-IP a default selection, let the user confirm or change — rather than forcing a hard pick ([NN/G, EAS Framework for Simplifying Forms](https://www.nngroup.com/articles/eas-framework-simplify-forms/); [NN/G, Get Started Stops Users](https://www.nngroup.com/articles/get-started/)).

City has high drop-off cost for low benefit: free-text fields are slower than dropdowns, look more invasive, and have no compelling "why we're asking" for a recommendation product. Baymard's research is consistent that "privacy concerns regarding collection of personal data can be alleviated by making requests for sensitive information such as phone number, gender, and birth date optional, or by explicitly explaining why the information is needed" — and city falls in that "needs explaining" bucket without anything to explain.

## Path into scoring

Country has a clean deterministic path: **availability filter and tie-breaker**. (1) Hard filter: before scoring, drop any candidate whose `watch/providers` lookup for the user's country returns empty (or, softer, down-rank to bottom). The TMDB `watch_region` parameter is *built for this*; HelpME2C's ML module would call TMDB with the user's country and use the response as a deterministic gate. (2) Tie-breaker: when two anime candidates have similar tag-overlap scores, prefer the one with a regional licensing footprint that includes the user. (3) Future: a small country-bucket prior in the scoring function (e.g. boost J-drama for JP users, boost K-drama for KR users) — but Phase 1A's "rule-based only" rule means this stays a manual re-weight, not a learned prior. City has **no clean deterministic path** in Phase 1A — there's nowhere in `packages/ml/src/recommendation.ts` it would plug in.

## Tier justification

**Recommended: SHOULD-ASK for country; DON'T-ASK for city.**

Country materially improves recommendation quality because streaming availability is fundamentally per-country: a perfect rec the user can't watch is a bad rec, and TMDB's API is built to be queried with a country code. The taste-lift on top of availability is modest-but-real (Schedl et al., Netflix localization data) and gives a clean tie-breaker hook in the rule-based scorer. GDPR cost is low (not Art 9, defensible under Art 6 legitimate interest *or* consent), and UX cost is the smallest of any demographic field if implemented as a confirmable IP-defaulted dropdown. The 4/5 quality bar from ≥10 testers is *unreachable* if we recommend Netflix-JP titles to a NL user — that alone justifies asking.

City fails on every axis. No rec-quality evidence, no path into the scoring function, and it converts the privacy profile from "ordinary personal data" to "quasi-identifier triple with age+sex" exactly as the k-anonymity literature warns against. The privacy-by-default rule in the constraints box puts city firmly in the "data-hoarding" bucket the CLAUDE.md banned-patterns list is designed to prevent.

## Sources

- [TMDB Watch Providers API (Movie)](https://developer.themoviedb.org/reference/movie-watch-providers)
- [TMDB Watch Providers Available Regions](https://developer.themoviedb.org/reference/watch-providers-available-regions)
- [Schedl et al., "Listener Modeling and Context-Aware Music Recommendation Based on Country Archetypes" (Frontiers in AI, 2021)](https://www.frontiersin.org/journals/artificial-intelligence/articles/10.3389/frai.2020.508725/full)
- [arXiv:2009.09935 — Country Archetypes preprint](https://arxiv.org/abs/2009.09935)
- [arXiv:2312.05805 — Towards Global, Socio-Economic, and Culturally Aware Recommender Systems](https://arxiv.org/html/2312.05805v1)
- [Statista — Most Popular TV Content Genre by Country](https://www.statista.com/chart/31290/most-popular-tv-content-genre-by-country/)
- [arXiv:2502.19043 — Global Streams, Local Currents (VOD content consumption analysis)](https://arxiv.org/html/2502.19043v1)
- [Netflix Localization Strategy (Weglot)](https://www.weglot.com/blog/netflixs-localization-strategy)
- [Crunchyroll: Why can't I watch certain shows in my region?](https://help.crunchyroll.com/hc/en-us/articles/43269213267092-Why-can-t-I-watch-certain-shows-in-my-region)
- [Crunchyroll availability by country (GeoLeap, 2026)](https://geoleap.app/blog/is-crunchyroll-available-in-your-country)
- [Art. 9 GDPR — Processing of special categories](https://gdpr-info.eu/art-9-gdpr/)
- [ICO — Rules on special category data](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/what-are-the-rules-on-special-category-data/)
- [ICO — Data Minimisation principle](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/data-minimisation/)
- [ICO — Anonymisation: how to ensure it's effective](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/how-do-we-ensure-anonymisation-is-effective/)
- [k-anonymity, l-diversity and t-closeness — Utrecht Data Privacy Handbook](https://utrechtuniversity.github.io/dataprivacyhandbook/k-l-t-anonymity.html)
- [k-anonymity — Wikipedia (Sweeney quasi-identifier framing)](https://en.wikipedia.org/wiki/K-anonymity)
- [Baymard — 19 Ways to Simplify Sign-Up](https://baymard.com/blog/simplifying-sign-up)
- [NN/G — Less Effort, More Completion: The EAS Framework for Simplifying Forms](https://www.nngroup.com/articles/eas-framework-simplify-forms/)
- [NN/G — "Get Started" Stops Users](https://www.nngroup.com/articles/get-started/)
- [Build Grow Scale — 81% Mobile Form Abandonment](https://buildgrowscale.com/reduce-form-abandonment)
- [JustWatch API documentation](https://apis.justwatch.com/docs/api/)

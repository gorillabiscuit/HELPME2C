# Signal: Region

**Currently collected:** Yes — binary `eu` / `row` flag, set at the age gate (used to apply the stricter GDPR Art. 8 age threshold and as a planned soft prior).
**Recommended tier:** SHOULD-ASK at country granularity (or auto-detect via IP with a one-click correction), but ONLY if we wire it into scoring. Keep the binary if we don't. The binary is fine for compliance; it's not enough for recommendations.

## What it is

"Region" can mean three different granularities, and the choice matters:

1. **Binary `eu` / `row`** — the current state. Sufficient for choosing the GDPR Art. 8 age threshold (16 in EU default, can be 13 in some member states; 13 globally elsewhere). Useless for taste prediction.
2. **Country (ISO-3166-1, e.g. `NL`, `JP`, `BR`)** — what Netflix, Spotify, and Pinterest actually use. Enables availability filtering, language priors, and cultural cohort signals.
3. **Sub-country region** — overkill for Phase 1A; reserve for Phase 2+.

The question for HelpME2C is whether to upgrade from (1) to (2), and how to ask without burning UX.

## Predictive value (literature / industry)

Region is one of the **strongest available cold-start signals for entertainment** — but the strength is concentrated in two specific uses (availability filtering and language priors), not in "people in country X like genre Y" demographic priors. Be precise about which use you're claiming.

The clearest published signal comes from Pinterest. Casey Winters reports that "by identifying local interests, and pairing that with a user's country — found within the browser data — Pinterest improved its activation rate abroad by 5–10% depending on the country and demographic" ([Casey Winters on Pinterest's onboarding](https://medium.com/appcues/casey-winters-reveals-how-pinterest-perfected-user-onboarding-639fcc7486d7)). That's a directly comparable cold-start metric (activation) and a directly comparable signal (country, auto-detected) — and it materially moved the needle.

Netflix is a more interesting and partly contradictory case. Their original pre-2016 production system grouped countries into regional models with separately tuned hyperparameters, because "taste differences between regions" were strong enough to warrant separate models ([Recommending for the World — Netflix TechBlog](http://techblog.netflix.com/2016/02/recommending-for-world.html)). But their 2021 followup, [A Global Approach to Recommendations](https://about.netflix.com/en/news/a-global-approach-to-recommendations), argues the opposite: cross-border taste communities outperform per-country models for personalisation. They use anime as the canonical example: "fewer than 10% of people in this [anime-loving] community are actually in Japan — the rest come from all over the world." This is a *crucial* finding for HelpME2C specifically, because **anime is one of our two media verticals**: it tells us that for the anime-fan archetype, country is a *bad* signal — taste community dominates. For TV/film generally, regional taste differences still exist (e.g. "telenovelas in Latin America, anime in Japan, and Korean dramas in South Asia" — [How Netflix Built Its Recommendation Engine](https://carburant.io/how-netflix-built-its-recommendation-engine/)) but Netflix's published conclusion is that these are best handled as global taste communities, not country filters.

What region *does* unambiguously enable is **availability filtering**, and this is the use that has a clean rule-based path. Streaming rights are licensed by territory: a title shown in Netflix US may simply not exist on any platform in DE, and recommending it produces a frustrating "watch where?" dead-end ([How do streaming services manage content licensing across regions](https://hellomassmedia.com/how-do-streaming-services-manage-content-licensing-and-distribution-rights-across-different-regions-or-countries/), [Why do streaming services geo-restrict content?](https://www.techradar.com/vpn/vpn-privacy-security/why-do-streaming-services-geo-restrict-content)). For a cross-medium rec product, "is this title actually watchable for this user this week" is a more useful filter than any taste prior. Country is the natural key for that lookup; `eu` / `row` is not.

The third use is **language priors**. Netflix explicitly notes "people often have preferences for watching content produced in their native language or one they're fluent in, and different people and cultures have different preferences for watching with subtitles or dubs" ([A Global Approach to Recommendations](https://about.netflix.com/en/news/a-global-approach-to-recommendations)). Spotify's localisation work makes the same observation across 36 added languages ([Scaling Translations at Spotify](https://engineering.atspotify.com/2022/9/scaling-translations-at-spotify), [Spotify's localization strategy](https://www.unitedlanguagegroup.com/blog/spotify-localization-strategy)). Country is a weak proxy for preferred-language-of-content, but it's the best available without asking explicitly.

For the academic angle: cross-cultural collaborative-filtering studies model spatial neighbourhood and "spatial popularity" effects as legitimate signals ([Personalized movie recommendation in IoT-enhanced systems using GCN](https://www.nature.com/articles/s41598-024-76587-4), [Exploring Movie Recommendation System Using Cultural Metadata](https://www.academia.edu/376418/Exploring_Movie_Recommendation_System_Using_Cultural_Metadata)), but these mostly use country as a side feature for matrix factorization, which is out of scope for Phase 1A's rule-based engine.

## GDPR / consent cost

Region/country is **not** a special category under Art. 9. It's ordinary personal data, processable on Art. 6(1)(b) (contract) or 6(1)(f) (legitimate interest) without explicit consent, provided it's necessary and the user is informed ([Article 9 GDPR](https://gdpr.algolia.com/gdpr-article-9), [ICO — A guide to lawful basis](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/a-guide-to-lawful-basis/)).

The wrinkle is **IP-based detection**, which most products use to avoid asking. IP address has been held to be personal data by the CJEU (Breyer ruling) and is treated as such by both EDPB and ICO ([Is an IP Address Considered Personal Data Under GDPR? — CookieYes](https://www.cookieyes.com/blog/ip-address-personal-data-gdpr/), [GDPR Location Data — GeoPlugin](https://www.geoplugin.com/resources/gdpr-location-data-how-to-collect-it-legally-and-avoid-fine/)). Processing IP for short-lived country derivation is normally fine under legitimate interest with a Legitimate Interest Assessment, *provided* the IP is not retained beyond the derivation. Persisting the derived country (e.g. `country=NL`) is lower-sensitivity than persisting the IP itself — that's exactly the minimisation move ICO and CNIL prefer ([ICO — Principle (c): Data minimisation](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/data-minimisation/), [CNIL — Minimize the data collection](https://www.cnil.fr/en/sheet-ndeg7-minimize-data-collection)).

Combined with other fields (anchor picks, ratings) country becomes mildly more identifying but stays well outside Art. 9. No cookie-banner trigger is created by storing user-entered country on an authenticated record — that's first-party data, not tracking. (IP geo-lookup using a third-party service *could* trigger third-party considerations; using `geoip-lite` or a self-hosted MaxMind dataset avoids it.)

## UX / drop-off cost

Asking country directly is moderate-cost. The Baymard form-length data points apply ([Baymard — Checkout Optimization](https://baymard.com/blog/checkout-flow-average-form-fields)): adding a single dropdown adds friction, but a well-implemented country select (searchable, default to detected country) is well-tolerated — it's a standard pattern users see in every shipping address form. It does not carry the privacy-intrusiveness perception that DOB does.

The dominant industry pattern, and the one most consistent with the Pinterest result, is **auto-detect via IP, show the detected country, allow one-tap correction**. This bypasses the question entirely for ~95% of users (the rest are travellers or VPN users) and turns the "did we ask too much?" question into "did we get it right?" Pinterest pulled country from browser data, not an explicit field, and that's what enabled the 5–10% activation lift ([Casey Winters on Pinterest's onboarding](https://medium.com/appcues/casey-winters-reveals-how-pinterest-perfected-user-onboarding-639fcc7486d7)).

Net: if region is asked as an explicit field, expect ~1–3 percentage points of additional drop-off; if auto-detected with a correction affordance, the drop is negligible.

## Path into scoring

Region has the cleanest rule-based scoring path of any cold-start signal we've considered. Concretely, in `packages/ml/src/recommendation.ts` Phase 1A can use it as:

- **Hard filter**: exclude candidate titles whose `availability[country]` is empty (i.e. not streamable for this user). Without this, cross-medium recs produce dead-ends.
- **Soft re-weight**: small boost to titles in the user's primary language(s), derivable from country. E.g. `+0.05` weight if `title.originalLanguage === languageForCountry[user.country]`.
- **Tie-breaker**: when scores are within epsilon, prefer titles with same-country production for the casual-watcher archetype; do not apply this to the anime-fan archetype (Netflix's <10% finding says this would be actively wrong).

The binary `eu`/`row` we currently store cannot do any of the above usefully. Country (ISO-3166-1 alpha-2) is the minimum granularity that unlocks the filter and the language prior.

## Tier justification

**Recommended: SHOULD-ASK at country granularity, ideally via IP auto-detect with a one-tap correction.** Keep the binary `eu` / `row` for the Art. 8 logic regardless — that's compliance, not recommendation.

The trade-off: country materially improves rec quality through the *availability filter*, which is non-negotiable for a cross-medium product (recommending a title the user can't actually watch is a primary failure mode), and through a small language-prior re-weight. Both have clean, rule-based scoring paths consistent with Phase 1A's "no ML training" rule. The GDPR cost is low (ordinary personal data, no special-category status, lawful under legitimate interest with a routine LIA). The UX cost is near-zero if auto-detected.

The tier is SHOULD-ASK rather than MUST-ASK because:
(a) the binary already suffices for compliance,
(b) the Phase 1A success metric (4/5 quality from ≥10 testers, 5–10 onboarding likes) is small enough that availability-filter regressions might not surface in user feedback,
(c) implementing the availability lookup is itself non-trivial work,
(d) Netflix's anime-community finding (<10% in Japan) explicitly tells us country is a *bad* signal for the anime-fan archetype, which is one of our four Phase 1A archetypes — so country should never be used as a hard taste filter, only as an availability filter and weak language prior.

This passes the constraints-box rec-quality bar via the availability filter (which is "materially improves rec quality" in the strong sense — it filters out unwatchable recommendations entirely). It has a deterministic path into scoring. The privacy posture stays defensible with IP auto-detect plus first-party storage.

Concrete action: upgrade the stored `region` from `eu` / `row` to ISO-3166-1 alpha-2 country code, derived from IP at signup with an explicit "we detected you're in {NL} — correct?" prompt. Use it as a hard availability filter in scoring and a soft language prior. Keep the `eu` boolean as a derived field for the Art. 8 logic.

## Sources

- [Netflix — A Global Approach to Recommendations](https://about.netflix.com/en/news/a-global-approach-to-recommendations)
- [Recommending for the World — Netflix TechBlog](http://techblog.netflix.com/2016/02/recommending-for-world.html)
- [How Netflix Built Its Recommendation Engine](https://carburant.io/how-netflix-built-its-recommendation-engine/)
- [Casey Winters on Pinterest's onboarding](https://medium.com/appcues/casey-winters-reveals-how-pinterest-perfected-user-onboarding-639fcc7486d7)
- [Scaling Translations at Spotify](https://engineering.atspotify.com/2022/9/scaling-translations-at-spotify)
- [Spotify's localization strategy](https://www.unitedlanguagegroup.com/blog/spotify-localization-strategy)
- [Hulu: Algorithmic Personalisation in Streaming Services](https://medium.com/@phuong.eu24/case-study-hulu-algorithmic-personalisation-in-streaming-services-af64ffb91eff)
- [How streaming services manage content licensing across regions](https://hellomassmedia.com/how-do-streaming-services-manage-content-licensing-and-distribution-rights-across-different-regions-or-countries/)
- [Why do streaming services geo-restrict content?](https://www.techradar.com/vpn/vpn-privacy-security/why-do-streaming-services-geo-restrict-content)
- [Personalized movie recommendation in IoT-enhanced systems using GCN](https://www.nature.com/articles/s41598-024-76587-4)
- [Exploring Movie Recommendation System Using Cultural Metadata](https://www.academia.edu/376418/Exploring_Movie_Recommendation_System_Using_Cultural_Metadata)
- [Article 9 GDPR](https://gdpr.algolia.com/gdpr-article-9)
- [ICO — A guide to lawful basis](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/a-guide-to-lawful-basis/)
- [ICO — Principle (c): Data minimisation](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/data-minimisation/)
- [CNIL — Sheet 7: Minimize the data collection](https://www.cnil.fr/en/sheet-ndeg7-minimize-data-collection)
- [Is an IP Address Considered Personal Data Under GDPR? — CookieYes](https://www.cookieyes.com/blog/ip-address-personal-data-gdpr/)
- [GDPR Location Data — GeoPlugin](https://www.geoplugin.com/resources/gdpr-location-data-how-to-collect-it-legally-and-avoid-fine/)
- [Baymard — Checkout Optimization: Minimize Form Fields](https://baymard.com/blog/checkout-flow-average-form-fields)
- [Comparing Japanese and US Anime Viewership — Anime News Network](https://www.animenewsnetwork.com/feature/2024-07-31/comparing-japanese-and-us-anime-viewership-spring-2024/.213760)

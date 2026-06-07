# Signal: Streaming providers

**Currently collected:** Yes (later in account flow, not at onboarding)
**Recommended tier:** MUST-ASK (and move earlier — into onboarding)

## What it is

The set of streaming services the user can actually watch on: Netflix, Prime Video, Disney+, Max, Crunchyroll, Apple TV+, Paramount+, Peacock, regional services (e.g. BBC iPlayer, ITVX, Stan, NOW TV), free ad-supported services (Tubi, Pluto TV, Freevee), library-card services (Kanopy, Hoopla), and rental/purchase access via Apple TV / Google Play / Amazon. In HelpME2C, this is the gate that decides whether a recommended title is actually *watchable tonight* for the user. The data is available per-title per-region via TMDB's `watch/providers` endpoint, keyed on ISO-3166-1 country code, so the user supplies the *set of providers they subscribe to*, and we cross it with what TMDB says is available where they are ([TMDB Watch Providers reference](https://developer.themoviedb.org/reference/movie-watch-providers)).

## Predictive value (literature / industry)

JustWatch — which is arguably the canonical comparison product here — treats provider selection as a primary filter, not a filter buried in settings. Their "My Services" filter narrows everything to the user's selected subscriptions and is presented as the first-class affordance ([JustWatch — Understanding Provider Filters](https://support.justwatch.com/hc/en-us/articles/25403490091421-Understanding-Provider-Filters-in-the-JustWatch-App)). Reelgood does the same and explicitly puts it in onboarding: "When you first sign up for Reelgood, you check each of the services you have access to, and Reelgood searches across all of them" ([Reelgood — Cloudwards guide](https://www.cloudwards.net/how-to-use-reelgood/)). Two competing products in HelpME2C's adjacent space both treat this as an onboarding-grade signal, not a settings-page-grade one.

The predictive question — "does filtering recs to streamable-on-user's-services improve the 4/5 quality metric?" — is essentially answered by Netflix's own catalogue-economics history. Netflix's earliest scoring win was *filtering out unavailable inventory* to push users toward in-stock DVDs, and the recommendation team has documented this as a foundational filter that survived into the streaming era ([Netflix Research — Recommendations](https://research.netflix.com/research-area/recommendations)). The principle generalises: a recommendation the user cannot act on is worse than no recommendation, because it pays the cognitive cost of evaluation without the payoff of resolution. For HelpME2C's 4/5 success metric, an unwatchable rec is structurally a 1- or 2-star rec, because the user has to bounce, search, and bail.

Realistic lift benchmarks for adding a hard filter like this — versus no filter — are in the 10–30% range for early-stage products replacing nothing, with 2–5% being a typical "real win" against a mature baseline ([nvecta — recommendation engine lift](https://blogs.nvecta.com/blog/measure-recommendation-engine-lift-metric-2026/)). HelpME2C in Phase 1A is the "replacing nothing" case for couch co-watchers comparing TV against anime across services, so the expected lift is large and the floor (uselessness without the filter) is also large.

The reality check: the average US household actively uses about 4 streaming apps ([MNTN Research](https://research.mountain.com/trends/the-average-ctv-household-actively-uses-around-4-streaming-apps/)), with Deloitte putting Gen-Z/millennial households at ~5 paid SVODs and rising ([Deloitte Digital Media Trends 2025](https://www.deloitte.com/us/en/insights/industry/technology/digital-media-trends-consumption-habits-survey/2025.html)). Churn is high — 52% of millennials cancel an SVOD in any given six-month window — so the user's "what I have" set is genuinely *not* knowable by inference; it has to be asked, and it has to be easy to update. This also means the "I have Netflix + Prime + Crunchyroll" model is approximately right for the median user but should accommodate ad-tier (68% of SVOD subscribers now have at least one ad-tier, up from 46% in 2024 — same Deloitte report), free services (Tubi, Pluto), and rental access if HelpME2C wants to be honest about availability rather than artificially constraining.

## GDPR / consent cost

Streaming subscription data is low-sensitivity under GDPR — it is personal data, but it is not Article 9 special-category data ([Art. 9 GDPR](https://gdpr-info.eu/art-9-gdpr/)), and it is not the kind of inference target that risks leaking sensitive attributes (subscribing to Crunchyroll does not reveal political opinion, religious belief, sexual orientation, or health status in any meaningful sense). The legal basis is straightforwardly "performance of a contract" or "legitimate interest" — the user came here to get personalised recommendations, and we cannot deliver that promise without knowing which catalogues to score against. A short purpose-statement next to the picker ("So we only recommend things you can actually watch — change this any time in Settings") satisfies the transparency obligation under Article 13, and a single explicit opt-in checkbox would be over-engineering for non-sensitive personal data of this kind.

There is a soft commercial-sensitivity dimension: subscription patterns are commercially valuable as aggregated market signal, and HelpME2C should explicitly *not* sell this onward or share it with the streaming services themselves without a separate consent layer. That belongs in the privacy policy, not in the onboarding UX.

## UX / drop-off cost

This is the live risk: signup form length is the single largest driver of abandonment. Baymard's 2024 checkout-usability data puts form length at 37% of self-reported abandonment causes, with every field beyond ~8 reducing mobile conversion by 3–7% ([Baymard — Checkout Form Fields](https://baymard.com/blog/checkout-flow-average-form-fields)). NN/g's 2022 form-conversion benchmark notes that the optimal form length is around 5 fields, and 81% of mobile users abandon if a form *feels* too long ([NN/g via wpforms — Online Form Statistics](https://wpforms.com/online-form-statistics-facts/)). Adding a provider picker to onboarding therefore has to be done with care — but the picker is fundamentally a *single multi-select control*, not a stack of fields, and good implementations (Reelgood, JustWatch) confirm it survives onboarding when designed as one logical step.

The proven pattern is a "top-N" approach with the most common services pre-surfaced (Netflix, Prime, Disney+, Max, Apple TV+, Crunchyroll, plus a region-aware top-up like BBC iPlayer in UK), with a "More" affordance behind a search/expand for the long tail. NN/g and Mobile UX writing both converge on: show all items only when the list is short (≤ ~20); above that, use search + chiclets-for-selected ([Bound State — Mobile Multi-Select](https://boundstatesoftware.com/articles/mobile-ux-design-exploring-multi-select-solutions); [Tripaneer Techblog — Improving multi-select usability](https://medium.com/tripaneer-techblog/improving-the-usability-of-multi-selecting-from-a-long-list-63e1a67aab35)). TMDB exposes the long tail (~150+ providers globally) but realistically 6–10 logos covers the top 90% of any single region's subscriber base. Region (already collected) makes this curation tractable: a UK user does not need to scroll past Hulu, an Australian user does not need to scroll past Peacock.

Time-to-first-value matters: products that deliver perceived value in under 5 minutes show ~40% better 30-day retention ([Monetizely — Onboarding Completion Rate](https://www.getmonetizely.com/articles/understanding-onboarding-completion-rate-a-critical-metric-for-saas-success)). Adding one well-designed step that *visibly improves the recommendations the user is about to receive* is the inverse of friction — it is the "Canva 'what will you design'" moment for HelpME2C, where the step itself frames the value proposition.

## Path into scoring

Concrete rule-based integration in `packages/ml/src/recommendation.ts`: after candidate generation (anchor picks, theme overlap, rated-titles signal), apply a `streamableNow` filter that joins each candidate against TMDB watch-provider data for the user's `region` and intersects with `user.providers`. Two-tier behaviour:

1. **Hard filter for the primary results list** — drop candidates that aren't watchable on any of the user's services. This is the default and is what protects the 4/5 quality metric.
2. **Soft demotion for a "Rent or buy" tail** — keep titles that are rentable/purchasable on Apple TV / Google Play / Amazon as a separate, smaller, clearly-labelled section. Don't surprise the user with paid recs in the main list, but don't pretend they don't exist either.

The filter is a join, not a model — zero ML overhead, zero training cost, and it composes cleanly with everything else in the rule-based pipeline. It also future-proofs: when Phase 2 ML lands, this is still a filter applied *after* scoring, not something the model has to learn around.

## Tier justification

**Recommended: MUST-ASK, and move to onboarding (not account-settings-later).**

Three constraints from the brief converge on this answer. (1) The 4/5 quality metric punishes unwatchable recs harder than missing-data recs, because evaluating-then-bouncing is worse than not-evaluating. (2) PROJECT.md already names "filter by user's connected subscriptions" as a planned filter, so this isn't a new product decision, only a placement decision. (3) The privacy-by-default bar ("materially improves rec quality, not might be useful") is met decisively — without this signal, a meaningful fraction of recs are dead on arrival. The competitive proof points (JustWatch, Reelgood) both put it in onboarding. The Baymard risk (form-length abandonment) is real but addressable with a top-N picker rather than a 150-row list. Net: move it forward, design it as one step with a region-aware top-N grid, and frame the step as a value-statement rather than a data-collection ask.

## Sources

- [TMDB API — Movie Watch Providers reference](https://developer.themoviedb.org/reference/movie-watch-providers)
- [TMDB API — Available Regions](https://developer.themoviedb.org/reference/watch-providers-available-regions)
- [JustWatch — Understanding Provider Filters in the JustWatch App](https://support.justwatch.com/hc/en-us/articles/25403490091421-Understanding-Provider-Filters-in-the-JustWatch-App)
- [Reelgood — How to Use Reelgood in 2026 (Cloudwards)](https://www.cloudwards.net/how-to-use-reelgood/)
- [Netflix Research — Recommendations](https://research.netflix.com/research-area/recommendations)
- [nvecta — How to Measure Recommendation Engine Lift](https://blogs.nvecta.com/blog/measure-recommendation-engine-lift-metric-2026/)
- [MNTN Research — Average CTV Household Uses ~4 Streaming Apps](https://research.mountain.com/trends/the-average-ctv-household-actively-uses-around-4-streaming-apps/)
- [Deloitte — 2025 Digital Media Trends](https://www.deloitte.com/us/en/insights/industry/technology/digital-media-trends-consumption-habits-survey/2025.html)
- [Deloitte — SVOD Churn (Customisation and Personalisation lead the SVOD revolution)](https://www.deloitte.com/us/en/insights/industry/technology/digital-media-trends-consumption-habits-survey/2024/customization-and-personalization-lead-the-svod-revolution.html)
- [Variety — U.S. Consumers Pay Average of $61/month for Video Streaming](https://variety.com/2024/digital/news/us-average-video-streaming-services-pay-deloitte-study-1235945991/)
- [Baymard — Checkout Optimization: Minimize Form Fields](https://baymard.com/blog/checkout-flow-average-form-fields)
- [wpforms — 101 Online Form Statistics & Facts (NN/g + Baymard data, 2024)](https://wpforms.com/online-form-statistics-facts/)
- [Bound State Software — Mobile UX Design: Exploring Multi-Select Solutions](https://boundstatesoftware.com/articles/mobile-ux-design-exploring-multi-select-solutions)
- [Tripaneer Techblog — Improving the usability of multi-selecting from a long list](https://medium.com/tripaneer-techblog/improving-the-usability-of-multi-selecting-from-a-long-list-63e1a67aab35)
- [Monetizely — Understanding Onboarding Completion Rate](https://www.getmonetizely.com/articles/understanding-onboarding-completion-rate-a-critical-metric-for-saas-success)
- [Art. 9 GDPR — Processing of special categories of personal data](https://gdpr-info.eu/art-9-gdpr/)

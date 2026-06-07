# Signal: Birth date

**Currently collected:** Partially — at `/age-check` we collect enough to compute age, but per [ADR-0012](../../../docs/decisions/0012-privacy-and-data-handling.md) we persist only `ageVerified=true` (and `ageVerifiedAt` timestamp). The birth date itself is discarded after the gate.
**Recommended tier:** DON'T-ASK (for personalisation). Continue the current age-gate practice (collect transiently, persist boolean only) for legal compliance.

## What it is

Two distinct questions get conflated under "birth date":

1. **Age gate / Art. 8 compliance check** — a one-time "are you old enough to consent to this service?" check. Inputs: full DOB *or* year-of-birth *or* an "I'm 16+" checkbox (declarative). Output we persist: boolean.
2. **Stored DOB / age as a recommendation feature** — persisting day/month/year (or a derived age bucket like `18-24`, `25-34`) on the user record so the recommendation engine can use it as a filter or re-weight. This is what the question "should we *store* it?" is really about.

Phase 1A already does #1. The decision in front of us is whether to additionally do #2.

## Predictive value (literature / industry)

The honest answer is: **age is a weak signal once you have a handful of explicit interest signals**, and HelpME2C onboarding is designed around exactly those interest signals (anchor picks + rated titles). Demographic-based recommendation is a well-explored area, and the recurring finding is that age and gender carry only modest information about taste once any behavioural signal exists.

Studies on MovieLens — the canonical entertainment-recsys dataset — repeatedly find that demographic features have low predictive correlation with movie preference. Reviews of demographic filtering note that "features such as age, gender, and occupation of the users aren't very sophisticated predictors of users' preferences for movies, because there isn't very high correlation between demographic information and user's likeness for a movie" ([Adopting Machine Learning in Demographic Filtering for Movie Recommendation System](https://www.researchgate.net/publication/371578900_Adopting_Machine_Learning_in_Demographic_Filtering_for_Movie_Recommendation_System)). Demographic filtering survives mainly as a *cold-start fallback* when no interaction data exists at all, and is dominated by content/collaborative methods the moment a user has rated anything ([Cold start (recommender systems) — Wikipedia](https://en.wikipedia.org/wiki/Cold_start_(recommender_systems)), [Aman's AI Journal — Cold Start](https://aman.ai/recsys/cold-start/)).

The cleanest result against storing DOB comes from the demographic-inference literature, which shows the relationship runs the other way: **rating behaviour predicts age, not the other way around**. Sun et al. inferred new users' gender at ~69% accuracy from as few as 10 selected queries, and inferred age within a mean absolute error of ~5 years using ~5 queries on Flixster/MovieLens ([Inferring Private Demographics of New Users in Recommender Systems](https://csc.lsu.edu/~msun/publications/mswim-sigconf.pdf)). A more recent arXiv paper reports age/gender prediction directly from movie ratings on MovieLens with strong accuracy ([Predicting user demographics based on interest analysis (arXiv:2108.01014)](https://arxiv.org/abs/2108.01014)). The implication is direct: once HelpME2C has 5–10 anchor picks plus ratings — which is *literally the cold-start target metric* in the constraints box — age is largely redundant with signal we're already capturing.

There is one published counterexample worth naming. Ekstrand et al.'s [Revisiting Popularity and Demographic Biases in Recommender Evaluation and Effectiveness](https://dl.acm.org/doi/10.1007/978-3-030-99736-6_43) found "statistically significant differences in recommender performance by both age and gender, with recommendation utility steadily degrading for older users." But that paper is an *audit finding*, not an argument for collecting more demographic data; it argues that current systems disadvantage older users, and the remedy is fairness work on the algorithm, not asking everyone their age.

Industry practice tracks this. Netflix's published cold-start work treats country/language and historical viewership as the primary signals; their public algorithm writeups don't lean on stored DOB as a personalisation feature ([Netflix — A Global Approach to Recommendations](https://about.netflix.com/en/news/a-global-approach-to-recommendations), [Recommending for the World — Netflix TechBlog](http://techblog.netflix.com/2016/02/recommending-for-world.html)). Pinterest's onboarding work — among the best-documented in the industry — leaned on *interest selection* and *country* but not stored DOB ([Casey Winters on Pinterest's onboarding](https://medium.com/appcues/casey-winters-reveals-how-pinterest-perfected-user-onboarding-639fcc7486d7)). Hulu's cold-start system (CBVRP) is content-based on the catalogue side, not demographic-based on the user side ([Hulu: Algorithmic Personalisation in Streaming Services](https://medium.com/@phuong.eu24/case-study-hulu-algorithmic-personalisation-in-streaming-services-af64ffb91eff)).

## GDPR / consent cost

Birth date is **not** a special category under GDPR Art. 9 (which covers health, biometrics, sexual orientation, political opinion, racial/ethnic origin, etc. — none apply here) ([Article 9 GDPR](https://gdpr.algolia.com/gdpr-article-9), [Sensitive Personal Data and the GDPR](https://www.termsfeed.com/blog/gdpr-sensitive-personal-data/)). It is "ordinary" personal data under Art. 6, processable on consent or legitimate interest like any other personal field.

The relevant constraint is **Art. 8 (children's consent)** combined with **Art. 5(1)(c) data minimisation**. Art. 8 requires the controller to "make reasonable efforts to verify" that the user is old enough to consent in an information society service — 16 in the default GDPR floor, lower in some member states down to 13 ([Article 8 GDPR](https://gdpr-info.eu/art-8-gdpr/), [ICO — What are the rules about an ISS and consent?](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/children-and-the-uk-gdpr/what-are-the-rules-about-an-iss-and-consent/)). This is what `/age-check` is for, and a "year of birth" or "I'm 16+" declaration satisfies it; ICO guidance explicitly allows year-of-birth or self-declaration in low-risk contexts.

Data minimisation (Art. 5(1)(c)) is where storing the full DOB becomes problematic. ICO guidance is explicit: "identify the minimum amount of personal data you need to fulfil your purpose and hold only that much information, but no more" ([ICO — Principle (c): Data minimisation](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/data-minimisation/)). The ICO's *Age Appropriate Design Code* reinforces this specifically for services accessed by under-18s ([ICO — Children's Code §8 Data minimisation](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/8-data-minimisation/)). CNIL gives the same line in its design-time guidance — collect only what the purpose justifies ([CNIL — Minimise the data collection](https://www.cnil.fr/en/sheet-ndeg7-minimize-data-collection)). Storing a full DOB to use it as a recommendation feature, where the literature above shows it's largely redundant with rating data we already capture, is a textbook minimisation failure.

ADR-0012's choice to persist only `ageVerified=true` is the privacy-correct posture and is what should continue.

## UX / drop-off cost

Birth date is one of the most damaging fields a signup form can carry. A 2021 analysis of 40,000 landing pages found that asking for birth date or phone number dropped conversion rates by about one-sixth, and a separate analysis found landing pages requesting birth date or gender suffered an additional ~17 percentage-point drop on top of baseline form abandonment ([150 Online Form Statistics](https://www.feathery.io/blog/online-form-statistics), [Form Conversion Rate Benchmarks 2026](https://foundrycro.com/blog/form-conversion-rate-benchmarks-2026/)). Foundry's 2026 form-benchmarks summary states: "Date of birth causes an 8% drop in conversion rate, especially on mobile where date pickers are often poorly implemented. Unless age verification is legally required, it should be removed."

Baymard Institute's checkout-optimisation work makes the same recommendation: ask for gender or birthdate "only when absolutely necessary (e.g., to verify age for age-restricted products), or allow users to choose not to provide a response to reduce the risk of abandonments" ([Baymard — Checkout Optimization: Minimize Form Fields](https://baymard.com/blog/checkout-flow-average-form-fields), [Baymard — Reducing Sign Up Friction](https://baymard.com/blog/fast-and-easy-user-sign-up)). The general form-length finding is also relevant: moving from 3 to 5 fields costs ~5 percentage points of conversion; moving from 5 to 7 costs another 8 ([Form Conversion Rate Benchmarks 2026](https://foundrycro.com/blog/form-conversion-rate-benchmarks-2026/)).

For Phase 1A, where the success metric is "4/5 quality rating from ≥10 testers", the absolute conversion impact is small. But the precedent matters: HelpME2C's positioning is privacy-first, and a signup that asks for a DOB it doesn't read in the scoring function would feel — correctly — like data-hoarding.

## Path into scoring

The current scoring engine (`packages/ml/src/recommendation.ts`) consumes only anchor picks + rated titles. There is no clean rule-based path for stored DOB in Phase 1A. The only candidate uses would be:

- **Filter:** exclude titles rated R/18+ for under-18s. But ADR-0012 already gives us the boolean we need (`ageVerified=true` means ≥ legal-floor age, which is enough for any R-rated/explicit filter we'd actually want — we don't need to know whether a verified adult is 22 or 52 to decide whether to show them mature content).
- **Soft prior on cohort tastes** (e.g. boost 90s anime for users in their 30s): this requires either trained priors (banned in Phase 1A — rule-based only) or hardcoded "people aged X like Y" heuristics, which would be embarrassing pseudo-science. The MovieLens literature explicitly says these correlations are weak.
- **Tie-breaker:** marginal at best, and competing signals (rating recency, popularity, anchor-pick proximity) dominate.

There is no rule-based scoring path that justifies storing the DOB. By the constraints-box rule ("Any signal must have a deterministic path into the scoring function ... or it's data-hoarding"), this is decisive.

## Tier justification

**Recommended: DON'T-ASK** (for personalisation purposes; keep the current ADR-0012 boolean-only flow for Art. 8 compliance).

The trade-off is explicit: the rec-quality lift from stored DOB is empirically small and is largely subsumed by the rating data we capture during onboarding (the literature shows ratings can *predict* age, not vice versa). The GDPR minimisation cost is real and is reinforced by ICO and CNIL guidance. The UX cost is well-documented (8–17 percentage points of signup drop on the DOB field alone). And there is no rule-based path into the Phase 1A scoring function.

This fails the "materially improves rec quality" bar in the constraints box. It also violates the "deterministic path into the scoring function" rule. Both independently are sufficient to DON'T-ASK. The combined effect is decisive. Keep ADR-0012's posture: collect transiently at the age gate, persist only the boolean, do not surface DOB as a recommendation feature in Phase 1A.

If in Phase 2 we ever need an age bucket for legal content filtering beyond "is this user a verified adult", revisit then — and ask for a bucket (`18-24`, `25-34`, ...) rather than a full DOB.

## Sources

- [Article 8 GDPR — Conditions applicable to child's consent](https://gdpr-info.eu/art-8-gdpr/)
- [Article 9 GDPR — Processing of special categories of personal data](https://gdpr.algolia.com/gdpr-article-9)
- [ICO — Principle (c): Data minimisation](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/data-minimisation/)
- [ICO — Children's Code §8 Data minimisation](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/8-data-minimisation/)
- [ICO — Rules about ISS and child consent](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/children-and-the-uk-gdpr/what-are-the-rules-about-an-iss-and-consent/)
- [CNIL — Sheet 7: Minimize the data collection](https://www.cnil.fr/en/sheet-ndeg7-minimize-data-collection)
- [Sun et al. — Inferring Private Demographics of New Users in Recommender Systems](https://csc.lsu.edu/~msun/publications/mswim-sigconf.pdf)
- [Predicting user demographics based on interest analysis (arXiv:2108.01014)](https://arxiv.org/abs/2108.01014)
- [Adopting Machine Learning in Demographic Filtering for Movie Recommendation System](https://www.researchgate.net/publication/371578900_Adopting_Machine_Learning_in_Demographic_Filtering_for_Movie_Recommendation_System)
- [Ekstrand et al. — Revisiting Popularity and Demographic Biases in Recommender Evaluation and Effectiveness](https://dl.acm.org/doi/10.1007/978-3-030-99736-6_43)
- [Cold start (recommender systems) — Wikipedia](https://en.wikipedia.org/wiki/Cold_start_(recommender_systems))
- [Aman's AI Journal — Cold Start](https://aman.ai/recsys/cold-start/)
- [Baymard — Checkout Optimization: Minimize Form Fields](https://baymard.com/blog/checkout-flow-average-form-fields)
- [Baymard — Reducing Sign Up Friction](https://baymard.com/blog/fast-and-easy-user-sign-up)
- [Form Conversion Rate Benchmarks 2026](https://foundrycro.com/blog/form-conversion-rate-benchmarks-2026/)
- [150 Online Form Statistics](https://www.feathery.io/blog/online-form-statistics)
- [Casey Winters on Pinterest's onboarding](https://medium.com/appcues/casey-winters-reveals-how-pinterest-perfected-user-onboarding-639fcc7486d7)
- [Hulu: Algorithmic Personalisation in Streaming Services](https://medium.com/@phuong.eu24/case-study-hulu-algorithmic-personalisation-in-streaming-services-af64ffb91eff)

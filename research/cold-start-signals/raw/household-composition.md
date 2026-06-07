# Signal: Household composition

**Currently collected:** No
**Recommended tier:** MUST-ASK

## What it is

A single low-friction question at onboarding — likely a four-option radio — capturing whether the user watches mostly *solo*, *with a partner*, *with family / kids*, or *as part of a wider household / roommates*. The signal is about the user's typical co-viewing configuration, not a roster of names or ages. It is a one-shot prior, updatable from settings, and persisted as a single enum column on the user record. The point is not to model who lives in the home; it is to know whether the recommendations being generated will be consumed *alone* or *negotiated* with another person.

## Predictive value (literature / industry)

Co-viewing is the dominant mode of TV consumption, not the exception. Industry measurement consistently lands in the same range: an MNTN Research CTV study found that "nearly 80% of Connected TV viewing is shared" and ~90% of US adults 13–64 watch on a TV screen with other people; an IAB study reports a spouse/partner is the top co-viewing companion (59%) and kids second (41%) for OTT co-viewing sessions ([MNTN — Better Together: Co-Viewing on CTV](https://research.mountain.com/insights/better-together-an-exploration-of-co-viewing-on-ctv/); [IAB — OTT Co-Viewers Report](https://www.iab.com/news/56-ott-co-viewers-report-talking-brands-products-see-watching-tv/)). A recommendation engine that models a user as a solo entity is therefore wrong by default for the majority of sessions it serves.

Crucially, the recsys literature finds that co-viewing is **not reducible to averaging individual preferences**. Large-scale household viewing analyses show "group watching and individual watching differ significantly by genre, and co-watching is more than a simple aggregate of individual preferences" — i.e. the household has its own preference signal, not a derivable one ([Google Research — Challenges on the Journey to Co-Watching YouTube](https://research.google.com/pubs/archive/46602.pdf)). That single finding is the strongest defence for asking household composition explicitly rather than inferring it from rating noise; the model literally cannot recover it from individual data.

Netflix's architecture is the de facto reference. Public Netflix engineering writing describes a recommendation model that "operates simultaneously at the individual profile level and the household level, balancing isolation and shared context… preventing a horror-heavy profile from contaminating recommendations for a children's profile, while still benefiting from shared household-level signals" ([Netflix Research — Recommendations](https://research.netflix.com/research-area/recommendations); [Netflix TechBlog — Foundation Model for Personalized Recommendation](https://netflixtechblog.com/foundation-model-for-personalized-recommendation-1a0bd8e02d39)). The profile feature exists *because* household-level signal contamination is a real and measurable failure mode. A new entrant that wants to serve households without Netflix's data scale must compensate by collecting the household prior explicitly; the alternative is to suffer the same contamination Netflix spent years engineering around.

The group-rec literature also shows that aggregation strategy matters and is configuration-dependent: "least misery" aggregation (the group's rating equals the minimum individual rating) protects the constrained viewer (e.g. a kid present) and is appropriate for family co-watching, while *average* aggregation maximises overall satisfaction and is appropriate for couples with comparable taste ([Springer — Group Recommender Systems: Aggregation, Satisfaction and Group Attributes](https://link.springer.com/chapter/10.1007/978-1-4899-7637-6_22); [Towards Data Science — An Introduction to Group Recommender Systems](https://towardsdatascience.com/an-introduction-to-group-recommender-systems-8f942a06db56/)). Without knowing the composition, the engine cannot choose the right aggregation; with it, the choice is deterministic. Couples-co-watching research underlines the negotiation cost: 32% of partners have argued about what to watch and 63% have compromised — i.e. the recommendation surface for a paired user is functionally a *negotiation tool*, not a personal feed ([CableTV — How Watching TV Affects Relationships](https://www.cabletv.com/entertainment/how-tv-affects-relationships)).

## GDPR / consent cost

Household composition as captured here ("solo / partner / family / household") is personal data but is **not** a special-category under Article 9 GDPR. It does not reveal health, sexual orientation, political views, or religion, and the user is the only data subject — they are describing their *own* viewing context, not their cohabitants. The lawful basis fits comfortably within Article 6(1)(a) consent, with legitimate interest (6(1)(f)) as a defensible secondary frame given that personalisation is a contractually-expected service feature ([ICO — What is the 'legitimate interests' basis?](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/legitimate-interests/what-is-the-legitimate-interests-basis/); [EDPB — Guidelines 1/2024 on Legitimate Interest](https://www.edpb.europa.eu/system/files/2024-10/edpb_guidelines_202401_legitimateinterest_en.pdf)).

Data-minimisation (Article 5(1)(c)) is the test that actually matters: the ICO frames it as "adequate, relevant and limited to what is necessary" and the EDPB's necessity test asks whether the purpose "cannot reasonably be achieved just as effectively by other means less restrictive" ([ICO — Principle (c): Data minimisation](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/data-minimisation/)). The four-option enum passes this test cleanly: it is the minimum granularity that lets the engine choose between solo personalisation, couple-aggregation, and family-constrained ranking — and the alternative (inferring composition from behaviour) requires *more* data and produces a worse result, per the Google co-watching finding above.

CLAUDE.md §4 requires a stop-and-ask on new persisted user preferences and on processing user data without an explicit action. The captured signal satisfies both: it is set by an explicit user action at onboarding, and it changes the *interpretation* of recommendation requests rather than enabling new background processing.

## UX / drop-off cost

Baymard's well-cited form-research benchmark is "every additional form field reduces completion rates by 3–5%", and decision fatigue measurably bites past 3–4 simultaneous choices ([Baymard — Account Configuration & Onboarding](https://baymard.com/ecommerce-design-examples/account-configuration-and-onboarding); [SaaSFactor — Why Users Drop Off During Onboarding](https://www.saasfactor.co/blogs/why-users-drop-off-during-onboarding-and-how-to-fix-it)). A four-option radio with one "why we're asking" affordance is at the low end of this cost — a single visual scan and one click. NN/g's onboarding guidance is "skip it when possible", but its corollary is that questions which *materially change the product output* are the ones worth keeping ([NN/G — Onboarding: Skip it When Possible](https://www.nngroup.com/videos/onboarding-skip-it-when-possible/); [NN/G — Mobile-App Onboarding](https://www.nngroup.com/articles/mobile-app-onboarding/)). Industry data points the same way: 83% of consumers will share data for personalisation when the benefit is clear ([UX Pilot — Personalized User Experience Examples and Best Practices](https://uxpilot.ai/blogs/personalized-user-experience)). The framing matters more than the question count.

The hard UX cost would be a multi-step "tell us about your household" flow with ages, names, and relationships — that is a different signal and is not what's being recommended here.

## Path into scoring

Concrete usage in `packages/ml/src/recommendation.ts`:

1. **Aggregation switch.** When `household = 'partner'` and a Pairings session is active, route to average-with-floor aggregation; when `household = 'family'`, route to least-misery aggregation (already supported in the `family-with-constraint` archetype in `packages/ml/src/eval/fixtures.ts`). Solo users skip aggregation entirely.
2. **Surface routing.** Solo users see personal recs as the primary surface; partner users see a Pairings prompt above personal recs ("watching with [partner name]? Try these together"); family users see a family-safe pre-filter applied to popular recs. This is a single conditional, not new ML.
3. **Anchor-pick re-weighting.** The same enum can re-weight cold-start anchors: a partner-flagged user's anchor picks count toward both their personal vector and a "partnership-baseline" vector that seeds Pairings before the partner has signed up. This makes Pairings useful from session one, not session N.

All three paths are rule-based, deterministic, and require no model retraining — they satisfy the Phase 1A constraint.

## Tier justification

**Recommended: MUST-ASK.**

The constraints box names couch co-watcher as the *primary* archetype and explicitly calls group rec "the moat". A signal that (a) is directly load-bearing for the primary archetype, (b) cannot be recovered from behaviour according to peer-reviewed co-watching research, (c) has a deterministic and shipped-today path into rule-based scoring via the existing `family-with-constraint` fixture and aggregation infrastructure, and (d) carries a one-radio-button UX cost on a clearly justified prompt, clears the privacy-by-default bar comfortably. The "materially improves rec quality" test is met not by speculation but by the fact that without this signal, the engine has no principled way to choose between three different group aggregation strategies it already implements. Anything less than MUST-ASK leaves the moat unbuilt.

## Sources

- [MNTN Research — Better Together: An Exploration of Co-Viewing on CTV](https://research.mountain.com/insights/better-together-an-exploration-of-co-viewing-on-ctv/)
- [IAB — 56% of OTT Co-Viewers Report Talking About Brands While Watching TV](https://www.iab.com/news/56-ott-co-viewers-report-talking-brands-products-see-watching-tv/)
- [Google Research — Challenges on the Journey to Co-Watching YouTube (Sun et al.)](https://research.google.com/pubs/archive/46602.pdf)
- [Netflix Research — Recommendations](https://research.netflix.com/research-area/recommendations)
- [Netflix TechBlog — Foundation Model for Personalized Recommendation](https://netflixtechblog.com/foundation-model-for-personalized-recommendation-1a0bd8e02d39)
- [Springer — Group Recommender Systems: Aggregation, Satisfaction and Group Attributes (Masthoff)](https://link.springer.com/chapter/10.1007/978-1-4899-7637-6_22)
- [Towards Data Science — An Introduction to Group Recommender Systems](https://towardsdatascience.com/an-introduction-to-group-recommender-systems-8f942a06db56/)
- [CableTV — Survey: How Watching TV Affects Relationships](https://www.cabletv.com/entertainment/how-tv-affects-relationships)
- [ICO — What is the 'legitimate interests' basis?](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/legitimate-interests/what-is-the-legitimate-interests-basis/)
- [ICO — Principle (c): Data minimisation](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/data-minimisation/)
- [EDPB — Guidelines 1/2024 on Processing of Personal Data Based on Legitimate Interest](https://www.edpb.europa.eu/system/files/2024-10/edpb_guidelines_202401_legitimateinterest_en.pdf)
- [Baymard Institute — Account Configuration & Onboarding Design Examples](https://baymard.com/ecommerce-design-examples/account-configuration-and-onboarding)
- [NN/G — Mobile-App Onboarding: An Analysis of Components and Techniques](https://www.nngroup.com/articles/mobile-app-onboarding/)
- [NN/G — Onboarding: Skip it When Possible](https://www.nngroup.com/videos/onboarding-skip-it-when-possible/)
- [SaaSFactor — Why Users Drop Off During Onboarding and How to Fix It](https://www.saasfactor.co/blogs/why-users-drop-off-during-onboarding-and-how-to-fix-it)
- [Netflix Help Center — What is a Netflix Household](https://help.netflix.com/en/node/124925)

# Stereotype-based User Modeling (Rich 1979 + follow-ons)

Research notes for HelpME2C ghost-profile design. Focus: cataloguing the failure modes the literature has documented for "ask a few questions, infer the rest" user-modeling systems. We are *not* going to build stereotypes; we are inheriting the literature's lessons about what to avoid.

## 1. Approach

Elaine Rich introduced stereotype-based user modeling in her 1979 Cognitive Science paper ([Rich 1979, Cognitive Science 3(4):329-354](https://onlinelibrary.wiley.com/doi/abs/10.1207/s15516709cog0304_3); [author preprint, UT Austin](https://www.cs.utexas.edu/~ear/CogSci.pdf)). A "stereotype" in this technical sense is **a bundled prediction of multiple traits triggered by a single observation** — what Kobsa later called "a large number of plausible inferences on the basis of a substantially smaller number of observations" ([Kobsa 2001, "Generic User Modeling Systems"](https://ics.uci.edu/~kobsa/papers/2001-UMUAI-kobsa.pdf)). The reasoning is explicitly default / nonmonotonic: assumptions are treated as defaults that should be overridden when contradicted ([Kobsa 2001, p.6](https://ics.uci.edu/~kobsa/papers/2001-UMUAI-kobsa.pdf)).

## 2. Signal set used

Rich's Grundy book-recommender prototype elicited a short self-description from the user — "a small set of words that the person provided as a simple self description" ([summary at ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0364021379800129)). Those trigger words activated stereotypes whose contents were *facets* (predicted personality traits, interests, demographics, reading preferences). The stereotype thus contained dozens of inferred attributes, each with a confidence rating, bundled behind a single trigger.

Kobsa's BGP-MS ([Kobsa & Pohl 1995, "The User Modeling Shell System BGP-MS"](https://static.aminer.org/pdf/PDF/001/136/108/the_user_modeling_shell_system_bgp_ms.pdf)) generalised this: triggers were any observable, stereotypes were organised hierarchically (more general / more specific), and the system explicitly used **partition restrictions** ("upward propagation from non-stereotype partitions to stereotype partitions is prohibited") to prevent ad-hoc evidence from corrupting stereotype contents.

## 3. Inference mechanism

Three components recur across the Rich / Kobsa lineage:
1. **Trigger-and-default.** One observation activates a bundle of defaults.
2. **Hierarchical / overlapping stereotypes.** A user may match several; inferences combine.
3. **Confidence weighting + retraction-on-evidence.** Each inferred attribute carries a rating; direct evidence overrides the default ([Kobsa 2001 §3](https://ics.uci.edu/~kobsa/papers/2001-UMUAI-kobsa.pdf)). This is nonmonotonic reasoning — the system must be willing to take back beliefs.

The Stereotypes-and-User-Modeling chapter by Rich ([Springer 1989, "Stereotypes and User Modeling"](https://link.springer.com/chapter/10.1007/978-3-642-83230-7_2)) frames this as the central design problem: how aggressively do you allow stereotype-derived defaults to be retracted by single contradicting observations?

## 4. Validation results

Grundy was a prototype, not a product. Rich reported qualitative success — the system's models were "effective in guiding its performance" for novel recommendations ([Rich 1979 abstract](https://onlinelibrary.wiley.com/doi/abs/10.1207/s15516709cog0304_3)) — but the paper does not contain the precision/recall metrics one would expect of a modern recsys eval. The literature treats Grundy primarily as the *first articulation* of the user-modeling problem, not as an empirical benchmark. Later empirical work on stereotype quality has been blunt: "most stereotypes are formed based merely on users' external characteristics and on subjective human judgment, and such stereotypes do not represent their members accurately" ([survey discussion via search aggregation, 2026](https://link.springer.com/chapter/10.1007/978-3-642-83230-7_2)).

## 5. Failure modes the literature has catalogued

**(a) Stereotype rigidity / frozen defaults.** Once a stereotype is triggered, its defaults persist unless the system has well-engineered retraction. Kobsa explicitly designs around this and still warns that nonmonotonic reasoning is hard to get right ([Kobsa 2001](https://ics.uci.edu/~kobsa/papers/2001-UMUAI-kobsa.pdf)).

**(b) Stereotype-trigger overgeneralisation.** A single observation activates *many* inferences; the user must contradict each one separately. The retraction cost scales with bundle size, while the activation cost is constant — an inherent asymmetry that biases the system toward keeping wrong defaults.

**(c) Bias amplification and unfair outcomes.** Demographic-correlated triggers reproduce population biases as system behaviour. Ekstrand et al.'s "All The Cool Kids" ([FAT* 2018, PMLR 81:172-186](https://proceedings.mlr.press/v81/ekstrand18b.html); [author page](https://md.ekstrandom.net/pubs/cool-kids)) found demographic differences in measured recommender effectiveness *interact detrimentally* with popularity bias — different user populations get worse recommendations, not just different ones. Burke's multi-sided fairness framing ([Burke 2017, arXiv:1707.00093](https://arxiv.org/abs/1707.00093)) makes this a first-class design concern: consumer-side stereotyping is not just an accuracy problem, it's an ethical one. The proxy-variable problem makes it worse: even excluding protected attributes is insufficient because correlated variables (postcode, interaction pattern) still encode them ([fairness survey, ACM TIST 2024](https://dl.acm.org/doi/10.1145/3664928)).

**(d) Cold-start-after-cold-start: ungraceful retraction.** When the user contradicts the stereotype, naively-implemented systems either over-correct (throw away the stereotype, return to cold start) or under-correct (treat the contradiction as noise). Both fail the user. Rich's original paper already named this as the central engineering challenge; forty-six years later, it's still hard.

**(e) Bias amplification in feedback loops — the music-recommendation case.** Ferraro, Serra & Bauer's "Break the Loop" ([CHIIR 2021, ACM DL](https://dl.acm.org/doi/10.1145/3406522.3446033); [preprint PDF](https://christinebauer.eu/publications/ferraro-2021-break-the-loop/ferraro-2021-break-the-loop.pdf)) is the cleanest empirical demonstration: only 25% of artists in the training data were women; the recommender's first six recommendations were on average all male; users then listened to those recommendations; the bias amplified. The system did not "stereotype" in Rich's sense, but the underlying mechanism — population-level priors as user-level defaults — is the same. The mitigation (gradual re-ranking to surface underexposed groups) is a fix at recommendation time, not at user-modeling time, which is suggestive: stereotype contents may be unfixable from inside the stereotype framework.

## 6. Relevance to ghost profile

Two lessons that directly constrain the HelpME2C ghost-profile design.

**Don't bundle trait predictions.** Every signal we collect about the partner must be **independently storable, displayable, and retractable**. If the registered user says "she likes cosy mysteries," that's one fact, not a trigger for a bundle of "cosy mystery viewer → also likes baking shows / period drama / low-violence content." Rich's 1979 design bundled by necessity (compute was scarce, the AI was the bundle); we have no such excuse. The retraction asymmetry in §5(b) is the failure mode we inherit if we ever bundle.

**Don't trigger off protected attributes — and audit for proxies.** Even seemingly-innocent demographics (the partner's age, language, country) encode protected attributes via well-documented correlations ([fairness survey 2024](https://dl.acm.org/doi/10.1145/3664928); [Ekstrand 2018](https://md.ekstrandom.net/pubs/cool-kids)). The ghost profile should be **constituted from elicited specifics about content preferences**, not inferred from demographics about the partner. The Spotify gender-amplification case ([Ferraro 2021](https://dl.acm.org/doi/10.1145/3406522.3446033)) shows what happens when population-level priors leak into individual-level recommendations: the system entrenches biased exposure even when no individual decision was overtly discriminatory.

The literature's lesson — graceful retraction is the hard part — maps directly onto the ghost profile's likely usage: the registered user is *guessing* about their partner's taste, will sometimes be wrong, and the system must update without throwing away the partial profile or treating the contradiction as noise. Design for retraction first, accuracy second.

## Sources

1. [Rich, E. (1979). User Modeling via Stereotypes. Cognitive Science 3(4):329-354](https://onlinelibrary.wiley.com/doi/abs/10.1207/s15516709cog0304_3) — original paper.
2. [Rich 1979 author preprint (UT Austin)](https://www.cs.utexas.edu/~ear/CogSci.pdf) — open-access copy.
3. [Rich, E. (1989). Stereotypes and User Modeling. In Kobsa & Wahlster (eds), User Models in Dialog Systems](https://link.springer.com/chapter/10.1007/978-3-642-83230-7_2) — follow-up chapter framing retraction as the central problem.
4. [Kobsa, A. (2001). Generic User Modeling Systems. UMUAI 11:49-63](https://ics.uci.edu/~kobsa/papers/2001-UMUAI-kobsa.pdf) — survey of generic UM shells.
5. [Kobsa, A. & Pohl, W. (1995). The User Modeling Shell System BGP-MS. UMUAI 4(2):59-106](https://static.aminer.org/pdf/PDF/001/136/108/the_user_modeling_shell_system_bgp_ms.pdf) — hierarchical stereotypes, partition restrictions.
6. [Ekstrand et al. (2018). All The Cool Kids, How Do They Fit In? FAT* 2018, PMLR 81:172-186](https://proceedings.mlr.press/v81/ekstrand18b.html) — demographic × popularity bias interaction in recsys evaluation. [Author page](https://md.ekstrandom.net/pubs/cool-kids).
7. [Burke, R. (2017). Multisided Fairness for Recommendation. arXiv:1707.00093](https://arxiv.org/abs/1707.00093) — multi-stakeholder fairness framing.
8. [Ferraro, A., Serra, X., Bauer, C. (2021). Break the Loop: Gender Imbalance in Music Recommenders. CHIIR '21](https://dl.acm.org/doi/10.1145/3406522.3446033) — empirical Spotify-style gender amplification case. [Preprint](https://christinebauer.eu/publications/ferraro-2021-break-the-loop/ferraro-2021-break-the-loop.pdf).
9. [Fairness and Diversity in Recommender Systems: A Survey. ACM TIST 2024](https://dl.acm.org/doi/10.1145/3664928) — proxy-variable problem in recsys.
10. [Fairness in recommender systems: research landscape and future directions. UMUAI 2023](https://link.springer.com/article/10.1007/s11257-023-09364-z) — modern survey.

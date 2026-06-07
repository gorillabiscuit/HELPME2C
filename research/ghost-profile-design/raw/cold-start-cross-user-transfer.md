# Cold-Start Cross-User Transfer

Research notes for HelpME2C ghost-profile design. Focus: when the target user (the unregistered partner) has near-zero data, what does the literature say about *transferring* signal from a related source (the registered user, a domain, a demographic cluster) onto them?

## 1. Approach

"Cross-user transfer" in recsys research splits into two related sub-problems.

**(a) Domain transfer.** A user has rich signal in domain A (e.g. movies they've watched) and you want to recommend in domain B (e.g. books). This is the canonical "cross-domain recommendation" framing of Cantador, Fernández-Tobías and collaborators ([Fernández-Tobías et al. 2012, "Cross-domain recommender systems: A survey of the State of the Art"](http://arantxa.ii.uam.es/~cantador/doc/2012/ceri12a.pdf); [Cantador & Cremonesi 2014 RecSys tutorial](https://recsys.acm.org/wp-content/uploads/2014/10/recsys2014-tutorial-cross_domain.pdf); [chapter in Recommender Systems Handbook, 2nd ed.](https://shlomo-berkovsky.github.io/files/pdf/Springer15a.pdf)).

**(b) User-to-user transfer.** You use user A's profile as a *prior* for user B because A and B share something — household, relationship, demographics, behavioural overlap. Berkovsky and colleagues frame this as **mediation of user models** ([Berkovsky et al. 2008, "Cross-representation mediation of user models", UMUAI](https://link.springer.com/article/10.1007/s11257-008-9055-z); [Berkovsky, Kuflik, Ricci 2007, "Cross-Domain Mediation in Collaborative Filtering", UM 2007](https://shlomo-berkovsky.github.io/files/pdf/UM07a.pdf)): you import another system's user-model data and integrate it for a different task.

The ghost-profile case is closer to (b) with a relationship anchor — but the methodology in both branches overlaps because the underlying question is the same: *what signal can be transported between contexts without doing harm?*

## 2. Signal set used

The literature distinguishes four kinds of transfer signal ([Cantador & Cremonesi 2014 tutorial](https://recsys.acm.org/wp-content/uploads/2014/10/recsys2014-tutorial-cross_domain.pdf); [Fernández-Tobías et al. 2018, "Addressing the user cold start with cross-domain collaborative filtering"](https://link.springer.com/article/10.1007/s11257-018-9217-6)):

1. **Shared users** — same user in both domains, ratings transfer directly.
2. **Shared items / shared attributes** — items overlap or share metadata (genres, tags, themes); attribute-space alignment carries preferences across.
3. **Shared latent structure** — co-clustering / matrix factorisation projects source and target into a shared latent space.
4. **Explicit semantic bridge** — an external knowledge graph or taxonomy links source and target domains ([Fernández-Tobías et al. 2011, "A generic semantic-based framework for cross-domain recommendation"](https://www.researchgate.net/publication/254005959_A_generic_semantic-based_framework_for_cross-domain_recommendation)).

For user-to-user transfer specifically, the signal is **demographic similarity**, **social link** (friends, household, declared relationship), **behavioural overlap** with another user, or — most relevant here — an **explicit "this is like that" mapping** elicited from one user about another. Burke's hybrid recommender taxonomy ([Burke 2002, "Hybrid Recommender Systems: Survey and Experiments", UMUAI 12:331-370](https://link.springer.com/article/10.1023/A:1021240730564); [preprint](https://www.researchgate.net/publication/263377228_Hybrid_Recommender_Systems_Survey_and_Experiments)) is the right framework for combining a ghost-profile signal with everything else we know: switching, weighted, cascade, feature-augmentation, and meta-level hybrids each have different failure modes.

## 3. Inference mechanism

Four mechanisms recur:

- **Latent-factor projection.** Train a factorisation jointly across source and target; the latent space carries preferences. ([Pan & Yang 2010, "A Survey on Transfer Learning", IEEE TKDE 22:1345-1359](https://www.cse.ust.hk/~qyang/Docs/2009/tkde_transfer_learning.pdf) — the foundational transfer-learning survey.)
- **Taxonomy / attribute mapping.** Tags or themes act as a bridge: if the user likes X-tagged items in domain A, recommend X-tagged items in domain B ([Fernández-Tobías 2018](https://link.springer.com/article/10.1007/s11257-018-9217-6)).
- **Weighted prior blending.** Treat the transferred signal as a prior, blend with whatever local evidence accrues. Burke's "weighted" hybrid ([Burke 2002](https://link.springer.com/article/10.1023/A:1021240730564)).
- **Naive Bayes / probabilistic priors.** Source signal sets the prior over latent preferences; observed target-domain interactions update it.

For the ghost profile, the relevant primitive is **prior-with-update**: A elicits an initial mini-profile about B, and the system treats it as a Bayesian prior that gets updated whenever the couple registers feedback together.

## 4. Validation results

The cross-domain literature reports *positive but modest* lift over single-domain baselines, with the size of the lift highly dependent on domain similarity. Fernández-Tobías et al.'s 2018 work on cross-domain CF for cold-start ([UMUAI](https://link.springer.com/article/10.1007/s11257-018-9217-6)) shows that exploiting auxiliary-domain ratings with item-metadata bridges generates "more accurate recommendations than existing approaches, even in cold-start situations" — but the magnitude is dataset-specific and consistently smaller than the lift from collecting actual in-domain ratings.

For preference elicitation more generally: explicit elicitation of preferences on **attributes** (e.g. "do you like tracks by artist A?") rather than on individual items is more effective for collaborative filtering ([Karimi et al. 2018, "Generating Usage-related Questions for Preference Elicitation"](https://dl.acm.org/doi/10.1145/3629981); discussion in [Eliciting Auxiliary Information for Cold Start User Recommendation: A Survey, 2021](https://www.mdpi.com/2076-3417/11/20/9608)). **Pairwise** comparisons ("X or Y?") are more informative per question than single-item ratings.

The honest answer the literature settles on: when the target user has near-zero data and demographic priors are the only signal, *demographic-only* recommendations consistently underperform popularity baselines once even a few real interactions exist. Transfer signal degrades as the target user becomes warm.

## 5. Failure modes

**(a) Negative transfer.** When the source and target are too dissimilar, the transferred prior *actively hurts* — worse than no transfer. This is a first-class concern in modern cross-domain work ([Zhang et al. 2024, "Mitigating Negative Transfer in Cross-Domain Recommendation via Knowledge Transferability Enhancement", KDD 2024](https://dl.acm.org/doi/10.1145/3637528.3671799); [Cao et al. 2023, "Mitigating Negative Transfer in Sequential Recommendation", arXiv:2309.10195](https://arxiv.org/pdf/2309.10195)). The mechanism is straightforward: "naive aggregation of sequential signals can introduce conflicting domain-specific preferences, leading to negative transfer" ([Zhang 2024 KDD](https://dl.acm.org/doi/10.1145/3637528.3671799)). For the user-to-user case, it means: if you use A's profile as B's prior and A and B have genuinely different taste, B's recommendations are worse than if you'd recommended popularity.

**(b) Echo chamber / shared-account contamination.** Using A's profile as B's prior means B never escapes A's bubble. This is the canonical problem Netflix's profile architecture exists to solve — "if it thinks everyone in your household is the same person then its recommendations will be terrible" ([Netflix Help Center on profiles](https://help.netflix.com/en/node/123277)). It's the same dynamic the filter-bubble / feedback-loop literature describes ([Filter Bubbles in Recommender Systems: Fact or Fallacy — A Systematic Review, arXiv:2307.01221](https://arxiv.org/pdf/2307.01221)): personalisation reinforces existing exposure, and if B's "existing exposure" is just A's profile, B never gets out.

**(c) Identification risk.** If B's profile is derived from A's, B's privacy is effectively governed by A. This is a documented privacy threat: recommender systems can "reveal a user's identity or infer very private information such as gender" from indirect signals ([Privacy in Recommender Systems, Utwente 2013](https://research.utwente.nl/files/5352108/Privacy_in_Recommender_Systems.pdf)); fingerprinting based on behaviour alone identifies individuals with >40% accuracy in some studies. When B's profile is *constituted by* A's disclosures, B has no independent privacy posture.

**(d) Stale priors that don't update.** Transferred priors can dominate accumulated local evidence for too long, especially in low-data regimes — the same retraction-asymmetry problem as stereotypes (see `rich-stereotypes.md` §5).

## 6. Relevance to ghost profile

The ghost profile is deliberately framed as a **limited transfer** case, and that framing maps directly onto the literature's mitigation recipes.

We are explicitly *not* copying A's whole taste vector into B and then "adjusting." That naive approach hits negative transfer (A and B may genuinely differ), echo-chamber (B never escapes A's bubble), and identification risk (B's profile is derivable from A's). Instead, the ghost profile is: **A elicits an EXPLICIT mini-profile about B** — a small number of A's specific claims about B's preferences, each stored as an independent, retractable fact. This is closer to attribute-level preference elicitation ([Karimi et al. 2018](https://dl.acm.org/doi/10.1145/3629981); [survey](https://www.mdpi.com/2076-3417/11/20/9608)) than to cross-user latent-factor transfer.

This design choice is endorsed by the literature in two complementary ways. First, the negative-transfer work ([KDD 2024](https://dl.acm.org/doi/10.1145/3637528.3671799)) advocates decomposing preferences into domain-specific and shared components and transferring only the shared part — limiting transfer is the actively-recommended defence. Second, the privacy-and-recsys literature ([Utwente survey](https://research.utwente.nl/files/5352108/Privacy_in_Recommender_Systems.pdf)) treats minimisation of derived-profile inference as the design goal: ghost-profile fields are *what A told us about B*, not *what we inferred about B from A's behaviour*. That distinction is what makes the ghost profile defensible.

The Burke hybrid taxonomy ([Burke 2002](https://link.springer.com/article/10.1023/A:1021240730564)) gives the integration shape: the ghost profile is one input to a **weighted** hybrid in the couple's group-rec computation — never the sole signal, always blended with the registered user's actual data and any shared interactions, and always retractable when contradicted.

## Sources

1. [Rich, E. (1979). User Modeling via Stereotypes. Cognitive Science 3(4):329-354](https://onlinelibrary.wiley.com/doi/abs/10.1207/s15516709cog0304_3) — historical anchor; see companion file.
2. [Pan, S.J. & Yang, Q. (2010). A Survey on Transfer Learning. IEEE TKDE 22:1345-1359](https://www.cse.ust.hk/~qyang/Docs/2009/tkde_transfer_learning.pdf) — foundational transfer-learning survey.
3. [Fernández-Tobías, I., Cantador, I., Kaminskas, M., Ricci, F. (2012). Cross-domain recommender systems: A survey of the State of the Art](http://arantxa.ii.uam.es/~cantador/doc/2012/ceri12a.pdf) — taxonomic survey.
4. [Cantador, I. & Cremonesi, P. (2014). Tutorial on cross-domain recommender systems. RecSys '14](https://recsys.acm.org/wp-content/uploads/2014/10/recsys2014-tutorial-cross_domain.pdf) — practical taxonomy.
5. [Fernández-Tobías, I. et al. (2011). A generic semantic-based framework for cross-domain recommendation](https://www.researchgate.net/publication/254005959_A_generic_semantic-based_framework_for_cross-domain_recommendation) — semantic-bridge approach.
6. [Fernández-Tobías, I. et al. (2018). Addressing the user cold start with cross-domain collaborative filtering: exploiting item metadata in matrix factorization. UMUAI 29(2)](https://link.springer.com/article/10.1007/s11257-018-9217-6) — cold-start CDCF with metadata bridges.
7. [Cantador, I., Fernández-Tobías, I., Berkovsky, S., Cremonesi, P. (2015). Cross-Domain Recommender Systems. In: Recommender Systems Handbook 2e](https://shlomo-berkovsky.github.io/files/pdf/Springer15a.pdf) — handbook chapter.
8. [Berkovsky, S., Kuflik, T., Ricci, F. (2007). Cross-Domain Mediation in Collaborative Filtering. UM 2007](https://shlomo-berkovsky.github.io/files/pdf/UM07a.pdf) — mediation of user models.
9. [Berkovsky, S., Kuflik, T., Ricci, F. (2008). Cross-representation mediation of user models. UMUAI 19(1-2)](https://link.springer.com/article/10.1007/s11257-008-9055-z) — cross-representation transfer.
10. [Burke, R. (2002). Hybrid Recommender Systems: Survey and Experiments. UMUAI 12:331-370](https://link.springer.com/article/10.1023/A:1021240730564) — switching / weighted / cascade taxonomy.
11. [Zhang et al. (2024). Mitigating Negative Transfer in Cross-Domain Recommendation via Knowledge Transferability Enhancement. KDD '24](https://dl.acm.org/doi/10.1145/3637528.3671799) — modern negative-transfer mitigation.
12. [Cao et al. (2023). Mitigating Negative Transfer in Sequential Recommendation. arXiv:2309.10195](https://arxiv.org/pdf/2309.10195) — sequential setting.
13. [Eliciting Auxiliary Information for Cold Start User Recommendation: A Survey (2021)](https://www.mdpi.com/2076-3417/11/20/9608) — preference-elicitation methods.
14. [Karimi et al. (2023). Generating Usage-related Questions for Preference Elicitation in Conversational Recommender Systems. ACM TORS](https://dl.acm.org/doi/10.1145/3629981) — attribute-level elicitation evidence.
15. [Privacy in Recommender Systems. Utwente report 2013](https://research.utwente.nl/files/5352108/Privacy_in_Recommender_Systems.pdf) — identification risk discussion.
16. [Filter Bubbles in Recommender Systems: Fact or Fallacy — A Systematic Review. arXiv:2307.01221](https://arxiv.org/pdf/2307.01221) — echo-chamber evidence review.

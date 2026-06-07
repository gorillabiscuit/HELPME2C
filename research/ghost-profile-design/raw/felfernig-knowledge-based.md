# Felfernig and the knowledge-based recommender systems line

## 1. Approach

Knowledge-based recommenders (KBR) are the third historical branch of recommender systems alongside collaborative filtering (CF) and content-based (CB). Rather than learning from a rating matrix or item features, they recommend by reasoning over **explicit knowledge** — a domain model, a set of constraints, and an articulated user preference. Felfernig & Burke's foundational ICEC 2008 paper, ["Constraint-based recommender systems: Technologies and research issues"](https://www.semanticscholar.org/paper/Constraint-based-recommender-systems:-technologies-Felfernig-Burke/cafaf6981b4daf5bdc3f38041bb4e88675cd03ef), splits KBR into two sub-families: **constraint-based** (items satisfy a CSP `<V, C, R>` of variables, constraints, and user requirements) and **case-based** (items are matched to user preferences via similarity over attributes). A third variant, **critique-based** recommendation, lets the user iteratively revise a reference item ("cheaper", "more action") rather than enumerating preferences upfront, surveyed in the Frontiers 2024 review ["Knowledge-based recommender systems: overview and research directions"](https://www.frontiersin.org/journals/big-data/articles/10.3389/fdata.2024.1304439/full). The Jannach/Zanker/Felfernig/Friedrich textbook [_Recommender Systems: An Introduction_](https://www.cambridge.org/9780521493369) (Cambridge, 2010) dedicates Chapter 4 to KBR.

The core motivation: KBR exists for domains where CF is structurally weak — **infrequent, high-stakes, complex purchases** (cars, financial services, cameras, software) where users have no rating history and the item space is too sparsely sampled for nearest-neighbour methods to work ([Frontiers 2024](https://www.frontiersin.org/journals/big-data/articles/10.3389/fdata.2024.1304439/full)).

## 2. Signal set used

A constraint-based recommender collects three categories of input ([Felfernig & Burke 2008](https://www.researchgate.net/publication/234797128_Constraint-based_recommender_systems_Technologies_and_research_issues); [Frontiers 2024](https://www.frontiersin.org/journals/big-data/articles/10.3389/fdata.2024.1304439/full)):

- **Variables `V`** — the dimensions on which items vary (e.g. `ABtesting`, `statistics`, `multiplechoice`, `license`, `price`).
- **Constraints `C`** — logical rules encoding domain knowledge ("if `ABtesting = true` then `licenseTier >= pro`"), authored by domain experts.
- **User requirements `R`** — hard requirements ("price ≤ 100") and **utility weights** over higher-level interest dimensions (economy, quality), summing to 1.

Case-based variants additionally carry a **case base** of items with attribute vectors plus similarity metrics. Critique-based variants accept only one preference signal at a time — a directional tweak on a reference item.

## 3. Inference mechanism

Two engines dominate. **Constraint satisfaction** — the system computes the set `{i | consistent(C ∪ R ∪ a(i))}` and returns matching items. **Multi-Attribute Utility Theory (MAUT)** then ranks the matching set: each item gets a utility score `Σ wᵢ · uᵢ(item)` where `wᵢ` is the user-stated importance weight on dimension `i` and `uᵢ(·)` maps attribute values to a utility on that dimension ([Frontiers 2024](https://www.frontiersin.org/journals/big-data/articles/10.3389/fdata.2024.1304439/full)).

When the constraint set is unsatisfiable (no item matches), the system invokes **diagnosis and repair**: it finds a minimal **conflict set** (smallest subset of `R` that's inconsistent with `C`), computes alternative **diagnoses** (minimal subsets of `R` to relax to restore consistency), and offers the user a personalised repair proposal weighted by the stated importance values. Felfernig et al.'s 2013 ["Automated repair of scoring rules in constraint-based recommender systems"](https://journals.sagepub.com/doi/abs/10.3233/AIC-120543) formalises this as a nonlinear optimisation problem. Critique-based recommenders avoid this by never asking for full requirements at once — each interaction is a unit critique (one attribute, one direction) or a compound critique (a curated multi-attribute jump).

## 4. Validation results

Empirical evidence for KBR is real but narrower than for CF. KBR demonstrably **eliminates cold-start** — the system can recommend on the user's first interaction because nothing depends on historical ratings ([Frontiers 2024](https://www.frontiersin.org/journals/big-data/articles/10.3389/fdata.2024.1304439/full)). Case studies in the Felfernig group's ["Case-studies on exploiting explicit customer requirements in recommender systems"](https://link.springer.com/article/10.1007/s11257-008-9048-y) (UMUAI, 2008) and ["Evaluating Recommender Systems in Tourism — A Case Study from Austria"](https://link.springer.com/chapter/10.1007/978-3-211-77280-5_3) report measurable lifts in conversion and user satisfaction on complex e-commerce tasks (financial advisory, tourism packages). The 2009-era CWAdvisor environment ([Felfernig et al. IJEC 2006](https://www.researchgate.net/publication/228336870_An_Integrated_Environment_for_the_Development_of_Knowledge-Based_Recommender_Applications)) was deployed in industrial settings.

Where KBR **loses** to CF: high-volume entertainment domains (movies, music) with abundant ratings and where users cannot articulate what they want better than their past behaviour predicts.

## 5. Failure modes catalogued in the literature

The Frontiers 2024 overview and the Jannach et al. textbook enumerate consistent failure modes:

- **Knowledge-engineering cost.** The constraint base must be hand-authored by domain experts; "significant communication overheads" between experts and engineers ([Frontiers 2024](https://www.frontiersin.org/journals/big-data/articles/10.3389/fdata.2024.1304439/full)). Taxonomy drift over time silently breaks rules.
- **User fatigue in elicitation.** Long preference dialogs cause drop-off; McSherry's work on dialogue termination ([Conversational CBR](https://link.springer.com/chapter/10.1007/978-3-540-85502-6_27)) addresses when to *stop* asking.
- **Brittle defaults.** Static constraints over-constrain — small misspecifications produce empty result sets, requiring repair UX.
- **Limited serendipity.** "Serendipity effects in knowledge-based recommendation are limited by the static encoding" ([Frontiers 2024](https://www.frontiersin.org/journals/big-data/articles/10.3389/fdata.2024.1304439/full)) — the system only finds what the model already knows about.
- **Inconsistency between expressed and revealed preference.** Users state preferences they don't actually rate-confirm; the critique-based line (Burke's Entree, McSherry) emerged partly to mitigate this by deferring articulation.

For **group** KBR, Felfernig's later work ([_Group Recommender Systems – An Introduction_, Springer 2018](https://www.researchgate.net/publication/328118222_Group_Recommender_Systems_-_An_Introduction); ["Designing Explanations for Group Recommender Systems"](https://arxiv.org/pdf/2102.12413), 2021) distinguishes **aggregated predictions** (recommend per individual, merge by voting) from **aggregated models** (merge preferences first, recommend once). Fairness across group members becomes an explicit optimisation objective.

## 6. Relevance to ghost profile

This line is the closest academic precedent for HelpME2C's ghost-profile inference. A ghost profile is, structurally, **a knowledge-based representation of a person we cannot observe**: the registered user articulates the partner's preferences (genres, themes, dealbreakers) and we reason from those statements, not from a rating history we don't have. Two design implications follow.

First, **how much signal we need is bounded by the dimensionality of the constraint model, not by the inference machinery**. Felfernig's group recommender work assembles workable profiles from a handful of utility weights over genre/theme dimensions plus a small set of hard constraints (e.g. "no horror"). We do not need ten ratings; we need a clean elicitation interview hitting the dimensions that actually move recommendations. Second, **the dominant failure modes to design against are not accuracy but UX and brittleness**: user fatigue (keep the interview short), empty result sets (build repair / relaxation logic from day one), and taxonomy drift (the theme taxonomy is the constraint vocabulary — version it). The MAUT scoring discipline — explicit weights, explicit utility functions — also gives us a natural place to surface explanations to the user-of-record about why a recommendation was generated *for the partner*, which the literature consistently identifies as a trust-building requirement in KBR.

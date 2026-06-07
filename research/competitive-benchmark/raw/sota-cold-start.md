# SOTA: cold-start recommendation for content-discovery platforms

**Lens:** what HelpME2C (Phase 1A/1B; <1000 users; rule-based scoring; no model training; tag-based taxonomy already in place) can realistically adopt or be *inspired by*. Anything that requires Netflix-scale logs, dense interaction histories, or trained neural models is called out and ruled out for Phase 1A.

**Date written:** 2026-05-17.
**Author:** research agent, single pass.

---

## 1. Preference elicitation: interview / questionnaire design

The seminal piece of work here is **Rashid et al., "Getting to Know You: Learning New User Preferences in Recommender Systems"** (IUI 2002). It studies six item-selection strategies for the "what should we ask the new user about?" question and finds two robust signals: an item should be **popular** (so the user is likely to recognise it) AND **informative** (high entropy across users — i.e. it splits the population). The proposed product **Popularity × Entropy ("Pop×Ent")** consistently outperformed pure popularity, pure entropy, and personalised prediction-based selection. They also note that pure entropy fails because high-entropy items are usually obscure — the user just says "haven't seen it" and you learn nothing. A useful follow-on framing is **HELF ("Helpful and Frequent")**, basically a smoothed variant of the same product.

The next leap is **Golbandi, Koren, Lempel, "Adaptive Bootstrapping of Recommender Systems Using Decision Trees"** (WSDM 2011). Instead of a static questionnaire, the system builds a decision tree where each node is an item and each branch ("loved" / "hated" / "don't know") routes the user to the next best question. Empirically this beats static Pop×Ent because each question is conditioned on the previous answers. This is the conceptual ancestor of Netflix's "tell us 3 things you like" onboarding tree. The "don't know" branch is *essential* — without it, the tree degenerates on obscure items.

Modern variants worth noting: **pairwise comparison** elicitation ("do you like A or B more?") is empirically easier for users than absolute ratings — humans give better relative than absolute judgements. The **conversational recommender systems survey** (Jannach et al., ACM Computing Surveys 2021) is the canonical reference for elicitation-via-dialogue, including the question of how many questions to ask before user fatigue dominates. Google's **"Minimizing Live Experiments"** paper (SIGIR 2024) is the most recent industrial evidence: YouTube Music onboarding policies are tuned via offline user simulation precisely because each onboarding only happens once and is expensive to A/B test.

The product UX evidence: **Spotify's 3-artist picker** is a multi-cycle elicitation — pick 3, get refined options, pick more (see write-ups on Spotify's onboarding deep-dives). **Netflix moved from 5-star to thumbs up/down in 2017** and saw 200% more ratings, because cognitive load on a 5-point scale stalls users (Cameron Johnson / Netflix's reporting). The lesson: fewer options per choice, more choices total, beats high-resolution scales.

**Citations:**
- [Rashid et al., "Getting to Know You: Learning New User Preferences in Recommender Systems", IUI 2002](https://cs.fit.edu/~pkc/apweb/related/rashid-iui02.pdf)
- [Golbandi, Koren, Lempel, "Adaptive Bootstrapping of Recommender Systems Using Decision Trees", WSDM 2011](https://www.semanticscholar.org/paper/Adaptive-bootstrapping-of-recommender-systems-using-Golbandi-Koren/cedfd39777d9a5e8bd68a9149c20f3e860483a40)
- [Jannach et al., "A Survey on Conversational Recommender Systems", ACM Computing Surveys 54(5), 2021](https://dl.acm.org/doi/10.1145/3453154)
- [Christakopoulou et al., "Minimizing Live Experiments in Recommender Systems: User Simulation to Evaluate Preference Elicitation Policies", SIGIR 2024](https://arxiv.org/abs/2409.17436)
- [Carenini et al., "Using Groups of Items for Preference Elicitation in Recommender Systems", CSCW 2015](https://dl.acm.org/doi/10.1145/2675133.2675210)
- [Pommeranz et al., "The effect of preference elicitation methods on the user experience of a recommender system", CHI EA 2010](https://dl.acm.org/doi/10.1145/1753846.1754001)

**Deployable at HelpME2C scale?** YES. Pop×Ent is a 20-line scoring function over TMDB/AniList popularity + rating-variance (entropy proxy). Decision-tree adaptive interview is doable but adds engineering cost; defer to Phase 1B. Thumbs up/down/skip beats 5-star — adopt directly. Cap the picker at 5–10 items; further questions give diminishing returns (Rashid et al. find most signal in the first ~10 items).

---

## 2. Active-learning approaches for cold-start

**Elahi, Ricci, Rubens, "A Survey of Active Learning in Collaborative Filtering Recommender Systems"** (Computer Science Review, 2016) is still the canonical review. It classifies AL strategies along two axes: **personalisation** (does the next item depend on this user's prior answers?) and **hybridisation** (combine multiple criteria?). The taxonomy yields:

- **Non-personalised, single-criterion**: popularity, entropy, variance, log(popularity)×entropy → cheap, no per-user state.
- **Non-personalised, hybrid**: Pop×Ent, HELF → strictly better.
- **Personalised, single-criterion**: prediction-based ("what would the user most likely have a strong opinion on?"), influence-based → requires a baseline model.
- **Personalised, hybrid**: decision-tree, matrix-factorisation-driven → requires a trained model running during onboarding.

The deployable subset for HelpME2C is the **non-personalised** column. Personalised AL needs a working model to bootstrap the next question, which is circular for a true cold-start service.

Two important refinements have appeared since 2016. **Personality-based active learning** (Elahi et al., 2014, also IIS journal 2021) suggests that Big-Five personality survey responses are correlated with willingness to rate niche items and can be used to pick the elicitation strategy per user — but this requires a personality survey, which itself is friction. **Conversational AL** (e.g. an empirical evaluation of strategies for conversational profile elicitation, Iovine et al., JIIS 2021) replaces static questionnaires with chat, useful but heavyweight for an MVP.

**Citations:**
- [Elahi, Ricci, Rubens, "A survey of active learning in collaborative filtering recommender systems", Computer Science Review 20, 2016](https://www.sciencedirect.com/science/article/pii/S1574013715300150)
- [Karimi et al., "A supervised active learning framework for recommender systems based on decision trees", UMUAI 2015](https://link.springer.com/article/10.1007/s11257-014-9153-z)
- [Iovine et al., "An empirical evaluation of active learning strategies for profile elicitation in a conversational recommender system", JIIS 2021](https://link.springer.com/article/10.1007/s10844-021-00683-4)
- [Rubens, Elahi, Sugiyama, Kaplan, "Active Learning in Recommender Systems", in Recommender Systems Handbook (Springer, 2nd ed. 2015)](https://link.springer.com/chapter/10.1007/978-3-319-10491-1_12)

**Deployable at HelpME2C scale?** PARTIAL. Non-personalised AL (Pop×Ent + a "diversity-aware" pick using genre/tag coverage) ships in Phase 1A. Personalised AL and conversational AL are Phase 2+ once we have a baseline scorer to bootstrap from.

---

## 3. Demographic priors and side information

The foundational reference is **Pazzani, "A Framework for Collaborative, Content-Based and Demographic Filtering"** (AI Review, 1999). It established demographic filtering as a third leg alongside CF and content-based: age, gender, occupation, region → group membership → recommendation. The empirical record is *modest*: demographics give a small bump in cold-start scenarios but rarely beat any non-trivial content-based signal once even 5 ratings exist (see Al-Shamri's user-profiling-for-demographic-recommenders review, KBS 2016).

The post-2020 literature is dominated by **fairness concerns**. Ekstrand et al., **"Revisiting Popularity and Demographic Biases in Recommender Evaluation and Effectiveness"** (ECIR 2022), shows that recommendation utility degrades systematically for older users and is lower for women in standard CF setups — i.e. demographic priors that *just embed the training-data distribution* will reproduce the demographic skew of the catalogue. Melchiorre et al. (IPM 2021) document the same for music. The recent LLM-based cold-start work (Wang et al., arxiv 2508.20401, 2025) confirms that LLM-driven recommendations in cold-start regimes lean hard on stereotypes when only age/gender/language are provided — quantitatively worse than for users with even minimal interaction history.

For HelpME2C, the practical implications are:
1. Demographics are **soft priors, never hard filters** — never say "you can't see X because you're 19".
2. Region matters because it affects **availability** (JustWatch-style provider gating) far more than taste; it's an infra signal, not a recommendation signal.
3. Age is GDPR-relevant only for **maturity gating** (ADR-0012 framing). It is *not* worth collecting as a recommendation signal in Phase 1A — the lift is small and the fairness risk is real.
4. Gender as a recommendation signal is the highest-risk lowest-reward demographic. Strongly default to *not collecting*.

**Citations:**
- [Pazzani, "A Framework for Collaborative, Content-Based and Demographic Filtering", AI Review 13, 1999](https://link.springer.com/article/10.1023/A:1006544522159)
- [Al-Shamri, "User profiling approaches for demographic recommender systems", Knowledge-Based Systems 100, 2016](https://www.sciencedirect.com/science/article/abs/pii/S0950705116001192)
- [Ekstrand et al., "Revisiting Popularity and Demographic Biases in Recommender Evaluation and Effectiveness", ECIR 2022 (arxiv 2110.08353)](https://arxiv.org/pdf/2110.08353)
- [Melchiorre et al., "Investigating gender fairness of recommendation algorithms in the music domain", Information Processing & Management 58(5), 2021](https://www.sciencedirect.com/science/article/pii/S0306457321001540)
- [Wang et al., "Revealing Potential Biases in LLM-Based Recommender Systems in the Cold Start Setting", arxiv 2508.20401, 2025](https://arxiv.org/html/2508.20401v2)
- [Beel et al., "The Impact of Demographics (Age and Gender) and Other User-Characteristics on Evaluating Recommender Systems", TPDL 2013](https://www.researchgate.net/publication/284995558_The_Impact_of_Demographics_Age_and_Gender_and_Other_User-Characteristics_on_Evaluating_Recommender_Systems)

**Deployable at HelpME2C scale?** MOSTLY NO — for the recommendation signal itself. Collect region for availability (already in scope per ADR-0012). Defer age-as-prior and gender-as-prior; the lift is small and the GDPR/fairness cost is real.

---

## 4. Content-based cold-start with tags / metadata

Tag-based and content-based filtering are structurally immune to user cold-start in a way CF is not: a new user with N rated items immediately yields a **taste vector over tags** (sum or weighted sum of the tag-vectors of their rated items, normalised). No user-user similarity is required. This is exactly the architecture HelpME2C has chosen, and it is the right one for the regime.

The canonical reference here is **Sen, Vig, Riedl, "Tagommenders: Connecting Users to Items through Tags"** (WWW 2009), which evaluated tag-based recommenders against state-of-the-art CF on MovieLens and found that the tag-based approach produces rankings competitive with or better than CF, *especially in low-data regimes*. The "tag genome" follow-on work (Vig, Sen, Riedl, ACM TiiS 2012) refined this with continuous tag–item relevance scores rather than binary applications. The general handbook chapter **"Tag-Based Recommendation"** (Marinho et al., in Recommender Systems Handbook 2nd ed., Springer 2015) is the canonical reference for the algorithmic family.

The "anchor items" pattern — a small set of high-rated items as strong attractors — falls out naturally from a tag-vector approach: items the user has explicitly thumbed-up contribute their full tag weight, and similarity scoring becomes a simple cosine over the resulting profile. The MovieLens lineage shows this works in production at modest scale. The structural advantage is that the same tag taxonomy used for the catalog *is* the user profile — no separate embedding training run.

The main weakness is **tag sparsity**: if the catalogue is under-tagged or the user has only thumbed-up one item, the profile is degenerate. The mitigation is a small popularity floor plus tag-expansion via co-occurrence (an item with tag X is also "near" items with tags often co-occurring with X — this is essentially item-item similarity inside the tag space, not user space).

**Citations:**
- [Sen, Vig, Riedl, "Tagommenders: Connecting Users to Items through Tags", WWW 2009](https://dl.acm.org/doi/10.1145/1526709.1526800)
- [Vig, Sen, Riedl, "The Tag Genome: Encoding Community Knowledge to Support Novel Interaction", ACM TiiS 2(3), 2012](https://dl.acm.org/doi/10.1145/2362394.2362395)
- [Marinho et al., "Tag-Based Recommendation", in Recommender Systems Handbook 2nd ed., Springer 2015](https://link.springer.com/chapter/10.1007/978-3-319-90092-6_12)
- [Lops, de Gemmis, Semeraro, "Content-Based Recommendation Systems: State of the Art and Trends", in Recommender Systems Handbook, Springer 2011](https://link.springer.com/chapter/10.1007/978-0-387-85820-3_3)

**Deployable at HelpME2C scale?** YES — this is the core architecture for Phase 1A. Already in scope per the existing tag/theme taxonomy work (`packages/ml`).

---

## 5. Hybrid: tags + popularity + diversity injection

The diversity literature is anchored by **Carbonell and Goldstein, "The Use of MMR, Diversity-Based Reranking for Reordering Documents and Producing Summaries"** (SIGIR 1998). MMR is the workhorse: greedy re-rank where each candidate is scored as
`score = λ · relevance(item) − (1−λ) · max_sim(item, already_selected)`
with `λ ∈ [0,1]` tunable. λ=1 collapses to pure relevance, λ=0 to pure novelty. For a cold-start recommender, **λ in the 0.5–0.7 range** is typical because the diversity term is essential to surface tag clusters the user hasn't explicitly anchored.

MMR over a tag space is particularly clean: similarity is just cosine over tag-vectors, which the recommender already has. **Vargas and Castells, "Intent-Oriented Diversity in Recommender Systems"** (SIGIR 2011) extends this by modelling the user as having multiple "intents" (genre clusters they care about) and diversifying across intents rather than just across items. For HelpME2C, "intent" maps naturally to the cross-medium theme taxonomy — diversify so the slate covers multiple themes, not just multiple individual items.

Popularity backoff: the standard rule (see e.g. the "popularity bias" survey, Klimashevskaia et al., UMUAI 2024) is to **inject a popularity-weighted slot in the first slate** while user-signal is thin — typically 1–3 items out of 10 — and decay the popularity weight as the user accumulates explicit signal. The 2025 RecSys paper "On Inherited Popularity Bias in Cold-Start Item Recommendation" warns that popularity injection during cold-start tends to *persist* as bias even after the user warms up; the mitigation is to actively decay rather than passively letting user signal overwrite. The Wikipedia "cold start (recommender systems)" entry is a clean popular overview of the same trade-off.

**Citations:**
- [Carbonell, Goldstein, "The Use of MMR, Diversity-Based Reranking for Reordering Documents and Producing Summaries", SIGIR 1998](https://www.cs.cmu.edu/~jgc/publication/The_Use_MMR_Diversity_Based_LTMIR_1998.pdf)
- [Vargas, Castells, Vallet, "Intent-Oriented Diversity in Recommender Systems", SIGIR 2011](https://dl.acm.org/doi/abs/10.1145/2009916.2010124)
- [Klimashevskaia et al., "A Survey on Popularity Bias in Recommender Systems", UMUAI 2024 (arxiv 2308.01118)](https://arxiv.org/html/2308.01118v3)
- [Meehan et al., "On Inherited Popularity Bias in Cold-Start Item Recommendation", RecSys 2025](https://arxiv.org/pdf/2510.11402)
- [Wikipedia, "Cold start (recommender systems)"](https://en.wikipedia.org/wiki/Cold_start_(recommender_systems))

**Deployable at HelpME2C scale?** YES — MMR is ~30 lines over the tag-cosine similarity that already exists, and gives a real UX improvement (slates feel less monotone). Adopt with λ around 0.5–0.7 for cold-start slates; tighten λ towards 1.0 as the user accumulates signal. Add an explicit popularity slot for the first 1–2 sessions, then phase out.

---

## 6. What does NOT transfer from Netflix-scale work

**Two-tower neural retrieval** (Yang et al. for YouTube, RecSys 2019; Covington et al. "Deep Neural Networks for YouTube Recommendations", RecSys 2016) and its descendants (NVIDIA Merlin, Bloomreach, Joyn, etc.) solve **item cold-start at billion-item scale** by computing item embeddings from item features through a dedicated tower. Effective when you have (a) item features available at inference, (b) the training data and infra to learn the embedding space, and (c) a retrieval problem at a scale where dot-product over millions of vectors is the bottleneck. None of these apply to HelpME2C in Phase 1A.

**Transformer-based sequence models** (SASRec, BERT4Rec) likewise need long interaction histories; they explicitly do not help in true cold-start. **Meta-learning approaches** (MeLU, MetaCF) assume a population of warm users to meta-learn over, which HelpME2C does not yet have. **GNN-based cold-start** (e.g. CIKM 2023 "Boosting Meta-Learning Cold-Start Recommendation with GNN") requires either a user-user graph or item-item graph dense enough to propagate signal across — not viable at <1000 users.

**LLM-as-recommender** (the 2024–2025 wave: Wang et al. arxiv 2505.20773, Liu et al. WIREs 2026) is the one that's tempting because there's no training. But the August-2025 Wang et al. paper specifically warns that in cold-start regimes with only demographic context, LLMs default to stereotypes. The deployable subset is using an LLM for **theme/tag enrichment of the catalogue** (offline, not in the recommendation loop) — which HelpME2C is already doing per the `extract-themes` Inngest function (commit a72ef7a).

The transferable heuristics from this body of work, validated at scale:
1. **Item features matter more than user features in cold-start** — every two-tower deployment confirms this. Tag-based scoring is the rule-based version of this finding.
2. **Diversity injection in the candidate slate consistently lifts engagement** — confirmed across YouTube, Spotify, Netflix even though the diversification method differs.
3. **Onboarding policies should be tested in offline simulation before live A/B** — the YouTube Music SIGIR-2024 result. For HelpME2C: keep a small simulator over the existing tag catalogue to evaluate Pop×Ent vs decision-tree-style elicitation without a live experiment.
4. **Explicit signal beats implicit early; the inverse is true late** — Netflix's thumbs-up move and Spotify's BaRT findings both confirm that early users give better feedback when prompted; once warm, behavioural signal dominates.

**Citations (for the "not deployable" set, to know what we're explicitly ruling out):**
- [Covington, Adams, Sargin, "Deep Neural Networks for YouTube Recommendations", RecSys 2016](https://research.google/pubs/deep-neural-networks-for-youtube-recommendations/)
- [Yi et al., "Sampling-Bias-Corrected Neural Modeling for Large Corpus Item Recommendations", RecSys 2019 (the YouTube two-tower paper)](https://dl.acm.org/doi/10.1145/3298689.3346996)
- [McInerney et al. (Spotify), "Explore, Exploit, and Explain: Personalizing Explainable Recommendations with Bandits", RecSys 2018](https://dl.acm.org/doi/10.1145/3240323.3240354)
- [Schifferer (NVIDIA Merlin), "Solving the Cold-Start Problem using Two-Tower Neural Networks", 2022](https://medium.com/nvidia-merlin/solving-the-cold-start-problem-using-two-tower-neural-networks-for-nvidias-e-mail-recommender-2d5b30a071a4)
- [Liu et al., "A Review of Deep Learning and Large Language Models for Cold Start Problem in Recommender Systems", WIREs DMKD 2026](https://wires.onlinelibrary.wiley.com/doi/10.1002/widm.70068)
- [Awesome-Cold-Start-Recommendation curated list (GitHub)](https://github.com/YuanchenBei/Awesome-Cold-Start-Recommendation)

**Deployable at HelpME2C scale?** NO for the model architectures themselves. YES for the underlying heuristics they validate (item-feature primacy, diversity injection, offline-simulation-before-live, explicit-signal-early).

---

## Summary

**File written:** `/Users/wouterschreuders/Code/HelpME2C/research/competitive-benchmark/raw/sota-cold-start.md`

**TL;DR — what HelpME2C should consider adopting in Phase 1A/1B:**

- **Pop×Ent for the onboarding picker** (Rashid 2002): pick the 5–10 elicitation items by `popularity × rating-variance`, using TMDB/AniList popularity + rating-spread as a free entropy proxy. Use thumbs up / down / "haven't seen it" (Netflix-style), not a 5-point scale. Defer Golbandi-style adaptive decision-tree to Phase 1B.
- **Tag-vector taste profile + MMR re-rank** (Sen 2009 + Carbonell 1998) is the architecture: user profile = weighted sum of tag-vectors of thumbed-up items; slates re-ranked with `λ ≈ 0.5–0.7` for early sessions, λ tightens towards 1.0 as user signal accumulates. Reserve 1–2 slate slots for popularity backoff in the first 1–2 sessions, then phase out (per the 2025 inherited-popularity-bias warning).
- **Do not collect age/gender as recommendation signals** in Phase 1A. The empirical lift is small, the GDPR/fairness cost is real (Ekstrand 2022, Wang 2025), and our existing tag-based architecture does not need them. Region stays — but as an availability filter (JustWatch-style), not a taste prior.

# State of the Art: Cross-Domain / Cross-Medium Taste Transfer for Recommender Systems

**Scope:** This document benchmarks HelpME2C's current cross-medium recommendation mechanism (41 hand-curated theme bridges between TMDB keywords and AniList tags, implemented in `packages/ml/src/scoring.ts` and `packages/ml/src/cross-medium.ts`) against the academic and industrial literature on cross-domain recommendation. The filter throughout: *what is deployable at Phase 1A scale (<1000 users, no training infrastructure, rule-based scoring only)?*

**Methodology:** Literature search via Google Scholar, arXiv, ACM DL, Springer; targeted queries on cross-domain CF, tag-induced bridges, editorial taxonomies, and cold-start transfer. Where 2022+ industry/academic sources exist they are preferred for the "current state" framing; for foundations the canonical 2006–2017 work is cited.

**Author note:** Where a finding from a paper is paraphrased rather than quoted verbatim, that is because the source PDFs (Springer chapters, arXiv preprints) could not be parsed verbatim through WebFetch — claims here are reconstructed from authoritative secondary sources (Semantic Scholar abstracts, ResearchGate summaries, Wikipedia, the Atlantic, NPR). Direct quotation should be re-verified before being cited in a published artefact.

---

## 1. What "cross-domain recommendation" means in the literature

The foundational survey is **Cantador, Fernández-Tobías, Berkovsky, Cremonesi, "Cross-Domain Recommender Systems"**, Chapter 27 of the *Recommender Systems Handbook* (2nd ed., Springer, 2015), pp. 919–959. It formalises cross-domain recommendation (CDR) as the problem of generating recommendations in a **target domain** by exploiting knowledge from one or more **source domains**, where "domain" itself is an ambiguous term spanning at least three axes: (a) *attribute level* (movies vs. anime — different items but same medium-type), (b) *type level* (movies vs. books vs. music — different media), and (c) *system level* (Amazon Books vs. Amazon Movies — same medium, different catalogue/system). HelpME2C's TV ↔ anime case is at the **type-level boundary**: both are screen narrative, but production conventions, audience expectations, and tag vocabularies differ enough that they behave as distinct domains for recommendation purposes.

The earlier formalisation by **Cremonesi, Tripathi, Turrin (ICDM Workshops, 2011)**, "Cross-Domain Recommender Systems", introduced the now-canonical four-way overlap classification: **no-overlap, user-overlap, item-overlap, full-overlap**. HelpME2C is in the *no-overlap* regime: an anime title is not a TV title, and our user base does not span a separate rating system in each medium. This is the hardest cell in the matrix — it forces transfer via shared metadata rather than collaborative signal.

- [Cantador, Fernández-Tobías, Berkovsky, Cremonesi "Cross-Domain Recommender Systems" (Recommender Systems Handbook 2nd ed., 2015)](https://link.springer.com/chapter/10.1007/978-1-4899-7637-6_27) — PDF mirror at [Berkovsky's site](https://shlomo-berkovsky.github.io/files/pdf/Springer15a.pdf)
- [Fernández-Tobías, Cantador, Kaminskas, Ricci "Cross-domain recommender systems: A survey of the State of the Art" (CERI 2012)](http://arantxa.ii.uam.es/~cantador/doc/2012/ceri12a.pdf)
- [Cremonesi, Tripathi, Turrin "Cross-Domain Recommender Systems" (IEEE ICDMW 2011)](https://ieeexplore.ieee.org/document/6137420/)
- [Khan, Ibrahim, Ghani "Cross Domain Recommender Systems: A Systematic Literature Review" (ACM Computing Surveys 50(3), 2017)](https://dl.acm.org/doi/10.1145/3073565)
- [Zang et al. "A Survey on Cross-domain Recommendation: Taxonomies, Methods, and Future Directions" (ACM TOIS, 2022 / arXiv:2108.03357)](https://arxiv.org/abs/2108.03357)
- [Zhang, Cheng, Liu et al. "A Comprehensive Survey on Cross-Domain Recommendation: Taxonomy, Progress, and Prospects" (arXiv:2503.14110, 2025)](https://arxiv.org/html/2503.14110v1)

**Deployable at Phase 1A?** N/A — this is framing, not technique. But the framing matters: HelpME2C operates in the *type-level, no-overlap* cell, which is the cell where content-mediated bridges are essentially the only option without training data.

---

## 2. Aggregation-based / linkage-based cross-domain CF

Within the survey taxonomy, transfer mechanisms split into (i) **aggregating user preferences** (combine source-domain and target-domain models for a known user), (ii) **mediating user-modelling data** (translate between user-model representations), (iii) **sharing latent features** (joint factorisation across both domains), and (iv) **transferring rating patterns** (codebook-style cluster-level knowledge transfer, e.g. Li, Yang, Xue "Can Movies and Books Collaborate?" IJCAI 2009). Each of these *requires user-overlap or item-overlap*: at least one axis of the rating matrix must be shared across domains for the transfer to have anywhere to land.

The literature explicitly recognises a separate path for the **no-overlap** case: **shared semantic features** (categories, tags, ontologies) that bridge items across domains even when no user or item is in common. This is the cell HelpME2C lives in. The earliest articulation of cross-system user-model mediation through a shared representation is **Berkovsky, Kuflik, Ricci "Cross-Technique Mediation of User Models" (AH 2006, LNCS 4018)** — note: published 2006 not 2007 — and the extended journal version, **Berkovsky, Kuflik, Ricci "Mediation of user models for enhanced personalization in recommender systems" (UMUAI, 2008)**. The mediation framing is the conceptual ancestor of the modern "shared taxonomy as bridge" line.

- [Berkovsky, Kuflik, Ricci "Cross-Technique Mediation of User Models" (AH 2006)](https://link.springer.com/chapter/10.1007/11768012_4)
- [Berkovsky, Kuflik, Ricci "Mediation of user models for enhanced personalization in recommender systems" (UMUAI 18, 2008)](https://link.springer.com/article/10.1007/s11257-007-9042-9)
- [Li, Yang, Xue "Can Movies and Books Collaborate? Cross-Domain Collaborative Filtering for Sparsity Reduction" (IJCAI 2009)](https://www.ijcai.org/Proceedings/09/Papers/338.pdf)

**Deployable at Phase 1A?** *Aggregation / latent-feature sharing / codebook transfer:* **No** — all require either user-overlap or matrix factorisation infrastructure HelpME2C does not have. *Mediation framing (user model translated via a shared representation):* **Yes** — this is conceptually what the 41 theme bridges are doing.

---

## 3. Content-mediated cross-domain transfer

The closest literature analogue to HelpME2C's mechanism is the line of work using **shared tags** as bridges between domains. The seminal paper is **Shi, Larson, Hanjalic "Tags as Bridges between Domains: Improving Recommendation with Tag-Induced Cross-Domain Collaborative Filtering" (UMAP 2011)**. TagCDCF exploits user-contributed tags common to multiple domains to establish cross-domain links when the rating matrix alone provides too little overlap. The same group extended this in **Shi, Larson, Hanjalic "Exploiting Social Tags for Cross-Domain Collaborative Filtering" (arXiv:1302.4888, 2013)**.

Fernández-Tobías and Cantador have a multi-year programme on tag-mediated cross-domain CF. **Fernández-Tobías, Cantador "Exploiting Social Tags in Matrix Factorization Models for Cross-domain Collaborative Filtering" (CBRecSys at RecSys 2014)** added tag-factor latent variables to SVD++ to let tags shared across domains carry knowledge between music and movies. **Fernández-Tobías, Cantador, Tomeo, Anelli, Di Noia "Addressing the user cold start with cross-domain collaborative filtering: exploiting item metadata in matrix factorization" (UMUAI 29, 2019)** is the most directly relevant: it uses *item metadata* (genres, directors, actors, themes) as a bridge for cold-start users and benchmarks accuracy/diversity trade-offs.

**Kaminskas, Ricci** "Location-Adapted Music Recommendation Using Tags" (UMAP 2011) and the follow-on **"Emotion-Based Matching of Music to Places"** (2016) match music tracks to places-of-interest via *common emotional tags assigned to both items* — a cross-domain bridge with no user-overlap at all, mediated entirely through a shared affective vocabulary. This is structurally identical to what HelpME2C does with themes: a small curated vocabulary that lives on both sides of the medium boundary and lets similarity be computed across it.

A more recent variant, **TagCDCTR (Tag-informed Collaborative Topic Regression for cross-domain recommendation)**, extends the same family of techniques into a topic-model setting (*Knowledge-Based Systems*, 2020).

- [Shi, Larson, Hanjalic "Tags as Bridges between Domains" (UMAP 2011)](https://link.springer.com/chapter/10.1007/978-3-642-22362-4_26)
- [Shi, Larson, Hanjalic "Exploiting Social Tags for Cross-Domain Collaborative Filtering" (arXiv:1302.4888, 2013)](https://arxiv.org/pdf/1302.4888)
- [Fernández-Tobías, Cantador "Exploiting Social Tags in Matrix Factorization Models for Cross-domain Collaborative Filtering" (CBRecSys at RecSys 2014)](https://ceur-ws.org/Vol-1245/cbrecsys2014-paper06.pdf)
- [Fernández-Tobías et al. "Addressing the user cold start with cross-domain collaborative filtering: exploiting item metadata in matrix factorization" (UMUAI 2019)](https://link.springer.com/article/10.1007/s11257-018-9217-6)
- [Kaminskas, Ricci "Location-Adapted Music Recommendation Using Tags" (UMAP 2011)](https://link.springer.com/chapter/10.1007/978-3-642-22362-4_16)
- [Kaminskas, Ricci "Emotion-Based Matching of Music to Places" (2016)](https://link.springer.com/chapter/10.1007/978-3-319-31413-6_14)
- [Wang et al. "Tag-informed collaborative topic modeling for cross domain recommendations" (Knowledge-Based Systems, 2020)](https://www.sciencedirect.com/science/article/abs/pii/S0950705120303816)

**Deployable at Phase 1A?** **Yes — this is the cell HelpME2C is in.** The matrix-factorisation variants (SVD++ with tag factors, CTR) need training pipelines we don't have, but the *underlying mechanism* — a shared vocabulary that connects items across domain boundaries — is exactly the deployable Phase 1A pattern. HelpME2C's 41 theme bridges are a hand-curated instantiation of the same class of technique Kaminskas & Ricci (2011, 2016) and Shi et al. (2011) describe.

---

## 4. Neural / embedding cross-domain transfer (out of scope for Phase 1A, cited for context)

The dominant industry/academic line since ~2017 is **EMCDR (Embedding and Mapping for Cross-Domain Recommendation)**, **Man, Shen, Jin, Cheng "Cross-Domain Recommendation: An Embedding and Mapping Approach" (IJCAI 2017)**: learn embeddings in each domain separately, then train a mapping function (often an MLP) over the overlapping users to translate target-domain embeddings into source-domain embedding space (or vice versa). All downstream cold-start cross-domain neural methods — SSCDR, TMCDR, CDRNP, PTUPCDR — are descendants of this paradigm. They require **user-overlap** to train the mapping function, plus a model-training pipeline (GPU access, training data, evaluation loop), neither of which exists at HelpME2C Phase 1A.

A 2024 line **"Cross-Domain Recommendation Meets Large Language Models"** (Tang et al., arXiv:2411.19862) uses LLMs in a zero-shot CDR setting, and **TaxRec (Liang et al., COLING 2025)** "Taxonomy-Guided Zero-Shot Recommendations with LLMs" injects a curated taxonomy into the LLM prompt to constrain generation. TaxRec is the closest LLM-era cousin of HelpME2C's approach — it shares the *editorial-taxonomy-as-prior* posture, but at inference time uses an LLM rather than a deterministic scoring function.

Pretrained text encoders (BERT, sentence-transformers) for *tag-name semantic similarity* are a low-risk Phase 2 escape valve: with `sentence-transformers` you can compute cosine similarity between e.g. TMDB keyword "tragic hero" and AniList tag "Tragedy" without a training step. This bypasses curation but loses the precision of editorial bridges. **Worth flagging for Phase 2 as a way to discover *candidate* bridges that a human then approves.**

- [Man, Shen, Jin, Cheng "Cross-Domain Recommendation: An Embedding and Mapping Approach" (IJCAI 2017)](https://www.ijcai.org/proceedings/2017/0343.pdf)
- [Zhu et al. "Transfer-Meta Framework for Cross-domain Recommendation to Cold-Start Users" (TMCDR, SIGIR 2021)](https://nlp.csai.tsinghua.edu.cn/~xrb/publications/SIGIR-21_TMCDR.pdf)
- [Liu et al. "CDRNP: Cross-Domain Recommendation to Cold-Start Users via Neural Process" (WSDM 2024 / arXiv:2401.12732)](https://arxiv.org/abs/2401.12732)
- [Liang et al. "Taxonomy-Guided Zero-Shot Recommendations with LLMs" (COLING 2025)](https://aclanthology.org/2025.coling-main.102.pdf) — code at [github.com/yueqingliang1/TaxRec](https://github.com/yueqingliang1/TaxRec)
- [Reimers & Gurevych "Sentence-BERT" / sentence-transformers](https://sbert.net/) — production-ready library for semantic-similarity scoring of tag names

**Deployable at Phase 1A?** **No** for EMCDR/TMCDR/CDRNP family (need user-overlap + training pipeline). **Partially** for sentence-transformers (can run as a one-shot offline computation to *suggest* candidate theme bridges that a human curator then accepts/rejects — a Phase 2 acceleration of the curation process, not a replacement for it). **No** for LLM-at-inference (latency, cost, determinism issues for a sub-1000-user product where the moat is the taxonomy itself).

---

## 5. Cold-start via cross-domain transfer

HelpME2C's cold-start case is the canonical one in the literature: *a user has rich signal in the source domain (anime) and zero signal in the target domain (TV), or vice versa.* This is exactly the problem **Fernández-Tobías et al. (UMUAI 2019)** address with item-metadata-bridged matrix factorisation, and the problem the TMCDR/CDRNP/PTUPCDR line attacks with learned mapping functions. The current 2025 survey (Zhang et al., arXiv:2503.14110) explicitly motivates cross-domain recommendation as a cold-start technique: "a new user on a music platform may lack sufficient behavioral data; however, if active data from a video platform are considered, the system can infer the user's musical preferences."

What works at Phase 1A scale:
1. **Source-domain signal + shared-taxonomy projection.** The user's taste vector in the source domain is projected onto the shared theme axis; that projected vector then scores candidate items in the target domain. This is what HelpME2C does today.
2. **Item-metadata-bridge cold start (Fernández-Tobías 2019 framing)** as a reference point: matrix-factorisation-flavoured, but the *intuition* — use metadata to carry users across the domain gap — is the same intuition that motivates HelpME2C.

What does *not* work without infrastructure:
- Embedding-mapping cold-start methods (need users in both domains).
- Joint matrix factorisation (needs training).
- Meta-learning (TMCDR) cold-start (needs training and overlapping users).

The dangerous failure mode in this cell, flagged across the literature: **the user with cold-start in BOTH domains** — the genuinely new user. The cross-domain literature implicitly assumes signal exists *somewhere*; if it doesn't, cross-domain transfer offers nothing and falls back to either popularity, content-only, or conversational onboarding.

- [Fernández-Tobías et al. "Addressing the user cold start with cross-domain collaborative filtering" (UMUAI 2019)](https://link.springer.com/article/10.1007/s11257-018-9217-6)
- [Fernández-Tobías et al. "Cold-Start Management with Cross-Domain Collaborative Filtering and Tags" (EC-Web 2013)](https://link.springer.com/chapter/10.1007/978-3-642-39878-0_10)
- [Bei et al. "Awesome-Cold-Start-Recommendation" curated list (2024)](https://github.com/YuanchenBei/Awesome-Cold-Start-Recommendation)
- [Sahu, Dwivedi "Cross-Domain Recommendation for Cold-Start Users via Neighborhood Based Feature Mapping" (arXiv:1803.01617, 2018)](https://arxiv.org/abs/1803.01617)

**Deployable at Phase 1A?** **Yes** for shared-taxonomy projection (HelpME2C's current approach). **No** for learned cold-start cross-domain methods. **Open problem** for the "cold in both domains" cell — needs onboarding-flow design rather than a recommender-system technique.

---

## 6. Editorial taxonomy bridging — the human-curated approach

The canonical industrial precedent for an editorially-curated attribute taxonomy is **Pandora's Music Genome Project (Westergren, 2000–)**. Every song is hand-tagged by trained musicians against up to ~450 musical attributes (instrumentation, vocals, melody, harmony, rhythm, form) plus ~1,300 sub-genres; 20–30 minutes of human analyst time per 4-minute song. Pandora explicitly does not use machine-listening — the editorial taxonomy *is* the product. The cost is enormous (the original Genome took five years and 30 musicologists to build to usefulness) but the resulting attribute space supports recommendation behaviour (transparent, controllable, novelty-rich) that pure-collaborative-filtering systems struggle to match. **Alexis Madrigal's Atlantic investigation of Netflix's "altgenres" (2014)** revealed an analogous editorial layer: ~77,000 micro-genres ("Visually-striking Critically-acclaimed Father-Son Movies") built atop ~200 hand-tagged story attributes per title, with a 36-page taggers' training manual.

The academic precedent is the **Linked Open Data (LOD)** movement, formalised in **Heath & Bizer "Linked Data: Evolving the Web into a Global Data Space" (Morgan & Claypool, 2011)**, applied to recommendation through **Di Noia, Mirizzi, Ostuni, Romito, Zanker** ("Linked Open Data to support Content-based Recommender Systems" / "SPrank", ACM TIST 8(1), 2016) and the **ESWC 2014 Linked Open Data-enabled Recommender Systems Challenge** (Di Noia, Cantador, Ostuni, eds.). DBpedia / Wikidata / YAGO provide a cross-domain taxonomy substrate that has been used as a bridge in recommender systems for books, movies, and music. The trade-off is well documented: editorial / LOD taxonomies give *higher precision and explainability* but *lower coverage and slower update cadence* than learned embeddings. Hybrid approaches — **"Semantic IDs"** (Singh et al., **"Better Generalization with Semantic IDs"**, arXiv:2306.08121; **"Enhancing Embedding Representation Stability in Recommendation Systems with Semantic ID"**, arXiv:2504.02137) — pair a hand-curated or hierarchically-clustered semantic structure with learned embeddings on top, and are an active research direction in 2024–2025.

- [Pandora "Music Genome Project"](https://www.pandora.com/about/mgp) — context in [Music Genome Project Wikipedia](https://en.wikipedia.org/wiki/Music_Genome_Project)
- [Madrigal "How Netflix Reverse-Engineered Hollywood" (The Atlantic, 2014)](https://www.npr.org/sections/alltechconsidered/2014/01/02/259128268/netflix-built-its-microgenres-by-staring-into-the-american-soul) (NPR coverage of Madrigal's investigation)
- [Pajkovic "Algorithms and taste-making: Exposing the Netflix Recommender System's operational logics" (Convergence 28(1), 2022)](https://journals.sagepub.com/doi/10.1177/13548565211014464)
- [Heath, Bizer "Linked Data: Evolving the Web into a Global Data Space" (Morgan & Claypool, 2011)](http://linkeddatabook.com/)
- [Di Noia, Ostuni, Tomeo, Di Sciascio "SPrank: Semantic Path-Based Ranking for Top-N Recommendations Using Linked Open Data" (ACM TIST 8(1), 2016)](https://dl.acm.org/doi/abs/10.1145/2899005)
- [Di Noia, Cantador, Ostuni (eds.) "Linked Open Data-Enabled Recommender Systems: ESWC 2014 Challenge on Book Recommendation"](https://link.springer.com/chapter/10.1007/978-3-319-12024-9_17)
- [Singh et al. "Better Generalization with Semantic IDs: A Case Study in Ranking for Recommendations" (arXiv:2306.08121, 2023)](https://arxiv.org/html/2306.08121v2)

**Deployable at Phase 1A?** **Yes — this is the family HelpME2C belongs to.** The lesson from Pandora and Netflix is that curated taxonomies are extremely expensive but produce a defensible, explainable, novelty-rich recommendation surface that pure-CF cannot replicate. The lesson from LOD-based recsys is that *open* vocabularies (DBpedia/Wikidata) can substitute for hand-curation in some categories. The 41 theme bridges sit closer to the Pandora end (small, hand-curated, high-precision) than the DBpedia end (large, machine-extracted, lower-precision).

---

## 7. Cross-medium failure modes and limits

**The Spotify music-to-podcast paper — Nazari, Oguz, Lugosch, Sridhar, Kim, Coen, Sridhar, Liang, Lalmas "Recommending Podcasts for Cold-Start Users Based on Music Listening and Taste" (SIGIR 2020 / arXiv:2007.13287)** — is the most-cited industrial cross-medium cold-start study. They report up to 50% consumption lift for cold-start podcast users by leveraging music listening behaviour at Spotify scale. Crucially, they flag *bias* as a first-order concern: using music data as a proxy for podcast taste introduces systematic skew (some user segments are well-served by the proxy, others badly served). The paper's quiet lesson for HelpME2C: **a cross-medium bridge that "works on average" can still seriously misserve specific cohorts** — fans of medium A whose target-medium taste does not actually correlate with their source-medium taste in the way the bridge assumes. Worth designing for: track per-user bridge-confidence, and demote cross-medium recommendations when the user's source-medium taste vector is sparse or thematically narrow.

The 2025 survey (Zhang et al.) names **negative transfer** as the dominant failure mode of cross-domain methods: "directly aggregating representations independently derived from each domain may lead to negative transfer." When the source and target domains don't actually share the latent factors the bridge assumes, transfer makes recommendations *worse* than no transfer at all. The deep-CDR community has spent ~5 years building feature-level transferability scoring (Mitigating Negative Transfer, KDD 2024) and selective-attention mechanisms to detect and suppress non-transferable signal. **HelpME2C's editorial-curation approach is one of the few ways to sidestep this entirely**: a human deciding "Tragedy in TV does correspond to Tragedy in anime" is doing the negative-transfer triage at curation time, not at runtime.

The "themes don't map" cell is genuine. Some TMDB keywords (e.g. real-world political subgenres) have no AniList counterpart; some AniList tags (e.g. Slice of Life, Iyashikei, certain animation-production-specific tags) have no TMDB analogue. The right response is to *not* generate a bridge for those tags rather than to force one. HelpME2C's design implicitly assumes the curator does this — but the gap between "tags with a real bridge" and "tags without one" is a coverage hole that needs explicit tracking.

The "cold in both domains" cell (user has zero signal anywhere) remains a hard problem. Conversational onboarding, popularity priors, or demographic-conditioned defaults are the standard escape hatches.

- [Nazari et al. "Recommending Podcasts for Cold-Start Users Based on Music Listening and Taste" (SIGIR 2020 / arXiv:2007.13287)](https://arxiv.org/abs/2007.13287)
- [Liu et al. "Mitigating Negative Transfer in Cross-Domain Recommendation via Knowledge Transferability Enhancement" (KDD 2024)](https://dl.acm.org/doi/10.1145/3637528.3671799)
- [Park, Kim et al. "Cracking the Code of Negative Transfer: A Cooperative Game Theoretic Approach for Cross-Domain Sequential Recommendation" (arXiv:2311.13188, 2023)](https://arxiv.org/abs/2311.13188)
- [Hofmaier "Exploration of Content-Based Cross-Domain Podcast Recommender Systems" (TU Wien, 2024)](https://repositum.tuwien.at/bitstream/20.500.12708/205267/1/Hofmaier%20Matthias%20-%202024%20-%20Exploration%20of%20content-based%20cross-domain%20podcast...pdf)
- [Cremonesi, Quadrana "Cross-domain Recommendations without Overlapping Data: Myth or Reality?" (RecSys 2014)](https://www.researchgate.net/publication/286862297_Cross-domain_Recommendations_without_Overlapping_Data_Myth_or_Reality)

**Deployable at Phase 1A?** N/A — these are failure modes to design *around*. Concrete Phase 1A implications:
- Track per-bridge utilisation: are we firing the "Tragedy" bridge often? Are users with Tragedy in their taste vector actually rating its TV→anime suggestions well?
- Track per-tag coverage: what fraction of AniList tags / TMDB keywords have *any* theme bridge? (Today: low, because we only have 41.)
- Cap cross-medium contribution when the user's source-domain taste vector is too sparse to extrapolate from.

---

## 8. Honest assessment: HelpME2C's hand-curated 41-theme bridge approach

**Where it sits in the literature.** HelpME2C is a *content-mediated, shared-taxonomy, no-overlap, cold-start-friendly* cross-domain recommender. Mechanistically it sits in the same family as Kaminskas & Ricci (emotion-tag bridges between music and POIs), Shi et al. (TagCDCF), and the editorial-attribute branch represented by Pandora's Music Genome Project. **It is *not* "naïve"** — naïve would be matching on raw genre strings ("drama" → "Drama") and stopping there. The taste-vector-projected-onto-themes design, with the cross-medium-only rule (theme bridges fire *only* when the candidate tag is absent from the user's taste vector), is a deliberate way to make themes a true *bridge* rather than a double-counting multiplier, and is a more sophisticated design than most rule-based content-bridging systems in the academic literature.

**It is also *not* state-of-the-art** in the academic sense — SOTA today is neural EMCDR-family or LLM-based zero-shot CDR. But those approaches are not deployable at Phase 1A scale (no user-overlap, no training infrastructure, no need for the cost/latency/opacity tradeoff). For HelpME2C's constraints (<1000 users, no training, rule-based scoring), **the editorial-bridge approach is the right point in the design space.** It is, however, very small.

**The coverage gap is the key weakness.** AniList exposes ~1,000+ tags; TMDB exposes thousands of keywords. Bridging 41 themes covers a small fraction of the joint vocabulary. The Pandora reference point is humbling: ~450 attributes plus ~1,300 sub-genres took five years and 30 musicologists. A solo-curator HelpME2C reaching 200+ themes is a quarters-of-effort proposition, not weeks.

**Cheapest credible extensions** (in increasing cost / risk order):

1. **Coverage tracking + curation prioritisation.** Instrument bridge firing rate, AniList-tag-uncovered rate, TMDB-keyword-uncovered rate. Curate the next 40 themes against measured demand rather than intuition. This is a Phase 1A engineering task, not an ML task. **Highest ROI.**
2. **Candidate-bridge generation via `sentence-transformers`.** Offline: encode every TMDB keyword name and every AniList tag name with `all-MiniLM-L6-v2`, cosine-similarity, flag top-K cross-vocabulary pairs above a threshold. Output a CSV for the human curator to accept/reject. *Bridges are still curated by a human*; the LLM/embedding work is just to surface candidates. This skips the cold-start of "which themes should we curate next?" without compromising precision.
3. **LOD enrichment.** Map TMDB keywords and AniList tags to Wikidata QIDs; use the Wikidata category graph to propose theme bridges (e.g., both tags subclass-of "tragedy in fiction"). Higher engineering cost, also still requires human-in-the-loop approval, but yields a *principled* growth path to several hundred themes that aren't anyone's personal taste.
4. **LLM-assisted theme synthesis (à la TaxRec).** Give an LLM the full AniList tag list + full TMDB keyword list and ask it to propose candidate cross-medium themes with justifications. The output is a list of candidate themes the human curator then triages. Useful, but the moat-defending move is keeping the *acceptance* step human.
5. **Neural cross-domain methods (EMCDR family).** Genuinely Phase 2+; requires user-overlap data we won't have at <1000 users.

**Is this approach genuinely novel, or has it been done before?**

It has been done in pieces, but the *specific combination* — (a) editorial cross-medium theme taxonomy for TV ↔ anime, (b) deterministic rule-based scoring kernel rather than learned embeddings, (c) cross-medium-only rule preventing the theme dimension from double-counting tags with direct signal, (d) shipping it as both a per-user-taste personalised recommendation surface *and* a per-title, taste-agnostic "bridge from this title" query — is, as far as the literature surveyed here shows, **not** explicitly published as an end-to-end system. The component techniques are not novel; the *integration and the medium pair (TV ↔ anime via theme bridges)* is. That is consistent with the PROJECT.md positioning that the taxonomy is the moat: the published literature mostly treats cross-medium bridges as either a research stepping-stone toward learned methods or an editorial curiosity (Pandora). HelpME2C is shipping the editorial approach as a primary product mechanism, which is rare in the published literature even though it is what some industry products (Pandora, the curated-attribute layer of Netflix) actually do in production.

The defensibility is real but conditional: it depends on *getting the next 150 themes right*. At 41 themes, this is a promising prototype. At 200+ themes with measured per-bridge performance, it is a genuine differentiator that neural CDR methods cannot replicate without first acquiring the same kind of curatorial labour HelpME2C is investing in.

---

## Summary

**Path written:** `/Users/wouterschreuders/Code/HelpME2C/research/competitive-benchmark/raw/sota-cross-domain.md`

**(a) Is hand-curated theme bridging defensible?** Yes — at HelpME2C's scale (no user-overlap, no training infrastructure, <1000 users) it is the *correct* design point. Editorial taxonomies are the documented escape hatch from the negative-transfer failure mode that plagues every learned cross-domain method. Pandora and Netflix have validated the same posture in adjacent markets.

**(b) Cheapest credible extension path?** Two-step: first instrument bridge utilisation and tag-coverage at runtime to drive prioritisation of which next 40 themes to curate; second, use `sentence-transformers` offline to *surface candidate* cross-vocabulary theme matches that a human curator then accepts or rejects. Both are Phase 1A-feasible, both preserve curation quality, and together they can credibly carry coverage from 41 to 200+ themes within achievable solo-curator effort. Neither requires training infrastructure.

**(c) Is the approach genuinely novel?** The *components* (shared-tag bridges, editorial taxonomies, cross-domain content mediation) have been in the literature since 2006–2011. The *specific integration* — TV ↔ anime via a curated cross-medium theme taxonomy, with a deterministic cross-medium-only scoring rule, shipped as both a personalised and a taste-agnostic surface — is not visible in the surveyed literature as an end-to-end published system. It is a rare-in-publication, plausibly-defensible execution of well-understood mechanisms applied to a medium pair that the academic CDR community has not focused on.

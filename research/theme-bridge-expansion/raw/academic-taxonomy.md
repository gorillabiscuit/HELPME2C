# Academic literature on taxonomy design for recommendation

**Research date:** 2026-05-17
**Question being answered:** What does the foundational academic scholarship on taxonomy design tell HelpME2C about scaling from a 41-theme cross-medium bridge set to 200+, without poisoning the recommendation engine?

**Companion file:** `mood-taxonomies.md` (practitioner survey). This file extends the prior `research/competitive-benchmark/raw/sota-cross-domain.md` work by going deeper on **taxonomic substrate** — what makes a tag/theme vocabulary good *as a vocabulary* — rather than on cross-domain transfer mechanisms (already covered).

The literature surveyed below clusters around three poles:
- **Folksonomy critiques** (Mathes 2004; Sinclair-Cardew-Hall 2008) — what fails when tags are unconstrained.
- **Tag-quality engineering** (Sen-Vig-Riedl 2009, 2012; Heymann-Garcia-Molina 2006; Hotho et al. 2006) — how to extract signal from messy tag clouds.
- **Faceted / hierarchical / semantic structuring** (Marchionini 2006; Specia-Motta 2007; Cantador et al. 2015; De Gemmis 2009) — what scaffolding to impose on flat vocabularies.

Each entry includes (1) the taxonomic-design lesson, (2) the empirical methodology where applicable, (3) the HelpME2C-relevant implication.

---

## 1. Mathes — *Folksonomies: Cooperative Classification and Communication Through Shared Metadata* (2004)

**The originating folksonomy paper.** Adam Mathes, UIUC LIS doctoral seminar paper, December 2004. [adammathes.com/academic/computer-mediated-communication/folksonomies.html](https://adammathes.com/academic/computer-mediated-communication/folksonomies.html)

### Taxonomic-design lesson

Folksonomies trade *classification rigour* for *participation scale*. Mathes inherits Thomas Vander Wal's coinage and frames it as the "desire-line" model of classification: rather than designing the taxonomy a priori, you let user vocabulary surface organically, then live with the noise. The bargain is explicit — Stewart Butterfield: *"Free typing loose associations is just a lot easier than making a decision about the degree of match to a pre-defined category."*

Mathes itemises the three **systemic failure modes** of free-form tags:

1. **Polysemy** — a single tag (`filtering`) referring to incompatible concepts (water purification; Bayesian inference) with no disambiguation mechanism. Catastrophic when the corpus is heterogeneous.
2. **Synonymy collapse / proliferation** — `mac`, `macintosh`, `apple` all mean the same; `flower` and `flowers` fragment the corpus through trivial morphology.
3. **Technical and granularity artifacts** — case-sensitivity, no-space concatenation (`vertigovideostillsbbc`), acronym overloading (`ANT` = Actor-Network Theory or Apache Ant), and the deeper "level-of-specificity" problem: one user tags `dogs`, another tags `labrador`, a third tags `pets`, and no system relates them.

### Empirical methodology

Discursive, not empirical. Mathes is a position paper based on then-current observation of Flickr and del.icio.us. Its value is taxonomic, not statistical: it names the failure modes before they were measured.

### HelpME2C-relevant implication

HelpME2C is **not building a folksonomy** — it's a *curator-led* (currently solo) controlled vocabulary. That sidesteps polysemy (Wouter writes definitions) and the synonymy proliferation (Wouter picks one canonical term). It does *not* sidestep the level-of-specificity problem. Going from 41 to 200 themes will force ambient decisions about whether `melancholic-coming-of-age` is its own theme or a co-occurrence of `melancholic` + `coming-of-age`. Mathes' warning: **decide your level-of-specificity policy explicitly before you grow the vocabulary**, otherwise it gets decided implicitly per-theme and the taxonomy becomes inconsistent. Write the policy down (an ADR is the right home).

Sources:
- [Folksonomies (Mathes 2004)](https://adammathes.com/academic/computer-mediated-communication/folksonomies.html)

---

## 2. Sinclair & Cardew-Hall — *The folksonomy tag cloud: when is it useful?* (2008)

Journal of Information Science, Vol. 34, No. 1, pp. 15–29. [DOI 10.1177/0165551506078083](https://journals.sagepub.com/doi/10.1177/0165551506078083)

### Taxonomic-design lesson

Tag clouds (flat, unranked, popularity-weighted vocabularies) and traditional search interfaces serve **different information-seeking tasks**. They tested this empirically with users on dual interfaces.

> **Key finding:** "Where the information-seeking task required specific information, participants preferred the search interface, while where the information-seeking task was more general, participants preferred the tag cloud."

Tag clouds are exploratory affordances, not retrieval affordances. The paper's blunt conclusion: *"the tag cloud is not without value, [but] it is not sufficient as the sole means of navigation for a folksonomy-based dataset."*

### Empirical methodology

Controlled user study giving participants both a tag cloud and a search interface for the same dataset and measuring preference and task completion across question types. Sample sizes are modest (typical of mid-2000s IR studies) but the finding has held up across replications.

### HelpME2C-relevant implication

HelpME2C surfaces themes as **discovery primitives** ("films like *Aftersun*'s melancholy?") and as **input to group recommendation** (compose a mood between two users). Both are exploratory. The Sinclair finding endorses themes-as-flat-tags *for that use case*. But the moment Wouter wants users to **search by mood** ("show me cathartic-sad anime"), a flat tag list breaks down — users need ranking, faceting, or a tree. **Design implication:** the 200-theme vocabulary needs two surfaces, not one — a discovery surface (rich, exploratory, possibly cloud-or-grid-shaped) and a retrieval surface (faceted, filterable).

Sources:
- [The folksonomy tag cloud (Sinclair & Cardew-Hall 2008)](https://journals.sagepub.com/doi/10.1177/0165551506078083)

---

## 3. Sen, Vig, Riedl — *Tagommenders: Connecting Users to Items through Tags* (WWW 2009)

[ACM DL: 10.1145/1526709.1526800](https://dl.acm.org/doi/10.1145/1526709.1526800) | [PDF (GroupLens)](https://files.grouplens.org/papers/tagommenders_numbered.pdf)

### Taxonomic-design lesson — the load-bearing empirical findings

This paper is the *single most important reference for HelpME2C's expansion problem.* Three quantitative findings:

1. **Tag quality is appalling without curation.** From a 2007 earlier finding, **only ~21% of raw user-generated MovieLens tags were judged adequate to display to other users.** The other ~79% were too personal, too redundant, too misspelled, too off-topic, or simply incoherent.
2. **Entropy-based cleaning collapses the vocabulary to manageable size.** Sen et al. applied an entropy filter to the raw ~30,000 user-submitted MovieLens tags and **retained 1,128.** That is a **~96% pruning rate** before the vocabulary became useful for recommendation.
3. **Users prefer factual tags over subjective; strongly dislike personal.** From a 995-user MovieLens study: factual tags (e.g. "based on a book") are preferred over subjective tags (e.g. "thought-provoking"); personal tags ("seen with mom") are actively disliked when seen on others' profiles.

The tagommender model itself (predict user ratings from inferred user×tag preferences) beat then-state-of-the-art collaborative filtering on ranking metrics — but the *taxonomic finding* that the model rests on is the entropy-cleaning result.

### Empirical methodology

995 active MovieLens users; tag preference ratings collected explicitly via in-product rating prompts; entropy computed per tag based on distribution of user ratings; cross-validation against held-out rating data.

### HelpME2C-relevant implication

The HelpME2C theme-bridge set is *already curator-cleaned* (Wouter wrote all 41 themes intentionally) — so the 21% base rate doesn't apply directly. But the Sen finding extrapolates: **when the curator extends the vocabulary by LLM-suggested candidates, expect ~70–80% of LLM suggestions to be unusable** by Sen's quality criteria. Plan for that pruning rate in the workflow.

The factual-over-subjective preference is more worrying. Mood-themed cross-medium bridges *are* subjective by construction. Wouter is making the harder bet (subjective tags are user-preferred-against per Sen) on the wager that *for group-recommendation use cases* subjective is what matters more than factual. Document this as an explicit hypothesis in PROJECT.md so it can be falsified.

Sources:
- [Tagommenders (Sen, Vig, Riedl — WWW 2009)](https://dl.acm.org/doi/10.1145/1526709.1526800)

---

## 4. Vig, Sen, Riedl — *The Tag Genome: Encoding Community Knowledge to Support Novel Interaction* (ACM TiiS 2012)

[Vol 2, Issue 3, Sep 2012 — DOI 10.1145/2362394.2362395](https://dl.acm.org/doi/10.1145/2362394.2362395)

### Taxonomic-design lesson

The tag-genome model is the **continuous-relevance reframing** of tag membership. Instead of a binary (movie has tag / doesn't), every (movie, tag) pair gets a relevance score in `[0, 1]`. This handles two structural problems at once:

- **Subjective tags become tractable.** "Atmospheric" is not yes/no; it's a degree.
- **Sparse user input generalises.** A movie with zero user tags can still score on all 1,128 tags via the ML model.

The biological-genome metaphor is exact: every item gets a *vector* of relevance scores against a *common vocabulary*, regardless of whether any user has touched it.

### Methodology — quoted from the paper and follow-up Computing the Tag Genome

- **Ground truth:** users rated (movie, tag) pairs on a -3..+3 scale ("tag strongly contradicts" through "tag strongly describes" the movie).
- **Features for the ML model:** existing user tag applications, ratings, textual reviews (the textual signal turned out to be the most informative).
- **Model:** regression / supervised learning predicting the relevance score; multiple model families compared (logistic regression, decision trees, ensembles).
- **Output:** dense (movie, tag, relevance) matrix — ~10.5M scores in 2021 release.

### HelpME2C-relevant implication

Three direct lessons:

1. **Continuous relevance scoring beats binary tagging** for subjective vocabulary (which mood themes are). HelpME2C should store `theme_relevance` as a float, not a boolean.
2. **Text-derived features (reviews, synopses) are the cheapest scaling lever.** Wouter does not have to hand-tag (film, theme) pairs — review/synopsis text from TMDB, AniList, Letterboxd, and Wikipedia is dense enough for an LLM to assign a 0..1 relevance.
3. **Ground-truth seed is needed.** Vig et al. seeded with explicit user-rated (movie, tag) pairs before generalising. HelpME2C needs the analogue: a hand-rated seed of (film, theme) pairs for evaluation — probably ~200–500 hand-rated examples per theme as a held-out set to measure LLM-extension quality.

Sources:
- [Tag Genome paper (ACM TiiS 2012)](https://dl.acm.org/doi/10.1145/2362394.2362395)
- [Computing the Tag Genome (Vig, GroupLens technical paper)](https://files.grouplens.org/papers/genome.pdf)
- [Tag Genome 2021 dataset](https://grouplens.org/datasets/movielens/tag-genome-2021/)
- [The Tag Genome Dataset for Books (Kotkov et al., CHIIR 2022)](https://dl.acm.org/doi/10.1145/3498366.3505833) — extends the model to a different medium and confirms the methodology generalises.

---

## 5. Heymann & Garcia-Molina — *Collaborative Creation of Communal Hierarchical Taxonomies in Social Tagging Systems* (Stanford InfoLab TR 2006-10)

[Tech report PDF](http://ilpubs.stanford.edu:8090/775/1/2006-10.pdf) | [InfoLab listing](http://dbpubs.stanford.edu/pub/2006-10)

### Taxonomic-design lesson

This is the **foundational paper on extracting hierarchy from flat tag clouds.** The algorithm:

1. Build a tag-tag similarity graph from co-occurrence (tags that co-appear on the same items get an edge; weight = co-occurrence frequency).
2. Compute **centrality** for each tag node — high centrality = "general" tag (appears with many others); low centrality = "specific" tag.
3. Process tags in **decreasing centrality order**. For each tag, find its most-similar already-placed tag and add it as a child of that tag.
4. The result is a tree where general tags are near the root and specific tags are leaves.

The remarkable claim is that this **flat → hierarchical lift is essentially free** — no human input beyond the existing tag applications.

### Empirical validation

The algorithm was tested against synthetic data with known hierarchies and on real tagging data. Reported numbers from the follow-up *Extracting Tag Hierarchies* PMC paper (which benchmarks Heymann's algorithm against alternatives):

| Metric | Heymann–Garcia-Molina performance |
|---|---|
| Exactly-matching parent-child links | ~19% |
| "Acceptable" links | ~51% |
| Normalized mutual information vs ground truth | ~30% |

On synthetic "hard" data (tag frequencies not correlated with hierarchy depth), performance dropped to 48% acceptable links — substantially worse than the best follow-up algorithms (~91%).

### HelpME2C-relevant implication

Two implications, in tension:

1. **HelpME2C could derive a hierarchy from its existing theme co-occurrence on films.** If `melancholic` and `coming-of-age` co-occur a lot, they live near each other; if `slow-burn` is more central, it becomes a parent of more specific descendants.
2. **The expected accuracy is modest.** ~50% "acceptable" parent-child links is the headline number from the field. Don't expect Heymann's method to *create* the taxonomy for you — expect it to *suggest hierarchy candidates the curator then accepts or rejects.* The auto-derived tree is a draft, not a product.

The deeper warning: Heymann's algorithm assumes a "scale-free" tag distribution (a few very popular tags, a long tail of niche ones). HelpME2C's 41 themes are *intentionally evenly used* — the curator has tried to keep them comparable in coverage. That violates the algorithm's assumption and is likely to make hierarchy extraction *less* reliable than the benchmark suggests. Validate empirically before relying on it.

Sources:
- [Collaborative Creation of Communal Hierarchical Taxonomies (Heymann & Garcia-Molina 2006)](http://ilpubs.stanford.edu:8090/775/1/2006-10.pdf)
- [Extracting Tag Hierarchies (PMC review article — benchmarks Heymann's algorithm)](https://pmc.ncbi.nlm.nih.gov/articles/PMC3877228/)

---

## 6. Marchionini — *Exploratory Search: From Finding to Understanding* (CACM 2006)

Communications of the ACM 49(4), pp. 41–46. [URL via bibsonomy](https://www.bibsonomy.org/bibtex/9b618703c3cacd25e04aa2fdf80268ec). Full text via [ResearchGate](https://www.researchgate.net/publication/220422328).

### Taxonomic-design lesson

Marchionini's contribution to taxonomy design is *the framing itself*: lookup search and exploratory search are different tasks needing different interface support. Lookup is precise-goal / low-complexity — Google-shaped. Exploratory is open-goal / multi-faceted / iterative — Flamenco-shaped.

The corollary for taxonomy designers: **a single taxonomy can serve both tasks only if it exposes facets, not just a flat list.** Marchionini specifically calls out faceted classification systems (Flamenco from Hearst 2006; mSpace from Schraefel et al. 2005; Relation Browser from Capra & Marchionini 2008) as providing "a set of small categorical hierarchies instead of one large cover-all topical hierarchy."

This is the *theoretical anchor* for the now-orthodox "facet sidebar" pattern in product catalogues (Airbnb, Zappos, Booking.com).

### Empirical methodology

Discursive paper synthesising prior work; not its own user study. The empirical backing comes from the cited Flamenco and mSpace evaluations (Hearst's group at Berkeley).

### HelpME2C-relevant implication

Probably the most actionable single paper in this set. Three concrete implications:

1. **The 200-theme vocabulary should be exposed via facets, not as a flat list.** Likely facets: emotional-pole (sad/joyful/tense/contemplative), narrative-mode (coming-of-age/redemption/heist/etc), aesthetic-register (atmospheric/loud/dreamlike/grimy), pacing (slow-burn/breakneck/leisurely). Each facet is a small categorical hierarchy in Marchionini's terms.
2. **Build for exploration first, retrieval second.** The HelpME2C group-recommendation use case is structurally exploratory (you don't know what mood to land on until you see options). Marchionini endorses browsing strategies > lookup strategies for this class of task.
3. **Don't over-engineer one big hierarchy.** The Heymann-Garcia-Molina algorithm above produces *one tree*; Marchionini argues *several small facet trees* is superior for exploration. The HelpME2C taxonomy should look more like the latter.

Sources:
- [Exploratory Search: From Finding to Understanding (Marchionini 2006)](https://www.researchgate.net/publication/220422328)
- [Marchionini PDF (UT Austin mirror)](http://courses.ischool.utexas.edu/~i385t-sw/readings/Marchionini-2006-Exploratory_Search.pdf)

---

## 7. Hotho, Jäschke, Schmitz, Stumme — *Information Retrieval in Folksonomies: Search and Ranking* (ESWC 2006)

[Springer Link](https://link.springer.com/chapter/10.1007/11762256_31) | [PDF](https://www.kde.cs.uni-kassel.de/wp-content/uploads/stumme/papers/2006/hotho2006information.pdf)

### Taxonomic-design lesson

Folksonomies are not bag-of-tags — they are **tripartite graphs**: (user, tag, resource) triples. Hotho et al. formalise this and introduce **FolkRank**, an adaptation of PageRank to the tripartite structure. The intuition: a tag is important if many important users apply it to many important resources, and so on recursively.

This gives the field a way to *rank tags* (and users, and resources) by importance within a folksonomy, replacing the popularity heuristic.

### Empirical methodology

Tested on del.icio.us data; compared FolkRank ranking against simple frequency-based ranking. FolkRank surfaces more "topically focused" results, particularly for ambiguous queries.

### HelpME2C-relevant implication

HelpME2C is **not yet a folksonomy** — there's one tagger (the curator). So FolkRank-style ranking doesn't apply directly. *But*: if HelpME2C ever opens up a user-tagging affordance (Phase 2+), FolkRank is the canonical way to weight the resulting noise. The deeper lesson is **the tripartite-graph framing itself** — when the system has users + tags + items, the structural object isn't a tag list, it's a graph. The recommendation engine's internal representation should respect that even if the current UX doesn't expose user-tagging.

Sources:
- [Information Retrieval in Folksonomies: Search and Ranking (Hotho et al., ESWC 2006)](https://link.springer.com/chapter/10.1007/11762256_31)

---

## 8. Specia & Motta — *Integrating Folksonomies with the Semantic Web* (ESWC 2007)

[Springer Link](https://link.springer.com/chapter/10.1007/978-3-540-72667-8_44)

### Taxonomic-design lesson

Folksonomies and formal ontologies / Linked Open Data are not rivals — they are complementary. Specia & Motta present a method to **lift folksonomy tags to formal ontology concepts** via clustering similar tags, mapping clusters to existing ontology resources (e.g. WordNet, DBPedia), and surfacing the resulting semantic graph alongside the raw tag cloud.

### Methodology

Clustering + ontology-lookup pipeline; case study on del.icio.us tags mapped to DBPedia resources. Quality measured by ontology-mapping precision/recall.

### HelpME2C-relevant implication

HelpME2C's themes can be **linked to external concept ontologies** to gain semantic richness without adding curator load. A theme like `coming-of-age` exists in DBPedia, Wikidata, and TMDB's genre/keyword graph. Linking the HelpME2C internal theme to its external concept URIs:

- enables import of metadata (synonyms, translations, related concepts);
- gives downstream LLM-extension calls a richer concept anchor than the bare string `coming-of-age`;
- makes future cross-system interop (e.g. resale of the engine per PROJECT.md §revenue) feasible.

A small upfront investment (Wikidata QID per theme) pays for itself the moment the LLM-extension pipeline starts running.

Sources:
- [Integrating Folksonomies with the Semantic Web (Specia & Motta 2007)](https://link.springer.com/chapter/10.1007/978-3-540-72667-8_44)

---

## 9. De Gemmis, Lops, Semeraro, Musto, Narducci, Bux — *A Semantic Content-Based Recommender System Integrating Folksonomies for Personalized Access* (2009)

[Springer Link](https://link.springer.com/chapter/10.1007/978-3-642-02794-9_2)

### Taxonomic-design lesson

The FIRSt system demonstrates that **folksonomy tags can be folded into a semantic content-based recommender** without abandoning either side. Tags are used as a source of additional content features alongside controlled vocabulary; the recommender learns user-profile-over-tags through standard content-based-filtering machinery.

The taxonomic upshot: tags don't replace structured content metadata, they *augment* it. The two layers (controlled vocabulary + folksonomic tags) coexist as features.

### HelpME2C-relevant implication

HelpME2C already has a controlled vocabulary (curator-led themes). If it ever ingests user tags (Letterboxd, MAL, AniList tags as external signal even without HelpME2C user-tagging), the De Gemmis pattern is the canonical way to fold those in as additional features without polluting the curator's vocabulary. The two namespaces are kept separate but jointly contribute to the user-profile representation.

Sources:
- [A Semantic Content-Based Recommender System Integrating Folksonomies (De Gemmis et al. 2009)](https://link.springer.com/chapter/10.1007/978-3-642-02794-9_2)

---

## 10. Cantador, Fernández-Tobías, Berkovsky, Cremonesi — *Cross-Domain Recommender Systems* (Recommender Systems Handbook, 2nd ed., Springer 2015)

[Springer Link](https://link.springer.com/chapter/10.1007/978-1-4899-7637-6_27) | [Companion PDF](https://shlomo-berkovsky.github.io/files/pdf/Springer15a.pdf)

### Taxonomic-design lesson — focused on substrate, not algorithm

The chapter's full algorithmic survey was covered in the prior research file. The piece relevant to *this* file is the **domain-classification taxonomy** the authors propose. They distinguish three levels at which two systems can be "the same domain" or "different domains":

| Level | What it means | Example |
|---|---|---|
| **Attribute** | Same item type, different attribute value | All are movies; one corpus is comedy, the other drama |
| **Type** | Similar item types sharing some attributes | Movies vs TV shows (share director, cast, genre) |
| **Item** | Different item types with no attribute overlap by default | Books vs movies vs music |

The **HelpME2C case lives at the type and item levels simultaneously** — TV (broadcast or streaming) vs anime (animated, often Japanese, episodic). The theme-bridge is the *taxonomic device* that imposes attribute-level overlap onto items that don't naturally share attributes. This is exactly what Cantador et al. identify as the hardest-but-most-valuable cross-domain pattern.

The chapter also identifies (without fully resolving) the **substrate question**: a good cross-domain taxonomy needs to be (a) coarse enough to find bridges, (b) fine enough to remain meaningful, (c) culturally tractable across the two domains. They cite content-based, metadata-based, and latent-factor-based bridges as the three families; theme bridges are a content-based-and-metadata-hybrid.

### Methodology

Survey paper; the empirical backing comes from the dozens of cross-domain systems reviewed. The taxonomy is conceptual, not measured.

### HelpME2C-relevant implication

This chapter is the closest the formal literature comes to validating HelpME2C's product premise. Three concrete takeaways:

1. **HelpME2C's theme-bridge taxonomy is in the most demanding category (item-level cross-domain).** That makes the curation problem harder than the average cross-domain system — most published work operates at attribute-level (movie-comedy ↔ movie-drama), which is much easier.
2. **The (a)/(b)/(c) tension is real and unresolved in the literature.** Wouter is making a judgment call that doesn't have a definitive empirical answer. The 41-theme set is presumably tuned to that judgment; the 200-theme expansion must not violate it. Document the coarse-enough / fine-enough / culturally-tractable test for *each* new theme as part of the workflow.
3. **The "content-based hybrid" framing is the right family** — themes are derived from both narrative content (what happens) and aesthetic metadata (how it feels). Latent-factor bridges (matrix factorisation across domains) are easier to scale but lose the interpretability that's HelpME2C's differentiator. Stay in the content-hybrid family.

Sources:
- [Cross-Domain Recommender Systems (Cantador et al., 2015)](https://link.springer.com/chapter/10.1007/978-1-4899-7637-6_27)
- [Companion full-text PDF](https://shlomo-berkovsky.github.io/files/pdf/Springer15a.pdf)

---

## Cross-cutting empirical findings (citable summary)

Pulled out as a single table for the engineering work that follows this research:

| Finding | Source | Number | Used for |
|---|---|---|---|
| Raw user tags are mostly noise | Sen 2007 → Tagommenders 2009 | ~21% usable | Pruning rate for LLM-extension candidates |
| Entropy filter prunes vocabulary aggressively | Tagommenders 2009 | ~30k → 1,128 (~96% pruned) | Vocabulary-size sanity check |
| Users prefer factual over subjective tags | Tagommenders 2009 | 995-user study | Falsifiable hypothesis HelpME2C should track |
| Tag-relevance is well-modelled as continuous | Tag Genome 2012 | `[0, 1]` per (item, tag) | Schema decision (float not bool) |
| Heymann hierarchy extraction modest-accuracy | Heymann 2006 / PMC review | ~50% acceptable links | Use auto-hierarchy as draft only |
| Flat tag clouds serve exploration, not retrieval | Sinclair & Cardew-Hall 2008 | Empirical user study | Two surfaces (browse + filter) |
| Facets > single hierarchy for exploration | Marchionini 2006 / Flamenco | Theoretical + Flamenco data | Multi-facet UI for the 200-theme vocabulary |
| Cross-domain at the item-level is the hardest case | Cantador et al. 2015 | Taxonomic categorisation | Expect curation cost to be higher than average literature |

---

## Taxonomy-design choices the literature endorses for HelpME2C's situation

Distilled into recommendations Wouter can apply directly. Each is traceable to the source(s) above.

1. **Use a continuous (item, theme) relevance score**, not a binary tag relation.
   *Source:* Vig/Sen/Riedl 2012. Float in `[0, 1]`; reserve binary semantics for explicit curator overrides only.

2. **Keep the vocabulary curator-controlled; reject the open-folksonomy model for the 200-theme set.**
   *Source:* Mathes 2004 + Sen 2009. The 21% adequacy rate of raw user tags is not survivable for HelpME2C's small scale. (User-supplied *signal* is fine as additional features per De Gemmis 2009, but the *vocabulary itself* stays curator-controlled.)

3. **Expose the 200-theme vocabulary as faceted, not as a flat list.**
   *Source:* Marchionini 2006. Suggested facet axes: emotional pole, narrative mode, aesthetic register, pacing. Each facet is a small categorical hierarchy. Resist the single-big-tree temptation.

4. **Hand-author seed (film, theme, relevance) triples for evaluation, then LLM-extend, then audit.**
   *Source:* Vig/Sen/Riedl 2012 + Sen 2009. Roughly: ~50–200 hand-rated (film, theme) pairs per theme as evaluation set; LLM extension over the full catalogue using review text and synopsis features (the most informative features in the Tag Genome paper); pruning rate ~70–80% based on Sen's 21% adequacy finding extrapolated to LLM-suggested candidates.

5. **Don't try to derive the hierarchy automatically before the vocabulary is stable.**
   *Source:* Heymann & Garcia-Molina 2006 + the PMC benchmark review. The algorithm produces ~50% acceptable parent-child links on real data and degrades on non-scale-free distributions (which HelpME2C's intentionally even distribution likely is). Use the algorithm later as a draft generator for hierarchical structure, not as ground truth.

6. **Link each theme to an external concept URI (Wikidata QID or equivalent).**
   *Source:* Specia & Motta 2007. Cheap upfront; pays off in LLM-extension quality and future interop.

7. **Treat the cross-medium bridge as the hard-mode case in the field.**
   *Source:* Cantador et al. 2015. Plan for higher per-theme curation effort than literature averages suggest. Don't expect the 41→200 expansion to scale linearly in time-per-theme; the marginal theme is harder than the first one because the easy bridges have been taken.

8. **Validate the subjective-over-factual hypothesis explicitly.**
   *Source:* Sen 2009 (factual-preference finding). Mood-themed cross-medium bridges are subjective by construction. Wouter is betting that *for the group-recommendation use case* subjective is preferred — opposite to Sen's general-purpose-recommender finding. Make this hypothesis falsifiable in PROJECT.md or an ADR and design a downstream evaluation (group-rec retention, theme-click engagement) that can disconfirm it.

9. **Two-surface UI from day one of the expansion.**
   *Source:* Sinclair & Cardew-Hall 2008. A discovery surface (themes as explorable cloud, surfaced contextually) and a retrieval surface (themes as filterable facet). Don't conflate them.

10. **Plan for the tripartite-graph data shape even if user-tagging isn't exposed in Phase 1A.**
    *Source:* Hotho et al. 2006. The DB schema and the `packages/ml` interfaces should treat (user, theme, item) as the canonical triple. Costs little upfront, makes Phase 2+ user-signal ingestion much cheaper.

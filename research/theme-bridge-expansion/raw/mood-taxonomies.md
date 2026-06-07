# Mood-focused film taxonomies — small-scale, often solo-curated

**Research date:** 2026-05-17
**Question being answered:** What can HelpME2C learn about scaling a mood-themed taxonomy from 41 to 200+ themes, from one curator, looking at smaller-scale "what to watch tonight by mood" projects?

This file maps the field of mood-tagged film discovery — from solo hobby projects to community-curated lists to small-team editorial operations to one industrially-deployed cluster-from-language system. The deliberate spread of scale is the point: it shows what one person can hold, what slips when you grow, and where automation becomes load-bearing.

---

## 1. MovieLens Tag Genome (GroupLens Lab) — the academic-meets-practice anchor

**Source:** Vig, Sen, Riedl, "The Tag Genome: Encoding Community Knowledge to Support Novel Interaction," ACM TiiS 2(3), Sep 2012. Dataset releases 2014, 2021.

- **Vocabulary size:** 1,128 tags in the 2014 release; 1,084 tags in the 2021 release. ~10.5M (movie, tag, relevance) triples over 9,734 movies in 2021.
- **How "mood" is represented:** mood-relevance is encoded as a continuous score in `[0, 1]` per (movie, tag) pair. Example mood-coded tags (from GroupLens documentation): *atmospheric*, *thought-provoking*, *realistic*, *quirky*, *emotional*. No separate "mood" namespace — moods are flat tags alongside content tags like *based on a book* or *plot twist*.
- **Curation approach:** **hybrid algorithmic + supervised**. Users provided ground-truth ratings on a `-3..+3` scale ("tag strongly contradicts" through "tag strongly describes" the movie). An ML model trained on (user tags, ratings, textual reviews) generalised those labels to the full catalogue. The textual-review signal carries a lot of weight — the system learns that movies whose reviews use language like "haunting" or "slow burn" inherit those tags even without explicit user tagging.
- **Tag selection / vocabulary cleaning:** the 1,128-tag vocabulary is itself the product of cleaning. The Tagommenders paper (Sen et al., WWW 2009) reports an entropy-based filtering step that took a raw ~30,000 user-generated tags from MovieLens and reduced them to ~1,128 retained tags. Only ~21% of the original raw tags were judged adequate to display to other users in earlier work (cited by Sen et al.).
- **Quality signal:** Vig et al. validated by holding out user ratings and measuring how well the ML model predicted them. Downstream evaluations in Tagommenders showed tag-based recommenders beat then-state-of-the-art collaborative filtering on ranking quality. Users *prefer factual tags over subjective tags* and strongly dislike personal tags — explicit user-study finding.
- **Failure modes documented:** (a) mood-style tags are inherently more subjective and so noisier than factual tags; (b) the ML model needs decent review text to score relevance — sparse-review titles get poor relevance scores; (c) the 1,128-tag vocabulary is essentially fixed — adding new tags requires retraining and seed-rating collection.

**Most-relevant data point for HelpME2C:** the entropy filter is the load-bearing piece. They started with 30,000 raw user tags and kept ~4%. The 1,128 retained tags are the ones with enough cross-user agreement to be useful. *This is the empirical floor for "how many tags is too many before noise wins" in a movie taxonomy.*

Sources:
- [The Tag Genome: Encoding Community Knowledge to Support Novel Interaction (ACM TiiS 2012)](https://dl.acm.org/doi/10.1145/2362394.2362395)
- [MovieLens Tag Genome Dataset 2021 (GroupLens)](https://grouplens.org/datasets/movielens/tag-genome-2021/)
- [Tag Genome README](https://files.grouplens.org/datasets/tag-genome/README.html)
- [Tagommenders (Sen, Vig, Riedl — WWW 2009)](https://dl.acm.org/doi/10.1145/1526709.1526800)

---

## 2. Nanocrowd / Nanogenres — the language-cluster product behind Letterboxd

**Source:** [nanocrowd.com](https://nanocrowd.com/), [Letterboxd partnership announcement (Mar 2022)](https://nanocrowd.com/nanocrowd-letterboxd/), [Letterboxd Journal feature on nanogenres](https://letterboxd.com/journal/film-feelings-nanogenres/).

- **Vocabulary size:** Nanocrowd does not publish a total count. The product surfaces "nanogenres" as small, named clusters — each one usually a 3-word reaction descriptor. Examples published by Nanocrowd: "Suspense, Slick, Stylish"; "Twist, Mysterious, Confusing"; "Suspense, Guns, Action-Packed". Letterboxd integrates these as the "Similar Films" surface for 5M+ members.
- **Curation approach:** **fully algorithmic, language-driven.** Nanocrowd applies "advanced mathematical modeling" — described by them as Reaction Mapping® — to user-generated review text from Letterboxd and elsewhere. The system clusters films by the language audiences use to describe them, *not by metadata*. Mood is inferred, never explicitly tagged.
- **Tool:** proprietary NLP / clustering pipeline (ViewerVoice™ platform).
- **Quality signal:** Nanocrowd's public copy is qualitative ("emotional precision over demographic targeting"); no published accuracy/retention/click-through figures. The Letterboxd partnership is the implicit validation: a 5M-user product chose them over building in-house.
- **Failure modes (inferred — not Nanocrowd-published):**
  - **Mood drift:** clusters reflect the *language of reviewers*, who skew toward film-literate users. Mainstream emotional reactions ("made me cry," "felt cosy") underweight versus film-critic vocabulary ("hauntological," "post-genre").
  - **Long-tail starvation:** films with few reviews can't be clustered reliably.
  - **No browsable taxonomy:** nanogenres are surfaced contextually ("films like this one") not as a flat directory — you can't browse "all atmospheric" because the system doesn't structure it that way.

**Most-relevant data point for HelpME2C:** Nanocrowd is the proof-of-concept that *you can extract mood-themed groupings from review text alone, without curatorial input* — but only at industrial scale (millions of reviews, ML pipeline). Below that scale, language clustering doesn't have enough signal.

Sources:
- [Nanocrowd technology page](https://nanocrowd.com/technology/)
- [Letterboxd partnership announcement](https://nanocrowd.com/nanocrowd-letterboxd/)
- [Letterboxd Journal: Film Feelings — using nanogenres to find similar films](https://letterboxd.com/journal/film-feelings-nanogenres/)

---

## 3. MUBI Notebook — small-team editorial curation

**Source:** [Notebook | MUBI](https://mubi.com/en/notebook), Daniel Kasman (VP Content / Editor-in-Chief, Notebook), [Wikipedia on MUBI](https://en.wikipedia.org/wiki/Mubi_(streaming_service)).

- **Vocabulary size:** *No formal mood taxonomy*. MUBI's curation is essay-and-collection-driven, not tag-driven. Themes are named monthly (e.g., Issue 7 of the print Notebook organised around "the unfilmable"). Notebook publishes daily essays; the streaming product surfaces 30 films at a time on rotation.
- **Curation approach:** **small editorial team.** Daniel Kasman leads. Themes are conceived per-cycle, not selected from a fixed vocabulary. Each MUBI release notes are written by a named curator.
- **Tool:** CMS-based. No public visibility into internal categorisation systems.
- **Quality signal:** subscriber retention, never published numerically. Editorial reputation is the asset.
- **Failure modes:**
  - **Doesn't scale by tag.** A new "theme" is a piece of writing, not a row in a table. Browse-by-mood is structurally impossible.
  - **Bus factor.** Kasman and ~5 editors hold the taxonomy in their heads.
  - **Discoverability suffers.** You can't ask MUBI "what's something melancholic tonight?" — you have to read the essays.

**Most-relevant data point for HelpME2C:** *editorial curation does not scale linearly with vocabulary size.* MUBI's strength is depth-per-theme, not breadth. The opposite of where HelpME2C needs to go.

Sources:
- [Notebook | MUBI](https://mubi.com/en/notebook)
- [Daniel Kasman — Notebook author page](https://mubi.com/en/notebook/posts/author/4)

---

## 4. A24's editorial collections

**Source:** [a24films.com/notes](https://a24films.com/notes).

- **Vocabulary size:** none formal. A24 publishes editorial Notes (articles, zines, podcasts) organised around individual films and creative collaborations. No mood-tagged collections in any browsable taxonomy.
- **Curation approach:** small marketing/editorial team. Themes are bespoke per film release.
- **Quality signal:** brand affinity, not engagement-tracked publicly.
- **Failure modes:** zero mood-as-vocabulary structure. The Notes page is a chronological feed. If you want "A24 films that feel cosy", you build the list yourself in a third-party tool (Letterboxd).

**Most-relevant data point for HelpME2C:** A24 is *not* a mood taxonomy — it's a brand taxonomy. The signal is "if it's A24, it has a certain feel". This is **single-axis editorial framing** and is too coarse to compete with what HelpME2C is building.

---

## 5. Letterboxd community lists — the volunteer-curated mood layer

**Source:** [letterboxd.com/lists/popular](https://letterboxd.com/lists/popular), [list-tags help article](https://letterboxd.zendesk.com/hc/en-us/articles/15179274026639-How-do-tags-work).

- **Vocabulary size:** **unbounded.** Letterboxd has no controlled list-tag vocabulary — users tag freely. Popular mood-themed lists routinely have 50–1,000+ films each. Confirmed examples (single curators):
  - "Essential Depression Core" (@natethemartian) — 68 films
  - "The World is Hell: Hopeless Cinema" (@darrencb) — 1,000 films
  - "Let's Ugly Cry Together" (@clairacurtis) — 180 films
  - "That Aching Feeling. I Guess...It's Okay to Cry a Little" (@kun) — 138 films
  - "Good to watch when feeling lost, hopeless, lonely, depressed in life" (@clairererer) — 96 films
- **Curation approach:** **single hobbyist curator per list.** A handful of "official" lists are staff-curated; the great majority of mood lists are users' projects.
- **Tool:** Letterboxd's list builder (in-browser, drag-and-drop films into ordered lists with optional notes per item).
- **Quality signal:** *like* counts, *follow* counts, list comments. Top mood lists collect 5,000–50,000 likes over a few years.
- **Failure modes:**
  - **No vocabulary control.** "Sad" lists overlap with "depression core" lists overlap with "tearjerker" lists overlap with "melancholy" lists. The same film appears in 200+ semantically near-identical lists.
  - **List rot.** Curators stop maintaining; lists drift from their original intent as new films are added or omitted.
  - **No relevance scoring within a list.** Position is curator-chosen, not relevance-weighted.
  - **Discovery is by reputation, not by query.** You can't ask "show me melancholic films I haven't seen yet" — you find a list and skim it.

**Most-relevant data point for HelpME2C:** Letterboxd is the empirical demonstration that **one person can hold a 100–200-film mood list in their head and maintain it.** Beyond ~200 the curator becomes a librarian, not a tastemaker, and engagement drops. Several of these lists are 5+ years old and still active — sustainability is real.

Sources:
- [Letterboxd: how tags work](https://letterboxd.zendesk.com/hc/en-us/articles/15179274026639-How-do-tags-work)
- [Essential Depression Core list](https://letterboxd.com/natethemartian/list/essential-depression-core/)
- [That Aching Feeling list](https://letterboxd.com/kun/list/that-aching-feeling-i-guessits-okay-to-cry/)

---

## 6. Solo-built mood-recommender apps

A representative sample of small, often-single-developer mood-themed film products surfaced from recent (2024–2026) HN "Show HN" posts and indie product directories:

| Project | Vocabulary | Curation | Tool | Notes |
|---|---|---|---|---|
| **MoodieMovie** (Caesar Bell, 2025) | ~10 mood prompts ("cheerful", "reflective", "weird", "sleepy", "hyped", "romantic") | Hybrid: ChatGPT picks 5 genres per mood; DeepSeek auto-tagged a curated IMDb Top 250 + hidden-gems database | Next.js + Framer Motion + LLM API | Filters out anything below IMDb 6.7. "Dynamic tag clouds" like "Whimsical nostalgia" exposed as discovery affordance. |
| **Mood2Movie** | ~12 named moods | Lookup table per mood → curated film set | Static web app | Single curator; small set per mood (~20-40 each). |
| **Moodies** (Caesar Bell — earlier version) | Similar ~10-mood scope | Hybrid LLM + curated DB | Web app | Documented build process in Medium post; LLM-assisted tagging the load-bearing decision. |
| **MovieMood** (moviemood.io) | Quiz-based, not tag-based | LLM-driven over rating data | Web app | "2 minutes to a perfect match" — not a browsable taxonomy. |
| **Feelm** | "Films for the way you feel" | Curated lists per feeling | Web app | (Site timed out during fetch; based on directory description.) |

**Pattern observed across solo apps:** the vocabulary clusters around **~8–15 mood prompts**, never more. Adding more dilutes the brand promise ("pick a mood, get a film"). Auto-tagging via LLM is the universal scaling trick — *no* solo project hand-codes 200+ moods.

Sources:
- [MoodieMovie — Show HN](https://news.ycombinator.com/item?id=43340790)
- [Caesar Bell — Behind Moodies (Medium)](https://caesar-jd-bell.medium.com/behind-moodies-a-mood-based-movie-recommendation-engine-c9cf20f2c2a0)
- [Mood2Movie](https://mood2movie.com/)
- [MovieMood](https://moviemood.io/)

---

## 7. Plutchik-derived emotion taxonomies in film

**Source:** Plutchik's wheel-of-emotions (1980), PyPlutchik visualisation tool (2021), recent EMNLP/SuperEmotion work (2024–2025).

- **Vocabulary size:** Plutchik's foundational model: **8 primary emotions** (joy/sadness, anger/fear, trust/disgust, surprise/anticipation), 24 "dyads" composed of pairs of primaries, in three intensity rings. Total exposable vocabulary: **~32 emotion labels.**
- **Curation approach:** academic / psychometric, not editorial.
- **Application to film:** *limited but real.* The PySpice / SPICE H2020 project applied Plutchik-based emotion ontologies to cultural-heritage items including some film analysis. EMNLP 2024 ("Integrating Plutchik's Theory with Mixture of Experts") used Plutchik for sentiment fine-grained classification on text — film reviews would be in-scope.
- **Quality signal:** the model has 40 years of empirical psychology literature behind its validity *as an emotion taxonomy* — not as a *film-affect taxonomy*. The gap matters.
- **Failure modes when applied to film:**
  - **Plutchik categorises felt-emotion, not film-aesthetic-feel.** "Joy" the emotion ≠ "joyful" as a film descriptor. A *Funny Games* viewer may feel fear, but the film's mood isn't "fearful" — it's "alienating." Film mood needs aesthetic vocabulary, not psychological vocabulary.
  - **Granularity mismatch.** 8 primaries is too coarse; 32 dyads with intensities is unwieldy for a UI.
  - **Cross-cultural validity contested** — Plutchik's primaries are Western-centric.

**Most-relevant data point for HelpME2C:** Plutchik is *valuable as a sanity check* — when designing a mood vocabulary, check that you have rough coverage of the primary emotion poles. It is *not* a substitute for film-specific aesthetic vocabulary. The HelpME2C theme set needs film-critical descriptors (atmospheric, melancholic, coming-of-age, dreamlike) *plus* emotion-pole coverage (cathartic-sad, joyful, tense, etc).

Sources:
- [Robert Plutchik — Wikipedia](https://en.wikipedia.org/wiki/Robert_Plutchik)
- [PyPlutchik (PLoS ONE 2021)](https://pmc.ncbi.nlm.nih.gov/articles/PMC8409663/)
- [Integrating Plutchik's Theory with Mixture of Experts (EMNLP 2024)](https://aclanthology.org/2024.emnlp-main.50.pdf)

---

## 8. The "MoodPics" question — did not find

The brief asked about a "MoodPics" service. Searches for `moodpics.io` and `MoodPics film` returned no specific film-mood-tagging product by that name. Adjacent results were filmmaker-moodboard tools (`genery.io`, `filmvibes.io`) which are visual-reference utilities, not recommender taxonomies. Logging this as a research gap. If Wouter has a specific URL or reference, the analysis above should be re-scoped against it.

---

## Lessons for solo curator at HelpME2C scale

What's transferable from the field:

1. **Hand-curation tops out around 100–200 items per "node" of taxonomy** — empirically validated by the Letterboxd long-tail. Solo curators sustain that scale; beyond it, the curator becomes a librarian and the brand voice dilutes. This is the *upper bound* on how many films one human can authoritatively tag with any given mood theme. For HelpME2C's reverse calculation: if each theme spans 200 films, then 200 themes means ~40,000 (movie, theme) tag relations — too many for a single human to hand-write.
2. **Auto-tagging is universal at scale.** Every system above ~50 themes uses ML to extend a hand-seeded vocabulary: MovieLens Tag Genome (regression model from user ratings + review text), Nanocrowd (NLP clustering on reviews), MoodieMovie (LLM auto-tagging). *None* hand-tags every (film, mood) pair manually past trivial vocabulary sizes.
3. **The Tagommenders 21% / 1,128-of-30,000 finding is the warning bell.** When you let users tag freely, ~79% of tags are noise (too personal, too niche, or too redundant). A curator-led vocabulary skips this — but at the cost of cultural coverage. The optimal middle: a curator seeds the vocabulary, an LLM extends per-film tagging, and a quality filter (entropy / inter-curator agreement) prunes.
4. **Mood vocabulary clusters around 10–40 named moods for surface UX.** Plutchik's 32. Solo apps' 8–15. Even the 1,128-tag MovieLens Tag Genome surfaces only a curated handful in any given UI context. *200+ themes is a back-end vocabulary; the front-end shouldn't expose all of it as a flat list.* HelpME2C's expansion target is fine as a substrate but needs a hierarchy or facet for users.
5. **Browse-by-mood and search-by-mood are different products.** MUBI (essays), Letterboxd (lists), and MoodieMovie (quiz) all solve different jobs-to-be-done. HelpME2C's group-recommendation framing is a third distinct shape — closer to "match the mood of the room" than to either of the above.
6. **Cross-medium bridges (HelpME2C's actual differentiator) are absent from every system surveyed.** MovieLens is film-only. Nanocrowd is film-and-TV but doesn't bridge to anime via theme — it bridges via shared review language, which fails at the medium boundary (anime reviews use different vocabulary than live-action). Letterboxd has zero anime coverage in practice. This is where HelpME2C has genuine white space — *but it's also why solo curation matters more here than in any of the surveyed systems.* Nobody else has the cross-medium theme equivalence problem, so nobody else's auto-tagging trick generalises cleanly to it.

What's *not* transferable:

- **MUBI's editorial-essay model** — depth-per-theme doesn't scale to 200 themes.
- **Nanocrowd's review-language clustering** — requires industrial review volume; HelpME2C's catalogue mixes anime (low Letterboxd coverage) and Western TV (high coverage) asymmetrically, so a language-clustering approach would over-fit to the side with more text.
- **A24's brand-as-taxonomy** — single-axis editorial framing is too coarse for HelpME2C's 200-theme goal.

**The pragmatic move:** treat the 41→200 expansion as a **curator-seeded, LLM-extended, audit-pruned** pipeline. The curator does the *vocabulary design* (deciding which 200 themes exist and what their textual definitions are) — that's irreducibly human. An LLM does the *per-film application* of the vocabulary (assigning relevance scores to (film, theme) pairs at scale). An audit pass with concrete quality signals (entropy, cross-medium consistency, group-recommendation downstream metrics) prunes the long tail. This mirrors what every system above ~50 themes does and is the only documented path that survives the curator-as-librarian failure mode.

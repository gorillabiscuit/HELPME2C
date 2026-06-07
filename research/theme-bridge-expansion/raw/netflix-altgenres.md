# Netflix — Altgenres ("microgenres")

Source pack for HelpME2C theme-bridge-expansion research. Drafted 2026-05-17.

Netflix's altgenres are the canonical "compound, templated, human-tagged microgenre" precedent for video. They were surfaced publicly by Alexis Madrigal's January 2 2014 Atlantic investigation, *How Netflix Reverse Engineered Hollywood*, in which Madrigal + Ian Bogost scraped Netflix's sequentially-numbered genre URLs and counted 76,897 distinct altgenres. The system was built between ~2006 and 2014 under Todd Yellin (VP of Product) using a 36-page tagger training manual and a hand-tagged ~200-attribute-per-title schema he called the "Netflix Quantum Theory."

The arc since then is the second half of the story: altgenres have been *quietly de-emphasised* as Netflix shifted from explicit "Movies you'll like" personalised rows to behaviour-driven and now foundation-model-driven recommendation.

> Primary source citation note. We could not directly retrieve Madrigal's Atlantic article (the Atlantic blocks WebFetch and the Internet Archive copy is also blocked). Quotes attributed to Madrigal below are from secondary sources that themselves cite the article verbatim — chiefly [LIS653 *Behind Netflix's ~76,897 Altgenres*](https://lis653.wordpress.com/2017/11/27/behind-netflixs-76897-altgenres/), [Nick Seaver's *On Reverse Engineering*](https://medium.com/anthropology-and-algorithms/on-reverse-engineering-d9f5bae87812), [CSMonitor *How to unlock the mystery of Netflix genres* (Jan 12 2016)](https://www.csmonitor.com/Arts-Culture/TV/2016/0112/How-to-unlock-the-mystery-of-Netflix-genres), and Miriam Posner's DH101 reading-notes ([here](https://miriamposner.com/dh101f14/?p=437) and [here](https://miriamposner.com/dh101f14/?p=605)).

---

## 1. Vocabulary structure

**Compound / generative / templated.** Altgenres are not stored as a flat enumerated list — they are *generated* by a grammar that composes atomic tags into multi-clause titles. Atomic tags themselves are flat, but the altgenres on display are the cartesian-ish product of them, filtered by what actually has titles.

Reconstructed grammar (Ian Bogost + Alexis Madrigal, *Netflix genre generator*):

> "Region + Adjectives + Noun Genre + Based On… + Set In… + From the… + About… + For Age X to Y" with wildcards including "With a Strong Female Lead" and "For Hopeless Romantics." ([LIS653 *Behind Netflix's ~76,897 Altgenres*](https://lis653.wordpress.com/2017/11/27/behind-netflixs-76897-altgenres/))

> "Roughly 10% of the time add a region, and then three or less adjectives and the genre name, and half the time add data from the description," with the ability to recurse to create elements like starring information. (Bogost grammar described in [WebSearch summary citing Open Transcripts talk](http://opentranscripts.org/transcript/reverse-engineering-netflix/) — note: source URL had a TLS cert issue at fetch time)

Slot inventory implied by the grammar:

| Slot | Examples |
|---|---|
| Region | "French-Language", "Foreign", "British", "Spanish-Language" |
| Adjectives (multiple, stackable) | "Visually-striking", "Critically-acclaimed", "Witty", "Gory", "Goofy", "Irreverent", "Sentimental", "Cerebral" |
| Noun Genre (the anchor) | "Comedies", "Dramas", "Horror Movies", "Children & Family Movies", "Thrillers", "Action & Adventure" |
| Based On | "Based on 20th Century Literature", "Based on a True Story", "Based on a Book" |
| Set In | "Set in Europe", "Set in the 1970s" |
| From the… | "From the 1970s", "From the 1980s" |
| About | "About Father-Son Relationships", "About Friendship", "About Marriage" |
| Starring | "Starring Bruce Willis", "Starring Robert De Niro" |
| Age | "For Age 5 to 7", etc. |
| Audience tag | "With a Strong Female Lead", "For Hopeless Romantics" |

**Verified compound altgenre examples** (across the cited articles):
- "Witty Comedies Featuring a Strong Female Lead" ([Subtraction.com](https://www.subtraction.com/2014/01/02/the-atlantic-how-netflix-reverse-engineered-hollywood/))
- "Critically Acclaimed Dramas Based on 20th Century Literature" (same)
- "Violent Action Thrillers Starring Bruce Willis" ([Refinery29](https://www.refinery29.com/en-us/2014/01/60036/netflix-has-76897-subgenres))
- "Tearjerkers From The 1970s" (same)
- "Visually-striking Goofy Action & Adventure" ([WebSearch result](https://lis653.wordpress.com/2017/11/27/behind-netflixs-76897-altgenres/))
- "Sentimental Set in Europe Dramas from the 1970s" (same)
- "Irreverent French-Language Comedies" (code 1584) ([CSMonitor 2016](https://www.csmonitor.com/Arts-Culture/TV/2016/0112/How-to-unlock-the-mystery-of-Netflix-genres))
- "Visually-striking Imaginative Children & Family Movies" (code 2480) (same)
- "Gory B-Horror Movies from the 1980's" (code 444) (same)

**Hierarchy?** The Noun Genre slot is the anchor ("Drama", "Comedy", "Horror Movies", etc.) — a small flat root set, ~30–50 traditional genres. Everything else is orthogonal modifiers stacked on top. So *technically* one shallow layer (genre → altgenre), with combinatorial breadth at the leaf.

**Overlapping memberships.** Yes, by construction. A film like *Field of Dreams* sits in "Father-Son Movies", "Visually-striking…", "Sentimental…", "Based on a Book", "Sports Movies", etc. simultaneously. Each altgenre is a query over the atomic tag set.

---

## 2. Vocabulary size + growth over time

| Metric | Value | Source |
|---|---|---|
| Total altgenres (Jan 2014) | 76,897 | Madrigal, *Atlantic* — discovered by enumerating sequentially-numbered genre URLs ([NPR coverage](https://www.npr.org/sections/alltechconsidered/2014/01/02/259128268/netflix-built-its-microgenres-by-staring-into-the-american-soul); [Musically](https://musically.com/2014/01/27/how-netflix-metatagged-the-movies-with-76897-micro-genres/)) |
| Total altgenres (2024) | "over 36,000 codes" reported | [WebSearch aggregation, 2024 Netflix codes guides](https://www.whats-on-netflix.com/news/the-netflix-id-bible-every-category-on-netflix/) — i.e. the public-facing enumerable set has *shrunk* by roughly half over a decade |
| Atomic story tags per title | ~200 hand-tagged attributes | widely cited as the Quantum Theory tag-count per film; quoted via Madrigal in secondary sources |
| Training-manual length | 36 pages | confirmed in 4+ independent secondary sources ([Dexerto](https://www.dexerto.com/tv-movies/netflix-tagger-job-explained-2516025/), [CSMonitor](https://www.csmonitor.com/Arts-Culture/TV/2016/0112/How-to-unlock-the-mystery-of-Netflix-genres), [Posner DH101](https://miriamposner.com/dh101f14/?p=437), [Informediation 2015](http://www.informediation.com/blog/2015/05/06/the-netflix-quantum-theory-explained/)) |
| Active taggers ("Originals Creative Analysts") | ~30 reported as of ~2018 | [Bustle / HelloGiggles aggregations](https://www.bustle.com/p/what-is-a-netflix-tagger-heres-what-its-like-to-watch-netflix-shows-all-day-for-a-living-8638823); also cited as "30-person team" in [sidehustles.com](https://sidehustles.com/netflix-tagger-job/) |
| Tagger weekly hours (Gulmahamad) | ~20 hours/week of watching | [Fast Company *How I Got My Dream Job Of Getting Paid To Watch Netflix*](https://www.fastcompany.com/40547557/how-i-got-my-dream-job-of-getting-paid-to-watch-netflix) |

**Growth arc.**

- **~2006:** Yellin starts the Quantum Theory work; the foundational schema document is dated 2008 in most accounts (see §3), though 2006 is also sometimes cited as the conceptual origin.
- **~2008–2013:** Build-out phase. ~30 taggers, 36-page manual, ~200 attributes per title.
- **Jan 2014:** Madrigal scrape reveals 76,897 altgenres — the peak documented count.
- **2014–2017:** Altgenres dominant on the Netflix homepage as personalised row titles ("Because you watched X…", "Witty Father-Son Movies…").
- **~2017–2018:** Quiet de-emphasis. One former tagger interviewed in 2018 "left Netflix in 2018, and he believes Netflix no longer employs remote taggers, bringing metadata analysis in-house." ([WebSearch result citing Diggit / Tom's Guide aggregations](https://www.tomsguide.com/features/netflix-tagger))
- **2024–2026:** Public-facing genre-code count down to ~36,000; Netflix has pivoted to **three-word descriptors** + foundation-model-driven personalisation; row titles are increasingly natural-language-curated ("Twisted Christmas", "Human Connections") rather than templated altgenre strings. ([Deccan Herald, *Netflix reels in viewers with three-word hooks*](https://www.deccanherald.com/amp/story/business/netflix-reels-in-viewers-with-three-word-hooks-2848151); [Netflix Tech Blog *Foundation Model for Personalized Recommendation*](https://netflixtechblog.com/foundation-model-for-personalized-recommendation-1a0bd8e02d39))

So the trajectory is: explosive grammar-driven combinatorial growth 2008–2014 → peak surface area ~76,897 → managed contraction + shift away from altgenres-as-product-surface ~2017–2024.

---

## 3. Editorial workflow

**Architect.** Todd Yellin, Netflix VP of Product. Madrigal traced the schema to Yellin via interview. Yellin's stated motivation, in his own words: *"My first goal was: tear apart content!"* (Madrigal via [Seaver](https://medium.com/anthropology-and-algorithms/on-reverse-engineering-d9f5bae87812))

**The Netflix Quantum Theory document.** Yellin authored a foundational schema document called *The Netflix Quantum Theory*, which named "quanta" — atomic packets of meaning that compose a film. The document, per Yellin in the Irish Times: *"wrote a document called The Netflix Quantum Theory in 2008"* — he describes the naming as from a period when "we were into pretentious naming." ([Irish Times, *Trust busters and monkey boxing*](https://www.irishtimes.com/culture/film/trust-busters-and-monkey-boxing-why-netflix-watches-everything-you-watch-1.1860471))

The Quantum Theory document "spelled out ways of tagging movie endings, the 'social acceptability' of lead characters, and dozens of other facets of a movie." ([Informediation 2015](http://www.informediation.com/blog/2015/05/06/the-netflix-quantum-theory-explained/))

(Note: some sources cite 2006 as the origin date; Yellin's own 2014 quote in the Irish Times says 2008. Going with 2008 as authoritative.)

**Tagger hiring + training.**

- Job title: "Originals Creative Analyst" / informally "Netflix Tagger."
- Hiring profile: hard-core film/TV knowledge, often with formal training. Sherrie Gulmahamad (Netflix tagger since 2006, still at Netflix as of 2026): screenwriting undergrad + master's in critical film studies. Interview was "chatty and informal, with her supervisor focused on making sure she had a genuine passion for categorizing movies and TV." ([Fast Company, *How I Got My Dream Job…*](https://www.fastcompany.com/40547557/how-i-got-my-dream-job-of-getting-paid-to-watch-netflix))
- Training: the **36-page training manual** is the single most-cited tooling artifact in the Netflix-altgenres literature. It "teaches them how to rate movies on their sexually suggestive content, goriness, romance levels, and even narrative elements like plot conclusiveness." ([CSMonitor 2016, paraphrasing Madrigal](https://www.csmonitor.com/Arts-Culture/TV/2016/0112/How-to-unlock-the-mystery-of-Netflix-genres))

**Hand-tagging volume.**

- ~200 atomic story attributes per title (Quantum Theory schema, per Madrigal).
- ~20 hours/week of watching per tagger (Gulmahamad).
- ~30 taggers globally at peak (multiple secondary sources).
- Yellin's own characterisation of the hybrid: *"It's a real combination: machine-learned, algorithms, algorithmic syntax, and also a bunch of geeks who love this stuff going deep."* (Madrigal via [Seaver](https://medium.com/anthropology-and-algorithms/on-reverse-engineering-d9f5bae87812))

**Scoring scales.** Multi-dimensional, mostly 0–5 ordinal scales. From the Irish Times paraphrase: *"Certain attributes receive scalar ratings from one to five. For gore, 'five might be spleens being ripped out of someone's guts, while zero is nothing at all gory, perfect for a small child.'"* ([Irish Times](https://www.irishtimes.com/culture/film/trust-busters-and-monkey-boxing-why-netflix-watches-everything-you-watch-1.1860471)) Same as the Pandora MGP scale, independently arrived at — apparently 0–5 is the convergent answer.

**Tagger workflow — Gulmahamad's account:**

- ~20 hours/week of watching. Most work done from Netflix's Hollywood HQ.
- Specialism: comedy + stand-up, with some sci-fi. Sometimes assigned outside her specialism by the supervisor.
- Tag categories include: genres, characters, settings, themes, mood. The "subjective" tags ("quirky", "pretentious", plot resolution, character morality) are deliberately separated from the "objective" ones (release dates, cast, directors).
- Tagger's framing of the job: *"Our job is very much like being a librarian and making sure things are classified accurately, but you also have the broad knowledge base of how TV shows or movies are related, and if they look good together in a row on our site."* ([Bustle](https://www.bustle.com/p/what-is-a-netflix-tagger-heres-what-its-like-to-watch-netflix-shows-all-day-for-a-living-8638823))

**Cross-tagger consistency.** Not directly documented. Implied by: (i) the 36-page manual as the rubric, (ii) the single supervisor model, (iii) the rating-scale anchoring (gore=5 means spleens; gore=0 means safe-for-a-small-child). No published IAA/kappa numbers, no documented double-tag rate analogous to Pandora's 10%.

---

## 4. Tooling

**The 36-page training manual** is the canonical document, repeatedly cited but never publicly leaked. It functions as the rubric / anchoring artifact.

**The altgenre generator itself** is not a curator-facing tool — it's a *backend assembler*. Taggers tag atomic attributes; the altgenre strings are constructed by an algorithm that composes them via the grammar. This is the cleanest architectural lesson in the whole Netflix story: **humans tag atoms; machines compose compounds.**

**The Netflix genre generator** (Ian Bogost's reverse-engineering, hosted publicly) demonstrated that the grammar is well-formed enough to *generate plausible but non-existent* altgenres — i.e. the templating is so generative that the system has slots it has never actually populated with real films. This is functionally a hallucination surface (see §6).

**Suggestion engine?** Not publicly documented for the tagger workflow. Foundation-model era (post-2023) work suggests Netflix now uses learned embeddings to *propose* tags from content, with humans reviewing — but this is inference, not on-record fact for altgenres specifically.

**Audit log / disagreement resolution.** Not publicly documented. The Raymond Burr anomaly (see §6) is the only published artifact suggesting the audit surface is weak: Yellin himself couldn't explain *why* there were so many Raymond Burr altgenres. *"It's inexplicable with human logic. It's just something that happened."* ([Theoreti.ca summary of Madrigal](https://theoreti.ca/?p=5102))

---

## 5. Quality measurement

**Inter-annotator agreement.** Not publicly published. The manual + single-supervisor model is the de facto consistency mechanism.

**User feedback loops.**

- Pre-2017: thumbs-up/down + 5-star rating (deprecated 2017).
- Post-2017: thumbs-up/down only; behavioural signal (watch-to-completion, play-time, abandonment, replay).
- Critically — like Pandora — user feedback **reweights what's recommended, not what's tagged.** A user who downvotes a "Visually-striking Father-Son Movie" doesn't retroactively un-tag the film as "Father-Son"; their personal preference vector shifts.

**A/B testing.** Netflix is famous for industrial-scale A/B testing of personalisation; altgenres were continuously tested as row labels vs. alternatives. No published precision/recall on the altgenre labels themselves.

**Coverage vs. precision tradeoff.** The 76,897 figure included altgenres that contained no actual movies — the grammar generated combinations that the catalog didn't satisfy. This is a precision failure (false-positive altgenres) that's visible only because Madrigal/Bogost scraped sequentially-numbered URLs. ([Theoreti.ca summary](https://theoreti.ca/?p=5102))

---

## 6. Failure modes

**(a) Empty altgenres (the precision-without-coverage failure).** "Some microgenres contain no actual movies or shows as examples." ([Theoreti.ca summary of Madrigal](https://theoreti.ca/?p=5102)) Because the altgenre is *generated*, not enumerated, the grammar can produce empty slots. In a recommender this is fine (the slot just doesn't render); for a public-facing taxonomy it's noise.

**(b) Hallucination at scale — the Raymond Burr anomaly.** Netflix had an inexplicably high number of altgenres prominently featuring Raymond Burr and Barbara Hale. Yellin, asked on-record about it: *"It's inexplicable with human logic. It's just something that happened."* ([Theoreti.ca](https://theoreti.ca/?p=5102)) Lesson: when humans + machines combine, *some artifacts of the combination are unauditable.* Build for explainability or accept the noise.

**(c) Bogost generator — false generativity.** Bogost's reverse-engineering exposed that the grammar can produce indistinguishable-from-real altgenre strings that Netflix had never blessed. This is a structural feature, not a bug — but it implies the boundary between "real altgenre" and "plausible altgenre" is statistical, not editorial.

**(d) Cultural / "American soul" framing.** Madrigal himself flagged the system as *"a window unto the American soul"* — i.e. it encodes the categorisation instincts of a small US-based tagger team. Same Anglo-American bias failure mode that Pandora has. ([Seaver](https://medium.com/anthropology-and-algorithms/on-reverse-engineering-d9f5bae87812))

**(e) Term drift.** The shift in adjective usage between 2014 and 2024 (and the corresponding contraction of public-facing altgenre codes from 76,897 to ~36,000) suggests Netflix has been actively pruning + remapping. Not documented in detail, but the count change is real.

**(f) De-emphasis as product surface.** Altgenres were *the* dominant Netflix homepage row-label format ~2014–2017. They have been progressively replaced by:
- Three-word descriptors (post-2023; *"Netflix reels in viewers with three-word hooks"* — [Deccan Herald](https://www.deccanherald.com/amp/story/business/netflix-reels-in-viewers-with-three-word-hooks-2848151))
- Editorially-curated row titles ("Twisted Christmas", "Human Connections", "Small Town Scares")
- Foundation-model embeddings driving recommendation without exposing the underlying taxonomy.

The altgenres are still *in the metadata layer* — Netflix still tags atomic attributes — but the compound altgenre strings are no longer the front-line product surface.

**(g) Remote-tagger reduction.** A former tagger interviewed in 2018 reported that "Netflix no longer employs remote taggers, bringing metadata analysis in-house." The function survived; the cohort shrank and centralised. ([WebSearch result summary, citing Diggit / Tom's Guide aggregations](https://www.tomsguide.com/features/netflix-tagger))

**(h) Cognitive load on the curator.** Gulmahamad: *"We work with a sprawling palette of tones and storylines to capture the spirit of our content."* 200 attributes per title × subjective tags ("quirky", "pretentious", "morally compromised protagonist") is hard, slow, and resistant to crowdsourcing.

---

## Transferable to HelpME2C?

| Aspect | Verdict |
|---|---|
| **Compound altgenres assembled from atomic tags via a grammar** | YES — decisive. This is the cleanest precedent for HelpME2C's theme-bridge expansion: don't curate 200 bridges directly, curate ~30 atomic facets + a grammar that composes them. Compound count grows combinatorially without per-compound editorial cost. |
| **Atomic tags = human; compound altgenres = machine** | YES — architectural keystone. Wouter should curate atomic facets (mood, structure, audience-relationship, "after-credits feeling", etc.) and let the engine compose theme-bridges from them. |
| **Templated grammar with fixed slot order (Region + Adjectives + Noun + Set in… + Based on… + About…)** | YES with caveats — adapt for cross-medium (TV+anime) and for HelpME2C's narrative-bridge framing rather than Netflix's "movies starring X" frame. |
| **36-page training manual (the rubric) as the consistency anchor** | YES — Wouter should write a single rubric document for the atomic facets *before* expanding to 200 bridges. This is the closest analogue to "writing down the conventions" that makes future-Wouter consistent with past-Wouter. |
| **~200 hand-tagged attributes per title** | NO — way over budget at HelpME2C's scale. Cap at ~20–40 atomic tags per title; let the bridge taxonomy do the lifting. |
| **0–5 ordinal scoring (matches Pandora convergently)** | YES — converged on independently by Pandora and Netflix; use it. Booleans are too lossy for similarity math. |
| **Single supervisor + small specialist team for consistency** | N/A at n=1, but the rubric document substitutes for the supervisor. Build the rubric *as if* a future tagger is reading it cold. |
| **Generative grammar produces empty altgenres (precision-without-coverage failure)** | LESSON — when expanding 41 → 200+ bridges via grammar, set a minimum-coverage threshold (e.g. a bridge must match ≥N titles before it surfaces). |
| **Raymond Burr anomaly — unauditable human+machine artifacts** | LESSON — build an explicit "explain this bridge" audit query; don't let combinations slip through that can't be justified back to atomic tags + a curator's signature. |
| **Public-facing taxonomy can be reverse-engineered if URLs are sequential** | LESSON — for HelpME2C, decide deliberately whether the taxonomy is open or trade-secret. Netflix exposed it inadvertently; Pandora kept it closed. |
| **De-emphasis post-2017 as foundation models take over** | OPEN QUESTION — does HelpME2C's bridge taxonomy face the same fate? Probably yes in 3–5 years, *but* the labeled corpus generated by hand-curation now will be the training signal that lets the foundation-model successor work. The Netflix arc says: build the taxonomy, use it to label, accept that the surface presentation will eventually shift to learned representations. |
| **Cultural bias from a small US-based team** | YES, urgent (same lesson as Pandora) — single-curator setup will systematically over-represent Wouter's framing. Plan for an external review pass. |
| **Subjective tags ("quirky", "morally compromised") work but are slow** | YES — these are exactly the high-value bridges. The Netflix lesson is they're worth the time *if* the rubric anchors them; otherwise they drift. |

---

## Notable evidence gaps

- Could not retrieve Madrigal's original Atlantic article (blocked by The Atlantic and the Internet Archive at fetch time). Quotes attributed to it are via secondary cites that themselves quote verbatim.
- Could not retrieve the Fast Company Gulmahamad profile direct (403). Used Bustle + her LinkedIn for cross-reference.
- The 36-page manual itself has never been publicly leaked. We know its length and broad contents only by Yellin/Madrigal characterisation.
- No published IAA / Cohen's kappa for Netflix tagger consistency.
- Exact present-day altgenre count is approximated from third-party scrapers; Netflix has never published a definitive number post-2014.
- Netflix Tech Blog Foundation Model posts ([this one](https://netflixtechblog.com/foundation-model-for-personalized-recommendation-1a0bd8e02d39) and [the integration post](https://netflixtechblog.medium.com/integrating-netflixs-foundation-model-into-personalization-applications-cf176b5860eb)) confirm a shift toward embeddings but do not explicitly say "we are deprecating altgenres" — that conclusion is inferred from the surface-area changes + the 2018 remote-tagger reduction + the rise of three-word descriptors.

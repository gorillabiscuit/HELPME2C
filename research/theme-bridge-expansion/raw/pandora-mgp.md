# Pandora — Music Genome Project (MGP / MGP2)

Source pack for HelpME2C theme-bridge-expansion research. Drafted 2026-05-17.

The Music Genome Project (MGP) is the canonical "deep editorial taxonomy as competitive moat" precedent — a hand-curated, hundreds-of-attributes-per-item, human-musicologist-driven dataset built specifically to power similarity / recommendation. It is the longest-running example we have (active since 2000, still in production under SiriusXM as of 2026) and the most thoroughly documented in court filings, IPO disclosures, patents, conference talks and ex-employee testimony.

---

## 1. Vocabulary structure

**Faceted, multi-axis, with a separate genre/subgenre hierarchy layered on top.** Songs are *not* placed into a single slot in a tree — they are scored against hundreds of orthogonal "genes," and a separate ~1,300+ subgenre taxonomy ("Artist Genome Taxonomy" / AGT) is built on top of the gene scores plus categorical assignments.

- "Each song is analyzed using up to 450 distinct musical characteristics by a trained music analyst… melody, harmony, rhythm, form, composition and lyrics." ([Pandora MGP page; Wikipedia summary](https://en.wikipedia.org/wiki/Music_Genome_Project))
- Genes are not boolean: "Each gene is assigned a number between 0 and 5, in half-integer increments" — i.e. an 11-point ordinal scale per attribute. ([Wikipedia, *Music Genome Project*](https://en.wikipedia.org/wiki/Music_Genome_Project))
- Number of genes scales with genre complexity: "rock/pop (150 genes), rap (350 genes), jazz (~400 genes), world/classical (300–450 genes)." ([Wikipedia](https://en.wikipedia.org/wiki/Music_Genome_Project))
- Subgenre layer: "more than 1,300 subgenres" ([widely cited; see Pandora Community blog](https://community.pandora.com/t5/Community-Blog/What-is-the-Music-Genome-Project/ba-p/116426)); more recent "Artist Genome Taxonomy (AGT)" hierarchy is described as "a detailed hierarchy of genres with over 1,400 specific sub-genres, painstakingly organized by their expert Music Analysts." ([search aggregation, 2026](https://community.pandora.com/t5/Community-Blog/MGP2-What-s-Next-for-the-Music-Genome-Project/ba-p/120065))
- Patent confirms multi-dimensional vector representation: "each song represented by an n-dimensional database vector where each element corresponds to one of n musical characteristics," matched by weighted-Pythagorean distance. ([US Patent 7,003,515, *Consumer item matching method and system*, filed May 16 2002, issued Feb 21 2006](https://patents.google.com/patent/US7003515B1/en))

Songs can sit in multiple subgenres implicitly (they're scored on every applicable gene), but each song has a primary genre/subgenre assignment for routing.

**MGP2 evolution (announced ~2019–2020):** Pandora moved from numeric-only gene scoring to "a new system called MGP2, featuring a collection of new taxonomies and a text-based tagging system that allows more accurate and complete music annotation." Two flagship additions: a refined Genre taxonomy and the **Analysis Mood Taxonomy (AMT)**, "allowing songs to be tagged with a wide range of specific emotional states. These tags are easier for humans to interpret and also easier for machine learning models to use as inputs." ([Pandora Community blog, *MGP2 — What's Next for the Music Genome Project*](https://community.pandora.com/t5/Community-Blog/MGP2-What-s-Next-for-the-Music-Genome-Project/ba-p/120065))

---

## 2. Vocabulary size + growth over time

| Metric | Value | Source |
|---|---|---|
| Attributes per song ("genes") | ~150 (rock/pop) up to 450 (jazz/world/classical) | [Wikipedia](https://en.wikipedia.org/wiki/Music_Genome_Project); patent (which oddly says "approximately 150 genes" with genre-specific extensions) |
| Distinct subgenres | 1,300+ (older), 1,400+ in AGT (current) | [Pandora Community](https://community.pandora.com/t5/Community-Blog/What-is-the-Music-Genome-Project/ba-p/116426); [MGP2 post](https://community.pandora.com/t5/Community-Blog/MGP2-What-s-Next-for-the-Music-Genome-Project/ba-p/120065) |
| Initial build duration | 5 years before commercial launch | [Wikipedia](https://en.wikipedia.org/wiki/Music_Genome_Project); confirmed in [Westergren NPR interview, Dec 1 2011](https://www.npr.org/2011/12/01/143017833/tim-westergren-founder-of-pandora) |
| Songs analyzed by hand (lifetime) | ~2.2 million as of MGP2 era | [MGP2 post](https://community.pandora.com/t5/Community-Blog/MGP2-What-s-Next-for-the-Music-Genome-Project/ba-p/120065) |
| Songs analyzed per month | ~10,000 (as of 2012) | [Peninsula Press, *Pandora staff — not computers — analyze 10,000 songs each month*, March 27 2012](https://archive.peninsulapress.com/2012/03/27/pandora-staff-not-computers-analyze-10000-songs-each-month/) |
| Catalog gap by 2011 | ~800,000 analyzed vs. >100M available globally; the "long tail" problem | summarized in [Pandora Community, *Future of the MGP*](https://community.pandora.com/t5/Community-Blog/The-Future-of-the-Music-Genome-Project-Unlocking-the-Long-Tail/ba-p/176424) |

**Growth trajectory.** First five years (2000–2005) were all build, no commercial product — pure taxonomy + corpus construction before Pandora launched as a service in 2005. From 2005 to ~2019, growth was linear at the ~120k songs/year ceiling of the analyst team. MGP2 (~2019–) is the breakpoint: ML models trained on the 2.2M hand-analyzed seed are now used to extend gene scores to "tens of millions of songs in the catalog," which is the first time the corpus has grown faster than human throughput. ([MGP2 post](https://community.pandora.com/t5/Community-Blog/MGP2-What-s-Next-for-the-Music-Genome-Project/ba-p/120065))

---

## 3. Editorial workflow

**Who.** "Music Analysts" — internal title. Hired exclusively from people with formal musical training.

- Hiring criterion: "Trained musicologists — each with at least a four-year degree in music theory, composition, or performance." ([Pandora MGP page, widely cited in secondary sources](https://en.wikipedia.org/wiki/Music_Genome_Project))
- Selection: "Applicants must take a test and be able to demonstrate skills of identifying and judging music" ([Peninsula Press, March 27 2012](https://archive.peninsulapress.com/2012/03/27/pandora-staff-not-computers-analyze-10000-songs-each-month/))

**How many.** The two reliably-cited team-size numbers are an order of magnitude apart, depending on what's being counted:

- 30 musicologists during the initial 5-year build-out (2000–2005). Widely cited in secondary sources; ultimately traces back to Westergren's early press interviews and the Pandora corporate site.
- 26 active music analysts as of 2012 (Peninsula Press), ~25 as of 2017 ([Scott Pinkmountain on Talkhouse](https://www.talkhouse.com/scott-pinkmountain-talks-working-as-a-music-analyst-for-pandora/)).
- "Specialist, Music Analysis" and "Music Analyst 1 / 2" roles still listed on the Pandora careers site as of 2026, indicating the function is still staffed under SiriusXM. ([Pandora careers — Music Operations](https://www.pandora.com/careers/musicops))

**Time per song.** This is the famous number, and it survives close scrutiny:

- "20 to 30 minutes per song." ([Wikipedia](https://en.wikipedia.org/wiki/Music_Genome_Project), citing Pandora's own statements)
- "Between ten minutes to a half-an-hour to process." ([Peninsula Press, 2012](https://archive.peninsulapress.com/2012/03/27/pandora-staff-not-computers-analyze-10000-songs-each-month/))
- Headline phrasing: "20 to 30 minutes for each four minutes of song." (consistently repeated in press)

That gives a hard ceiling of roughly 2–3 songs/hour/analyst → 16–24 songs/day → ~400 songs/analyst/month → ~10,000 songs/month across the team, which matches the 2012 Peninsula Press figure exactly. Internally consistent and load-bearing.

**Review / consistency process.**

- Senior analyst supervises: Michelle Alexander (senior analyst, classical + pop, as of 2012) — "It's sort of my job to kind of corral the scoring and make sure that the herd stays together and thinks as one." ([Peninsula Press, 2012](https://archive.peninsulapress.com/2012/03/27/pandora-staff-not-computers-analyze-10000-songs-each-month/))
- "Analysts stay in communication with each other and periodically analyze the same song together to ensure that everyone is on the same page." ([Peninsula Press, 2012](https://archive.peninsulapress.com/2012/03/27/pandora-staff-not-computers-analyze-10000-songs-each-month/))
- "Ten percent of songs are analyzed by more than one musician" — explicit inter-annotator agreement check. ([Wikipedia](https://en.wikipedia.org/wiki/Music_Genome_Project)) This is the closest thing in industry to a published IAA target for an editorial taxonomy at this scale.
- "Everyone gets trained to analyze individual music genomes for different styles of music. There's a pretty rigorous training that people go through." (Michelle Alexander, [Peninsula Press](https://archive.peninsulapress.com/2012/03/27/pandora-staff-not-computers-analyze-10000-songs-each-month/))

**Named people worth following.**

- Tim Westergren — co-founder, "Chief Strategy Officer," authored the original gene taxonomy in 2000. [NPR profile Dec 1 2011](https://www.npr.org/2011/12/01/143017833/tim-westergren-founder-of-pandora).
- Will Glaser — co-conceiver of the MGP idea (late 1999). [Wikipedia](https://en.wikipedia.org/wiki/Music_Genome_Project).
- Jon Kraft — co-founder, Savage Beast Technologies (January 2000).
- Eric Bieschke — "Second employee" (joined 2000), Chief Scientist for many years; "built the first prototypes for playlist algorithms." [LinkedIn](https://www.linkedin.com/in/bieschke/); [MLconf speaker page](https://mlconf.com/speakers/eric-bieschke/).
- Michelle Alexander — senior analyst, on-record on consistency / corraling process.
- Scott Pinkmountain — ex-music-analyst (~9 years), wrote a first-person reflection on the job. ([Talkhouse](https://www.talkhouse.com/scott-pinkmountain-talks-working-as-a-music-analyst-for-pandora/))
- Erik Schmidt — Senior Scientist, MGP-derived ML systems (Thumbprint Radio); presented at Machine Intelligence Summit San Francisco, March 23–24 2017. ([blog.re-work.co](https://blog.re-work.co/music-discovery-at-pandora/))

---

## 4. Tooling

Pandora has been *cagey* about screenshots of the actual analyst UI. What we can piece together:

- Songs are analyzed track-by-track, single-song-deep. Not bulk-edit. The 20–30-minute-per-song figure precludes batch processing.
- Analysts listen with **headphones** (Pinkmountain emphasizes this: "listened to closely with headphones on"). The analysis is acoustic-perceptual, not metadata-derived.
- Pre-MGP2: numeric scoring per gene on the 0–5 / half-step scale, presumably some kind of dense form with hundreds of fields.
- Post-MGP2 (~2019+): "a new, text-based tagging system that allows more accurate and complete music annotation" — the explicit shift from numeric-only to text-tag-based is the biggest tooling change documented in MGP's 25-year history. ([MGP2 post](https://community.pandora.com/t5/Community-Blog/MGP2-What-s-Next-for-the-Music-Genome-Project/ba-p/120065))
- Suggestion engine: "Once the science team updated machine-learning models to use the new tags as inputs, they saw immediate improvements in predictions, recommendations, and track grouping, allowing these models to leverage information from 2.2 million analyzed songs onto tens of millions of songs in the catalog." This phrasing strongly implies ML now *proposes* tag values that humans approve — i.e. human-in-the-loop, not full autonomy. ([MGP2 post](https://community.pandora.com/t5/Community-Blog/MGP2-What-s-Next-for-the-Music-Genome-Project/ba-p/120065))
- Disagreement resolution: the "periodically analyze the same song together" + "10% double-analyzed" mechanisms above are the only documented cross-curator checks. No mention of formal Cohen's-kappa-style monitoring in any public Pandora source we found — could not verify.

---

## 5. Quality measurement

Three distinct loops:

**(a) Inter-annotator consistency.** The "10% of songs are analyzed by more than one musician" rule plus periodic group-analyze-the-same-song sessions are the on-record IAA mechanisms. No published kappa numbers — but the fact that there's a deliberate double-analysis rate is itself rare in editorial taxonomies.

**(b) User feedback (thumbs).** Pandora's thumbs-up / thumbs-down is the dominant runtime signal:
- "A thumbs-up signals that similar songs should appear more frequently, while a thumbs-down removes that specific track from the station and avoids playing similar songs."
- "Thumbs-up increases the weight of features present in that track/artist for that station; thumbs-down reduces them or excludes similar tracks."
- The aggregate feedback "refines global models: which genome features correlate with likes/dislikes, seasonal trends, and demographic patterns." (synthesis from [Pandora Community thread, *Station Algorithm*](https://community.pandora.com/t5/My-Collection/Station-Algorithm/td-p/117347), and the FastCompany piece [*In Pandora's Big Data Experiments, You're Just Another Lab Rat*](https://www.fastcompany.com/3015729/in-pandoras-big-data-experiments-youre-just-another-lab-rat) — Bieschke is quoted extensively on the A/B testing posture there.)
- Crucially, thumbs do **not** retroactively edit gene values for the song; they reweight the station-level preference vector. Gene scores are treated as ground-truth musicology.

**(c) A/B testing.** Pandora runs continuous online A/B tests; Bieschke described listeners as "test subjects" in the 2013 FastCompany piece. Used to validate (i) new recommendation strategies on top of MGP, (ii) new gene weighting schemes, (iii) MGP2 rollout.

**Notably absent:** publicly published precision/recall numbers on the MGP labels themselves. The taxonomy is treated as definitional ("we hand-curated it, therefore it is correct") rather than empirically evaluated against an external gold standard. This is consistent with the Copyright-Royalty-Board posture below, where Pandora characterised MGP labels as the definitional musicological truth of each track.

---

## 6. Failure modes

**Long-tail coverage gap.** Most-documented MGP failure. By 2011 only ~800,000 songs analyzed against a global catalog measured in the tens of millions; the gap widened every year as music releases accelerated. Pandora openly framed MGP2 as the *response* to this gap: "discussions around enhancing the Music Genome Project with artificial intelligence focus on integrating machine learning to scale analysis of unanalyzed tracks and uncover lesser-known music in the 'long tail' of catalogs." ([Pandora Community, *Future of the MGP*](https://community.pandora.com/t5/Community-Blog/The-Future-of-the-Music-Genome-Project-Unlocking-the-Long-Tail/ba-p/176424))

**Subjective-attribute capture.** Brooklyn Rail critique (Nov 2014): "attributes which might lead a listener to want to hear a song repeatedly can be exceedingly difficult to isolate, and in fact the list is effectively infinite — a listener's pleasure center may be activated by a subtle, or barely perceptible, vocal inflection, or a style of guitar strumming, or a kind of amplifier distortion." ([Brooklyn Rail, *Feature Creeps*](https://brooklynrail.org/2014/11/music/feature-creeps/)) → finite gene lists capture some-but-not-all of what makes a song hit.

**Cultural / Anglo-American bias.** "The project's origins in a U.S.-based framework mean analysts — predominantly familiar with Anglo-American pop and rock — may overlook or inadequately capture elements from global traditions, effectively naturalizing a Global North perspective on music diversity." (search aggregation, traced to [Grokipedia / academic critique](https://grokipedia.com/page/Music_Genome_Project))

**Tempo / arc flatness.** Users complain MGP "seems unable to deliver the ebbs and flows in tempo and musical texture which characterize good mix tapes or college radio shows." (same source aggregation)

**Hallucination at scale (MGP2 era).** Critics flag that the ML extension to the long tail "risks inheriting or amplifying these initial biases" — i.e. now the 2.2M hand-labeled core is propagated onto tens of millions of unlabeled tracks via models that bake in any systematic gaps the human team had.

**Curator burnout / churn.** Pinkmountain stayed ~9 years before leaving and writing publicly. The job is a marathon of headphones-on close listening; the "Frank Zappa vs. new-age piano" complexity gap (Alexander, Peninsula Press) is real. No public attrition number, but the team has stayed at 25–30 analysts for ~15 years, suggesting steady-state hiring against ongoing churn.

**Acquisition / corporate signal.** Pandora → SiriusXM completed Feb 1 2019; SiriusXM did follow-on layoffs (~60 positions across the combined company) in May 2019. ([Digital Music News, May 2 2019](https://www.digitalmusicnews.com/2019/05/02/siriusxm-pandora-job-cuts/)) The Music Analysis function was *not* eliminated — Pandora careers still lists Music Analyst 1, Music Analyst 2, Specialist Music Analysis as of 2026 — but the broader bet visibly shifted from "deeper hand-curation" to "MGP2 + ML extension to the long tail." The acquisition did not kill the moat but it did re-cap it.

**Patent expiration.** US 7,003,515 expired May 9 2023. ([Google Patents](https://patents.google.com/patent/US7003515B1/en)) The legal moat around the matching method is gone; only the trade-secret labeled corpus and the analyst team remain as defensive assets.

**Legally-tested defensibility.** In Webcasting IV / *Pandora vs. SoundExchange* rate-setting proceedings (Copyright Royalty Board, ~2014–2016), Pandora's filings positioned the MGP labor as the core of its differentiation: "The process of including sound recordings within the Music Genome Project's algorithms is time- and labor-intensive work accomplished by extremely knowledgeable and credentialed musicologists with extensive experience and expertise in the field." ([CRB filing](https://crb.gov/rate/16-CRB-0003-PR/statements/pandora/statement.pdf); we could not retrieve the PDF text directly — characterisation is from secondary citation in [RAIN News coverage](https://rainnews.com/pandora-vs-soundexchange-pandoras-rebuttal-in-copyright-duel-of-government-documents/)) Useful precedent: courts and regulators have accepted human-curated taxonomy as a real economic asset.

---

## Transferable to HelpME2C?

| Aspect | Verdict |
|---|---|
| **Faceted, multi-axis vocabulary (not flat / not pure hierarchy)** | YES — already the HelpME2C theme-bridge model; MGP validates the bet at 25-year horizon. |
| **Hundreds of attributes per item** | NO — way over budget for a single curator. Cap at the 41-bridge density; pick the highest-leverage attributes only. |
| **20–30 min/item rigorous deep-curation** | PARTIAL — viable for the *bridge definitions themselves*; not viable for per-title scoring. Per-title work should be ML-proposed, curator-approved. |
| **Inter-annotator double-analysis (10%) for consistency** | NO (single curator, n=1) — but adapt as **time-shifted self-consistency**: re-curate a 5–10% sample after 3 months and measure drift. |
| **Numeric 0–5 half-step scores per attribute** | YES, low-cost — better than booleans for downstream similarity math, but write a one-screen rubric per attribute to anchor scoring. |
| **Hire credentialed domain experts, not random annotators** | YES (already in posture — Wouter is the curator and the editorial filter). The lesson is *don't crowdsource theme bridges to volunteers*. |
| **Senior analyst "corrals" the herd** | N/A at n=1, but write the rubric *as if* a second curator will join — forces explicit conventions. |
| **Use hand-curated seed as ML training data to extend long tail (MGP2)** | YES, decisive — this is the cleanest precedent for "grow 41 → 200+ without poisoning": hand-curate the seed bridges rigorously, then use them as labels to propose new candidates from corpus signal. |
| **Treat thumbs / user feedback as *station-level reweighting*, not as edits to ground-truth labels** | YES — important architectural separation; preserves taxonomy integrity. |
| **Long-tail gap is inevitable and *defines* the v2 strategy** | YES — plan now for the inflection where hand-curation can't keep up. |
| **Cultural bias is a real failure mode in single-curator taxonomies** | YES, urgent — Wouter as solo curator will systematically under-tag non-Anglo / non-Western theme bridges. Schedule an external review pass before publishing the 200-bridge set. |
| **Patent the matching method as moat** | NO — MGP's own patent expired; the labeled corpus + the analyst rubric are the durable moat, not the math. |

---

## Notable evidence gaps

- Could not retrieve the actual CRB / SoundExchange Pandora testimony PDFs (403). Working from secondary citations.
- Could not retrieve The Atlantic / Fast Company / TheStreet originals (paywalls + 403s). Cross-referenced via multiple secondary cites.
- ISMIR 2015 paper *Modeling Genre with the Music Genome Project* (Lamere et al.) is a primary academic source we could not parse from the PDF binary — would substantially deepen §1 and §2 if read in full. Filed under: known unknown.
- Specific Cohen's-kappa or precision/recall numbers on MGP labels: **not publicly disclosed.** Plausibly internal-only.
- Exact dates for MGP2 rollout: not pinned; the Pandora Community blog post is undated in our extract.

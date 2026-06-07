# Theme-bridge expansion — REPORT

**Date:** 2026-05-17
**Scope:** how should one curator (Wouter) grow HelpME2C's cross-medium theme-bridge set from **41** to **200+** without poisoning the engine?
**Constraints anchoring the recommendations:** Phase 1A scale (<1000 users), rule-based scoring only (no ML training infrastructure), editorial work is Wouter-time-bound, the 41 existing bridges are baseline (not to be discarded), high-precision-with-growable-recall (a bad bridge actively harms recs).
**Companion artefacts:** `research/theme-bridge-expansion/raw/*.md` (per-source evidence); `research/theme-bridge-expansion/HANDOFF.md` (ticket-ready plan).

Every non-obvious claim cites or links to a raw file or external URL. This is a synthesis document.

---

## Contents

### Part 1 — Per-source synthesis (12 sources)
- [Pandora MGP](#pandora-mgp) — 25-year hand-curation precedent; ~450 attributes × ~30 musicologists × 5 years; 0–5 ordinal scoring; MGP2 = "use hand-labeled seed to ML-extend to long tail"
- [Netflix altgenres](#netflix-altgenres) — **compound from atomic via grammar** (76,897 surface altgenres from ~200 hand-tagged atoms); 36-page manual as the rubric; same 0–5 ordinal scoring as Pandora
- [TMDB keywords](#tmdb-keywords) — our upstream; ~18k flat free-text keywords, lowercase, no categories, reactive moderation; the noisy raw material we bridge FROM
- [IMDb keywords](#imdb-keywords) — 8-category flat keyword system, sock-puppet vulnerable, ~50% acceptable parent-child links via Heymann auto-hierarchy
- [AniList tags](#anilist-tags) — our other upstream; **423 tags across 25 categories** (live count 2026-05-17), per-title weight voting (`rank` 0–100), moderator-approved; the curated raw material we bridge TO
- [Letterboxd tags](#letterboxd-tags) — Showdown fortnightly cadence + HQ-canonical-tag-per-topic + Borda top-10; small Auckland team (16FT + 12PT)
- [Apple Music subgenres](#apple-music-subgenres) — slow, conservative, two-level hierarchy; ~1,000 editors globally; validates "shallow vocabulary is fine"
- [Spotify + Echo Nest](#spotify-echonest) — cluster-first / name-second pipeline (Glenn McDonald, 6,291 genres); Every Noise public map + Truffle Pig internal curator UI; **single-curator concentration risk** (McDonald laid off Dec 2023, Wrapped 2024 visibly worse)
- [AllMusic](#allmusic) — faceted (genre × style × mood × theme) is the gold-standard shape; 200+ moods, 80+ themes, 1,400 styles
- [Discogs](#discogs) — tight controlled vocabulary (540 styles), Master/Release model, vote-gated reputation; sourcing rule worth adopting verbatim
- [Mood-focused film taxonomies](#mood-taxonomies) — solo apps universally cap at 8–15 moods; auto-tagging at scale is universal past ~50 themes; Letterboxd lists show 100–200 items is the solo-curator ceiling per "node"
- [Academic taxonomy literature](#academic-taxonomy) — Sen/Vig/Riedl Tagommenders entropy filter kept ~1,128 of ~30k raw tags (96% pruning); Tag Genome's continuous `[0,1]` relevance scoring; Marchionini facets > one big tree

### Part 2 — Editorial workflow design
- [Vocabulary structure decision](#vocab-structure) — flat vs hierarchical vs faceted (verdict: **shallow faceted with flat top layer**)
- [Candidate generation](#candidate-generation) — sentence-transformers offline pass (model, anchors, threshold, batch size)
- [Curator UI](#curator-ui) — where it lives, what's on screen, what's bulk vs deep
- [Session shape](#session-shape) — 5–10 bridges/sit, 2 sits/week, ~12 weeks to reach 200; what the productivity literature actually says
- [Quality measurement](#quality-measurement) — per-bridge firing-rate telemetry; rec-quality impact via eval-harness extension
- [Negative-transfer guardrails](#negative-transfer) — how to detect a poisoning bridge vs an inactive one

### Part 3 — 90-day 41 → 200 plan
- [Phase 1 (weeks 1–2): tooling](#phase-1) — what gets built first, what depends on what
- [Phase 2 (weeks 3–10): curation](#phase-2) — realistic per-week throughput, 41 → 100 → 200 trajectory
- [Phase 3 (weeks 11–12): validation](#phase-3) — measuring the 200-bridge taxonomy is better than 41
- [Engineering-vs-curator-time split](#split) — what AI writes vs what Wouter does

---

# Part 1 — Per-source synthesis

The 12 sources cluster into four families. Each family answers a different sub-question, and the synthesis recombines them into the workflow design that follows.

| Family | Sources | What the family answers |
|---|---|---|
| **Deep-editorial precedents** | Pandora MGP, Apple Music, AllMusic | What does a long-running, single-vocabulary, deep-tagging editorial operation actually look like? |
| **Compositional / cluster-first precedents** | Netflix altgenres, Spotify / Echo Nest | How do you scale a vocabulary past what one team can hand-curate? |
| **Community-curated precedents (our upstreams)** | TMDB keywords, IMDb keywords, AniList tags, Letterboxd tags, Discogs | What does open-contribution editorial governance actually look like, and what are we inheriting from our upstreams? |
| **Mood / academic baselines** | Mood-focused film taxonomies, Academic taxonomy literature | What's the empirically-grounded ceiling for a single curator + LLM-extended vocabulary, and what taxonomic substrate does the literature endorse? |

<a id="pandora-mgp"></a>
## Pandora MGP

The canonical "deep editorial taxonomy as competitive moat" precedent. ~450 musical attributes ("genes") per song, 20–30 min/song, ~30 musicologists across the 5-year initial build-out (2000–2005), ~10,000 songs/month sustained team throughput, **10% of songs double-analyzed as on-record inter-annotator-agreement check**. Most-actionable shift: **MGP2** (~2019+) graduated from numeric-only gene scoring to text-tag-based annotation, then used the 2.2M hand-analyzed core as training labels to ML-extend gene scores to "tens of millions of songs" in the long tail.

**What transfers to HelpME2C** (full table in [raw/pandora-mgp.md](raw/pandora-mgp.md)):
- The **faceted multi-axis vocabulary** (not flat / not pure hierarchy) is validated at 25-year horizon → keep HelpME2C's existing shape.
- The **20–30 min/item rigorous deep-curation** is viable for *bridge definitions* themselves (not for per-title scoring — that's ML-proposed, curator-approved).
- The **hand-curated seed → ML-extended long tail** path (MGP2) is the cleanest precedent for the 41 → 200+ growth.
- **0–5 ordinal scoring per attribute** (half-step). Independently converged with Netflix.
- **Cultural/Anglo-American bias** is a documented failure mode of single-team taxonomies — schedule an external review pass before publishing.

**What does NOT transfer:**
- 30 musicologists. We have 1 curator. Bridge density per-theme is capped accordingly.
- Patent-the-method-as-moat. MGP's own patent expired May 2023. The defensible moat is the labeled corpus + the rubric, not the math.

<a id="netflix-altgenres"></a>
## Netflix altgenres

**The cleanest architectural lesson in this entire research run.** Altgenres are *compound, generative, templated* — not stored as a flat list, but assembled by a grammar from atomic tags. ~200 atomic story attributes per title (hand-tagged via the 36-page training manual), ~30 taggers globally at peak, **76,897 altgenres in Jan 2014** (Madrigal Atlantic). The atom is human; the compound is machine.

The Yellin grammar slot inventory (verified from secondary cites of Madrigal in [raw/netflix-altgenres.md](raw/netflix-altgenres.md)):

```
Region + Adjectives + Noun Genre + Based On… + Set In… + From the… + About… + Starring + For Age X to Y + Audience tag
```

Example: "Witty Comedies Featuring a Strong Female Lead" / "Sentimental Set in Europe Dramas from the 1970s" / "Visually-striking Imaginative Children & Family Movies".

**What transfers to HelpME2C — decisively:**
- **Humans tag atoms; machines compose compounds.** Don't hand-curate 200 bridge "compounds" directly. Curate ~30–40 atomic facets + a composition grammar.
- **A single rubric document is the consistency anchor for solo curation.** Netflix's 36-page manual is the closest analogue to writing down the conventions that make future-Wouter consistent with past-Wouter.
- **0–5 ordinal scoring** (same as Pandora, independently arrived at).
- **Empty altgenres** (precision-without-coverage failure) is a real risk — set a minimum-coverage threshold for any generated bridge (e.g. ≥N titles must match before it surfaces).
- **Raymond Burr anomaly** ("It's inexplicable with human logic. It's just something that happened" — Yellin) is the warning that when humans + machines combine, some artifacts are unauditable. Build an explicit "explain this bridge" audit query.

**The full transferability table** is in [raw/netflix-altgenres.md](raw/netflix-altgenres.md).

<a id="tmdb-keywords"></a>
## TMDB keywords (our upstream)

**This is the raw material we bridge FROM.** Flat free-text, lowercase, space-separated, no categories, contributor-driven (any logged-in account can add a keyword), reactive moderation (post-hoc, slow). ~**18,432 keywords** (moderator estimate via the [List of Keywords forum thread](https://www.themoviedb.org/talk/588418309251410457012d57)), ~13× growth since 2017. Daily ID exports at `files.tmdb.org/p/exports/keyword_ids_MM_DD_YYYY.json.gz`. Lowercase-canonical confirmed by HelpME2C's existing `tags.name` UNIQUE rule.

**What this means for HelpME2C's upstream** (operational implications, full detail in [raw/tmdb-keywords.md](raw/tmdb-keywords.md)):

1. Our `tags` table contains exactly the strings TMDB contributors wrote — including occasional junk (`cool summer plannings`, `midlife identity and a crime drama`, `girl friend or colleague`). Filter on ingestion via simple heuristics (length, conjunction count).
2. **Pre-approved trivia keywords** (`3d`, `duringcreditsstinger`, `aftercreditsstinger`, `woman director`) are technical metadata, not themes — explicitly exclude from bridge-candidate generation.
3. **TV vs movie asymmetry**: TV section explicitly *encourages* genre-as-keyword (`sitcom`, `anime`, `dark comedy`); movies explicitly *ban* it. Bridge logic crossing TV/film needs to know about this.
4. **Synonym proliferation is unmanaged upstream** (`super power` vs `superpowers` vs `superhuman` may all coexist; TMDB has no merge tool). The bridge layer is the only place HelpME2C can declare them equivalent.
5. **Stale orphan keywords** — restrict bridge candidates to keywords attached to ≥N titles in our local catalogue, not the upstream existence list.

The **single most actionable lesson**: TMDB's keyword vocabulary is the raw material, not the product. The work that turns 41 themes into 200+ is the work of (a) deciding which TMDB keywords are bridge-worthy at all, (b) merging synonyms upstream-of-the-bridge, and (c) refusing to bridge the noisy long tail.

<a id="imdb-keywords"></a>
## IMDb keywords

A useful negative example. Flat hyphenated keyword strings + **8 categories at the attachment level** (subgenre, plot-detail, plot-timeframe, other, adult-only, potentially-offensive, character, title-display). Per-attachment relevance voting drives the top-5 surfaced on title main pages. Academic measurement ([2022 *Journal of Library Metadata* paper](https://www.tandfonline.com/doi/abs/10.1080/19386389.2022.2056408)): IMDb plot keywords achieve **average recall 23.38% / precision 18.89%** against OCLC FAST headings on 100 documentary films.

**Failure modes catalogued in [raw/imdb-keywords.md](raw/imdb-keywords.md):** orphan keywords (`mother-teaches-her-daughter-how-to-crack-an-egg` — single-attachment), sock-puppet upvoting, reference-as-keyword spam (`avengers-infinity-war` on unrelated titles), keyword inflation (*Inland Empire*: 1,672 keywords), no synonym handling. The 2014 hand-picked "Interesting Keywords" overlay frozen since 2014 — "even curated overlays atrophy without active maintenance."

**Most actionable lesson:** IMDb's failure is the workflow, not the vocabulary. Open-contribution + thumbs voting at scale produces a noisy long tail staff cannot prune. HelpME2C's single-curator vocabulary is structurally protected — but only if the curator has tooling to scale (search-before-mint, "which TMDB keywords have no bridge yet" reports, periodic vocabulary review).

<a id="anilist-tags"></a>
## AniList tags (our other upstream)

**423 tags across 25 categories, live-confirmed 2026-05-17.** Faceted single-category-per-tag. Per-title weight voting (`rank` 0–100). Moderator-approved (~25 active humans circa 2019, similar order today). Each tag has a global `description` (80–150 chars, reads like a dictionary entry), `isAdult`, `isGeneralSpoiler` flags. Explicit subjective-rejection rule: *"tags should not be ones that are often considered subjective, such as 'moe', and not as descriptive as eye color"*.

**Category breakdown** (live, from [raw/anilist-tags.md](raw/anilist-tags.md)):

| Category | Count | Bridge candidate for HelpME2C? |
|---|---|---|
| Cast-Traits (73), Cast-Main Cast (12) | 85 | **No** — already blacklisted in `recommend.ts:47-54` (cast composition ≠ theme) |
| Sexual Content | 67 | **No** — `isAdult`-gated, out of scope |
| Demographic (5: Josei, Kids, Seinen, Shoujo, Shounen) | 5 | **No** — publication target ≠ content |
| Technical | 21 | **Maybe** — style markers; review case-by-case |
| Theme-* (12 sub-categories) | 142 | **Yes** — primary bridge surface |
| Setting-* (3 sub-categories) | 38 | **Yes, narrowly** — setting-as-theme is legitimate (Post-Apocalyptic, Dystopia, Cyberpunk) |
| Theme-Other-* (Organisations, Vehicle) | 17 | **Yes, narrowly** — specific enough to anchor |

So **~200 AniList tags are bridge-candidate-eligible** out of 423 total. That's the realistic upper bound on the AniList side of HelpME2C's bridge work — comfortably aligned with the 200-bridge target.

**Other transferable design decisions:**
- **Trust the rank.** Use `minimumTagRank` of 50–70 for bridge anchors (AniList itself defaults the browse UI to 18% — too permissive for our purpose).
- **No synonyms in the canonical AniList model** (Time Loop / Time Manipulation / Time Skip are unrelated in the API). Maintain a curated synonym map at the HelpME2C bridge boundary.
- **Adopt per-tag descriptions** (80–150 char dictionary entries) for every HelpME2C theme. AniList's voice is the right voice.
- **Adopt the subjective-rejection rule** ("no 'moe'") as a §3 banned-pattern of theme-bridge expansion.

<a id="letterboxd-tags"></a>
## Letterboxd tags + Showdown

**The closest live analogue to "what does a small editorial team actually do all day" for film.** Auckland-based, founder-led (Matthew Buchanan + Karl von Randow), **16 full-time + 12 part-time** as of Sept 2023, deliberately *no personalised recommender*. The editorially-interesting tag system is on **lists**, not films. The Showdown mechanic is the most directly-transferable pattern:

```
Every fortnight:
  1. HQ picks a topic (e.g. "Best film detectives")
  2. HQ coins a canonical tag (e.g. showdown-detectives)
  3. Users make + tag lists during the fortnight (top-10 each counts)
  4. Borda-aggregated consensus published the following second Thursday
```

78+ historical Showdown topics catalogued in [raw/letterboxd-tags.md](raw/letterboxd-tags.md). Recent topics: *Best film detectives, Best contemporary costuming in film, Best directorial debuts by actors, Best video-game adaptation, Best ensemble casting…*

**Transferable patterns:**
- **HQ-canonical-tag-per-topic.** One canonical theme slug; synonyms live separately. This is exactly what HelpME2C should do for each new theme bridge.
- **Fortnightly cadence.** Monthly is too slow; weekly is too noisy. 14 days forces editorial discipline without burnout.
- **Top-10-only Borda counting.** When aggregating user contributions to a theme (if HelpME2C ever does), only the top-N counts. Stops single-vote spam.
- **Editorial-first product positioning** (cross-medium theme bridges as a curated map, not a black-box recommender).
- **Auckland small-team viability** — 16+12 humans running the largest film social network on the planet validates that the HelpME2C single-curator phase is *not weird*.

**Patterns to NOT transfer:**
- **Open user-tag vocabulary on films.** HelpME2C's closed theme system is the point. Letting users tag freely would defeat it.
- **No tag descriptions.** Inherit AniList's discipline (per-tag description) here, not Letterboxd's lack of one.
- **No per-attachment weight.** AniList's `rank` is the right call.

<a id="apple-music-subgenres"></a>
## Apple Music subgenres

The "human-first, algorithm-second" posture, deliberately conservative. Two-level genre → subgenre hierarchy, ~hundreds of music subgenres, **single-digit additions per year** (compare Spotify: hundreds per year). ~1,000 editors globally (industry estimate, not Apple-confirmed). Beats Music acquisition 2014 brought the curation DNA. Editorial leadership: Zane Lowe, Ebro Darden, Rachel Newman, Julie Pilat, Scott Plagenhoef.

**Strongest single lesson for HelpME2C:** a small, slowly-growing, deliberately coarse taxonomy can serve a 100M-song catalogue *if* the curation team has authority and consistency. Wouter's 41 → 200+ expansion is **closer in shape to Apple's model than Spotify's**, and should be planned with Apple's discipline (slow, deliberate, justifiable per-bucket additions) rather than Spotify's volume.

What does not transfer: 1,000 editors and a closed CMS without public versioning. HelpME2C should treat the theme-bridge set as a versioned artifact (Git-tracked, schema-validated) from the start. Full table in [raw/apple-music-subgenres.md](raw/apple-music-subgenres.md).

<a id="spotify-echonest"></a>
## Spotify + Echo Nest

The opposite design DNA from Apple. **Cluster-first, name-second** pipeline: internal tooling surfaces unlabeled clusters of artists with shared listening patterns → human (Glenn McDonald, the data alchemist) listens → if cluster is coherent, find or coin a name → bind to artists, generate "Sounds of …" playlist. **6,291 named genres** at the December 2023 snapshot; ~hundreds added per year over a decade by an effectively one-person team.

The two key tools:
- **Every Noise at Once** (everynoise.com) — Glenn McDonald's externally-published map; functioned as both user-facing discovery and internal debugging.
- **Truffle Pig** — internal sonic search engine where editors set thresholds on audio features (acousticness, speechiness, loudness, tempo, hotness) to pull candidate tracks.

**Strongest single lesson for HelpME2C — direct quote of the [raw/spotify-echonest.md](raw/spotify-echonest.md) verdict:**

> **Anchor names to evidence-bearing clusters, not to a priori taxonomies.** The reason Spotify's 6,291 genres mostly hold up is that each is grounded in a real co-listening cluster — even when McDonald invented the name, the *thing being named* existed in user behaviour. HelpME2C should not try to hand-design 200+ theme-bridges purely from Wouter's taste; it should mine candidate bridges from cross-tag co-occurrence in existing TMDB / AniList / MAL data and have Wouter act as the *judge-and-namer*, not the *designer-from-scratch*.

**Second strongest lesson — direct quote:**

> **Don't be one person.** McDonald's layoff (4 December 2023, part of Spotify's 17%-workforce cut) froze the entire substrate within hours; Spotify Wrapped 2024 was visibly worse for it. HelpME2C's theme-bridge set must be legible enough that a hypothetical second curator could pick it up — which argues for committing rationale per bridge to Git, not just the bridge labels.

<a id="allmusic"></a>
## AllMusic

The faceted-taxonomy gold standard. **Genre × Style × Mood × Theme** — four orthogonal axes. ~16 top-level genres, ~1,400 styles/subgenres, **200+ moods**, **80+ themes** (where "theme" in AllMusic's sense is activity/situation — "Road Trip," "Reflection," "Hanging Out," "At the Office" — distinct from "mood" which is texture).

Strongest single lesson: **the four-axis faceted shape (genre × style × mood × theme) is the right scaffolding for cross-medium bridging.** AllMusic proves the model works at scale; their failures are governance failures (ownership instability, lack of public governance docs), not structural failures.

Most-actionable cautionary tale: AllMusic has **no public mood/theme governance documentation** — moods are added/merged without public changelog. Stephen Thomas Erlewine's 2024 layoff from Xperi marks the end of the named-critic era. Treat the HelpME2C theme-bridge governance rules as a public artefact from the start to avoid this fate. Full detail in [raw/allmusic.md](raw/allmusic.md).

<a id="discogs"></a>
## Discogs

**Tight, deliberately-curated controlled vocabulary** with crowdsourced application and vote-gated reputation. 15 genres + **540 styles** (deliberately capped — "excess styles or sub-sub-genres cause the dropdown list on the submission form to become unmanageable"). Master/Release model groups variant releases of the same underlying work. Voting reputation gates contribution rights; the Contributor Improvement Program (CIP) throttles bad contributors.

**The sourcing rule is worth adopting verbatim for HelpME2C** (direct quote from Discogs Database Guidelines via [raw/discogs.md](raw/discogs.md)):

> "Only enter or change information that you can cite a trustworthy source for (stick to provable facts!) … The physical release must always be the main source, and external sources of information must be declared in the Submission Notes, explained in the Release Notes, and be verifiable as far as possible. Additionally, unsubstantiated information may be removed or rejected."

HelpME2C equivalent: every theme bridge entry has a citation (a specific scene, episode, review, or moment that justifies the bridge). Without sourcing, the bridge is unfounded and gets pulled.

**Master/Release model maps onto HelpME2C:** the Theme is the Master; individual TMDB-keyword + AniList-tag bridge memberships are the Releases. Stable identity at the top, specific instantiations below.

**Strongest single lesson:** a tight, deliberately-curated controlled vocabulary with sourcing rules and an audit trail will outperform a permissive crowd vocabulary every time, but only if the curator holds the line against scope creep. Discogs's 540-styles-and-no-more discipline is the same discipline HelpME2C needs at 200+ themes.

<a id="mood-taxonomies"></a>
## Mood-focused film taxonomies

Six clusters surveyed in [raw/mood-taxonomies.md](raw/mood-taxonomies.md):

1. **MovieLens Tag Genome** (academic-meets-practice) — 1,128 tags after entropy-pruning from ~30k raw user tags; continuous (movie, tag) relevance score in `[0, 1]`; text-derived features (review language) carry most of the signal.
2. **Nanocrowd / nanogenres** (powers Letterboxd's "Similar Films") — NLP clustering on review text; fully algorithmic; requires industrial review volume to work.
3. **MUBI Notebook** — small editorial team, essay-and-collection-driven, no formal mood taxonomy. *Editorial doesn't scale by tag.*
4. **A24 Notes** — brand-as-taxonomy, single-axis editorial framing, too coarse for 200-theme goal.
5. **Letterboxd community lists** — **the empirical demonstration that one person can hold a 100–200-film mood list and maintain it.** Top mood lists collect 5,000–50,000 likes over years. Beyond ~200 the curator becomes a librarian, not a tastemaker.
6. **Solo-built mood-recommender apps** (MoodieMovie, Mood2Movie, Moodies, MovieMood, Feelm) — **vocabulary universally caps at ~8–15 mood prompts.** Adding more dilutes the brand promise. **LLM auto-tagging is the universal scaling trick** — no solo project hand-codes 200+ moods.
7. **Plutchik-derived emotion taxonomies** — 8 primaries + 24 dyads = ~32 emotion labels. Useful as sanity check, not substitute for film-aesthetic vocabulary.

**Empirically-grounded ceilings** distilled from this set:
- ~10–40 named moods for *surface UX* (Plutchik 32, solo apps 8–15, top of any rec product).
- 100–200 items per "node" of taxonomy is the **solo-curator ceiling** (Letterboxd long-tail evidence).
- 1,128 tags is the **MovieLens entropy-cleaned vocabulary ceiling** before noise dominates.
- 200+ themes is a back-end vocabulary — the front-end shouldn't expose all of it as a flat list.

**The pragmatic move** (direct quote from [raw/mood-taxonomies.md](raw/mood-taxonomies.md)):

> Treat the 41 → 200 expansion as a **curator-seeded, LLM-extended, audit-pruned** pipeline. The curator does the *vocabulary design* (deciding which 200 themes exist and what their textual definitions are) — that's irreducibly human. An LLM does the *per-film application* of the vocabulary (assigning relevance scores to (film, theme) pairs at scale). An audit pass with concrete quality signals (entropy, cross-medium consistency, group-recommendation downstream metrics) prunes the long tail.

<a id="academic-taxonomy"></a>
## Academic taxonomy literature

Ten papers reviewed in [raw/academic-taxonomy.md](raw/academic-taxonomy.md), clustering around three poles: folksonomy critiques (Mathes 2004; Sinclair-Cardew-Hall 2008), tag-quality engineering (Sen-Vig-Riedl 2009, 2012; Heymann-Garcia-Molina 2006; Hotho et al. 2006), faceted/hierarchical/semantic structuring (Marchionini 2006; Specia-Motta 2007; Cantador et al. 2015; De Gemmis 2009).

**Cross-cutting empirical findings (citable summary):**

| Finding | Source | Number |
|---|---|---|
| Raw user tags are mostly noise | Sen 2007 → Tagommenders 2009 | ~21% usable; entropy filter prunes ~96% |
| Users prefer factual over subjective tags | Tagommenders 2009 | 995-user study |
| Tag-relevance is well-modelled as continuous | Tag Genome 2012 | `[0, 1]` per (item, tag) |
| Heymann hierarchy extraction modest-accuracy | Heymann 2006 / PMC review | ~50% acceptable parent-child links |
| Flat tag clouds serve exploration, not retrieval | Sinclair & Cardew-Hall 2008 | Empirical user study |
| Facets > single hierarchy for exploration | Marchionini 2006 / Flamenco | Theoretical + Flamenco data |
| Cross-domain at item-level is the hardest case | Cantador et al. 2015 | Taxonomic categorisation |

**Ten taxonomy-design choices the literature endorses for HelpME2C's situation** (direct distillation from [raw/academic-taxonomy.md](raw/academic-taxonomy.md)):

1. Use continuous `[0, 1]` (item, theme) relevance scores, not binary.
2. Keep the vocabulary curator-controlled; reject the open-folksonomy model.
3. Expose the 200-theme vocabulary as **faceted, not flat** (Marchionini 2006).
4. Hand-author seed (film, theme, relevance) triples for evaluation; LLM-extend; audit.
5. Don't try to derive the hierarchy automatically before the vocabulary is stable.
6. Link each theme to an external concept URI (Wikidata QID) for semantic richness.
7. Treat the cross-medium bridge as the **hard-mode case** (Cantador et al. 2015) — expect higher per-theme curation effort than literature averages.
8. Validate the subjective-over-factual hypothesis explicitly. (Sen's general finding is *against* subjective; HelpME2C is betting subjective is preferred for group-recommendation. Document this as falsifiable.)
9. Two-surface UI from day one of the expansion: discovery (cloud/grid) + retrieval (faceted/filterable).
10. Plan for the tripartite-graph data shape `(user, theme, item)` even if user-tagging isn't exposed in Phase 1A.

---

# Part 2 — Editorial workflow design

This section answers the six sub-questions from the brief. Each recommendation is anchored to a specific source from Part 1.

<a id="vocab-structure"></a>
## 2.1 Vocabulary structure: flat vs hierarchical vs faceted

**Verdict: keep the flat top layer; add lightweight faceting via a `facet` column on `THEME_MAPPINGS`. Do NOT build a hierarchy.**

Reasoning:
- **AllMusic** validates faceted (genre × style × mood × theme) as the gold-standard shape.
- **Apple Music** validates 2-level hierarchies as the conservative ceiling — Apple does single-digit genre additions per year and the structure is deliberately shallow.
- **AniList** uses faceted-single-category-per-tag (25 categories on 423 tags) and it works.
- **Marchionini 2006** explicitly argues: *several small facet trees beats one big hierarchy* for exploratory tasks. HelpME2C's group-rec use case is structurally exploratory.
- **Heymann & Garcia-Molina 2006** auto-hierarchy extraction produces ~50% acceptable parent-child links on real data, degrading further on intentionally-even tag distributions (which HelpME2C's is). Don't try to derive a tree before the vocabulary is stable.

**Proposed facet axes** (matching the AllMusic mood/theme distinction extended to cross-medium themes):

| Facet | Examples (existing 41 + extensions) |
|---|---|
| `emotional-pole` | tragedy, joyful-comedy, contemplative, suspense |
| `narrative-mode` | coming-of-age, revenge, redemption, heist, war, isekai, reincarnation |
| `aesthetic-register` | post-apocalyptic, dystopian, medieval, historical, cyberpunk |
| `subject-matter` | demons, vampires, zombies, dragons, ghosts, aliens, magic, time-manipulation |
| `protagonist-type` | antihero, samurai, ninja, detective, assassin, pirate |
| `setting-context` | school-life, prison, military, mafia, gangs, religion |

A `facet` column on `THEME_MAPPINGS` (text, enum-like) costs near-zero schema migration and unlocks faceted UI. The existing 41 themes get backfilled in one pass — likely a 1-hour curator task.

**Migration path** (additive, non-breaking):
- Add `facet` column with nullable default.
- Backfill the 41 existing themes by category.
- New themes get a `facet` assigned at curation time.
- The `cross-medium.ts` scoring code is unchanged — facets are exposed only at UI level.

<a id="candidate-generation"></a>
## 2.2 Candidate generation: sentence-transformers offline pass

**Verdict: use `all-MiniLM-L6-v2` (sentence-transformers/all-MiniLM-L6-v2) with anchor sets from existing 41 themes; cosine similarity threshold ≥0.55; batch size ~50 candidate pairs per curator session.**

Reasoning:
- **Spotify / McDonald's cluster-first-name-second pipeline** is the architectural template. Mine candidate bridges from existing data, then Wouter judges-and-names.
- **The prior `research/competitive-benchmark/raw/sota-cross-domain.md` already endorsed sentence-transformers as the cheapest credible extension path.**
- **Universal in solo mood-recommender apps** (MoodieMovie, Moodies, etc — see [raw/mood-taxonomies.md](raw/mood-taxonomies.md)).

**Concrete proposal:**

1. **Anchor sets:** for each of the 41 existing themes, compose an "anchor sentence" from `name + description + member tag names`. Example for the `tragedy` theme:
   ```
   Tragedy. Stories whose central arc is loss, downfall, or unrecoverable consequence.
   tragedy, Tragedy.
   ```
2. **Candidate pool:** every TMDB keyword + every AniList tag NOT currently in any bridge AND attached to ≥10 titles in the local catalogue (the local-attachment-count gate — see [raw/tmdb-keywords.md](raw/tmdb-keywords.md) lesson on orphan keywords).
3. **Compute pairwise cosine similarity** between every (anchor, candidate-tag-name) pair where the candidate's name is composed similarly: `tag_name. tag_description_if_any.`.
4. **Surface to curator:** the top-K (e.g. K=200) (TMDB keyword, AniList tag) pairs ranked by similarity, with similarity scores visible. Curator scans, accepts/rejects, names.

**Why MiniLM-L6-v2 specifically:**
- 80MB, runs on CPU, sub-second-per-thousand-pairs throughput on a laptop.
- Trained on >1B sentence pairs, strong on short English semantic similarity.
- Library is mature (`sentence-transformers` Python package, ~5 minutes to set up).
- Zero training infrastructure required — pretrained, deterministic, reproducible.

**Why threshold ≥0.55 and not higher:**
- Below 0.5 the pairs are mostly noise.
- Above 0.7 you only get near-identical pairs (`tragedy` ↔ `Tragedy`) that are usually already bridged.
- The interesting bridge candidates (`survival` ↔ `Post-Apocalyptic`, `gangster` ↔ `Mafia`) live in the 0.55–0.7 band and benefit from human judgment.

**Why batch size ~50:**
- A session of 50 candidate-pair reviews at ~30 seconds each = ~25 minutes of focused curator work. Below the cognitive-load tipping point per the mood-taxonomies survey (which doesn't quote a number directly but shows solo curators routinely doing ~30-60 minute sessions).
- Pandora's analyst rate (~16-24 songs/day at 20-30 min/song = 1-2/hour deep, ~3-4/hour shallow) supports this — bridge accept/reject is closer to shallow than deep.

**Tunable parameters; defaults are the proposal**, not the lock.

<a id="curator-ui"></a>
## 2.3 Curator UI: where it lives, what's on screen

**Verdict: a CLI script + JSON workflow, not an admin UI. Live in `scripts/theme-bridge-curation/`. Bulk-accept/reject in one mode; single-bridge-deep with synopsis preview in a second mode.**

Reasoning:
- **Spotify's Truffle Pig is the architectural template** — internal curator UI surfacing candidate matches, editor decides. Externally a CLI is the lowest-friction equivalent for a single curator.
- **Discogs's structured submission form is too heavy** for a single curator who is also the platform owner — there's no "submission queue + voting + moderation" loop to design around. Wouter is queue, voter, and moderator.
- **Letterboxd's Showdown autocomplete UI** (`/s/autocompletetags`) is good for users but not relevant — Wouter isn't picking from existing themes, he's authoring new ones.
- **AllMusic's closed CMS** is a cautionary tale — no public versioning, no governance docs. Wouter's tool should produce Git-trackable artefacts.

**Proposed shape:**

```
scripts/theme-bridge-curation/
  README.md                   — workflow doc
  generate-candidates.ts      — runs sentence-transformers, writes JSON
  curate.ts                   — interactive CLI: shows candidate, prompts, writes decision
  decisions.jsonl             — append-only log of every decision (accept / reject / defer)
  proposals/
    YYYY-MM-DD-batch-N.json   — one file per session, list of accepted bridges with rationale
```

**Two CLI modes:**

**Mode A — bulk scan (5–10 minute session, ~50 candidates):**
```
$ pnpm curate bulk --batch=2026-05-20-batch-1
Bridge candidate 1/50
  TMDB: gangster (1,247 local titles)        ◀──── number = local catalogue attachments
  AniList: Mafia (32 local titles)
  Similarity: 0.612
  Existing bridge for either side? NO
  [a]ccept / [r]eject / [d]efer / [s]kip + reason ?
```

Decision logged immediately to `decisions.jsonl`. Accepted bridges enter the proposal file; rejected ones get a one-line reason ("synonym proliferation: TMDB `mafia` already bridged in slug:mafia").

**Mode B — single-bridge-deep (15-30 minutes, naming + description):**
```
$ pnpm curate deep --candidate=gangster:Mafia
TMDB keyword: gangster
  Attached to 1,247 local titles. Top 5 by popularity:
    The Godfather (1972)
    Goodfellas (1990)
    Casino (1995)
    The Departed (2006)
    Once Upon a Time in America (1984)

AniList tag: Mafia
  Description: "Stories which prominently feature mafia or yakuza-style criminal organisations."
  Attached to 32 local titles. Top 5 by rank ≥ 70:
    Baccano!
    91 Days
    Gangsta.
    Phantom: Requiem for the Phantom
    Black Lagoon

Existing bridge candidates this matches?
  None.

Propose:
  slug: mafia
  name: Mafia
  description: ?   ◀──── prompt to author the bridge description (AniList-style: 80–150 chars)
  facet: ?         ◀──── prompt to pick a facet (setting-context, protagonist-type, etc)
```

The deep mode writes a fully-formed `ThemeMapping` entry (matching the TypeScript `ThemeMapping` interface in `packages/ml/src/themes/mappings.ts`), suitable for cherry-pick into the file via a follow-up commit.

**Why CLI not admin UI:**
- Zero new web infrastructure.
- Decisions are Git-trackable (the `decisions.jsonl` and `proposals/*.json` files commit alongside theme additions).
- Workflow survives one-off interruption — the next session resumes from `decisions.jsonl`.
- A future second curator can review past decisions to understand the rationale.

<a id="session-shape"></a>
## 2.4 Session shape: cadence, throughput, fatigue

**Verdict: 5–10 bridges accepted per session; 2 sessions per week; 25–50 minutes per session; expect 80–160 net accepts in 12 weeks → 41 + 80 = 121 to 41 + 160 = 201.**

Throughput reasoning (anchored to the precedents):

| Precedent | Throughput | Translation to bridge curation |
|---|---|---|
| Pandora MGP | 20–30 min/song, ~16–24 songs/day | Theme bridges are simpler than song genome scoring → expect higher throughput in accept-mode, lower in deep-mode |
| Netflix taggers | ~20 hours/week of watching, ~200 attributes/film | Mostly *application* not *vocabulary design* — not directly comparable |
| Solo mood-recommender apps | 8–15 moods, hand-coded over weeks | Confirms 10/week sustained is realistic |
| Letterboxd Showdown | 1 canonical tag per fortnight (HQ) | Suggests slower cadence is normal at the editorial level |
| Discogs CIP throttle | 3 active submissions max during throttle | Confirms there's a "too fast = quality drops" pattern |

**Sustainable plan:**

| Phase | Sessions/week | Bridges accepted/session | Net adds/week | Cumulative after 12 weeks |
|---|---|---|---|---|
| Weeks 1–2 (warmup, low candidate density) | 2 | 3–5 | 6–10 | 53 |
| Weeks 3–8 (peak, dense candidate band 0.55–0.7) | 2 | 7–10 | 14–20 | 137–173 |
| Weeks 9–12 (long tail; harder bridges) | 1–2 | 3–5 | 3–10 | 156–213 |

That gives a realistic landing zone of **~150–200 bridges by week 12**. The 200 target is achievable but not guaranteed — it depends on candidate density in the 0.55–0.7 band, which is unknown until the candidate-generation pass actually runs.

**Cognitive-load / fatigue considerations:**

The mood-taxonomies survey ([raw/mood-taxonomies.md](raw/mood-taxonomies.md)) explicitly flags solo-curator burnout at the 100–200 item ceiling: *"Beyond ~200 the curator becomes a librarian, not a tastemaker."* This is Wouter-specific:
- Pinkmountain (ex-Pandora analyst) stayed ~9 years; that's *one* analyst out of ~30. Pandora's redundancy was the moat.
- McDonald (ex-Spotify) was the single curator and his layoff cratered the system within hours.
- The Pandora 10%-double-analysis rule (inter-annotator agreement) is the closest precedent for "how do you keep a single curator consistent over time" — adapt as **time-shifted self-consistency**: re-review a sample of 5–10% of bridges after 3 months and look for "I'd reject this one now" drift.

**Spacing recommendation (anchored to the human-fatigue literature implicit in mood-taxonomy app patterns):**
- 2 sessions/week is sustainable without burnout.
- Sessions on non-consecutive days (Tue + Sat, or Mon + Thu).
- Each session is *one mode* (bulk OR deep, not both back-to-back).
- Hard stop at 50 candidates per bulk session, 5 bridges per deep session.

<a id="quality-measurement"></a>
## 2.5 Quality measurement: bridge-firing-rate telemetry + eval-harness extension

**Verdict: two parallel telemetry tracks — (a) per-bridge firing-rate in production; (b) per-bridge contribution to rec quality via eval-harness ablation.**

Reasoning:
- **Pandora's quality model** is editorial fiat — labels are treated as ground truth, validated indirectly via user thumbs at the *station* level (not the gene level). HelpME2C needs better than this.
- **Spotify's quality model** is listener-cluster evidence — a genre is real if the cluster exists. HelpME2C's analogue is *bridge-firing-rate*: a bridge is real if recs that use it produce engagement.
- **MovieLens Tag Genome** validates ML-extended tags by held-out user-rating prediction. HelpME2C's analogue is eval-harness ablation.

**Track A — per-bridge firing-rate telemetry:**

Extend `apps/web/src/inngest/functions/recommend.ts` to record per-recompute:

```ts
// when scoreCandidate fires a theme bridge (themeWeight !== undefined)
// log: { userId, candidateTitleId, themeId, contribution, ts }
```

Aggregate weekly:

| Bridge | Times fired | Distinct users | Avg contribution | Recs where bridge was top reason |
|---|---|---|---|---|
| tragedy | 4,231 | 218 | 28.7 | 1,047 |
| super-power | 3,189 | 187 | 22.1 | 743 |
| ... | | | | |
| mafia (new) | 47 | 23 | 18.2 | 19 |

**Pruning rule:** a bridge that fires <N times AND has <M distinct users after 30 days of post-launch traffic is a candidate for pruning. N and M are tunable; suggested defaults N=20, M=10 at HelpME2C MVP scale.

**Track B — eval-harness extension:**

Extend `packages/ml/src/eval/` (the existing eval harness from the cold-start research) with:

```ts
// per-bridge ablation
function bridgeAblation(bridgeSlug, fixtures, params, limit): {
  withBridge: EvalMetrics,
  withoutBridge: EvalMetrics,
  delta: number,  // composite quality delta
}
```

For each new bridge, run the ablation on a fixture set of (taste vector, candidate titles, expected ranking). Record:
- Δ NDCG@10 (does the bridge improve top-10 quality?)
- Δ cross-medium recall (does the bridge unlock new cross-medium recs?)
- Δ taste-vector-coverage (does the bridge make more taste vectors scoreable?)

A bridge with a *negative* Δ on multiple fixtures is a **poisoning bridge** (see §2.6).

**Together, Tracks A + B give:**
- Track A = lagging real-world signal ("is this bridge being used?")
- Track B = leading eval signal ("is this bridge good even before users see it?")

The two together replicate Pandora's "editorial + thumbs" two-loop quality model at single-curator scale.

<a id="negative-transfer"></a>
## 2.6 Negative-transfer guardrails

**Verdict: three checks, in increasing cost order — pre-merge synonym check, post-merge ablation gate, post-launch firing-rate watch.**

Reasoning:
- **The 2025 cross-domain survey ([Zhang et al. arXiv:2503.14110](https://arxiv.org/html/2503.14110v1))** names negative transfer as the dominant failure mode of cross-domain methods. The editorial-curation approach sidesteps this *at curation time*, not at runtime — but only if the curation actually catches it.
- **Nazari et al. music→podcast paper (SIGIR 2020)** documents systematic bias: a bridge that "works on average" can still seriously misserve specific cohorts.
- **Netflix's Raymond Burr anomaly** is the unauditable-artifact failure mode at scale.

**Check 1 — pre-merge synonym check (free, automated):**

Before accepting a new bridge candidate, check:
- Does the TMDB keyword already appear as a member in any existing bridge? If yes, the candidate is a synonym merge, not a new bridge.
- Does the AniList tag already appear as a member in any existing bridge? Same check.
- Does the proposed `slug` collide with an existing bridge slug?

This is a 3-line validation in `curate.ts`, run before any decision is recorded.

**Check 2 — post-merge ablation gate (cheap, semi-automated):**

After a curator session, before the proposals JSON gets merged into `mappings.ts`:
- Run the eval-harness `bridgeAblation` on each new bridge against the fixture set.
- If Δ composite-quality < 0 on >25% of fixtures, **flag for re-review** (don't auto-reject — could be a fixture problem).

The fixture set needs to include cross-medium pairings (anime fan + TV fan, etc) per the cold-start research's existing fixtures.

**Check 3 — post-launch firing-rate watch (lagging, automated):**

After a bridge has been live for 30 days:
- If fires_per_week >> uses_in_top_recs (i.e., bridge fires a lot but never makes the top-N) → low-signal bridge.
- If fires_per_week is high AND top-rec inclusion is high AND user thumbs-down rate on bridge-driven recs is significantly above baseline → poisoning bridge. Manual review.

The "thumbs-down rate" check requires the thumbs-up/down UX to ship first (per the cold-start research). Until then, Check 3 is *firing-rate-only*, which is weaker but still catches dead bridges.

**The Netflix Raymond Burr lesson:** build an explicit "explain this bridge" audit query (`SELECT * FROM tagThemes WHERE themeId = X` + the membership rationale from the JSON file) so any "why is this happening" question is answerable from data + code, never from "it just happened."

---

# Part 3 — 90-day 41 → 200 plan

<a id="phase-1"></a>
## Phase 1 — weeks 1–2: tooling

**Goal:** ship the candidate-generation script, the curator CLI, and the per-bridge firing-rate instrumentation.

**Dependencies (build order):**

```
1. (1 day, AI) Add `facet` column to THEME_MAPPINGS schema + backfill existing 41 themes
   ↓
2. (1 day, AI) Per-bridge firing-rate logging in recommend.ts (Track A)
   ↓ (independent)
3. (2 days, AI) generate-candidates.ts — sentence-transformers offline pass
   ├── pulls TMDB keywords + AniList tags from DB
   ├── filters by local-attachment-count threshold (≥10)
   ├── computes anchor sentences for existing 41 themes
   ├── runs MiniLM-L6-v2 cosine similarity
   ├── outputs ranked candidate pairs JSON
   ↓
4. (2 days, AI) curate.ts — interactive CLI for bulk + deep modes
   ├── reads candidate JSON
   ├── prompts curator per candidate
   ├── writes decisions.jsonl + proposals JSON
   ├── enforces synonym-check gate
   ↓
5. (2 days, AI) bridgeAblation extension to packages/ml/src/eval/
   ├── per-bridge ablation function
   ├── fixture set covering cross-medium pairings
   ├── composite quality metric
   ↓
6. (1 day, AI) merge-proposals.ts — apply accepted proposals to mappings.ts
   ├── runs the eval-harness ablation gate
   ├── writes the new entries
   ├── produces a git-staged diff for human approval
```

**Critical path:** ~9 person-days of engineering. All AI-side. No Wouter time required.

**Deliverable at end of week 2:** Wouter can run `pnpm curate bulk` and start the first session.

<a id="phase-2"></a>
## Phase 2 — weeks 3–10: curation

**Goal:** grow the bridge set from 41 to 150–200 via sustained 2 sessions/week.

| Week | Mode | Target net adds | Cumulative |
|---|---|---|---|
| 3 | 2× bulk (warmup) | +6–8 | 47–49 |
| 4 | 2× bulk | +12–16 | 59–65 |
| 5 | 1× bulk + 1× deep | +10–14 | 69–79 |
| 6 | 2× bulk | +14–18 | 83–97 |
| 7 | 2× bulk | +14–18 | 97–115 |
| 8 | 1× bulk + 1× deep | +10–14 | 107–129 |
| 9 | 2× bulk | +10–14 | 117–143 |
| 10 | 1× bulk + 1× deep | +6–10 | 123–153 |

Net at end of week 10: **~123–153 bridges**. The 200 target probably requires the additional ~3 weeks of validation phase to add tail bridges as gaps surface.

**Throughput risks** (anchored to precedents):
- **Candidate density falls off above ~0.65 similarity.** The first few hundred candidates are easy; the long tail is harder. Expect throughput to halve in weeks 7+.
- **Cultural-bias drift** (Pandora + Netflix both): Wouter should deliberately seek out non-Anglo / non-Western theme candidates rather than accepting whatever the candidate-generation surfaces. Track per-bridge "origin medium" (anime-first vs western-first) and aim for rough balance.
- **Synonym proliferation** (TMDB lesson): the synonym-check gate in `curate.ts` prevents accidental dups, but doesn't catch semantic-near-dup. After the first ~80 bridges, schedule a half-day "merge audit" to surface near-duplicates the gate missed.

**Curator-side time investment:** ~25 min × 2 sessions × 8 weeks = ~7 hours. Plus ~2 hours of audit/review. Total ~9 hours over 2 months — sustainable.

<a id="phase-3"></a>
## Phase 3 — weeks 11–12: validation

**Goal:** prove the 150–200-bridge taxonomy is *measurably better* than the 41-bridge baseline, plus address the gaps surfaced during Phase 2.

**Validation tracks:**

| Track | What's measured | Success bar |
|---|---|---|
| Eval-harness regression | NDCG@10 on existing fixtures with 200-bridge set vs 41-bridge set | ≥+5% NDCG@10 on cross-medium fixtures |
| Cross-medium coverage | % of taste vectors that produce ≥1 cross-medium rec in top-20 | ≥40% (vs current baseline — measure first) |
| Bridge firing distribution | Top-10 most-fired bridges / bottom-10 least-fired bridges | No "dead" bridges (≥5 fires/week in synthetic test traffic) |
| Self-consistency drift check | Re-review 5–10% of week-3-curated bridges (10–15 bridges) | ≥80% of re-reviewed bridges still "accept" |
| Cultural-bias review | External reviewer pass (Pandora lesson) | ≥1 round of feedback incorporated |

**Gap-filling work:**
- Bridges flagged by eval-harness as low-impact → review and either improve description or prune.
- Themes the bridge set still doesn't cover but should (gap analysis vs the AllMusic 200+ mood / 80+ theme reference set) → add via 1–2 additional deep-mode sessions.

**Success bar for the 41 → 200 plan as a whole:**
- ≥150 bridges live, all with descriptions, facets, and committed rationale.
- ≥+5% NDCG@10 on cross-medium fixtures vs 41-bridge baseline.
- No regression on personal-rec NDCG@10.
- Public Git artefact of the bridge set is reviewable end-to-end (bus-factor mitigation).

<a id="split"></a>
## Engineering vs curator-time split

**AI engineering effort (~12 person-days total):**

| Item | Days |
|---|---|
| `facet` column schema migration + backfill | 1 |
| Per-bridge firing-rate logging (recommend.ts) | 1 |
| `generate-candidates.ts` | 2 |
| `curate.ts` (bulk + deep modes) | 2 |
| `bridgeAblation` eval-harness extension | 2 |
| `merge-proposals.ts` | 1 |
| Cross-medium fixture set extension | 1 |
| Validation tooling (Phase 3) | 1 |
| Documentation (README, governance ADR) | 1 |

**Wouter curator-time effort (~12 hours total over 12 weeks):**

| Item | Hours |
|---|---|
| Initial backfill of `facet` on 41 existing themes | 1 |
| ~16 bulk-mode sessions × 25 min | ~7 |
| ~6 deep-mode sessions × 25 min | ~2.5 |
| Cultural-bias review + external feedback round | ~1 |
| Validation review at week 12 | ~1 |

The AI does the platform work; Wouter does the irreducibly-human work (vocabulary judgment + naming). No curator time goes into building infrastructure; no AI time goes into deciding what a bridge means.

---

## Summary — the load-bearing decisions

Distilled to one page:

1. **Architectural shape:** keep flat top layer, add `facet` column. **Don't** build a hierarchy (Marchionini + Heymann). **Don't** abandon the existing 41-bridge baseline (it's the seed).
2. **Vocabulary growth model:** McDonald's cluster-first / name-second, not Pandora's hand-author. Mine candidates from TMDB+AniList co-occurrence + sentence-transformers semantic similarity; Wouter judges + names, doesn't design from scratch.
3. **Curator tool:** CLI script, not admin UI. Git-trackable decisions, Git-trackable proposals, Git-trackable rationale. Bus-factor mitigation by design (McDonald-Spotify lesson).
4. **Per-bridge governance:** every bridge has a description (AniList discipline), a facet, a sourcing rationale (Discogs rule), a Wikidata QID where possible (Specia-Motta lesson), an audit explain query (Netflix Raymond Burr lesson).
5. **Quality measurement:** firing-rate telemetry in production + eval-harness ablation per new bridge. Two loops, like Pandora's editorial + thumbs but at single-curator scale.
6. **Negative-transfer guardrails:** synonym check pre-merge (free), ablation gate post-merge (cheap), firing-rate watch post-launch (lagging).
7. **Cadence:** 5–10 bridges per 25-minute session; 2 sessions per week; landing at ~150–200 bridges in 12 weeks.
8. **External review pass before publishing 200** to mitigate the documented single-team cultural-bias failure mode (Pandora + Netflix both).
9. **Continuous `[0, 1]` relevance scoring** for any future per-item theme application (Vig/Sen/Riedl Tag Genome lesson). Phase 1A is binary membership; Phase 1B+ can graduate.
10. **The bridge set is the moat.** Recommend.ts firing-rate telemetry is the proof that bridges create value. The 41 → 200 expansion is the work that turns a great architecture into a great product.

**See [HANDOFF.md](HANDOFF.md) for the ticket-ready version with proposed defaults the implementing session can pick up.**

---

## Evidence base

13 raw research files in `research/theme-bridge-expansion/raw/` (~250KB, ~2,500 lines, ~150 unique citations across canonical industrial precedents, our upstreams, and the academic taxonomy literature). This run is a direct continuation of `research/competitive-benchmark/REPORT.md` §sota-cross-domain — the prior research established that hand-curated theme bridging is the right design point for HelpME2C's scale and recommended `sentence-transformers`-assisted curation as the cheapest extension path; this run designs the actual workflow.

**Notable evidence gaps:**
- Pandora MGP and Netflix altgenres internal CMS screenshots / curator UI: never publicly leaked. Workflow detail reconstructed from named-ex-employee accounts (Pinkmountain, Gulmahamad) + secondary press.
- No system in the survey publishes Cohen's-kappa or precision/recall numbers on its human-labeled taxonomy.
- The "MoodPics" product referenced in the brief could not be verified as a real public film-mood-tagging product; adjacent results were filmmaker moodboard tools. Flagged for human verification.
- Letterboxd verbatim quotes from help-centre and Journal pages are search-snippet-confirmed (Cloudflare blocks WebFetch); structural claims are primary-source.
- Cantador et al. CDR Handbook chapter could not be parsed as PDF binary; content reconstructed from authoritative secondary cites.

**Run notes** in `RUN_LOG.md` capture per-agent execution detail and timing.

# Vocabulary Redesign Proposal

Based on synthesis of 33 research items across affective narratology, industry taxonomies
(AllMusic, Netflix, Spotify, TVTropes), computational narrative frameworks, and Big Five
media-preference literature.

---

## 1. Facet Architecture

The research converges on one structural critique with unusual consistency: the current
vocabulary is a flat list that conflates at least four orthogonal axes. Items from
affective-narratology, allmusic-mood-taxonomy, big-five-media-preference, cognitive-
narratology, hedonic-eudaimonic, mood-management, russell-circumplex, and several others
all independently reach the same conclusion — *how a story feels* is a different axis
from *what a story is about*, and mixing them into one list makes matching worse, not
better.

The proposed facet model has five layers. Each layer is orthogonal to the others; a work
gets tags from each layer independently.

### Facet A — Topical Themes (what the story is about)

The existing vocabulary is predominantly this facet. It captures moral and relational
concerns: `found-family`, `power-corrupts`, `redemption-arc`, `class-conflict`, etc.
This is the facet Claude Haiku can extract most reliably from a synopsis because these
themes are stated or strongly implied in the premise text.

LLM-extractable from synopsis: yes, high confidence.

### Facet B — Structural Arc (how the story is shaped)

Distinct from topic. Two shows about revenge can be a comedy caper or a grim tragedy;
the structural arc tells you which. Sources recommending this separation: booker-seven-
plots, campbell-heros-journey, propp-morphology, reagan-emotional-arcs, tobias-twenty-
plots, cognitive-narratology.

Key dimensions: emotional direction (ends-uplifting / ends-downbeat / ambiguous), hero
arc type (transformational / static), quest structure (classic / subverted / none),
whether the story is linear or nonlinear.

LLM-extractable from synopsis: partial. Ending direction is often inferable from premise
tone. Transformation arc is partially inferable. Specific Booker/Tobias categories are
medium confidence.

### Facet C — Affective Texture (how it feels to watch)

Distinct from topic and structure. Captures the tonal register — bittersweet, rousing,
brooding, playful, cosy. Sources: allmusic-mood-taxonomy, plutchik-wheel,
spotify-mood-taxonomy, russell-circumplex, mood-management, imdb-letterboxd-folksonomy.

AllMusic's applied taxonomy is the strongest precedent here. AllMusic proved you can
tag music with a small, orthogonal set of mood/tone labels that survive editorial review
and become actionable in matching. The same approach transfers to TV/anime.

LLM-extractable from synopsis: medium confidence. Tone is often present in marketing
language and synopsis word choices even when not stated explicitly.

### Facet D — Content Intensity (what content thresholds it crosses)

Discrete, low-inference, most useful as a FILTER rather than a matching signal.
Violence intensity, sexual content intensity, and whether horror elements are present.
Source: netflix-taste-communities (Netflix tags these as absolute properties per title).
This facet is most relevant to the two-person use case as a veto layer: if one partner
has a hard aversion to graphic violence, any title above a threshold is excluded before
ranking.

LLM-extractable from synopsis: medium-high confidence for binary (present/absent);
lower for graded intensity because synopses rarely describe graphic detail.

### Facet E — Gratification Profile (what kind of viewing experience it affords)

The eudaimonic/hedonic axis and the escapism/enrichment axis. Hedonic = fun, thrilling,
light; eudaimonic = meaningful, moving, thought-provoking. Sources: hedonic-eudaimonic,
uses-gratifications, self-determination-media, media-use-motivation-scales.

This facet is orthogonal to all of the above: `slow-burn` (Facet A structural) combined
with `bittersweet` (Facet C) can still be either hedonic (entertaining tragedy) or
eudaimonic (serious meditation). They are different axes.

LLM-extractable from synopsis: medium confidence. The hedonic/eudaimonic distinction
is often signalled by critical framing language in synopses, but less reliably than
tone.

---

## 2. Slugs to ADD

These are new slugs with direct research backing and reasonable extractability from
synopsis text. Each entry specifies: proposed slug, facet, source evidence, extraction
confidence, and whether it is a work-side or receiver-side property.

### Facet B — Structural Arc additions

**`arc-ends-uplifting`**
- Facet: B (Structural Arc)
- What it captures: the emotional direction of the ending is positive — catharsis,
  resolution, hope. Distinct from `underdog-rise` (which is topical). A tragedy can be
  `redemption-arc` without being `arc-ends-uplifting`.
- Research basis: reagan-emotional-arcs (the rise arc and fall-then-rise arc shapes),
  booker-seven-plots (the Comedy and Rebirth archetypes), tobias-twenty-plots
- Extraction confidence: medium. Marketing synopses tend to signal hopeful vs bleak
  endings, though not always explicitly.
- Work-side: yes.

**`arc-ends-downbeat`**
- Facet: B (Structural Arc)
- What it captures: ending direction is tragic, ambiguous-negative, or unresolved in a
  bleak direction. Complements `arc-ends-uplifting`; together they replace the need for
  a vague "dark" tag at the arc level.
- Research basis: reagan-emotional-arcs (fall and fall-then-rise arcs), booker-seven-
  plots (Tragedy archetype)
- Extraction confidence: medium.
- Work-side: yes.

**`protagonist-transforms`**
- Facet: B (Structural Arc)
- What it captures: the central character materially changes by the end. Distinct from
  `coming-of-age` (which is topical, about the youth-to-adult transition specifically).
  A 60-year-old detective who changes is `protagonist-transforms` but not `coming-of-age`.
- Research basis: campbell-heros-journey, cognitive-narratology, tobias-twenty-plots
- Extraction confidence: high. Synopsis language typically reveals whether the premise
  is about a character's change.
- Work-side: yes.

**`anthology-structure`**
- Facet: B (Structural Arc)
- What it captures: stories told in discrete, self-contained episodes or vignettes
  rather than a continuous narrative. Distinct from `ensemble-mosaic` (which is about
  multiple parallel plotlines in a single continuous story).
- Research basis: propp-morphology, tobias-twenty-plots, tvtropes-taxonomy
- Extraction confidence: high. Anthology structure is almost always stated in a synopsis.
- Work-side: yes.

### Facet C — Affective Texture additions

These three slugs are the highest-priority additions from the entire research set.
AllMusic's taxonomy, Plutchik's wheel, and the IMDb/Letterboxd folksonomy all
independently converge on these as the most useful, most extractable affective
distinctions for matching. They replace the need for a generic "mood" or "dark" tag
that is currently entangled with topical slugs.

**`tone-brooding`**
- Facet: C (Affective Texture)
- What it captures: heavy, oppressive, or melancholic atmosphere. The slow accumulation
  of dread or sadness in the tone itself, distinct from whether sad *events* occur.
  Validated by AllMusic's Brooding/Ominous cluster, Plutchik's sadness-fear dyad
  prominence, IMDb folksonomy frequency analysis.
- Research basis: allmusic-mood-taxonomy, plutchik-wheel, imdb-letterboxd-folksonomy
- Extraction confidence: medium-high. Synopses for brooding shows use characteristic
  language ("haunting", "atmospheric", "oppressive").
- Work-side: yes.

**`tone-bittersweet`**
- Facet: C (Affective Texture)
- What it captures: mixed emotional register — joy and sorrow coexisting. The
  wistful-poignant-autumnal cluster in AllMusic's taxonomy. Distinctly NOT the same
  as either `arc-ends-uplifting` or `arc-ends-downbeat` — bittersweet works often have
  resolution without pure happiness.
- Research basis: allmusic-mood-taxonomy (the "Poignant/Autumnal" cluster),
  plutchik-wheel (joy-sadness dyad), hedonic-eudaimonic (the eudaimonic-moving axis)
- Extraction confidence: medium. Synopses sometimes signal this directly ("a tender
  meditation on loss") but often do not.
- Work-side: yes.

**`tone-rousing`**
- Facet: C (Affective Texture)
- What it captures: energetic, uplifting, propulsive register. The AllMusic
  "Rousing/Exuberant" cluster. Distinct from `underdog-rise` (topical) and
  `arc-ends-uplifting` (structural) — a rousing military drama can still end in
  tragedy. This is about sustained energy level, not plot outcome.
- Research basis: allmusic-mood-taxonomy, russell-circumplex (high arousal + positive
  valence quadrant), mood-management (excitatory potential)
- Extraction confidence: medium-high. High-energy/propulsive register is visible in
  synopsis language.
- Work-side: yes.

**`tone-playful`**
- Facet: C (Affective Texture)
- What it captures: light, comedic, fun register without the specific mode of
  `absurdist-comedy` or `dark-comedy`. Covers feel-good comedies, cosy mysteries,
  upbeat slice-of-life. The IMDb/Letterboxd folksonomy shows "feel-good" as one of the
  highest-frequency affective tags not covered by the existing vocabulary.
- Research basis: allmusic-mood-taxonomy, imdb-letterboxd-folksonomy (feel-good/upbeat
  cluster), uses-gratifications (mood-lift affordance)
- Extraction confidence: medium-high.
- Work-side: yes.

### Facet D — Content Intensity additions

**`violence-present`** (binary flag)
- Facet: D (Content Intensity)
- What it captures: significant violence is part of the content. Intended as a veto
  filter, not a ranking signal. Replaces the implicit assumption embedded in slugs like
  `war-and-its-toll` that they imply violence.
- Research basis: netflix-taste-communities (Netflix codes this as an absolute content
  property distinct from genre)
- Extraction confidence: high. Synopses that involve combat, crime, or horror almost
  always mention it.
- Work-side: yes.

**`sexual-content-present`** (binary flag)
- Facet: D (Content Intensity)
- What it captures: significant sexual content. Same veto-filter logic.
- Research basis: netflix-taste-communities
- Extraction confidence: medium. Synopses often omit or euphemise this.
- Work-side: yes.

### Facet E — Gratification Profile additions

**`affords-comfort-viewing`**
- Facet: E (Gratification Profile)
- What it captures: the show is broadly suitable as low-demand, relaxing, feel-good
  watching. The "comfort watch" category. Distinct from `tone-playful` (which is about
  register) — a warm family drama can be comfort viewing without being playful.
- Research basis: uses-gratifications (escapism/comfort motive), media-use-motivation-
  scales (relaxation motive), game-feel-taxonomy (the "comfort/submission" register)
- Extraction confidence: medium. Sometimes stated; sometimes inferable from premise.
- Work-side: yes (as an affordance), though with receiver-side overlay.

**`affords-catharsis`**
- Facet: E (Gratification Profile)
- What it captures: the work is structured to produce emotional release — crying,
  cathartic grief, emotional intensity. Distinct from `tone-brooding` (which is
  atmosphere); catharsis implies the emotional arc builds to release.
- Research basis: uses-gratifications, hedonic-eudaimonic, narrative-transportation
- Extraction confidence: low-medium. Hard to reliably extract from synopsis alone;
  better signalled by critical reception. Flag as lower-confidence extraction.
- Work-side: yes (as affordance).

### Facet A — Topical Theme additions

A smaller set than the facet additions. Most topical theme gaps can be filled by the
new facets above. The following are genuine topical gaps:

**`cosy-mystery`**
- Facet: A (Topical Themes)
- What it captures: mystery investigation set in a warm, low-stakes world — no graphic
  violence, amateur sleuth, community-centred. Distinct from `mystery-investigation`
  (which includes dark crime dramas) and `whodunit` (which is structural).
- Research basis: imdb-letterboxd-folksonomy ("cozy mystery" as a high-frequency tag),
  tvtropes-taxonomy
- Extraction confidence: high. The cosy mystery genre marker is nearly always explicit.
- Work-side: yes.

**`isekai`** (anime-specific)
- Facet: A (Topical Themes)
- What it captures: protagonist transported to another world. A dominant premise type
  in the anime catalogue with no current mapping. `fish-out-of-water` is close but does
  not capture the specific mechanics (death-and-reincarnation, magical world) that drive
  the fantasy.
- Research basis: tvtropes-taxonomy (the "Trapped in Another World" trope cluster),
  transmedia-storytelling (world-archetype facet)
- Extraction confidence: high. Isekai synopses are highly formulaic and identifiable.
- Work-side: yes.

**`slice-of-life`**
- Facet: A (Topical Themes)
- What it captures: low-conflict, quotidian, character-and-atmosphere driven narrative
  with no strong central plot engine. A major category in anime and K-drama that the
  current vocabulary cannot tag — none of the existing structural slugs fit a show
  where the point is peaceful daily existence.
- Research basis: cognitive-narratology (experientiality > narrativity works),
  tvtropes-taxonomy, imdb-letterboxd-folksonomy
- Extraction confidence: high. Slice-of-life as a genre marker is almost always
  explicit in synopses.
- Work-side: yes.

**`ensemble-conflict`**
- Facet: A (Topical Themes)
- What it captures: the dramatic engine is conflict *among* an ensemble cast — internal
  politics, betrayals, competition for power within a group. Distinct from `ensemble-
  mosaic` (which is structural: multiple parallel storylines) and `found-family` (which
  is about warmth and chosen bonds). Reality-competition shows, political dramas with
  multiple factions, and workplace rivalries all fit here.
- Research basis: tobias-twenty-plots (Rivalry and Temptation plots), tvtropes-taxonomy
- Extraction confidence: medium-high.
- Work-side: yes.

---

## 3. Slugs to Modify

### `mystery-investigation` — too broad, split recommended

Currently covers everything from cosy amateur sleuths to gritty procedurals to
supernatural mysteries. The research (tvtropes-taxonomy, imdb-letterboxd-folksonomy)
shows this conflates shows with very different audience profiles. Recommended: keep
`mystery-investigation` as the broad umbrella, add `cosy-mystery` as a subtype (see
above), and use `tone-brooding` vs `tone-playful` to distinguish dark and light variants.
Do not force a split into two core slugs yet — wait for real misclassification data.

### `slow-burn` — misfiled in Texture, but currently accurate

Currently in the "Texture" section, which is the right instinct. Under the new facet
model, `slow-burn` belongs in Facet B (Structural Arc) as a pacing descriptor, not in
Facet C (Affective Texture). It is a statement about narrative tempo, not about
emotional register. The hint is correct; the section heading is the only issue. Low
priority since it is hint-only metadata not exposed to users.

### `nonlinear-storytelling` — validated, hint could be sharper

Currently: "fractured chronology as structural choice." The cognitive-narratology
research suggests adding "or deliberately withheld cause-and-effect" to the hint —
some nonlinear works are non-chronological, others are structurally chronological but
withhold information. Both patterns are captured well by the existing slug, but the hint
could make this clearer for Haiku.

### `character-study` — slightly overlapping with `biographical-portrait`

The hints currently distinguish these ("dense interior focus on a single protagonist" vs
"a specific real or fictional person's life story"). The big-five-neo-pi and cognitive-
narratology research validates this distinction. However, the hints risk overlap when
applied to fictionalised biopics. Recommended: add "NOT a biographical work" to the
`character-study` hint, and "about a specific named real person or historical figure"
to `biographical-portrait` to make the boundary explicit.

### `existential-horror` — dual-audience problem

The receiver_dependence research (affective-narratology, plutchik-wheel) flags that
existential horror attracts two distinct audiences: those who want intellectual-idea
content (the meaninglessness premise), and those who want visceral dread/fear arousal.
The slug as defined ("dread rooted in meaninglessness or the unknown") leans toward the
intellectual reading. The hint could acknowledge both: "dread rooted in meaninglessness
or the unknown — may be ideas-driven or visceral in execution." This does not split the
slug but helps Haiku and users understand the range.

---

## 4. Slugs to Keep As-Is

The following slugs are validated by multiple research frameworks and should not change.

**`found-family`** — Validated by moral-foundations (care/loyalty foundations),
  big-five-media-preference (Agreeableness predictor), affective-narratology (attachment
  prototype), narrative-transportation (relatedness need), imdb-letterboxd-folksonomy
  (high folksonomy frequency). One of the most robustly supported slugs in the vocabulary.

**`redemption-arc`** — Validated by affective-narratology (criminal-justice/sacrifice
  prototype), moral-foundations (care and proportionality foundations), big-five-neo-pi
  (Agreeableness predictor). Well-defined and extractable.

**`vengeance-and-its-cost`** — Validated by affective-narratology (Hogan's revenge
  master sentiment, the single best-evidenced topical category), tobias-twenty-plots
  (Revenge plot), moral-foundations (proportionality foundation). The "and its cost" framing
  is important and should stay — it distinguishes this from simple action-adventure.

**`power-corrupts`** — Validated by moral-foundations, schwartz-values (self-enhancement
  axis), dark-triad (Machiavellianism content preference), big-five-media-preference
  (low-Agreeableness predictor). Well-defined; extractable.

**`nonlinear-storytelling`** — Validated by cognitive-narratology, big-five-neo-pi
  (Openness predictor), need-for-cognition (complexity preference predictor). Well-defined.

**`slow-burn`** — Validated by big-five-neo-pi, need-for-cognition, sensation-seeking
  (as an inverse predictor — high SS viewers avoid slow-burn). Well-defined.

**`coming-of-age`** — Validated by big-five-media-preference (Agreeableness predictor),
  affective-narratology (identity/attachment themes), imdb-letterboxd-folksonomy.

**`grief-and-loss`** — Validated by need-for-affect (high approach predictor),
  big-five-media-preference (Neuroticism predictor), affective-narratology (attachment/
  loss schema), imdb-letterboxd-folksonomy.

**`class-conflict`** — Validated by schwartz-values (self-transcendence axis), moral-
  foundations (equality/care foundations), schwartz-values.

**`moral-compromise`** — Validated by moral-foundations (low-binding profile), dark-triad
  (Machiavellianism/psychopathy preference), schwartz-values.

**`mentor-and-pupil`** — Validated by tobias-twenty-plots, propp-morphology (donor/
  helper functions), big-five-media-preference (Conscientiousness).

**`heist-and-caper`** — Validated by tobias-twenty-plots (The Quest with a planning/
  execution structure), sensation-seeking (TAS facet predictor), big-five-neo-pi
  (Extraversion predictor).

**`dystopian-society`** — Validated by transmedia-storytelling (world-archetype), big-
  five-neo-pi (Openness predictor), schwartz-values.

**`magical-realism`** — Validated by big-five-neo-pi (Openness predictor), cognitive-
  narratology (storyworld design axis).

**`folk-horror`** and **`cosmic-horror`** — Both validated by sensation-seeking (TAS
  facet), moral-foundations (sanctity/purity foundation), big-five-neo-pi (Openness).

All relationship slugs (`forbidden-love`, `unrequited-longing`, `toxic-relationship`,
`platonic-soulmates`, `friendship-tested`, `parent-child-rift`) — validated by need-for-
affect, empathy-quotient (Fantasy Subscale), big-five-media-preference (Agreeableness).

---

## 5. What NOT to Add to the Vocabulary

These dimensions are real, researched, and relevant — but they are either receiver-
dependent (belong in the user profile, not the content tag) or not extractable from
synopsis text. Adding them to the content vocabulary would degrade matching.

### Do not add: Big Five trait tags applied to content

The big-five-media-preference research is explicit: "Do NOT add Big Five traits to the
theme vocabulary — they are VIEWER attributes." `high-openness-content` or `cerebral`
as content tags are viewer-expectation judgements, not work properties. What IS
extractable as a work property is `narrative-complexity` — but that is captured
adequately by `nonlinear-storytelling` and `slow-burn` already.

### Do not add: Emotional arc labels (Rags-to-Riches, Fall, etc.)

The reagan-emotional-arcs research recommends encoding arc *direction* (ends-uplifting /
ends-downbeat) but not the six-way Reagan typology. The fine-grained arc labels
(Cinderella, Oedipus, Man in a Hole) require full-text sentiment analysis, not
synopsis reading, and the inter-rater reliability at synopsis level is low. The proposed
`arc-ends-uplifting` / `arc-ends-downbeat` slugs above are the correct coarse summary.

### Do not add: Transportation or Engagement scores

Narrative-transportation and narrative-engagement-scales both explicitly state these are
viewer×work×context outcomes — not work properties. `immersive-potential` or
`high-transportation` as a content tag would be the recommender system prejudging the
viewing experience, which varies by viewer. These belong in user feedback loops, not
the extraction vocabulary.

### Do not add: Moral Foundation scores

Moral-foundations recommends a per-title moral texture layer, but as ordinal scores,
not vocabulary slugs. The research is explicit that a synopsis-level extraction of
six moral foundation scores is unreliable (synopses don't reveal whether a narrative
*adjudicates* its moral conflicts or just poses them). The topical slugs already cover
the content layer; the foundation scores are better derived from viewing behaviour.

### Do not add: Values-axis tags (Schwartz)

Schwartz-values recommends a derived VALUE-SIGNATURE OVERLAY with two bipolar axis
scores, not vocabulary slugs. The self-enhancement vs self-transcendence axis is already
largely covered by existing moral slugs (`power-corrupts`, `class-conflict`, `found-
family`). Adding explicit Schwartz labels as slugs creates a parallel taxonomy that
redundantly encodes what the moral theme slugs already say.

### Do not add: SDT Need-satisfaction labels

Self-determination-media is explicit: "do NOT add autonomy/competence/relatedness as
literal theme slugs — they are motivational constructs, not themes." These are a
derived layer from existing slugs, not a new extraction target.

### Do not add: Tension-mechanism tags (suspense-driven, twist-driven)

Affective-narratology specifically flags these as NOT reliably extractable from synopsis.
"Prefer signals beyond the synopsis — runtime/episode pacing, editorial tags." A
synopsis cannot reliably reveal whether a show's pleasure mechanism is suspense,
curiosity, or twist; these require full-episode experience or editorial metadata.

### Do not add: Character Big Five profiles

Big-five-character-profiling recommends this but immediately qualifies it: synopsis-
level extraction of character trait profiles is low reliability, static (missing arc),
and the signal-to-noise ratio for cross-medium matching is poor. This is a research
direction, not a Phase 1A extraction target.

---

## 6. Priority Order

Based on evidence strength, receiver-independence (work-side taggable), and expected
impact on the two-person recommendation quality:

**Priority 1 — Immediate (strongest evidence, cleanest extraction)**

1. `tone-brooding` — three independent sources, fills a genuine gap, high extraction
   confidence
2. `tone-bittersweet` — three independent sources, AllMusic applied precedent
3. `tone-rousing` — two sources, AllMusic applied precedent
4. `tone-playful` — IMDb/Letterboxd folksonomy frequency, fills a gap the existing
   vocabulary explicitly lacks
5. `arc-ends-uplifting` / `arc-ends-downbeat` — reagan-emotional-arcs, booker-seven-
   plots; critical for two-person aggregation (least-misery on ending direction)
6. `protagonist-transforms` — campbell, cognitive-narratology, tobias; high extraction
   confidence

**Priority 2 — Soon (good evidence, specific use cases)**

7. `violence-present` — critical as a content veto filter for two-person matching
8. `sexual-content-present` — same veto-filter logic
9. `slice-of-life` — anime catalogue gap; high extraction confidence once defined
10. `isekai` — anime catalogue gap; formulaic, easy to extract

**Priority 3 — When vocabulary is stable (moderate confidence or niche use)**

11. `anthology-structure` — valid but lower matching impact
12. `cosy-mystery` — valid but subtype of an existing slug
13. `affords-comfort-viewing` — useful for session-state matching; extraction is
    receiver-side-adjacent, validate kappa before shipping
14. `ensemble-conflict` — valid but lower extraction confidence
15. `affords-catharsis` — low synopsis extraction confidence; wait for editorial signal

**Notes on implementation**

- Validate inter-rater agreement (Cohen's kappa) between two Haiku extraction passes
  on a sample of 50 titles before shipping any new facet. The affective-narratology
  research explicitly warns: "prototype labels are interpretive — expect lower LLM
  agreement than topical themes, and validate kappa before shipping."
- The four tone slugs (Priority 1, items 1–4) can be shipped as a small batch because
  they share a facet and are applied together.
- The two content-intensity flags (Priority 2, items 7–8) should be implemented as
  boolean fields alongside the existing theme array, not as theme slugs themselves, to
  preserve the architectural distinction between content tags and content filters.

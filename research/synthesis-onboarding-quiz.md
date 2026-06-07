# Onboarding Quiz Design Spec

Based on synthesis of 27 research items covering personality instruments (Big Five
short forms, HEXACO, Dark Triad, Empathy Quotient, TIPI, BFI-2-XS), elicitation
methods (narrative scenarios, projective character selection, feature sliders, item-based
elicitation), group compatibility models, and industry precedents (Netflix, Spotify).

---

## 1. What Signal to Collect

### Include — strong evidence

**Item-based seed picks (explicit title selection)**
Strongest cold-start signal in the set. item-based-cold-start is explicit: "item-based
elicitation is the natural way to POPULATE the theme-preference vector at cold start."
The mechanism is direct: each picked title carries theme-slug tags, so three picks give
an empirical distribution over the theme vocabulary with no inference chain. It is
the baseline every other signal must justify itself against.

Effect on matching: direct, large (the only signal with a clear, validated path to
the theme-preference vector). Limitation: fails when users recognise few seed titles.

**Item-based dislike picks (explicit negative title selection)** ← added 2026-06-07
The original synthesis only considered negative signal collected passively (ratings over
time). This misses a critical gap for two-person matching: knowing what a partner
strongly rejects from day one is more important than knowing what they like, because
a single unwanted show ruins a joint watch.

Mechanism: a second title grid, separate screen, same pool but skewed toward popular/
mainstream titles (users must have watched something to dislike it — obscure titles
produce noise). Each selected title's theme-slug tags are subtracted from the taste
vector using the same bipolar formula already in extractTasteVector. No new engine
logic required — the scoring function already handles negative weights.

Effect on matching: direct negative signal into the taste vector. Particularly high
value for two-person aggregation: the Average-Without-Misery veto floor needs explicit
rejection signal to function well at cold start; without it, the veto floor has nothing
to act on until passive ratings accumulate.

Why the research missed this: the synthesis treated negative signal as a passive
accumulation problem (ratings over time), not an active elicitation opportunity. The
dislike grid front-loads what would otherwise take weeks of interaction to collect.

**Direct feature/tone elicitation (preference sliders)**
Second-strongest cold-start signal. preference-for-specific-features is explicit: "this
method maps to the HelpME2C theme vocabulary the MOST DIRECTLY of any in this research"
because several slider axes ARE theme-vocabulary axes (tone-dark vs tone-light, slow-
burn vs fast-paced, ending valence). Axes include: darkness/lightness, pacing, ending
valence, emotional intensity, content-tolerance vetoes. Acts as catalogue-independent
complement to item picks.

Effect on matching: direct (feature axes map nearly one-to-one to theme-vocabulary
facets). Cross-medium: excellent — features transfer across TV and anime regardless of
title recognition.

**Need for Affect (NFA) — emotional intensity appetite**
Predicted effect: predicts preference across the emotion/relationship cluster (grief-
and-loss, forbidden-love, unrequited-longing, trauma-survival, the war cluster) AND the
visceral-horror cluster (existential-horror, folk-horror, cosmic-horror). Orthogonal to
Openness — high-NFA / low-Openness viewers want emotionally devastating but clearly-told
linear melodrama; high-Openness / low-NFA viewers want cerebral but emotionally cool
content. need-for-affect: "NFA's strongest unique contribution... maps directly onto
the emotion/relationship/tone axes of the theme vocabulary, which genre tags capture
poorly."

Effect size: moderate-to-strong (the strongest effect size in the personality instrument
set for the emotion/relationship cluster). Include as 3-4 disguised, forced-choice items.

**Openness to complexity (proxy for Big Five Openness)**
Predicted effect: predicts the structure/texture axes of the theme vocabulary:
nonlinear-storytelling, slow-burn, character-study, magical-realism, earned-ambiguity,
cosmic-horror, absurdist-comedy, satirical content. big-five-neo-pi: "Mapping is
strongest for Openness... the texture and structure categories."

Effect size: the single most consistently validated personality-to-media-preference link
across the literature. big-five-short-forms, big-five-neo-pi, need-for-cognition,
big-five-media-preference, sensation-seeking all confirm it. Include 2 items.

**Content-intensity vetoes (violence, sexual content)**
Not a ranking signal — a filter. But critical for the two-person case where one
partner's hard aversion ruins a joint watch. preference-conflict-resolution: "Least
Misery is the right operator... themes where one member's strong aversion genuinely
ruins a co-watch." preference-for-specific-features: "content-TOLERANCE vetoes (gore,
sexual content)" are part of the recommended feature quiz. Include as 2 binary or
ordinal questions.

**Moral-ambiguity comfort (appetite for antihero/moral-grey content)**
Predicted effect: gates the entire moral/power cluster (power-corrupts, moral-compromise,
complicity-with-evil, rise-and-fall) and the antihero cluster that genre tags miss.
narrative-scenario-quiz: "The single most valuable derived feature is a 'moral-ambiguity
tolerance' axis... that predicts the antihero/moral-greyness cluster which genre tags
capture almost not at all." Can be extracted from 2-3 content-anchored forced-choice
items (dark-triad: "How much do you enjoy stories told from the villain's point of view?").

Effect size: moderate. dark-triad and narrative-scenario-quiz both recommend this as
a content preference signal rather than the trait instrument itself.

### Include conditionally — good evidence, secondary

**Sensation-seeking (intensity/arousal tolerance)**
Partially redundant with NFA on the horror/visceral axis. Add value if NFA items do
not cover the fast-paced/action/kinetic content dimension (chase-and-escape, heist-and-
caper, survival-and-endurance). Include 1-2 items targeting the TAS facet (thrill-
seeking intensity) rather than the full Zuckerman/BSSS instrument. sensation-seeking:
"the one incremental dimension" beyond Openness and NFA is "visceral-intensity/horror
appetite."

**Social viewing motive (co-watch orientation)**
media-use-motivation-scales uniquely recommends including the social/co-viewing motive
because it "predicts JOINT watching specifically" — this is the most HelpME2C-
specific motive. A single item ("Do you tend to watch TV alone or with others? How
important is it that a show is something you can discuss?") directly measures the
construct relevant to the North Star.

### Exclude — real constructs, wrong layer for Phase 1A

**Full Big Five (all five domains)**
The research is unanimous: drop Conscientiousness and Agreeableness from the quiz
(lowest media signal, most items). big-five-neo-pi: "Drop Conscientiousness and
Agreeableness from the quiz (lowest media signal)." The actionable signal is Openness +
Neuroticism/NFA proxy + Extraversion-adjacent energy preference. A full five-domain
TIPI or BFI-10 is more friction than the signal justifies.

**Full Moral Foundations Questionnaire**
The narrative scenario format (see §2 below) efficiently extracts the one useful
derivative — moral ambiguity comfort — without the 30-item MFQ-2. Direct MFQ-2
administration is too long, socially sensitive (political inference risk), and requires
Article 9 consent review.

**Schwartz Values full instrument**
Useful signal, high privacy risk. value-based-preference-elicitation: "requires the
privacy/consent decision to be made deliberately under ADR-0012 before any storage."
The two-axis values signal (self-transcendence vs self-enhancement) is partly recoverable
from the moral-ambiguity items. Exclude from Phase 1A; revisit if moral-axis signal
proves insufficient.

**HEXACO Honesty-Humility specifically**
hexaco: "only reason to prefer HEXACO is the Honesty-Humility factor." A single
indirect H-flavoured forced-choice item captures the usable signal; the full HEXACO-60
or even HEXACO-24 is not justified for Phase 1A.

**Dark Triad instruments (SD3, DTDD)**
dark-triad: "Do NOT administer the SD3 or DTDD... faking/social-desirability bias
is severe." The useful output — appetite for morally dark narratives — is captured by
the 2-3 moral-ambiguity preference items.

**Empathy Quotient (full EQ)**
empathy-quotient: "full EQ is poorly suited: abstract social-interaction items, social-
desirability-loaded, autism-screening lineage (privacy-sensitive)." The one usable
subscale is IRI Fantasy (character immersion tendency), which maps to the
character-study / relationship cluster. If included at all: 2 disguised, media-framed
items from the IRI Fantasy subscale. Low priority given overlap with NFA.

**Social media personality inference**
social-media-personality-inference: "EXCLUDE for HelpME2C Phase 1A, with a high bar
to ever reconsider." Privacy, data access, and accuracy-per-friction all fail.

---

## 2. Recommended Quiz Structure

### Format rationale

Multiple research items converge on forced-choice/scenario format over Likert scales:
- Eliminates acquiescence bias (the single biggest threat to Likert-based personality
  in multilingual populations — cross-cultural-personality-validity)
- Eliminates reverse-keying and social-desirability problems
- Higher completion rates
- More engaging, more honest (feels like taste, not a clinical screen)
- Maps naturally to relative preference, which is what a ranker needs

ipsative-vs-normative: "Use multidimensional forced-choice 'this-or-that' / 'most-like-
me' blocks... lowest-friction, most engaging, most acquiescence-resistant elicitation."
Hard constraint: desirability-match the two options in each forced-choice block, or the
bias advantage evaporates.

### Structure

**Screen 1 — Shows you love (positive title grid)**
- 24-36 title posters, multi-select, ask for ≥3 picks
- Region/language-aware seed pool (non-Western users under-served by global defaults)
- "Show me different ones" refresh button for users who recognise few titles
- Skip option
- Time target: 60-90 seconds
- Output: positive theme-preference vector from tag distributions of selected titles

**Screen 2 — Shows you really don't like (negative title grid)** ← added 2026-06-07
- Separate screen, clear framing ("now tell us what you can't stand")
- 24-36 title posters, multi-select, ask for ≥3 picks; skip option
- Pool curation differs from Screen 1: skew toward high-popularity/mainstream titles
  that users are more likely to have actually watched. Obscure titles produce noise
  (can't dislike what you haven't seen). Ensure genre/tone diversity so the negative
  signal is specific, not just "I don't like blockbusters"
- "Show me different ones" refresh option
- Time target: 45-60 seconds
- Output: negative weights applied to the taste vector via the existing bipolar formula
  in extractTasteVector; no new engine logic required
- Two-person value: front-loads the rejection signal the Average-Without-Misery veto
  floor needs to function at cold start

**Screen 3 — Tone and feature preferences (forced-choice or visual slider)**
- 6-8 items on the highest-signal feature axes:
  1. Tone: light/playful ← → dark/brooding (Facet C direct)
  2. Pacing: slow and atmospheric ← → fast-paced and propulsive (slow-burn vs action)
  3. Ending valence: uplifting resolution ← → downbeat or ambiguous (arc direction)
  4. Emotional intensity: cosy/light ← → emotionally intense/devastating (NFA proxy)
  5. Complexity: straightforward story ← → complex structure or ideas (Openness proxy)
  6. Moral texture: clear heroes and villains ← → morally grey protagonists (moral-
     ambiguity comfort)
  7. Violence tolerance: I'd rather avoid graphic violence ← → fine with it (veto)
  8. Social/solo: usually watch alone ← → prefer shows to watch and discuss together
- Format: two-option forced-choice with illustrated visual anchors (not text-only Likert)
- Time target: 60-90 seconds
- Output: feature-preference vector mapping directly to theme-vocabulary facets

**Screen 4 (optional) — Character/scenario question**
- 1-2 projective character selection items ("who would you rather follow?")
- Primarily a personality signal that supplements the feature slider for users who
  engage more with character than with explicit feature labels
- OR a single narrative scenario dilemma for moral-ambiguity signal (if Screen 3 item 6
  is insufficient — see narrative-scenario-quiz)
- Optional/skippable
- Time target: 30 seconds

**Total target: 3-4 minutes for Screens 1-3, max 5 minutes including Screen 4.**

### Specific instruments to draw from

- **Item-based elicitation**: Netflix 3-title pick pattern (validated at scale) extended
  to 24-36 items with medium/niche-title diversity
- **Feature sliders**: preference-for-specific-features design (the specific 6-8 axes
  above are taken directly from that research item's recommendation)
- **NFA proxy**: 2-3 items adapted from NAQ-S (10-item Need for Affect questionnaire),
  disguised as content preferences rather than abstract self-statements
- **Openness proxy**: 1-2 items adapted from BFI-2-XS or TIPI Openness items,
  reformulated as "would you rather watch a show with a complex, ambiguous story or a
  clear, satisfying one?"
- **Moral-ambiguity items**: 2-3 content-anchored forced-choice items per dark-triad
  recommendation ("A character takes brutal revenge and gets away with it — satisfying
  or uncomfortable?")
- **Projective character selection**: 6-8 archetype cards per projective-character-
  selection design, with explicit theme-affinity weights authored per card at design
  time (not inferred) — stop-and-ask before building the card deck (art/IP)

---

## 3. Two-Person Aggregation

### Default strategy

**Start with Average-Without-Misery (cold-start phase)**
preference-conflict-resolution: "lean on Average (or Average-Without-Misery, threshold
~3/5) rather than pure Least Misery, because noisy per-user predictions cause Least
Misery to over-veto" at cold start. group-personality-compatibility: "AVG ranking + veto
floor removing titles either prior strongly rejects."

Operationally: average both partners' theme-preference vectors, then apply a veto floor
that removes titles where either partner's vector has a strong negative signal (below a
calibratable threshold).

**Migrate toward Least Misery as interaction data accumulates**
preference-conflict-resolution: "transition toward Least Misery as per-user confidence
grows." The strategy should be confidence-gated: noisy early estimates → average; higher
confidence late estimates → least-misery.

### Per-dimension aggregation rules

| Dimension | Rule | Rationale |
|---|---|---|
| Content-intensity vetoes (violence, sexual content) | Set-union (EITHER partner's veto applies) | preference-for-specific-features: "compose content vetoes with set-union"; preference-conflict-resolution: "strong aversion genuinely ruins a co-watch" |
| Emotional intensity / NFA | Least-misery (lower intensity partner wins) | need-for-affect: "least-misery floor on intensity"; emotionally overwhelming content for a low-NFA partner ruins the joint watch |
| Openness / complexity | Average, then steer toward middle-ground bridge themes when gap is large | group-personality-compatibility: "when profile distance is high, up-weight cross-appeal middle-ground themes"; mystery-investigation, ensemble-mosaic, dark-comedy as bridges |
| Moral-ambiguity comfort | Least-misery on dark content (neither partner forced into territory they reject) | preference-conflict-resolution; dark-triad: "gate dark content behind a both-comfortable (intersection / least-misery) check" |
| Topical theme preferences | Average with intersection bonus (shared high-affinity themes boosted) | group-personality-compatibility: "INTERSECTION/overlap of the two members' high-affinity themes is the safe joint core" |
| Ending valence | Average (moderate divergence acceptable) | Lower stakes than intensity veto; bittersweet is often an acceptable compromise |
| Social/co-viewing motive | Amplify if shared; treat as tie-breaker if divergent | media-use-motivation-scales: "weight the joint recommendation toward the dimension both partners share" |

### Assertiveness / dominance weighting

Defer to Phase 1B. group-personality-compatibility notes an optional "assertiveness
asymmetry (Extraversion gap)" weighting, but preference-conflict-resolution recommends
against it at MVP: "defer personality-WEIGHTED aggregation to a later phase... inherits
Article 9 consent burden, and depends on a validated conformity/dominance instrument."

### Compatibility score: do not surface

Multiple items warn against surfacing a compatibility number to users.
group-personality-compatibility: "do NOT expose a compatibility number."
preference-conflict-resolution: "two-party explicit consent; store only the derived
joint prior, never raw scores or a compatibility verdict." The aggregation function
is internal scaffolding; users see only recommendations.

---

## 4. Privacy Architecture

### What to store

**Store:**
- The theme-preference vector derived from seed picks (the tag distribution, not the
  raw picks themselves — though raw picks may be useful for display and should be
  discussed separately)
- A coarse feature-preference band per axis (5 bands is sufficient; continuous scores
  are unnecessary and increase inference risk)
- Explicit content vetoes as boolean flags (violence-present: avoid, sexual-content-
  present: avoid)

**Do not store:**
- Raw personality trait scores (Openness, Neuroticism, etc. as labelled OCEAN dimensions)
- A labelled moral/political profile (this triggers Article 9)
- Individual quiz item responses (store only the derived vector)
- Raw scenario choices from the moral-ambiguity items (political/moral inference risk)

**Derive transiently (compute, discard, do not persist):**
- The absolute personality-trait estimate (e.g. "Openness = 0.72") — use it to seed
  the theme-preference vector, then discard
- The two-person compatibility distance vector — use it to select the aggregation
  strategy, then discard; never persist a compatibility verdict

### GDPR Article 9 triggers

The following constructs require explicit stop-and-ask + ADR-0012 review before storing
anything beyond a coarse derived content-preference band:

- NFA-avoidance signal: need-for-affect is explicit about the "mental-health-adjacent
  inference risk" of storing an emotional-avoidance score
- Moral-ambiguity items: narrative-scenario-quiz: "requires explicit GDPR Article-9
  consent and stop-and-ask review"
- Values-axis if ever included: value-based-preference-elicitation: "requires the
  privacy/consent decision to be made deliberately under ADR-0012 before any storage"
- Any inferred personality trait label surfaced to the user

The IRI Fantasy subscale (if included for character-immersion signal):
empathy-quotient flags the autism-screening provenance as a sensitivity concern.
Store only a coarse "character-immersion: low/medium/high" band, not a raw empathy
score.

### Deletion

All stored vectors are deletable per `/account/delete` under the existing ADR-0012
framework. No special complexity — these are structured fields in the user profile,
not unstructured raw text.

---

## 5. What NOT to Build in Phase 1A

### Full psychometric personality battery

Exclude the NAQ-S as a standalone 10-item quiz, the BFI-10/TIPI as a standalone
quiz, and any multi-page personality assessment. These are instruments to draw
*items* from, not to administer verbatim. quiz-design-psychometrics: "spend a 6-10
item budget on 2-4 high-yield traits at 2-3 items each (fewer traits, measured well)."

### Music taste integration (Spotify/Apple Music import)

music-taste-proxy and spotify-music-personality both recommend deferring this to
Phase 1B+. Reason: third-party OAuth is a stop-and-ask + ADR boundary, cross-cultural
validity is weaker, and the signal is largely redundant with Openness and NFA once
those are captured directly.

### Gamified character assessment battery

gamified-personality-assessment: "DO NOT build a separate 'gamified assessment'
instrument; instead, apply gamified UX patterns to the instruments already recommended."
A full Pymetrics-style behavioural mini-game battery (25-45 min) is excluded. The
*principle* (visual, forced-choice, low-friction) is included in the quiz design above.

### Collaborative filtering / taste-community clustering

netflix-taste-communities: "behavioral clustering needs scale (cold problem for a small
early user base — collaborative signal is sparse until you have users)." This is a
warm-state mechanism. Build the theme-vocabulary infrastructure now; defer cluster
discovery until there is user-base scale.

### Assertiveness-weighted aggregation (PEGA)

preference-conflict-resolution: "defer personality-WEIGHTED aggregation (PEGA /
Quijano-Sanchez style) to a later phase — it is the most promising lever for the
personality/ghost-profile differentiator... but it is unvalidated at n=2."

### Social media personality inference

Excluded entirely. See §1.

### Implicit personality signals from browse behaviour

implicit-personality-signals: "Do NOT use implicit behavioral inference as the cold-
start primary signal." Capture interaction events from day one, but treat them as
direct preference learning, not personality inference. Any inference layer is a future
opt-in feature requiring its own ADR.

---

## 6. Implementation Sequence

### Phase 1A (MVP — must have at launch)

1. **Item-based seed picks (likes)** — Screen 1 of onboarding. Region/language-aware
   title grid, 24-36 titles, ≥3 picks, skip option. Positive theme-preference vector
   derived directly from tag distributions of selected titles. Highest-ROI cold-start
   feature.

2. **Item-based dislike picks** — Screen 2 of onboarding. Separate title grid, 24-36
   titles, skewed toward high-popularity titles users are likely to have watched.
   Negative weights applied to taste vector via existing bipolar formula. Critical for
   two-person Average-Without-Misery veto floor at cold start. No new engine logic.

3. **Feature-preference elicitation** — Screen 3 of onboarding. 6-8 forced-choice items
   on the feature axes above (tone, pacing, ending valence, emotional intensity,
   complexity, moral texture, violence veto). Outputs mapped to theme-preference vector
   via near-direct slug mappings. Catalogue-independent — works for users who skip
   Screen 1.

4. **Content veto flags** — Embedded in Screen 3 (items 7-8). Violence tolerance and
   sexual content tolerance as binary or 3-point items. Applied as hard filters before
   ranking in the two-person aggregation.

5. **Average-Without-Misery joint aggregation** — The two-person theme-preference vector
   combination. Implement the content-veto set-union and the NFA-intensity least-misery
   floor at this stage even if NFA is not explicitly elicited — the intensity veto is
   inferable from the Screen 3 emotional-intensity item.

### Phase 1A optional (include if onboarding friction budget allows)

5. **Moral-ambiguity comfort** — 2-3 forced-choice content preference items (villain
   POV, moral-grey protagonist). Needs Article 9 consent review before storing derived
   score. Include in Screen 2 or as an optional Screen 3 item.

6. **Character projection** — 1-2 archetype forced-choice items ("who would you rather
   follow?"). Adds character-immersion signal. Stop-and-ask before building card deck
   (original art/IP required per projective-character-selection).

### Phase 1B (after first cohort, with interaction data)

7. **NFA explicit elicitation** — 3-4 disguised NFA items (adapted from NAQ-S),
   validated against early interaction data to confirm the phase-1A emotional-intensity
   proxy is insufficient. Article 9 review for NFA-avoidance storage.

8. **Openness explicit elicitation** — 2 disguised Openness items, validated against
   early data.

9. **Migrate to Least-Misery aggregation** — as per-user confidence rises with
   interaction data, switch from Average-Without-Misery to Least-Misery for
   higher-confidence user pairs.

10. **Social motive item** — single co-viewing orientation item. Low friction; add
    when the two-person flow is stable.

### Phase 2+

11. **Spotify/Apple Music import** (optional, requires ADR + stop-and-ask)
12. **Personality-weighted aggregation (PEGA)** — requires validated conformity/
    dominance instrument and internal A/B evidence
13. **Values-axis signal** — requires ADR-0012 privacy decision, only if moral-axis
    signal from Phase 1A proves insufficient
14. **Taste-community clustering** — requires user-base scale for collaborative signal

---

## Uncertainty flags

**Genuine uncertainty where the research is thin or conflicting:**

- The two-person aggregation strategy recommendations (least-misery vs average) are
  supported by dyadic satisfaction literature but the underlying studies are mostly
  movie rating aggregation, not joint watch decisions. multiple-items flag this
  explicitly as "an untested hypothesis to A/B validate."
- The trait-to-theme-slug mappings beyond Openness (Agreeableness → found-family,
  Neuroticism → grief-and-loss, etc.) are directional priors from population-level
  research, not validated against HelpME2C's specific vocabulary. big-five-neo-pi:
  "These are directional priors with small effect sizes — useful for shaping diversity
  and tie-breaking, not for confident per-title ranking."
- Cross-cultural validity of all personality instruments is a known weakness.
  cross-cultural-personality-validity: "the standard high-confidence mapping is only
  as valid as the cross-cultural measurement of the predicting trait." Non-WEIRD users
  (non-Western/non-English) may be poorly served by the Openness→complexity link.
  Per-locale calibration is required before global rollout of personality-weighted
  ranking.
- The IRI Fantasy subscale's incremental value over Openness + NFA is assumed but
  not proven. empathy-quotient flags this dependency explicitly.

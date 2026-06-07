# Ghost-profile design for HelpME2C — research report

**Date:** 2026-05-17
**Prepared by:** Claude (Opus 4.7) — autonomous run
**Status:** Research deliverable, not a design ticket. The HANDOFF doc
beside this one anchors a ticket-ready proposal in Design C, with every
Wouter-facing decision flagged as a proposed default rather than a
committed choice.

---

## TL;DR

A ghost profile in HelpME2C is what we call a **profile inferred about a
non-registered partner/housemate** so that the existing `recommendForGroup`
aggregator (per ADR-0020) can produce a usable couples-rec when only one
partner is on the platform. This is named **moat #1** in PROJECT.md and
Phase 1B in the deferrals list. The research had three questions:

1. **What does the literature say about inferring preferences from
   minimal signal — particularly for someone the answering user isn't?**
2. **What's the GDPR / privacy posture for processing data about a
   non-user described by a registered user?**
3. **What concrete designs should we propose for HelpME2C's ghost-profile
   feature?**

**Headline findings:**

- The Pinterest "Pick 5" topic-picker + Hinge's 3-prompts + OkCupid's
  three-part question battery + Felfernig's knowledge-based recommenders
  + the Rashid 2002 / Christakopoulou 2016 / Sepliarskaia 2018 elicitation
  line collectively converge on a **5–8 well-chosen questions** sweet
  spot for cold-start preference elicitation, with the *interview battery
  design* being the load-bearing UX work, not the inference math
  ([§Q1.6](#q16-interview-elicitation), [§Q1.7](#q17-pinterest-pick-5),
  [§Q1.9](#q19-dating-apps)).
- "Describe a non-registered third party so we can build their profile"
  is **essentially unprecedented in mainstream consumer products** —
  verified absence across Netflix, Hulu, Disney+, HBO Max, Prime Video,
  Apple TV+, Goodreads, Spotify, all major co-watching apps, and
  family-sharing systems. Gifting quizzes (WtfDoTheyWant, Outdone) are
  the closest analogues but one-shot, not durable. **The absence is the
  moat** ([§Q1.8](#q18-non-user-industry-prior-art)).
- Under GDPR, **legitimate interests is the only defensible Article 6
  basis** for processing the partner's data; consent isn't transferable.
  Article 14 obligations apply in full and must be operationally routed
  through the registered user. The household exemption (Lindqvist,
  Buivids) does NOT shield the platform. Bounded scope, time-limited
  retention, and exclusion of Article 9 special categories are all
  load-bearing on the balancing test ([§Q2](#q2-privacy--consent-framing)).
- The recommended ship — **Design C** — is a **5-input visual-picker
  battery** (3–5 vibe/theme tiles + 1 dealbreaker chip + 1 "really
  important" flag), wrapped in an explicit add-a-partner consent gesture
  and routed into the existing `recommendForGroup` aggregator as a
  reduced-weight member with a soft cold-start flag
  ([§Q3.3](#design-c-the-one-id-ship)).
- The eval path piggy-backs on the existing
  `packages/ml/src/eval/cold-start-fixtures.ts` pattern (added under the
  cold-start signals research) — a paired ghost-on / ghost-off
  comparison plus a within-user pilot that asks existing personal-rec
  users the ghost battery about themselves and measures how well the
  elicited profile reproduces their real personal recs
  ([§Q3.4](#q34-evaluation-strategy)).

---

## Constraints box (what this design has to live inside)

- **Phase 1B feature.** This research informs design; nothing is built
  here. Phase 1A is still cold-start onboarding + household composition
  signal (in progress per `research/cold-start-signals/HANDOFF.md`).
- **GDPR is the regulatory floor** per
  [ADR-0012](../../docs/decisions/0012-privacy-compliance.md). EU
  region. Three-toggle consent. The ghost profile is consciously
  breaking the industry per-profile-no-fusion default; the legal
  posture has to do the work.
- **Same rule-based scoring** that powers `recommendForUser` today must
  be able to consume the ghost profile. That means the ghost profile
  must produce a `UserTasteVector` (a `Map<tagId, number>` per
  `packages/ml/src/recommendation.ts:49`) the existing aggregator can
  plug in.
- **Couch co-watcher is the primary archetype** per PROJECT.md §40, and
  this is *the* moat-relevant feature for that archetype's "I want to
  watch with my partner who isn't on the app" use case.
- **No ML training infrastructure** in 1B. Same rule-based scoring as
  Phase 1A.
- **Ghost target may never register.** Designs that assume they
  eventually do are out of scope.

---

# Q1 — Literature & precedent review

Per-source files in `raw/`; one-line takeaway each in this TOC, then a
section per source below.

## TOC of sources

| Source | One-line key takeaway |
|---|---|
| Felfernig knowledge-based recsys ([raw](./raw/felfernig-knowledge-based.md)) | KBR (variables + constraints + MAUT utility weights + repair logic) is the formal academic precedent for ghost profile — what we need is bounded by the dimensionality of the constraint model, not by the inference machinery. |
| Pazzani 1999 demographic-prior ([raw](./raw/pazzani-demographic.md)) | Demographics are **latent in ratings** (BlurMe 2012: gender ~80% inferable); demographic priors add little and amplify bias. Don't ask demographic questions about the partner. |
| Rich 1979 stereotypes + follow-ons ([raw](./raw/rich-stereotypes.md)) | Don't bundle trait predictions — store every elicited fact as independent, individually retractable. Design for graceful retraction first, accuracy second. |
| Cold-start cross-user transfer ([raw](./raw/cold-start-cross-user-transfer.md)) | Negative transfer is real and documented (KDD 2024); don't copy A's whole vector to B. Transfer only what's explicitly elicited; the ghost profile is a deliberately *limited* transfer. |
| Spouse/partner modeling ([raw](./raw/spouse-partner-modeling.md)) | Mainstream recsys has no named subfield for "describe your partner". OkCupid's 3-part question battery + Berkovsky mediation are the closest formal kin. Netflix's per-profile-no-fusion is a deliberate non-answer. |
| Interview elicitation ([raw](./raw/interview-elicitation.md)) | 5–8 well-chosen questions is the empirical sweet spot. Sepliarskaia SPQ: 3× compression. Christakopoulou KDD 2016: 25% lift after 2 questions. Rashid log(pop)*entropy is the cold-start-on-cold-start heuristic. |
| Pinterest "Pick 5" ([raw](./raw/pinterest-interests.md)) | Visual topic picker with min-N gate seeded U2I vector; +5–10% activation lift. The closest mainstream pattern for "small finite set of high-signal picks" — directly transferable except picker is picking *for someone else*. |
| Industry "describe a non-user" prior art ([raw](./raw/describe-a-non-user-industry.md)) | Verified absence across SVOD, books, music, co-watching, family-sharing. Closest analogue: gifting quizzes (WtfDoTheyWant, Outdone, Gretchen Rubin). The absence is a moat. |
| Dating-app question batteries ([raw](./raw/dating-app-question-batteries.md)) | Industry bimodal: Hinge/Tinder ~3–6 questions vs. OkCupid/Match 50–80. Hinge end is right. Negative preferences (dealbreakers) are higher-info per bit (Jonason 2015). Avoid Article 9 axes (CMB ethnicity-algorithm story). |

---

## Q1.1 Felfernig knowledge-based recommenders

[Full file →](./raw/felfernig-knowledge-based.md)

The line — Felfernig, Friedrich, Jannach, Zanker, Burke — frames
recommendation as reasoning over an **explicit knowledge** model
(variables `V`, constraints `C`, user requirements `R` with utility
weights), rather than as a regression from a rating matrix. The Jannach
et al. textbook ([Cambridge 2010](https://www.cambridge.org/9780521493369))
and the Frontiers 2024 overview
([Frontiers in Big Data](https://www.frontiersin.org/journals/big-data/articles/10.3389/fdata.2024.1304439/full))
position KBR as the right structural choice for **infrequent, high-stakes,
complex purchases where users have no rating history** — exactly the
shape of "describe my partner once so we get good couples recs."

The mechanism is **constraint satisfaction + MAUT scoring**:
`{i | consistent(C ∪ R ∪ a(i))}` ranked by `Σ wᵢ · uᵢ(item)`. When the
constraint set is unsatisfiable, the system computes diagnoses and
offers personalised repair — Felfernig 2013 formalises this as nonlinear
optimisation
([SAGE](https://journals.sagepub.com/doi/abs/10.3233/AIC-120543)).

For the ghost profile, the relevant lessons are: (a) the dimensionality
of *the constraint model* — how many theme axes our taxonomy has — sets
how much we need to elicit; we don't need ten ratings, we need a clean
interview hitting the dimensions that actually move recommendations; and
(b) the dominant failure modes documented in the literature are
**knowledge-engineering cost, user fatigue in elicitation, brittle
defaults producing empty result sets, and limited serendipity** —
*not* accuracy. Each of these is a UX failure mode the ghost profile
will inherit if we don't design for it.

## Q1.2 Pazzani 1999 demographic-prior + later contradict

[Full file →](./raw/pazzani-demographic.md)

Pazzani's 1999 *Artificial Intelligence Review* paper
([Springer](https://link.springer.com/article/10.1023/A:1006544522159);
[DOI](https://doi.org/10.1023/A:1006544522159)) treats recommendation as
a hybrid of CF, content-based, and demographic branches. The demographic
branch scores items from age/gender/education/ZIP/marital-status, with
Pazzani's broader Winnow / naive-Bayes work
([Pazzani UCI page](https://ics.uci.edu/~pazzani/Syskill.html)) supplying
the inference machinery.

The most consequential later finding **inverts the framing**. Weinsberg
et al.'s BlurMe (RecSys 2012,
[ACM](https://dl.acm.org/doi/10.1145/2365952.2365989);
[Google Research](https://research.google/pubs/blurme-inferring-and-obfuscating-user-gender-based-on-ratings/))
shows **gender is ~80% inferable from MovieLens ratings alone** — i.e.
demographics are largely *latent* in behavioural data, so demographic
priors add little orthogonal information and instead amplify existing
biases. The 2025 study on gender stereotypes in movie recsys reports
~74.5% of MovieLens users rate in line with gender stereotypes
([arXiv:2501.04420](https://arxiv.org/html/2501.04420v1)). The Spotify
gender-amplification line
([Ferraro/Serra/Bauer CHIIR 2021](https://dl.acm.org/doi/10.1145/3406522.3446033);
[The Conversation](https://theconversation.com/music-recommendation-algorithms-are-unfair-to-female-artists-but-we-can-change-that-158016))
quantifies the consequence — listeners encounter 6–7 male artists before
the algorithm surfaces a female one — driven by training-data imbalance
that demographic clustering preserves and intensifies.

The privacy ceiling is sharper. Latanya Sweeney's classic result
([_Simple Demographics Often Identify People Uniquely_](https://dataprivacylab.org/projects/identifiability/paper1.pdf))
— **87% of US individuals are uniquely identifiable from
{5-digit ZIP, gender, date-of-birth}** — means storing partner
demographics is also a re-identification vector. For a non-consenting
partner this is a first-order GDPR risk (see [§Q2](#q2-privacy--consent-framing)).

**Conclusion**: don't ask demographic questions about the partner.
Prefer elicited theme preferences (the Felfernig KBR signal — variables
and utility weights) over elicited demographics. The cold-start research
already drew this conclusion for the registered user; the case is
stronger for the partner.

## Q1.3 Rich 1979 stereotypes + modern follow-ons

[Full file →](./raw/rich-stereotypes.md)

A "stereotype" in Rich's technical sense
([Cognitive Science 1979](https://onlinelibrary.wiley.com/doi/abs/10.1207/s15516709cog0304_3);
[UT Austin preprint](https://www.cs.utexas.edu/~ear/CogSci.pdf)) is
**a bundled prediction of multiple traits triggered by a single
observation**. Kobsa's later work
([UMUAI 2001](https://ics.uci.edu/~kobsa/papers/2001-UMUAI-kobsa.pdf))
generalised the idea: triggers + hierarchical stereotypes + confidence
weighting + retraction-on-evidence (nonmonotonic reasoning).

The literature's *central* engineering lesson is **graceful retraction
is the hard part**. Once a stereotype is triggered, its defaults
persist; the retraction cost scales with bundle size while the
activation cost is constant — an inherent asymmetry that biases the
system toward keeping wrong defaults. The Spotify gender-amplification
line ([Ferraro/Bauer 2021](https://dl.acm.org/doi/10.1145/3406522.3446033))
is the cleanest empirical demonstration of population-level priors
leaking into individual recs. Ekstrand et al.'s "All The Cool Kids"
([FAT* 2018](https://proceedings.mlr.press/v81/ekstrand18b.html))
documents that demographic differences in measured recommender
effectiveness *interact detrimentally* with popularity bias.

For the ghost profile this hardens into two design constraints. First,
**don't bundle trait predictions** — every elicited fact about the
partner must be independently storable, displayable, and retractable.
"She likes cosy mysteries" is one fact, not a trigger for "cosy mystery
viewer → also likes baking shows / period drama / low-violence content."
Second, **don't trigger off protected attributes — and audit for proxies**.
The fairness survey
([ACM TIST 2024](https://dl.acm.org/doi/10.1145/3664928)) is explicit
that even innocent-seeming demographics encode protected attributes via
correlated variables. The Phase 1B ghost-profile UX should be
*constituted from elicited specifics about content preferences*, not
inferred from demographics about the partner.

## Q1.4 Cold-start cross-user transfer

[Full file →](./raw/cold-start-cross-user-transfer.md)

The literature splits into (a) **domain transfer**
([Cantador/Fernández-Tobías survey](http://arantxa.ii.uam.es/~cantador/doc/2012/ceri12a.pdf);
[2014 RecSys tutorial](https://recsys.acm.org/wp-content/uploads/2014/10/recsys2014-tutorial-cross_domain.pdf))
and (b) **user-to-user transfer** with a relationship anchor
([Berkovsky et al. UMUAI 2008](https://link.springer.com/article/10.1007/s11257-008-9055-z);
[VDM PDF](https://shlomo-berkovsky.github.io/files/pdf/VDM09.pdf)). The
ghost profile is closer to (b): we use A's *explicit elicited
description* of B as a prior for B's preferences.

The hard finding is **negative transfer is documented and real**
([Zhang et al. KDD 2024](https://dl.acm.org/doi/10.1145/3637528.3671799);
[Cao et al. arXiv:2309.10195](https://arxiv.org/pdf/2309.10195)): when A
and B are too dissimilar, the transferred prior actively hurts. The
modern KDD/arXiv literature recommends decomposing preferences into
domain-specific and shared components and **transferring only the
shared part**. Two other failure modes recur:

- **Echo chamber / shared-account contamination**: using A's profile as
  B's prior means B never escapes A's bubble. This is the canonical
  problem Netflix's profile architecture exists to solve
  ([Netflix Help](https://help.netflix.com/en/node/123277);
  [filter-bubbles survey, arXiv:2307.01221](https://arxiv.org/pdf/2307.01221)).
- **Identification risk**: if B's profile is derived from A's, B's
  privacy is governed by A
  ([Utwente privacy-in-recsys survey 2013](https://research.utwente.nl/files/5352108/Privacy_in_Recommender_Systems.pdf)).

This is exactly why the HelpME2C ghost profile must NOT copy A's whole
taste vector as a prior. Instead the design is **A elicits an EXPLICIT
mini-profile about B** — a small number of A's specific claims about
B, each stored as an independent retractable fact. That maps to the
attribute-level preference elicitation pattern
([Karimi 2023](https://dl.acm.org/doi/10.1145/3629981);
[MDPI cold-start survey](https://www.mdpi.com/2076-3417/11/20/9608))
rather than to latent-factor transfer. Burke's hybrid taxonomy
([UMUAI 2002](https://link.springer.com/article/10.1023/A:1021240730564))
gives the integration shape: the ghost profile is one input to a
**weighted** hybrid, never the sole signal, always blended with
whatever feedback emerges from real co-watching.

## Q1.5 Spouse / partner modeling

[Full file →](./raw/spouse-partner-modeling.md)

**Direct answer: there is no named academic subfield for "infer a
partner's preferences from the registered user's description."** Group
recommender systems (Masthoff 2004/2011) assume all members are
first-class users with their own data. Reciprocal recommender systems
(Pizzato 2010, Tay arXiv:1501.06247, UMUAI 2020 survey) assume both
sides have profiles. Co-watching literature (Sun et al. CSCW 2017,
[Google PDF](https://research.google.com/pubs/archive/46602.pdf))
validates the *mechanism* (co-watching is a negotiation, users do
impression management) without proposing a proxy-profile solution.

The two closest practical precedents are:

1. **OkCupid's three-part question battery** ([§Q1.9](#q19-dating-apps))
   formalises "describe your ideal partner" as a weighted-overlap
   scoring problem with explicit importance weights (Irrelevant=0,
   A little=1, Somewhat=10, Very=50, Mandatory=250). The methodological
   transfer to HelpME2C: substitute "a show vector" for "another user's
   answers" and the math carries.
2. **Berkovsky/Kuflik/Ricci mediation framework**
   ([UMUAI 2008](https://link.springer.com/article/10.1007/s11257-007-9042-9))
   — the only formal machinery I found for "use one source of UM data
   to bootstrap another UM."

**Netflix's deliberate non-answer.** Gibson Biddle's retrospective
([Medium](https://gibsonbiddle.medium.com/a-brief-history-of-netflix-personalization-1f2debf010a1))
documents the choice: per-profile (separation), not household-fusion
(synthesis). Initial adoption was ~2% of members; Netflix planned to
*kill* profiles but kept them after pushback. The strategic reasoning,
reading between the lines: per-profile is robust against "my partner
watched horror and now my recs are broken" — household-fusion would
have required solving the hard problem (who's watching? whose
preference dominates?) and Netflix chose to push that complexity to
users. That's the gap HelpME2C is filling.

## Q1.6 Interview elicitation

[Full file →](./raw/interview-elicitation.md)

This is the most directly applicable literature line. The headline
numbers across the canon:

| Source | Finding |
|---|---|
| **Rashid et al. IUI 2002** ([ResearchGate](https://www.researchgate.net/publication/2881320_Getting_to_Know_You_Learning_New_User_Preferences_in_Recommender_Systems)) | log(popularity)*entropy strategy beats random/popularity; **5–7 well-chosen items beat ~20 random items** on accuracy *and* completion. |
| **Christakopoulou/Radlinski/Hofmann KDD 2016** ([MSR PDF](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/06/rfp0063-christakopoulou.pdf)) | Bayesian latent-factor elicitation: **25% lift over a static model after only 2 questions.** |
| **Sepliarskaia et al. RecSys 2018** ([UvA PDF](https://staff.fnwi.uva.nl/m.derijke/wp-content/papercite-data/pdf/sepliarskaia-preference-2018.pdf)) | Static Optimal Preference Questionnaire (SPQ): **3× shorter questionnaire for same accuracy** — each question is a binary search step in latent-factor space. |
| **Zhou et al. Functional MF / decision-tree elicitation** (cited [arXiv:2510.27342](https://arxiv.org/html/2510.27342v1)) | Best accuracy around 6–8 questions; plateaus after. |

The cross-cutting takeaway: **3–10 well-chosen questions is the sweet
spot**, with 5–8 the target zone for a battery aimed at completion AND
accuracy. Survey-fatigue evidence
([Pulse Insights](https://www.pulseinsights.com/pulse/survey-fatigue);
[Survicate](https://survicate.com/blog/how-many-questions-should-surveys-have/);
[PMC review](https://pmc.ncbi.nlm.nih.gov/articles/PMC11833437/))
puts the drop-off knee at ~3–5 questions for in-app onboarding —
mirrors the Userpilot data cited in the cold-start research.

Two failure modes are load-bearing for the ghost profile specifically.
**Stated vs revealed (aspirational) gap**
([CloudArmy](https://cloud.army/why-stated-preferences-fail-the-saydo-gap-in-market/);
[Sci Reports 2023](https://www.nature.com/articles/s41598-023-34192-x)):
"I watch documentaries" vs. actual watch history. The proxy version is
worse — the registered user reports not their own aspirational answer
but their *aspirational answer about their partner*. Counter-intuitively,
the Sci Reports 2023 study finds *aspirational* recs make users feel
time-better-spent at a slight click-rate cost — so deliberately
aspirational ghost recs may be a feature for couple viewing. **Impression
management** ([Sun CSCW 2017](https://research.google.com/pubs/archive/46602.pdf)):
users select content that signals something about themselves to the
co-watcher; the proxy version is the registered user describing their
partner as they *want the partner to be seen*. Mitigation: behavioural
validation (cross-check ghost answers against shows-actually-watched-
together) and *not* exposing the ghost-profile output to the partner in
literal form.

The load-bearing UX work for Phase 1B is therefore **interview battery
design**, not the inference math. Concrete validation path: pilot the
battery on the existing personal-rec users (who have ground-truth watch
history) by asking *them* the questions about *themselves* and checking
how well the elicited profile reproduces their actual personal recs.
That offline validation gives the lift-per-question curve *before* any
partner is ever asked about.

## Q1.7 Pinterest "Pick 5"

[Full file →](./raw/pinterest-interests.md)

The canonical cold-start onboarding pattern. Pinterest asks brand-new
users to **select ≥5 topics** from a curated visual grid of ~30–50 tiles
before the "Done" CTA activates
([Casey Winters / Appcues writeup](https://www.appcues.com/blog/casey-winters-pinterest-user-onboarding);
[Pinterest Engineering — Interest Taxonomy](https://medium.com/pinterest-engineering/interest-taxonomy-a-knowledge-graph-management-system-for-content-understanding-at-pinterest-a6ae75c203fd)).
Each topic is a *visual card with a representative pin image* — not a
text checkbox; that detail is load-bearing. The picks immediately seed
the home feed, so first-session value is real.

The publicly disclosed activation lift is **+5–10% from the
combined-interests + browser-locale onboarding experiment**, the number
that consistently gets cited downstream.

For the ghost profile, the relevant transfers are:

1. **Small finite set of high-signal picks beats a long free-text
   questionnaire.** 3–5 picks from a curated 30–60 item pool of
   *themes/genres/vibes* gives a usable initial vector. The picker pool
   design is the real work — pre-compute the *separability* of each
   candidate theme on the existing registered-user corpus, then pick the
   30–60 themes that maximally partition the population. This is the
   log(pop)*entropy heuristic from Rashid 2002 in practice.
2. **Visual exemplars matter.** Pinterest succeeds partly because each
   tile is a concrete pin, not an abstract word. For a TV+anime ghost
   profile, the analogous move is showing a small poster/still/clip per
   theme — "Cosy small-town mystery" backed by a *Murder, She Wrote*
   still next to a *Midsomer Murders* still.

Caveat specific to the ghost case: Pinterest assumes the *picker is the
picked-for*. Our user is picking *for someone else*, which adds two
problems Pinterest doesn't have — the registered user's mental model of
their partner is noisy, and the partner has no agency to correct it.
Both argue for a smaller, more confident initial vector (3 picks not 5)
plus an explicit "tell me if I got your partner wrong" feedback loop in
the first co-watch session.

Analogue patterns: Spotify (artist picker, performance on
onboarding-aligned clusters drops 13.8% without it per
[Spotify Research 2025](https://research.atspotify.com/2025/9/generalized-user-representations-for-large-scale-recommendations));
Netflix 2014-era "pick 3 shows" ([Help](https://help.netflix.com/en/node/100639));
Twitter topic-follow; Quora's "follow 9 more topics." All converge on the
small-picker pattern as the cold-start primitive.

## Q1.8 Non-user industry prior art

[Full file →](./raw/describe-a-non-user-industry.md)

**Verified absence.** Cross-checked with five query variants and direct
help-doc inspection on Netflix, Hulu, Disney+, HBO Max, Prime Video,
Apple TV+, Paramount+, Peacock — no mainstream consumer streaming
product has a "describe a non-registered third party so we can build
them a recommendation profile" feature. Hulu kids profiles collect a
binary kid/not-kid signal (parental gating, not a taste profile).
Disney+ same. Amazon Household *isolates* tastes per adult, not fuses
them.

Goodreads has a gift-recommendation flow but the recipient must already
be a Goodreads user. Spotify Blend fuses two users' tastes but both are
registered. Co-watching apps (Teleparty, Scener, Watch2Gether, Vemos,
Hulu Watch Party) are synchronous-playback overlays without predictive
group rec. Apple Family Sharing, Google Family Link, Microsoft Family
Safety — all share entitlements/controls, not taste data.

**The closest analogue is gifting quizzes** — WtfDoTheyWant, Outdone,
Gretchen Rubin's Gift-Giving Quiz, GiftWhisper, SmartGiftAI,
GetPerfectGifts, Freudly Gift Finder. All variations on "5–10 questions
describing the recipient → ranked product list." But they are
**one-shot, not durable**: nobody builds a recipient profile that lives
beyond the single gift recommendation. And none of them surface any
notice or rights for the described non-user — the data is treated as
belonging to the giver.

**The absence is a moat.** No mainstream rec product has "describe your
partner / kid / housemate so I can recommend for both of you" as a
first-class durable surface. That means defensible product wedge for
HelpME2C; it also means the UX must be invented rather than borrowed.
The synthesis: **a Pinterest-style topic picker bolted onto a
gifting-style question battery, with the streaming-profile world's
privacy framing**. Worth budgeting design effort here — there is no
prior art to copy, only adjacent patterns to graft.

## Q1.9 Dating apps

[Full file →](./raw/dating-app-question-batteries.md)

Dating apps are the closest commercial analogue because they
systematically extract preferences for a person the user doesn't have
yet. The industry is **bimodal**:

| Platform | Required questions | Typical | Pattern |
|---|---:|---:|---|
| Tinder | ~0 | ~0 | photos-only |
| **Hinge** | 3 prompts + 6 basics | 3 prompts | curated minimal |
| Bumble | 0 + basics | 3 prompts + 5 badges | pick-grid |
| **OkCupid** | 15 match Qs | ~50 | self-paced expansion (3-part questions) |
| eHarmony | 80 | 80 | mandatory pre-match |
| Match | many | many (skippable) | front-loaded |

SurveyMonkey ([completion rates](https://www.surveymonkey.com/curiosity/survey_questions_and_completion_rates/))
puts the steep drop above 12 questions / 5 min, climbing to 40% above
10 min. Refiner 2025 ([in-app survey response rates](https://refiner.io/blog/in-app-survey-response-rates/))
puts the modern in-app sweet spot at **4–5 questions**. Hinge's 3
prompts + lazy-load of basics is the closest deliberate match. Anything
Match-shaped is an immediate completion-rate failure.

**OkCupid's three-part question structure** is the single most
transferable pattern. Per question: (a) my answer; (b) the answer I
would accept from a match; (c) importance rating on the
Irrelevant/Little/Somewhat/Very/Mandatory scale, worth 0/1/10/50/250
points respectively
([HackerEarth notes](https://www.hackerearth.com/practice/notes/okcupids-matching-algorithm-1/);
[OkCupid help](https://okcupid-app.zendesk.com/hc/en-us/articles/22982200783771-How-Does-OkCupid-Work-Our-Complete-Guide-to-Match-Questions-the-Algorithm-and-Setting-Up-Your-Account)).
The importance axis adds Bayesian prior strength *without* adding
question count — a high-value pattern to consider for ghost profile.

**Negative preferences are higher-information per bit than positive
ones.** Jonason et al. PSPB 2015 ([SAGE](https://journals.sagepub.com/doi/10.1177/0146167215609064))
— across 6 studies and 6,500+ participants, *dealbreakers are weighted
more heavily than dealmakers* (asymmetric negativity bias). Hinge has
operationalised this as the Dealbreakers feature. Frolov & Oseledets
2022 ([Springer](https://link.springer.com/article/10.1007/s10844-022-00705-9))
confirms in the recsys theoretical literature: negative preferences are
*less elicited* but *more diagnostic*.

**Special-category data is operationally hazardous even when legally
consented.** The Coffee Meets Bagel ethnicity-algorithm story
([AI Incident DB #280](https://incidentdatabase.ai/cite/280/);
[BuzzFeed News](https://www.buzzfeednews.com/article/katienotopoulos/coffee-meets-bagel-racial-preferences))
is the cleanest cautionary tale: collecting religion/ethnicity/politics/
sexual-orientation with explicit consent is *legal* under GDPR Article 9
but the legal and reputational cost is much higher. For HelpME2C this
means: even if "does your partner like religious-themed films" is a
strong taste predictor, the cost of asking is higher than the benefit.
Use **behavioural-taste axes** (action vs. drama, dark vs. light,
long-form vs. one-shot) that are correlated with the latent traits
without naming them.

**Five lessons** that carry to the ghost profile battery:

1. Keep it small (Hinge end, not OkCupid end). 5–7 questions max.
2. Allow negative preferences explicitly. "What they would *not* watch
   with you" is structurally higher-info than "what they enjoy."
3. Frame everything as relationship-aware ("with you", "on date night",
   "together"). Avoids aspirational-personality bias.
4. Avoid sensitive-axes questions (religion, politics, ethnicity,
   orientation) per Article 9 / CMB lesson.
5. Use multi-choice + importance, not free-text or Likert. OkCupid's
   importance-weight axis lets us add Bayesian signal without adding
   questions.

---

# Q2 — Privacy & consent framing

This is the load-bearing section of the report. Producing a profile
about a non-user has first-order GDPR implications, and they
substantially constrain the design.

## Q2.1 Is the ghost target a data subject?

**Yes.** [Full analysis →](./raw/gdpr-non-user-data.md) §1. GDPR Article
4(1) defines personal data as "any information relating to an identified
or **identifiable** natural person." The ghost target is identifiable by
reference to the registered user's household — we don't need their name,
we have a stable pointer ("user X's partner") that maps to one human and
we're building a behavioural profile against that pointer. WP29 Opinion
4/2007 (still cited by EDPB as primary reference) treats identifiability
as satisfied where "means reasonably likely to be used" exist to single
the person out. *Breyer* (C-582/14, 2016) confirms the CJEU's
expansive read. **GDPR applies in full.**

## Q2.2 Legal basis — only legitimate interests is defensible

Walking Article 6(1):

- **(a) Consent** — the data subject must consent themselves. EDPB
  Guidelines 05/2020 on consent are explicit: Article 4(11) requires
  "freely given, specific, informed and unambiguous indication of *the
  data subject's* wishes." **The registered user cannot consent on the
  partner's behalf.** Article 8's narrow parental-consent carve-out is
  irrelevant (children under 16/13, tied to legal capacity, not "I know
  them well").
- **(b) Contract, (c) Legal obligation, (d) Vital interests, (e) Public
  task** — none apply.
- **(f) Legitimate interests** — available, but conditional on a
  three-part LIA per
  [ICO guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/legitimate-interests/how-do-we-apply-legitimate-interests-in-practice/).
  This is the only viable basis.

**The LIA balancing test is load-bearing on every design choice.** ICO:
*"Their interests are likely to override your legitimate interests if
they wouldn't reasonably expect you to use the information in that way."*
A partner who has never visited the site has almost by definition no
expectation that a third-party platform is building a profile of them.
The balance tips only if (i) the registered user has informed them, (ii)
scope is narrow, (iii) data doesn't leak into adjacent uses (ads,
training, analytics), and (iv) deletion is straightforward.

## Q2.3 Household exemption — protects the user, not the platform

Article 2(2)(c) excludes "purely personal or household activity." The
canonical reads — *Lindqvist* (C-101/01, 2003;
[GDPRhub](https://gdprhub.eu/index.php?title=CJEU_-_C-101/01_-_Bodil_Lindqvist))
and *Buivids* (C-345/17, 2019;
[SCL commentary](https://www.scl.org/10571-the-buivids-debate-why-the-cjeu-decision-isn-t-wrong-and-why-the-gdpr-is-out-of-date/))
— are restrictive: the exemption covers private/family life; if data
leaves the household via a commercial platform, the exemption breaks.
The exemption shields the registered user in their own kitchen ("I'm
using a site to pick a show for me and my partner") but **does not
shield the platform**. HelpME2C is a controller processing the partner's
data for our commercial purposes (improving the model, retaining users).

## Q2.4 Joint controller vs. sole controller

Article 26 covers joint controllers
([EDPB Guidelines 07/2020](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-072020-concepts-controller-and-processor-gdpr_en);
*Wirtschaftsakademie* C-210/16 expansively;
[Bird & Bird analysis](https://www.twobirds.com/en/insights/2018/global/what-is-next-after-the-ecj-ruling-on-joint-control)).
For HelpME2C the dominant framing is **sole controllership**: the
registered user provides input but doesn't determine algorithm/storage/
retention. A privacy review before launch should re-test this once the
UX is concrete (EDPB warns joint-controller status can arise from
"converging decisions").

## Q2.5 Article 14 — informing the partner

This is the load-bearing article. We obtain personal data about the
partner not from the partner; Article 14 obliges us to inform them of
controller identity, purposes, legal basis, retention, recipients,
rights, source, and any automated decision-making — within a month
(Article 14(3)(a)). [ICO right-to-be-informed guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/).

**The Article 14(5)(b) "disproportionate effort" exemption is read
restrictively** per the
[Polish DPA-aligned commentary](https://komentarzrodo.pl/en/home/chapter-iii/section-2/art-14/commentary-on-article-14)
and ICO. Recital 62 ties it primarily to research/statistics/archiving.
HelpME2C *has* a route to the partner — through the registered user, who
knows them — and a consumer recommendation app processing identifiable
individuals via a routable intermediary cannot credibly invoke 14(5)(b).

**The practical compliance pattern is to route the Article 14
information through the registered user.** A clear, persistent
disclosure at the moment of partner-add: *"By adding your partner here,
you confirm they're aware HelpME2C is using information you provide
about their tastes to suggest things for the two of you. Show them this
page: [public Article 14 notice URL]."* This shifts the *operational
delivery* of the notice but does NOT transfer controllership. We remain
the controller; we remain liable if the notice never reaches the
partner. The pattern is consistent with how Article 14 has been argued
in HR/employment contexts and in the *noyb*/LinkedIn line
([Matheson summary of DPC fine](https://www.matheson.com/insights/dpc-imposes-significant-gdpr-fine-on-linkedin/)).

## Q2.6 DSAR implications — Articles 15, 16, 17

| Scenario | Treatment |
|---|---|
| Registered user requests deletion (Art. 17) | **Hard-delete the ghost profile** alongside the registered user's identifying data. The ADR-0012 anonymised-retention pattern does NOT transfer here — the consent/legitimate-interest chain that justified the ghost profile is severed when the registered user leaves. |
| Ghost target registers later | Full Article 15 right of access. Platform must surface "we held a ghost profile keyed to your partner; here it is" and offer claim / merge / delete. Implication: the ghost profile schema needs an addressable identifier reconcilable with a new account. |
| Ghost target asks for erasure before registering | Comply. They're a data subject with Article 17 rights regardless of whether they have an account. Operational implication: a documented `/privacy/delete-non-user` flow. |
| Ghost target requests rectification (Art. 16) | Path needs to exist. Practically rare. |

## Q2.7 Article 9 special categories

Post *OT v Vyriausioji tarnybinės etikos komisija* (C-184/20, 1 August
2022;
[Inside Privacy](https://www.insideprivacy.com/eu-data-protection/special-category-data-by-inference-cjeu-significantly-expands-the-scope-of-article-9-gdpr/);
[Trilateral](https://trilateralresearch.com/data-protection/landmark-cjeu-judgment-confirms-broad-interpretation-of-special-category-data)),
data that *indirectly reveals* a special category through "an
intellectual operation involving comparison or deduction" falls inside
Article 9. ICO has long held the same position
([special category guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/what-is-special-category-data/)).

**The risk for HelpME2C**: a partner-preference signal like "she loves
documentaries about religious cults" or "he won't watch anything with
gay leads" routes the inference straight through Article 9 axes. Even
less obvious signals can drift — heavy preference for political-thriller
and a particular set of LGBTQ+ tags can, in aggregate, "reveal."

**Mitigation** (each load-bearing on the LIA):

- **Filter at ingestion.** Don't ask questions that route through
  Article 9 axes ("religious belief," "sexual orientation," "political
  opinion" as preference dimensions).
- **Genre/theme allowlist for the ghost profile.** Use a curated
  taxonomy that excludes themes which proxy for special categories.
  Don't use anime tags like `religious-cult`, `lgbt-romance`, or
  political-extremism tropes as ghost-profile-eligible features. (The
  model can still use these for the *registered user*, where a different
  consent basis exists; the ghost profile schema is tighter.)
- **Inference suppression.** If aggregate behaviour on the ghost
  profile starts to look like a sensitive cluster, the system should
  refuse to act on that cluster rather than encode it.

## Q2.8 Household-CTV industry default — and the deviation HelpME2C is taking

[Full file →](./raw/household-ctv-extra-members.md). Counting the
platforms: Netflix, Hulu, Disney+, Amazon Household, YouTube Premium
Family, Apple Family Sharing, Google Family Link, Spotify Family —
**eight out of nine systems default to per-individual data with separate
recommendation surfaces**. Sonos/Alexa partitions by voice identity. The
industry has converged on **privacy by isolation** rather than
**privacy by fusion-with-consent**. The exceptions are deliberate
opt-in (Spotify Blend — both registered) or shared-entitlement-not-taste
(Amazon Household).

There is **no commercial precedent for unconsented fusion of an inferred
non-user profile into the registered user's recommendation surface.**
The closest analogue is the "shadow profile" controversy — Facebook
(Belgian DPA decision 2018 — fined for `datr` cookie on non-users;
overturned on jurisdiction, never on merits;
[Global Freedom of Expression](https://globalfreedomofexpression.columbia.edu/cases/belgian-privacy-commission-v-facebook/)),
LinkedIn (noyb complaints) — and that is precisely the pattern that has
drawn enforcement.

The mitigations doing the work, given this industry context:

1. **Explicit registered-user disclosure to the partner** at the moment
   of partner-add — the Article 14 channel above. The ghost profile
   cannot be a "shadow" in the Facebook sense; the registered user has
   been instructed to inform their partner.
2. **Bounded scope** — only signals genuinely required for group
   selection, mirroring Hulu's coarse-grained parental signal rather
   than Spotify's full taste profile.
3. **Session-anchored, not persistent** — the Sun et al. co-watching
   paper tells us the value is in the *decision moment*, not in a
   long-running behavioural archive. Auto-delete after N days inactive.
4. **The responsible defaults from §Q2.2 / §Q2.5 / §Q2.6 / §Q2.7** —
   time-bounded retention, no analytics fusion, hard deletion on
   registered-user delete, claim-on-register, special-category filter.

## Q2.9 Responsible-defaults framing (proposed)

These are the operational principles every design in §Q3 must satisfy.
Each is a proposed default, not a committed decision — Wouter signs off
in the HANDOFF doc.

1. **Legal basis: legitimate interests + a documented LIA.** Drafted
   before the feature ships, anchored to bounded scope.
2. **Article 14 delivered via the registered user.** Persistent written
   disclosure at the add-partner step; standalone public Article 14
   notice page.
3. **Bounded scope schema.** Schema enforces a content-only signal
   allowlist; no demographics, no health, no political/religious
   inferences. Compile-time tag allowlist excludes special-category-
   proxy themes.
4. **Time-bounded retention.** Auto-delete after **90 days** (proposed
   default) of inactivity from the registered user.
5. **Walled off from secondary uses.** Excluded from analytics, A/B
   testing, training data, and any future shareable embedding. Tagged
   at the schema level.
6. **Hard delete on registered-user deletion.** No anonymised retention
   (departs from ADR-0012's pattern for behavioural signal — the
   justification chain collapses when the registered user leaves).
7. **Claim/anonymise/delete path on later registration.** If a new
   account is created by an address the registered user identified as
   the partner (or via an explicit "I'm the partner" flow), surface the
   ghost profile and offer the choice.
8. **Non-user deletion path.** A documented `/privacy/delete-non-user`
   flow.
9. **Session-anchored aggregator behaviour.** The ghost profile
   contributes to the group score for the registered user's session,
   but is **never used as a sole signal** and is treated as a
   reduced-confidence member in the AWM aggregator (lower veto weight,
   wider lambda treatment) — implements the "limited transfer + always
   blend" recipe from the cross-user transfer literature.

---

# Q3 — Three concrete designs for HelpME2C

All three designs share the same architectural shape:

- The ghost profile produces a **`UserTasteVector`** (`Map<tagId, number>`
  per `packages/ml/src/recommendation.ts:49`) that plugs into
  `recommendForGroup` as one of the `GroupMember` entries.
- The registered user remains a separate `GroupMember` with their
  existing taste vector. The aggregator does its AWM-with-soft-
  disagreement-penalty work per ADR-0020.
- The ghost member carries a **confidence flag** that the aggregator
  reads: lower veto weight (ghost won't single-handedly veto a
  candidate; only contributes a soft penalty), and a relaxed
  per-user-normalised floor.
- Each elicited fact is stored as an **independent retractable signal**
  (no bundled stereotypes per [§Q1.3](#q13-rich-1979-stereotypes--modern-follow-ons)).

The three designs differ in *what is elicited* and *how rich the
interview is*. All three respect the responsible defaults in
[§Q2.9](#q29-responsible-defaults-framing-proposed).

## DESIGN A — Minimal-signal (30-second flow)

**Question budget:** 5 inputs, **~30s** total.

**Signal set collected:**

1. **3 vibe-tile picks** from a curated visual grid of 30–60
   theme/genre/vibe tiles. Each tile is backed by a representative
   poster/still (the Pinterest visual-exemplar pattern). Examples:
   "Cosy mystery", "Slow-burn prestige drama", "Heist & cons",
   "Wholesome ensemble comedy", "Action-thriller", "Lighthearted
   anime", "Big-feelings character drama". The picker pool is
   pre-computed by **theme-separability against the existing registered-
   user corpus** per Rashid 2002's log(popularity)*entropy heuristic.
2. **1 dealbreaker chip pick** from a smaller curated list ("no
   horror", "no gore", "no slow-burn", "no animated", "no subtitles",
   "no real-life crime", "no period drama", "no anime"). Single-select.
   Maps to negative-preference signal (Jonason 2015 dealbreaker
   literature, [§Q1.9](#q19-dating-apps)).
3. **1 "really important" flag** — the user can tap one of their 3 vibe
   picks as "Especially loves this one". Adds importance-weighted
   signal without adding a question (OkCupid pattern,
   [§Q1.9](#q19-dating-apps)).

**UX shape:**

- Triggered from the existing `/groups/[id]` page when a registered
  user invites a partner who hasn't registered yet (e.g. "Add as a
  ghost", "Tell us about your partner so we can recommend for both
  of you"). The cold-start research's household-composition signal
  (Phase 1A) is the natural upstream trigger.
- Single page, single scroll, no multi-step wizard. Counter on the
  picker; "Done" enables at 3 picks.
- The dealbreaker is presented as a row of chips beneath the picker.
  Optional but encouraged ("Anything they'd refuse to watch?").
- The importance flag is a small star/heart on each picked tile —
  tap-to-toggle.

**Framing language** (proposed):

| Surface | Copy |
|---|---|
| Partner-add CTA | "Tell us about your partner — 30 seconds, no account needed for them." |
| Article 14 gesture | "By adding your partner here, you confirm they're aware HelpME2C is using your input about their tastes to suggest things for the two of you. **[See what we collect →]**" (link to standalone public Article 14 notice) |
| Picker headline | "Pick 3 vibes your partner is into. We'll show you couple-friendly picks based on this." |
| Importance prompt | "Tap one they especially love — we'll weight it heavier." |
| Dealbreaker chips | "Anything they'd refuse to watch?" |

**How it enters the group aggregator:**

- The 3 vibe tiles map deterministically to a **starter
  `UserTasteVector`** by expanding each tile through the existing
  tag→theme membership tables (`packages/ml/src/scoring`,
  `buildTagThemeIndex`). Each picked tile contributes its constituent
  tags with weight = base weight × the user's existing
  `RATING_HALF_SPAN` constant (≈ a 6/10 rating). The "especially
  loves" tile gets a 2× multiplier (mirrors a 10/10 rating).
- The dealbreaker chip generates a **set of veto tags**. The aggregator
  reads these as hard exclusions in the candidate set (analogous to
  exclusion rules in `recommendForGroup`'s candidate filter, not a
  per-user-normalised veto).
- The ghost `GroupMember` is added alongside the registered user with
  a `confidenceLevel: 'ghost'` flag. The aggregator's veto threshold
  for the ghost member is set to **0.3** (vs. 0.5 default) and the
  disagreement-penalty contribution is halved — implements the
  "limited transfer + always blend" recipe from
  [§Q1.4](#q14-cold-start-cross-user-transfer).

**Privacy / consent posture:**

- All [§Q2.9](#q29-responsible-defaults-framing-proposed) responsible
  defaults apply.
- The picker tile taxonomy is filtered through the special-category
  allowlist at compile time — no tile maps to an Article 9 axis.
- Dealbreaker chip vocabulary is similarly filtered (no
  religion/orientation/politics dealbreakers).

**Schema implications** (adds to existing `apps/web/src/server/schema/`,
not to `packages/ml/`):

```sql
CREATE TABLE ghost_profiles (
  id              uuid PRIMARY KEY,
  owner_user_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name    text,                              -- "Sam", "Partner", null
  vibe_picks      text[] NOT NULL,                   -- 3 tile ids; allowlist enforced
  starred_pick    text,                              -- the importance-flagged tile id; nullable
  dealbreaker_ids text[] NOT NULL DEFAULT '{}',      -- 0..1 chips
  notice_sent_at  timestamptz,                       -- registered user confirmed Article 14 gesture
  last_used_at    timestamptz NOT NULL,              -- updated when ghost contributes to a rec
  expires_at      timestamptz NOT NULL,              -- last_used_at + 90 days
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ghost_profiles_owner ON ghost_profiles(owner_user_id);
CREATE INDEX ghost_profiles_expires ON ghost_profiles(expires_at);
```

A nightly Inngest job hard-deletes any row where `expires_at < now()`.
The ghost has no row in `users`, no Clerk account, no PostHog person
profile. `dealbreaker_ids` and `vibe_picks` use enum-like text columns
backed by an application-layer allowlist (per ADR-0012 §enum patterns).

**Eval strategy:**

See [§Q3.4](#q34-evaluation-strategy). Design A is the most testable —
the smallest amount of new instrumentation. The harness extension is a
paired `with_ghost_profile` / `without_ghost_profile` scenario over the
existing ADR-0020 archetype set, with `coldStartQuality` (composite
score from the cold-start research's
`packages/ml/src/eval/cold-start-fixtures.ts`) as the headline metric.

**What Design A deliberately doesn't include:**

- No multi-axis Likert. No free-text. No "describe their personality."
- No demographics (age, gender, region).
- No "what they watched before" question (would require behavioural
  validation we can't do).
- No claim-on-register / merge logic in v1 (deferred — the schema is
  shaped for it, but the flow isn't built).

## DESIGN B — Rich-signal (2-minute flow)

**Everything in Design A, plus:**

4. **2 polarising-show pair-picks** (Sepliarskaia 2018 SPQ pattern —
   each pair is a binary search step in latent-factor space). The pairs
   are pre-computed offline as the top-2 information-gain pairs in the
   existing registered-user corpus per Rashid 2002 log(pop)*entropy.
   Example: "Would your partner pick **Brooklyn Nine-Nine** or **True
   Detective**?". Quick-tap, no skip.
5. **1 'on date night with you' relationship-anchored question**
   (OkCupid relational framing —
   [§Q1.9](#q19-dating-apps) lesson 3). E.g. "When you two pick
   something for date night, what wins?" — 3 options: "Cosy & familiar
   / Something we'd both rave about / A new genre we'd both try".
6. **1 importance-weighted slider** on one theme axis. E.g. "How
   important is it to them that it's **not too dark**?" — 4-option
   scale: Don't care / A little / Quite / Very. Modeled after the
   OkCupid Irrelevant=0..Mandatory=250 importance pattern but with
   linearly-scaled weights (×1, ×2, ×5, ×10 in the aggregator).

**Question budget:** ~8 inputs, ~2 minutes total. Right at the upper
edge of the 5–8 sweet spot ([§Q1.6](#q16-interview-elicitation)).

**Why Design B exists:** to characterise what *material* additional
quality lift can be bought at the 2-minute cost. The polarising pairs
are the strongest single addition per the
[§Q1.6](#q16-interview-elicitation) literature (Christakopoulou's "25%
lift after 2 questions" specifically); the relationship-anchored
question is the OkCupid-style relational framing; the importance slider
is the only multi-axis Likert in the design.

**How it enters the group aggregator:**

- Same as Design A, plus:
- The polarising pairs deterministically map to direction-on-a-latent-
  axis (offline: which set of tags is correlated with "True Detective"
  preference). Each pair-pick contributes ± 1×weight to the relevant
  tag cluster.
- The relationship-anchored question maps to a small bias on the
  `recommendForGroup`-internal disagreement-penalty `lambda`: the
  "Cosy & familiar" answer increases lambda (penalise disagreement
  harder), "New genre we'd both try" decreases it (allow more
  divergent picks).
- The importance slider contributes a weighted boost (or penalty) on
  the named axis. The 4-step linear scale is documented in code; the
  ×10 max keeps the boost well below the registered user's anchor-pick
  weight to avoid the ghost dominating.

**Schema delta vs Design A:** add three columns to `ghost_profiles`:

```sql
ALTER TABLE ghost_profiles
  ADD COLUMN polarizing_pair_picks jsonb,   -- [{pair_id, pick: 'left'|'right'}, ...]
  ADD COLUMN date_night_axis text,          -- 'cosy' | 'rave' | 'new'
  ADD COLUMN importance_axis jsonb;         -- {axis_id, level: 1|2|3|4}
```

**Eval strategy:** the harness ablation is per-signal — the harness can
hold each new signal in/out independently so Design B's *components* can
be evaluated separately. The expected ranked-order of marginal lift,
per the literature, is: polarizing pair-picks > dealbreaker > importance
slider > relationship-anchored question. The harness should produce that
ranking offline before Design B is recommended over Design A.

**Failure modes Design B specifically exposes:**

- Survey fatigue knee — drop-off rises sharply past ~5 questions per
  [§Q1.6](#q16-interview-elicitation). Design B is at ~8 inputs.
- Aspirational drift — the more questions, the more room for the
  registered user to describe an idealised partner rather than the
  real one ([§Q1.6 §5.4](#q16-interview-elicitation)). Mitigated by
  multi-choice + relational framing but not eliminated.
- Increased Article 9 surface — more axes = more risk one of them
  proxies a special category. The allowlist filter needs to cover
  every new axis Design B introduces.

## DESIGN C — The one I'd ship

**Design C = Design A + ONE addition from Design B.**

**The addition:** the **2 polarising-pair-picks** (Design B item 4). The
rest of Design B (relationship-anchored question, importance slider) is
deferred to a follow-up.

**Why C:**

1. **Per the literature, the polarizing-pair-picks deliver the largest
   marginal lift per question** ([§Q1.6](#q16-interview-elicitation):
   Christakopoulou's "25% lift after 2 questions" comes from exactly
   this pattern; Sepliarskaia's SPQ specifically formalises pair-picks
   as binary-search steps in latent space). If we're going to pay for
   one additional input beyond Design A's minimal 5, the pair-picks
   are it.
2. **The relationship-anchored question and importance slider are
   higher-uncertainty additions.** The relationship question's value
   depends on whether the `lambda` mapping holds empirically (worth
   testing, not worth shipping unproven). The importance slider adds
   schema complexity (jsonb axis) for an effect that overlaps the
   "starred pick" mechanic from Design A — possibly redundant.
3. **Design C's input count is 7** (3 picks + 1 dealbreaker + 1 star +
   2 pair-picks). Within the 5–8 sweet spot
   ([§Q1.6](#q16-interview-elicitation)) and within the in-app survey
   sweet spot of 4–5 questions (Refiner 2025) by question count (the
   3-tile picker is one question; the 2 pair-picks are two; the
   dealbreaker chip is one; the star is a sub-action). Approximately
   60–90 seconds total interview time.
4. **The privacy surface is tightly bounded.** Each new signal is on
   the content-axis allowlist; no new sensitive-data risk vs Design A.
   The polarizing-pair pool is the same allowlist-filtered tile pool,
   just paired.
5. **The aggregator integration is identical to Design A** plus a
   single new tag-cluster-bias function for pair-picks. The
   `recommendForGroup` interface is unchanged.

**Signal set collected (Design C, full list):**

1. 3 vibe-tile picks
2. 1 starred (importance-flagged) tile
3. 1 dealbreaker chip
4. 2 polarizing-pair-picks (pre-computed information-gain pairs)

**UX shape:**

```
[partner-add card on /groups/[id]]
      ↓
Step 1: Vibe picker (counter, "Done" at 3, starring optional)
      ↓
Step 2: Dealbreaker chips ("Anything they'd refuse to watch?")
      ↓
Step 3: Two pair-pick questions, fast-tap
      ↓
[Confirm Article 14 gesture] → ghost profile created
      ↓
Back to /groups/[id] — recs recompute, ghost member visible
```

**Framing language** (Design C-specific additions to Design A's):

| Surface | Copy |
|---|---|
| Pair-pick 1 | "Quick test — would your partner pick A or B?" with two visual cards |
| Pair-pick 2 | "And one more — A or B?" |
| Article 14 confirm | "I confirm my partner knows I'm using HelpME2C to find things for us to watch. [See what we collect about them]" — checkbox-required to submit. |

**How it enters the group aggregator** — same as Design A, plus:

- Each pair-pick contributes ±1×weight to a pre-computed tag cluster
  on a polarising latent axis. Two pair-picks = two latent-axis
  corrections to the starter vector built from the vibe tiles. The
  resulting vector is the ghost's `UserTasteVector`.

**Privacy posture** — same as Design A and same responsible defaults
from [§Q2.9](#q29-responsible-defaults-framing-proposed). No new
schema-level risk vs Design A.

**Schema implications** — Design A schema plus:

```sql
ALTER TABLE ghost_profiles
  ADD COLUMN polarizing_pair_picks jsonb NOT NULL DEFAULT '[]';
  -- [{pair_id: 'pair_001', pick: 'left'|'right'}, ...]
  -- Application-layer enforces length <= 2 and pair_id ∈ allowlist
```

The polarising-pairs are *pre-computed offline* by a separate Inngest
job over the existing registered-user corpus and stored in a static
`polarizing_pairs` table (~50 pairs initially; the runtime UX picks 2
at random per session, or uses a sticky pair-set per onboarding-cohort
for cleaner A/B testing).

**Eval strategy:** see [§Q3.4](#q34-evaluation-strategy). The ablation
runs Design A signal-on vs Design A signal-off (regression gate); then
Design C signal-on vs Design C signal-off; then Design C vs Design A
(does the pair-pick addition justify the extra 30 seconds?).

**What Design C deliberately defers** (worth flagging for follow-up):

- The relationship-anchored question. Worth piloting as a
  conversational follow-up rather than a battery question — "Now
  what's the vibe tonight?" as a *session-level* prompt at the moment
  of recommendation, not at partner-add. Phase 1B+ follow-up.
- The importance slider. Subsumed by the "starred pick" mechanism in
  v1; only worth re-opening if the offline ablation shows the star
  alone is insufficient.
- Claim/anonymise/delete UX on later registration. The schema supports
  it; the flow is a separate ticket.
- Newcomer detection for the ghost (e.g. the partner is described as
  liking anime even though the registered user has none in their
  picks). Could surface the cross-medium bridge explanation more
  prominently, but that's a v2 UX hook.

## Q3.4 Evaluation strategy

The instrumentation reuses the harness shape from the cold-start
signals research (`packages/ml/src/eval/`,
`cold-start-fixtures.ts`-style paired with/without scenarios).

### Layer 1 — Offline ablation in `packages/ml/src/eval/`

**Hypothesis** (per design):

> Given a ghost profile of shape <Design A/B/C>, group-rec quality on
> the registered-user + ghost-member pair improves by at least
> `<delta>` over the no-ghost baseline (where the registered user is
> the only member), measured on the `partner-couple-with-ghost` fixture
> set.

**New fixtures to add:** `packages/ml/src/eval/ghost-profile-fixtures.ts`
with paired scenarios:

- `SCENARIO_GHOST_COMPATIBLE_COUPLE_DESIGN_A` —
  registered user + ghost with the Design A 5-input vector. Compare
  against `SCENARIO_GHOST_COMPATIBLE_COUPLE_NO_GHOST` (registered user
  only, returning solo recs).
- Same for Design B and Design C.
- `SCENARIO_GHOST_DIVERGENT_COUPLE_*` — registered user picks
  anime-leaning anchors, ghost has a "no anime" dealbreaker, ghost has
  "Cosy mystery" vibe pick. Tests the dealbreaker veto path.
- `SCENARIO_GHOST_COLD_START_COUPLE_*` — registered user has minimal
  anchor history; the ghost is the dominant signal source. Tests the
  reduced-confidence ghost member treatment.

**New harness function:**
`ghostAblation(scenarioPair, params, limit) → { withGhost, withoutGhost, delta }`
reusing the shape of `signalAblation` proposed in the cold-start
HANDOFF.

**Composite metric (reused from cold-start research §3):**

```
coldStartQuality = 0.5×meanScore + 0.3×(allHappyCount/topN) + 0.2×min(themeDiversity/5, 1)
```

For the ghost specifically, two additional eval-only metrics:

- `ghostHappyRate` — proportion of top-N items where the ghost
  member's normalised score ≥ 0.6 (lower bar than the registered
  user's 0.7 because the ghost is reduced-confidence by design).
- `coverageDelta` — does the ghost expand the recommendable surface,
  or contract it (via dealbreaker)?

### Layer 2 — Within-user pilot

The pilot the literature endorses ([§Q1.6](#q16-interview-elicitation)):
before any partner is ever asked about, ask N existing personal-rec
users the ghost battery **about themselves**. They have ground-truth
watch history. Measure how well the elicited profile reproduces their
real personal recs (recall@k against their actual personal-rec list).

This is the only validation that genuinely tests "does the battery
extract the right signal" before we touch a non-user. It's offline-ish
(uses existing users), GDPR-clean (we ask them about themselves), and
gives a defensible curve of "lift per question." If the within-user
pilot fails to reproduce personal recs convincingly, the ghost profile
isn't ready to be deployed against actual partners.

### Layer 3 — Live (n=10) testing — only after Layers 1 and 2 pass

Per PROJECT.md's 4/5 quality bar — once Layers 1 and 2 hit threshold,
the canonical live eval is a 10-tester panel. The hypothesis:

> Couples (one registered, one not) using Design C report self-reported
> quality of top-10 group recs ≥ 4.0/5, AND the registered user
> reports the partner-add flow as "obvious / quick / I'd do it again"
> ≥ 4/5.

The bar for "keep" is **directionally positive + no harm to the
partner-add flow completion rate**. Drop-off cost > 15pp at the
partner-add step is the hard fail.

### Decision gates (proposed)

| Layer | Gate |
|---|---|
| Offline ablation | `coldStartQuality_with_ghost ≥ coldStartQuality_no_ghost + 0.05` across all ghost scenarios; no scenario regresses by > 0.02. |
| Within-user pilot | recall@10 against personal recs ≥ 0.40 (i.e. the elicited profile reproduces at least 40% of the user's actual top-10 personal recs). |
| Live n=10 | mean rating ≥ 4.0/5 on top-10 group recs; partner-add completion ≥ 70%. |

If any gate fails, the design either reduces to A (fewer inputs) or
ships behind a feature flag while iterating.

---

## Synthesis pointers (cross-cutting)

A few cross-cutting findings worth surfacing for the implementing
session:

- **The interview battery design is the moat-relevant work, not the
  inference math.** Five separate raw files converge on this point. The
  picker pool, the dealbreaker vocabulary, the polarising-pair set —
  these are the artifacts that make the difference between a good
  ghost profile and a useless one. The aggregator integration is
  ~50 lines of TS.
- **Validate within-user before cross-user.** Layer 2 above is the
  only validation that's both ethical (no non-user data) and
  scientifically informative. It must be done before any live ghost
  testing.
- **The "limited transfer" framing is doing all the legal work.**
  Designs A/B/C all *elicit* specifics from A *about* B; none copies
  A's whole vector to B. That distinction is what makes the
  legitimate-interests balancing test (Article 6(1)(f)) survive — and
  it's what avoids the negative-transfer / echo-chamber /
  identification-risk failure modes the cross-user transfer literature
  documents ([§Q1.4](#q14-cold-start-cross-user-transfer)).
- **The schema must enforce the special-category allowlist at compile
  time.** A runtime allowlist check is a soft guarantee; a TypeScript
  enum or Zod schema for ghost-profile signals is what makes the
  Article 9 mitigation auditable.

---

## Open questions for human review

Three things the autonomous run wants Wouter to look at before this
becomes a ticket:

1. **The 90-day retention default.** Picked from the responsible-
   defaults literature without an empirical anchor. Could be 60, 30,
   or 180. The trade-off is "less retention is more privacy-defensible"
   vs "less retention is more user-friction when the registered user
   comes back next month." Worth a short calibration conversation.
2. **The decision to defer claim/anonymise/delete-on-register from
   v1.** The schema supports it; the flow is a separate ticket.
   Arguable that it should ship with Design C because once a partner
   does register, *not* offering them control is the worst possible
   UX. Counter-argument: the v1 user base is unlikely to surface this
   case for months — defer until we hit it.
3. **Whether the dealbreaker vocabulary should be free-form or
   curated chip-only.** Curated is safer (allowlist enforcement is
   trivial); free-form is more expressive and matches the gifting-quiz
   norm. The CMB ethnicity-algorithm story
   ([§Q1.9](#q19-dating-apps)) is the cleanest reason to start curated
   and only relax later if user testing demands it.

---

## Where to look next (for follow-on research)

- **Relationship-anchored session prompts** ("What's the vibe tonight?"
  at the recommendation moment, not at partner-add). The OkCupid
  relational-framing finding combined with the Sun et al. co-watching
  paper's "decision-making is the bottleneck" insight suggests
  session-level prompts may outperform persistent profile data for the
  couch-co-watcher archetype. Worth a separate research run before
  Phase 1B+ adds session-level signals.
- **Claim-on-register UX patterns from password-manager / contact-card
  worlds.** The closest precedent for "the data subject shows up
  later" is account-recovery and email-merge flows — Mailchimp,
  HubSpot, and Apple's Family Sharing handle the "verify and merge"
  moment in ways that may transfer.
- **Partner-side disclosure tools.** A short, clear public Article 14
  notice page (`/privacy/about-your-partner-profile`) is operationally
  load-bearing for the LIA balancing test. Worth a short content-design
  research pass before drafting the page copy.

---

## Files

- This report: `research/ghost-profile-design/REPORT.md`
- Ticket-ready plan: `research/ghost-profile-design/HANDOFF.md`
- Raw evidence: `research/ghost-profile-design/raw/*.md` (11 files,
  ~18k words, ~250 citations)
- Run log: `research/ghost-profile-design/RUN_LOG.md`

_End of REPORT.md._

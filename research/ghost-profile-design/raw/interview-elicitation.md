# Interview-style Preference Elicitation

> Raw notes for HelpME2C ghost-profile-design research, gathered 2026-05-17.
> Topic: "ask the user a small number of well-chosen questions to bootstrap a
> profile." This is the most directly applicable literature line for the
> HelpME2C ghost-profile interview battery.

## 1. Approach

Interview-style (a.k.a. "quiz-style", "active-learning", "preference
elicitation", "conversational") cold-start is the academic version of the
Buzzfeed quiz: instead of asking the user to fill out a 50-field form or
silently waiting for behavioural data to accumulate, the system poses a
small sequence of carefully-chosen questions, each chosen to *maximally
disambiguate* the user's latent preference state given everything answered
so far.

Why this beats a long form, per the literature:

- **Survey fatigue is real and steep.** Drop-off rises sharply with each
  additional question past a small threshold; Gartner data cited by
  Pulse Insights pegs average completion at ~33%, dropping below 15% for
  surveys longer than 5 minutes ([Pulse Insights survey-fatigue
  guide](https://www.pulseinsights.com/pulse/survey-fatigue),
  [Survicate](https://survicate.com/blog/how-many-questions-should-surveys-have/)).
  Userpilot's onboarding-specific work (cited in the cold-start
  research note) finds ~3-5 steps before significant churn.
- **Most form fields are low-information.** Asking 50 likert ratings
  produces *less* information about a user's latent factor vector than
  5 cleverly-chosen pairwise comparisons (Sepliarskaia et al. 2018 —
  see §4).
- **Conversational framing reduces perceived friction.** Christakopoulou,
  Radlinski, Hofmann at KDD 2016 show explicit interactive question-asking
  outperforms static models even with very few questions
  ([Microsoft Research PDF](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/06/rfp0063-christakopoulou.pdf),
  [ACM DOI](https://dl.acm.org/doi/10.1145/2939672.2939746)).

## 2. Signal set — what kinds of questions are high-information?

Three high-information question types recur across the literature:

### 2.1 Polarising items

Items where the population is split roughly 50/50. Rating an item that
99% of people love gives near-zero information about your user; rating a
polariser maximally splits the user-population posterior. Rashid et al.
2002 quantify this — their "entropy0" strategy explicitly selects items by
the entropy of the rating distribution
([IUI 2002 paper, ResearchGate
PDF](https://www.researchgate.net/publication/2881320_Getting_to_Know_You_Learning_New_User_Preferences_in_Recommender_Systems)).

### 2.2 Items that disambiguate latent clusters

If the population latent-factor model has well-separated clusters,
choosing items where clusters disagree most is optimal. Functional
matrix factorisation (Zhou et al., implemented as "IGCN — information
gain through clustered neighbours") builds a decision tree of items
where each leaf is a user cluster
([Pairwise and Attribute-Aware Decision Tree, arXiv 2510.27342](https://arxiv.org/html/2510.27342v1)).

### 2.3 Items that map cleanly to taxonomy axes

Critique-based recommenders (Chen & Pu 2012 — see §3.2) target the
*feature axes* directly: "do you want more action and less romance" is a
question per-axis, not per-item. For HelpME2C's theme taxonomy this is
the obvious shape.

## 3. Inference mechanism

Four canonical mechanisms appear:

### 3.1 Information gain (entropy reduction)

Rashid et al. 2002 ([IUI proceedings](https://www.researchgate.net/publication/2881320_Getting_to_Know_You_Learning_New_User_Preferences_in_Recommender_Systems),
[Penn State author page](https://pure.psu.edu/en/publications/getting-to-know-you-learning-new-user-preferences-in-recommender-/))
evaluate six strategies: random, popularity, entropy, item-entropy,
log(popularity)*entropy, and a personalised strategy. The
log(pop)*entropy hybrid wins on offline metrics — popularity ensures the
user can rate it (not too obscure), entropy ensures the rating is
informative.

### 3.2 Critiquing — unit and compound critiques

Chen & Pu, "Critiquing-based recommenders: survey and emerging trends"
(UMUAI 2012) catalogues the design space
([Springer DOI](https://link.springer.com/article/10.1007/s11257-011-9108-6),
[author PDF](https://link.springer.com/content/pdf/10.1007/s11257-011-9108-6.pdf)).
The user sees a recommended item and *critiques* it ("cheaper", "more
sci-fi, less crime"). Each critique is a constraint on the next iteration's
search. Relevant for HelpME2C because the ghost-profile UX can show a
proposed couples-pick and let the registered user critique it on the
partner's behalf ("she'd like this but with less violence").

### 3.3 Bayesian latent-factor disambiguation

Christakopoulou, Radlinski, Hofmann (KDD 2016) formalise it as a Bayesian
update over latent-factor coordinates. The system maintains a posterior
over the user's latent vector; each question is chosen to maximally
shrink the posterior covariance. Result: **25% improvement over a static
model after only 2 questions**
([Microsoft Research PDF](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/06/rfp0063-christakopoulou.pdf)).

### 3.4 Static optimal questionnaires (SPQ)

Sepliarskaia, Kiseleva, Radlinski, de Rijke (RecSys 2018) prove the
optimisation task that should be solved to construct a *static* (no
dynamic branching) questionnaire of relative preference questions
([RecSys 2018 PDF](https://staff.fnwi.uva.nl/m.derijke/wp-content/papercite-data/pdf/sepliarskaia-preference-2018.pdf),
[ACM DOI](https://dl.acm.org/doi/10.1145/3240323.3240352),
[de Rijke blog post](https://staff.fnwi.uva.nl/m.derijke/recsys-2018-paper-on-preference-elicitation-as-an-optimization-problem-online/)).
Each SPQ question is a binary search step in latent-factor space. Result:
**SPQ reduces required questionnaire length by up to a factor of 3** vs.
prior state of the art. SPQ is especially relevant for HelpME2C because a
static questionnaire is easier to UX, A/B-test, and reason about than a
dynamic decision tree.

A 2020+ generation of conversational-recsys survey work catalogues the
broader space ([Gao et al. survey, arXiv 2101.09459](https://arxiv.org/abs/2101.09459),
[Jannach et al. ACM CSUR 2021](https://dl.acm.org/doi/10.1145/3453154)) —
five sub-problems: question-based elicitation, multi-turn strategy,
dialogue understanding/generation, exploit-explore tradeoff, evaluation.
For HelpME2C only the first matters.

## 4. Validation results — how few questions are enough?

The headline empirical numbers across the literature:

| Source | Setup | Result |
|---|---|---|
| **Rashid et al. 2002** (IUI; live study, 300+ users; MovieLens) | Compared random / popularity / entropy / log-pop*entropy / item-item / personalised strategies, 5-25 items each | log(popularity)\*entropy outperforms random and popularity on RMSE; user-effort experiments suggest **5-7 well-chosen items beat ~20 random items** on prediction accuracy *and* completion rate |
| **Christakopoulou et al. KDD 2016** (live study, restaurant rec) | Bayesian latent-factor elicitation vs. static model | **25% lift after 2 questions** |
| **Sepliarskaia et al. RecSys 2018** (offline + user study, MovieLens / Jester) | SPQ (static relative-preference questionnaire) vs. prior elicitation methods | **3× shorter questionnaire for same accuracy** |
| **Zhou et al., Functional MF** (cited by [arXiv 2510.27342](https://arxiv.org/html/2510.27342v1)) | Decision tree with FMF leaves | Best accuracy around **6-8 questions**, plateaus after |

Cross-cutting takeaway: the sweet spot is **3-10 well-chosen questions**.
Past ~10, marginal information gain per question collapses; past ~15,
survey-fatigue churn dominates the marginal gain. For HelpME2C's
ghost-profile interview, the target zone is roughly the **5-8 question
range**, with adaptive branching if a question is highly informative
(critique style) and a hard cap to protect completion rate.

## 5. Failure modes

Five recur in the literature:

### 5.1 Survey fatigue past ~3-5 steps

User-onboarding-flow research consistently finds drop-off begins around
3-5 questions; long surveys see completion rates collapse
([Pulse Insights](https://www.pulseinsights.com/pulse/survey-fatigue),
[Survicate](https://survicate.com/blog/how-many-questions-should-surveys-have/),
[PMC review article on survey fatigue in questionnaire research](https://pmc.ncbi.nlm.nih.gov/articles/PMC11833437/)).
Implication for HelpME2C: budget the interview at ~30s to 2min, ≤8
questions, treat completion as a primary metric.

### 5.2 Cold-start-on-cold-start

The elicitation system itself needs priors. Information-gain strategies
require knowing the *population* distribution over items — which you
need data to estimate. A brand-new platform has no population from
which to compute item entropy. Mitigations: bootstrap from a public
dataset (MovieLens-style, or for HelpME2C, TMDB + AniList tag
distributions); start with hand-crafted polarising items chosen by a
domain expert; transfer the latent factor model from a related domain
([Berkovsky et al. mediation 2008 — see spouse-partner-modeling.md
§2.4](https://link.springer.com/article/10.1007/s11257-007-9042-9)).

### 5.3 Leading questions / framing effects

A question like "do you like clever, character-driven dramas?" leads;
nobody answers no. Critiquing surveys (Chen & Pu 2012) flag this
explicitly and recommend pairwise / forced-choice formats. Pairwise
*"would your partner pick A or B?"* avoids most framing pathologies and
is the format used by Sepliarskaia et al.'s SPQ.

### 5.4 Stated vs. revealed preference — the aspirational gap

The "say/do gap": "I watch documentaries" vs. actual watch history that
is 80% reality TV
([CloudArmy on stated preferences](https://cloud.army/why-stated-preferences-fail-the-saydo-gap-in-market/),
[Thorburn — What does it mean to give someone what they want?](https://medium.com/understanding-recommenders/what-does-it-mean-to-give-someone-what-they-want-the-nature-of-preferences-in-recommender-systems-82b5a1559157),
[Tailoring recommendation algorithms to ideal preferences, Sci Reports 2023](https://www.nature.com/articles/s41598-023-34192-x)).
For HelpME2C, the say/do gap *compounds* — the registered user reports
not their own aspirational answer, but their *aspirational answer about
their partner*. The Sci Reports 2023 study finds, counter-intuitively,
that targeting *aspirational* preferences makes users feel time-better-
spent even at a slight click-rate cost. The ghost profile may inherit
this property: deliberately aspirational ghost recs may be a feature,
not a bug, for couples viewing.

### 5.5 User lies / signalling

The Sun et al. CSCW 2017 co-watching study explicitly documents
*impression management* in co-watching choice — users select content
that signals something about themselves to the co-watcher
([Google Research PDF](https://research.google.com/pubs/archive/46602.pdf)).
The proxy version: the registered user may describe their partner as
they *want the partner to be seen* by the recommender (and by
themselves). Mitigations: behavioural validation (cross-check ghost
answers against shows-actually-watched-together), and *not* showing the
ghost-profile output to the partner in literal form.

## 6. Relevance to ghost profile

This is the most directly applicable literature line for HelpME2C. The
ghost profile is, structurally, a preference-elicitation problem with
two twists: (a) the subject of the elicitation is *not* the answering
user, and (b) the goal is a *couples-rec*, not a single-user rec. Twist
(a) makes the say/do gap larger but not fundamentally different — the
mechanics of "ask 5-8 well-chosen questions, build a latent-factor
posterior, generate recs" all transfer. Sepliarskaia et al.'s SPQ and
Christakopoulou et al.'s Bayesian elicitation are the two strongest
recipes; Rashid et al.'s log(pop)\*entropy is the strongest heuristic
for the cold-start-on-cold-start case where HelpME2C has not yet
trained a latent-factor model.

The load-bearing UX work for Phase 1B is therefore **interview battery
design**, not the inference math. Concretely: choose 8-12 candidate
questions from theme-taxonomy axes + polarising shows; pilot the battery
on the existing personal-rec users (who have ground-truth watch history)
by asking *them* the questions about *themselves* and checking how well
the elicited profile reproduces their actual personal recs. That offline
validation gives the curve of "lift per question" before any partner is
ever asked about. Only once the within-user battery proves itself does
ghost (cross-user, proxy-elicited) get deployed. The literature's
"5-8 question sweet spot, 25% lift after 2, 3× compression vs. naive
methods" gives a defensible target for the pilot.

## Sources and References

1. [Rashid, Albert, Cosley, Lam, McNee, Konstan, Riedl — Getting to know you: learning new user preferences in recommender systems, IUI 2002 (ResearchGate PDF)](https://www.researchgate.net/publication/2881320_Getting_to_Know_You_Learning_New_User_Preferences_in_Recommender_Systems) / [Penn State author page](https://pure.psu.edu/en/publications/getting-to-know-you-learning-new-user-preferences-in-recommender-/) / [Semantic Scholar entry](https://www.semanticscholar.org/paper/Getting-to-know-you:-learning-new-user-preferences-Rashid-Albert/f14e1858d6c3a7c8db7c0e1a935f3e6924b1ec00).
2. [Christakopoulou, Radlinski, Hofmann — Towards Conversational Recommender Systems, KDD 2016 (Microsoft Research PDF)](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/06/rfp0063-christakopoulou.pdf) / [ACM DOI](https://dl.acm.org/doi/10.1145/2939672.2939746) / [KDD subtopic page](https://www.kdd.org/kdd2016/subtopic/view/towards-conversational-recommender-systems).
3. [Sepliarskaia, Kiseleva, Radlinski, de Rijke — Preference elicitation as an optimization problem, RecSys 2018 (UvA PDF)](https://staff.fnwi.uva.nl/m.derijke/wp-content/papercite-data/pdf/sepliarskaia-preference-2018.pdf) / [ACM DOI](https://dl.acm.org/doi/10.1145/3240323.3240352) / [author blog summary](https://staff.fnwi.uva.nl/m.derijke/recsys-2018-paper-on-preference-elicitation-as-an-optimization-problem-online/).
4. [Chen & Pu — Critiquing-based recommenders: survey and emerging trends, UMUAI 2012 (Springer)](https://link.springer.com/article/10.1007/s11257-011-9108-6) / [author PDF](https://link.springer.com/content/pdf/10.1007/s11257-011-9108-6.pdf).
5. [Gao, Lei, He, Huang, Chua — Advances and Challenges in Conversational Recommender Systems: A Survey, arXiv 2101.09459](https://arxiv.org/abs/2101.09459) / [USTC PDF](http://staff.ustc.edu.cn/~hexn/papers/CRS-survey-2021.pdf).
6. [Jannach, Manzoor, Cai, Chen — A Survey on Conversational Recommender Systems, ACM Computing Surveys 2021 (full HTML)](https://dl.acm.org/doi/fullHtml/10.1145/3453154) / [DOI](https://dl.acm.org/doi/10.1145/3453154) / [arXiv 2004.00646](https://arxiv.org/abs/2004.00646).
7. [Pairwise and Attribute-Aware Decision Tree-Based Preference Elicitation for Cold-Start Recommendation, arXiv 2510.27342](https://arxiv.org/html/2510.27342v1) — recent decision-tree elicitation work; cites Zhou et al.'s functional matrix factorisation.
8. [InfoRec — Information gain based dynamic support set construction for cold-start recommendation, J. Intelligent Information Systems 2023](https://link.springer.com/article/10.1007/s10844-023-00795-z).
9. [Active learning algorithm for alleviating the user cold start problem of recommender systems, Scientific Reports 2025](https://www.nature.com/articles/s41598-025-09708-2).
10. [Pulse Insights — Survey Fatigue is Real: 7 Strategies to Get Quality Feedback Without Annoying Customers](https://www.pulseinsights.com/pulse/survey-fatigue) — cites Gartner ~33% / <15% completion data.
11. [Survicate — Survey Length: Data Report on How Many Questions Should Surveys Have](https://survicate.com/blog/how-many-questions-should-surveys-have/).
12. [Survey Fatigue in Questionnaire Based Research: The Issues and Solutions, PMC review article](https://pmc.ncbi.nlm.nih.gov/articles/PMC11833437/).
13. [Sun, de Oliveira, Lewandowski — Challenges on the Journey to Co-Watching YouTube, CSCW 2017](https://research.google.com/pubs/archive/46602.pdf) — impression-management finding relevant to §5.5.
14. [CloudArmy — Why Stated Preferences Fail: The Say/Do Gap in Market Research](https://cloud.army/why-stated-preferences-fail-the-saydo-gap-in-market/).
15. [Thorburn — What Does it Mean to Give Someone What They Want? (Understanding Recommenders, Medium)](https://medium.com/understanding-recommenders/what-does-it-mean-to-give-someone-what-they-want-the-nature-of-preferences-in-recommender-systems-82b5a1559157).
16. [Milli, Chen, Kasirzadeh, Stray — Tailoring recommendation algorithms to ideal preferences makes users better off, Scientific Reports 2023](https://www.nature.com/articles/s41598-023-34192-x) / [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC10250302/).
17. [Greedy SLIM: A SLIM-Based Approach For Preference Elicitation, arXiv 2406.06061](https://arxiv.org/html/2406.06061) — recent alternative to SPQ.
18. [Cold-start Recommendation by Personalized Embedding Region Elicitation, arXiv 2406.00973](https://arxiv.org/html/2406.00973) — embedding-space variant.
19. [Should We Tailor the Talk? Conversational Styles on Preference Elicitation in CRS, arXiv 2504.13095](https://arxiv.org/html/2504.13095) — conversational-style effects.

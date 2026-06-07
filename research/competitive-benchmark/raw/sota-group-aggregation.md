# SOTA: Group Recommendation Aggregation Strategies

Competitive-benchmark research note for HelpME2C (Phase 1A). Focus:
techniques that are **deployable at <1000 users with no ML training
infrastructure**. Each section ends with a one-line verdict for the
HelpME2C scale.

HelpME2C's current approach (per [ADR-0020](../../../docs/decisions/0020-group-rec-strategy.md)):

```
groupScore = mean(norm_member_scores) - λ · stddev(norm_member_scores)
where any member_score < veto_threshold (0.5) excludes the item
λ = 0.5
```

i.e. **Average Without Misery (AWM) + soft disagreement penalty + per-user
normalisation**. The literature gives this approach a defensible
pedigree (Masthoff + Amer-Yahia line), and §7 below assesses its
position against alternatives.

---

## 1. Average / Additive utilitarian strategies

### Plain mean (utilitarian / Additive Utilitarian / ADD)

The simplest aggregator: `groupScore(item) = mean(member_scores)`. Maximises
**total group utility** but is blind to distribution. Famously produces
"lowest-common-denominator" output — items that nobody dislikes
strongly but nobody is excited about — and ignores a "grumpy" minority
whose preferences get drowned out by the majority. Senot et al.'s
TV-viewing evaluation found ADD performs **competitively on accuracy** at
the *group profile* level for ephemeral groups, but its utility weakens
as group heterogeneity grows. It remains the de facto baseline in every
comparative study of group aggregation.

- [Masthoff (2011) — *Group Recommender Systems: Combining Individual Models*, in Ricci et al. (eds.) Recommender Systems Handbook (1st ed.), Springer, pp. 677–702](https://link.springer.com/chapter/10.1007/978-0-387-85820-3_21)
- [Senot, Kostadinov, Bouzid, Picault, Aghasaryan (2011) — *Evaluation of Group Profiling Strategies*, IJCAI 2011](https://www.ijcai.org/Proceedings/11/Papers/454.pdf)
- [Boratto & Carta (2011) — *State-of-the-Art in Group Recommendation and New Approaches for Automatic Identification of Groups*, in Soro et al. (eds.) Information Retrieval and Mining in Distributed Environments, Springer SCI 324](https://link.springer.com/chapter/10.1007/978-3-642-16089-9_1)

**Deployable at HelpME2C scale?** Yes — trivial to compute, but should
not be deployed alone (no protection against the grumpy-member case).

### Average Without Misery (AWM) — Masthoff 2004, foundational

Masthoff's UMUAI 2004 paper is *the* foundational empirical study: she
asked humans to construct TV viewing sequences for groups and observed
that they spontaneously used **Average**, **Average Without Misery**, and
**Least Misery** strategies — and that **fairness and the avoidance of
individual misery** were dominant concerns. AWM is operationalised as
"compute the average, but exclude any item where some member's predicted
score falls below a misery threshold". The veto threshold is the lever
between pure averaging (threshold = 0) and least-misery-like behaviour
(threshold high). HelpME2C uses `veto_threshold = 0.5` in normalised
space, which Masthoff explicitly endorses as the standard parameterisation
("no member should be miserable, but otherwise maximise the group
average").

- [Masthoff (2004) — *Group Modeling: Selecting a Sequence of Television Items to Suit a Group of Viewers*, User Modeling and User-Adapted Interaction 14(1), 37–85](https://link.springer.com/article/10.1023/B:USER.0000010138.79319.fd)
- [Masthoff (2015) — *Group Recommender Systems: Aggregation, Satisfaction and Group Attributes*, in Ricci et al. (eds.) Recommender Systems Handbook (2nd ed.), Springer, pp. 743–776](https://link.springer.com/chapter/10.1007/978-1-4899-7637-6_22)
- [Masthoff (2022) — *Group Recommender Systems: Beyond Preference Aggregation*, in Ricci et al. (eds.) Recommender Systems Handbook (3rd ed.), Springer](https://link.springer.com/chapter/10.1007/978-1-0716-2197-4_10)

**Deployable at HelpME2C scale?** Yes — closed-form, O(|members|) per
item, no training, no parameters beyond the misery threshold.

### Weighted average (member importance)

Generalisation of ADD where each member gets a weight `w_i` (e.g. host
vs. guest, parent vs. child, or "the person whose turn it is"). Used by
Quijano-Sánchez et al. to bake personality into aggregation (extraverts'
weights bumped up because they're more vocal in real-life group
negotiation), and by Stratigi et al. to encode caregiver authority in
health recommendations. The hard problem is **where the weights come
from**: explicit user setup (high friction), inferred from past sessions
(needs history), or from a personality survey (also high friction). Most
production deployments degrade to uniform weights = ADD.

- [Quijano-Sánchez, Recio-García, Díaz-Agudo, Jiménez-Díaz (2013) — *Social Factors in Group Recommender Systems*, ACM TIST 4(1), Article 8](https://dl.acm.org/doi/10.1145/2414425.2414433)
- [Berkovsky & Freyne (2010) — *Group-Based Recipe Recommendations: Analysis of Data Aggregation Strategies*, RecSys 2010](https://shlomo-berkovsky.github.io/files/pdf/RecSys10a.pdf)

**Deployable at HelpME2C scale?** Yes, *if* weights are uniform or
explicit; **no** if they have to be learned — that's an ML training
dependency Phase 1A doesn't have.

---

## 2. Aggregation by voting / consensus

Masthoff's 2011 chapter is the canonical reference that frames every
voting rule below as a borrowing from **social choice theory**. The
core insight is that group recommendation is structurally identical to
electing a winner from a slate of candidates, so the ~250-year-old
literature on voting (Borda, Condorcet, Copeland) applies almost
directly. Masthoff's experiments found Borda count, Average, and AWM
all perform "quite well" for user-perceived satisfaction; Plurality,
Copeland, and pure Least Misery were judged to produce **misery** more
often.

- [Masthoff (2011) — *Group Recommender Systems: Combining Individual Models*, in Ricci et al. (eds.) Recommender Systems Handbook (1st ed.), Springer](https://link.springer.com/chapter/10.1007/978-0-387-85820-3_21)
- [Masthoff (2015) — *Group Recommender Systems: Aggregation, Satisfaction and Group Attributes*, in Ricci et al. (eds.) Recommender Systems Handbook (2nd ed.)](https://link.springer.com/chapter/10.1007/978-1-4899-7637-6_22)
- [Masthoff tutorial slides (Bolzano RecSys School 2017)](https://pro.unibz.it/projects/schoolrecsys17/JudithMasthoff.pdf)

### Plurality voting

Each member's #1 pick gets a vote; the item with the most votes wins.
Trivially simple, but pathological: easily produces a "Condorcet loser"
(an item disliked by the majority that still wins a 3-way split). Tied
last in Masthoff's "would the group be satisfied?" survey.

**Deployable at HelpME2C scale?** Yes mechanically; **no** semantically
— produces obvious failures at couple/triad sizes that are HelpME2C's
core unit.

### Borda count

Each member ranks all items; an item gets `n-1` points for being
ranked first, `n-2` for second, etc. Sum across members; highest sum
wins. Performs **very well** in Masthoff's evaluation and is
**robust to scale-calibration drift** (one user always rating 7-10,
another using the full 1-10 range doesn't matter because only ranks
count). The architectural caveat — and why ADR-0020 rejected it —
is that Borda needs a **pre-ranked candidate set per user**, which
is exactly what the recommender is meant to *produce*. Borda is
therefore better positioned as a *re-ranking* step on top of a
shortlist than as the primary aggregator.

- [Performance Comparison of Rank Aggregation Using Borda and Copeland in Recommender System (2018)](https://www.researchgate.net/publication/327935374_Performance_Comparison_of_Rank_Aggregation_Using_Borda_and_Copeland_in_Recommender_System)

**Deployable at HelpME2C scale?** Yes as a *re-ranker* on a candidate
shortlist; **no** as the primary aggregator (chicken-and-egg with the
recommender).

### Copeland (Condorcet-style pairwise)

For each pair of items, count members preferring `a > b` vs. `b > a`;
`a` "wins" that pair if it wins the majority. The Copeland score is
(wins − losses) across all pairs; highest wins. Theoretically attractive
(elects the Condorcet winner when one exists) but Masthoff's user study
found it ranks **near the bottom on perceived satisfaction**, and
empirical NDCG comparisons typically favour Borda over Copeland for
recommendation use.

**Deployable at HelpME2C scale?** Yes (cheap), but **no** as default —
worse user-perceived outcomes than Borda or AWM in published comparisons.

### Approval voting

Each member "approves" or "doesn't approve" each item (a hard
threshold, e.g. score ≥ 7/10); the item with the most approvals wins.
Conceptually clean and used in real systems (e.g. Doodle-style
scheduling). Senot et al. include it as a baseline; Masthoff treats
it as a discrete variant of AWM.

**Deployable at HelpME2C scale?** Yes — particularly attractive if the
UI ever surfaces a thumbs-up/thumbs-down preview before locking the
recommendation.

---

## 3. Veto / Least-Misery strategies

### Least Misery (MIN) and Most Pleasure (MAX)

**MIN**: `groupScore(item) = min(member_scores)`. "The group is as
happy as its unhappiest member." **MAX**: `groupScore = max(...)` —
caters to the most enthusiastic member. Masthoff's foundational point
is that humans use **both** in different situations: MIN for high-stakes
group choices (a film for the whole family), MAX for low-stakes
sequential choices (the next song at a party where you'll get your
turn next). In a pure scoring comparison, MIN produces "reasonable
disagreement and poor satisfaction" — the literature is consistent
that one outlier member dictates every choice, which feels unfair
across sessions.

- [Masthoff (2004) — *Group Modeling*, UMUAI 14(1)](https://link.springer.com/article/10.1023/B:USER.0000010138.79319.fd)
- [Stratigi, Pitoura, Nummenmaa, Stefanidis (2022) — *Sequential group recommendations based on satisfaction and disagreement scores*, J. Intelligent Information Systems 58(2)](https://link.springer.com/article/10.1007/s10844-021-00652-x)

**Deployable at HelpME2C scale?** Yes, but **only as a component** (the
AWM veto floor in ADR-0020 is essentially a thresholded MIN); **no** as
the sole aggregator.

### When veto is appropriate vs. harmful

Veto is appropriate when there are **hard constraints** that translate
to genuine negative utility — dietary restrictions (allergies, religious
prohibitions), parental controls (children present), content warnings
(violence/horror that triggers PTSD). These are not "preferences" in
the trade-off sense; they are bright-line exclusions.

Veto is **harmful** when one member's predicted score is depressed by
*model noise* rather than a real preference — cold-start members, users
with sparse history, users whose score-distribution normalisation max
is dominated by a single outlier (see §7). The Sequential Group
Recommendations line of work explicitly addresses this by softening the
floor over sessions: a member who vetoed last session gets less veto
weight this session.

- [Stratigi, Kondylakis, Stefanidis (2017) — *Fairness in Group Recommendations in the Health Domain*, ICDE 2017](https://ieeexplore.ieee.org/document/7930114/)

**Deployable at HelpME2C scale?** Yes — but **only with a normalised
score input**, and explicitly recognising that a "score floor" is *not*
the same kind of veto as an allergy. HelpME2C's `veto_threshold = 0.5`
is a soft floor; hard constraints (e.g. "no horror for this user")
should be expressed at the *candidate generation* stage, not as an
aggregation veto.

---

## 4. Fairness-aware group recommendation

The fairness wave (post-2017) reframes group rec as a **multi-stakeholder
optimisation** problem: it's not enough to maximise group utility, you
must also ensure no member is *systematically* underserved.

### Serbos / Pitoura / Tsaparas — package fairness

Serbos et al. introduced **package-to-group fairness**, where the
"recommendation" is a *bundle* (vacation package, playlist, evening
itinerary), not a single item. They formalised two fairness notions:
**proportionality fairness** (each member finds enough items they like
in the package) and **envy-freeness** (no member envies another's share
of the package). Both notions extend to sequential single-item
recommendations by treating the **session history** as the package.

- [Serbos, Qi, Mamoulis, Pitoura, Tsaparas (2017) — *Fairness in Package-to-Group Recommendations*, WWW 2017](https://dl.acm.org/doi/10.1145/3038912.3052612)
- [Sacharidis (2019) — *Top-N Group Recommendations with Fairness*, SAC 2019](http://www.ec.tuwien.ac.at/~dimitris/publications/SAC19.pdf)

**Deployable at HelpME2C scale?** Partially — proportionality is computable
in O(|members| · |items|), but envy-freeness is closer to an LP. The
proportionality variant is reasonable Phase 1B work; envy-freeness is not.

### Kaya / Bridge / Tintarev — rank-sensitive fairness

Kaya et al. (2020) introduced the **zero-recall metric** (how many
members got *zero* relevant items in their top-N) and a re-ranking
approach that balances individual relevance against fairness. This is
the closest line to what HelpME2C wants long-term, because it operates
on an existing scored shortlist and is essentially a re-ranker — no
training required.

- [Kaya, Bridge, Tintarev (2020) — *Ensuring Fairness in Group Recommendations by Rank-Sensitive Balancing of Relevance*, RecSys 2020](https://dl.acm.org/doi/10.1145/3383313.3412232)

**Deployable at HelpME2C scale?** Yes — pure re-ranking on top of an
existing scored list, no ML training, no extra infrastructure.

### Stratigi / Pitoura / Stefanidis — sequential fairness

The strongest line of work for HelpME2C's long-term Phase 1B goal.
Stratigi et al. introduce the SDAA, SIAA, and Average+ aggregators that
**reweight each member based on how satisfied / dissatisfied they were
in past sessions**. A member who was vetoed-against last session gets a
weight bump this session. This is the formal mechanism behind
"Rawlsian / proportional fairness across sessions". Crucially, it
**requires session history** — exactly what ADR-0020 says is out of
scope for Phase 1A and parked for 1B.

- [Stratigi, Pitoura, Nummenmaa, Stefanidis (2022) — *Sequential group recommendations based on satisfaction and disagreement scores*, J. Intelligent Information Systems 58(2)](https://link.springer.com/article/10.1007/s10844-021-00652-x)
- [Kaya, Stefanidis, Pitoura (2020) — *Fair Sequential Group Recommendations*, ACM SAC 2020](https://homepages.tuni.fi/konstantinos.stefanidis/docs/sac20.pdf)
- [Stratigi, Kondylakis, Stefanidis (2018) — *FairGRecs: Fair Group Recommendations by Exploiting Personal Health Information*, DEXA 2018, LNCS 11030](https://link.springer.com/chapter/10.1007/978-3-319-98812-2_11)
- [Stratigi, Kondylakis, Stefanidis (2017) — *Fairness in Group Recommendations in the Health Domain*, ICDE 2017](https://ieeexplore.ieee.org/document/7930114/)
- [Sacharidis, Mouratidis, Kleftogiannis (2020) — *ADAPT: Fairness & diversity for sequential group recommendations*, Information Systems](https://www.sciencedirect.com/science/article/pii/S0306437925000560)

**Deployable at HelpME2C scale?** Yes for Phase 1B (once session
history exists); **no** for Phase 1A — it needs the recommended-and-shown
log that doesn't exist yet.

### Long-term satisfaction balancing (fairness across sessions)

The umbrella term in the literature for "even out who-wins-when across
sessions" is **long-term fairness** or **proportionality-preserving
group recommendation**. It's actively being studied (ADAPT, SQUIRREL,
Sequential Group Recommendations with Responsibility Constraints) but
all require session history; none are zero-state deployable.

**Deployable at HelpME2C scale?** Phase 1B at earliest.

---

## 5. Hybrid / personality-aware aggregation

### Quijano-Sánchez et al. — personality + trust

The 2013 ACM TIST paper folds **Big Five personality traits**, **trust
between members**, and a **memory of past sessions** into the
aggregation function. The recommender simulates the argumentation
process a real group would go through: high-assertiveness members get
more weight; high-cooperation members concede; high-trust pairs
co-influence. Conceptually compelling and well cited, but requires
**personality data** (either survey-based or inferred from other
sources) that HelpME2C doesn't collect and isn't planning to.

- [Quijano-Sánchez, Recio-García, Díaz-Agudo, Jiménez-Díaz (2013) — *Social Factors in Group Recommender Systems*, ACM TIST 4(1)](https://dl.acm.org/doi/10.1145/2414425.2414433)
- [Recio-García, Jiménez-Díaz, Sánchez-Ruiz, Díaz-Agudo (2009) — *Personality Aware Recommendations to Groups*, RecSys 2009](https://dl.acm.org/doi/10.1145/1639714.1639779)

**Deployable at HelpME2C scale?** **No** — personality data is not in
the data model; collecting it (Big Five inventory at signup) is high
friction and out of scope.

### Recio-Garcia et al. — Conflict-resolution via TKI

Builds on the Thomas-Kilmann Instrument's five conflict modes
(competing, collaborating, avoiding, accommodating, compromising) to
compute a per-member **Conflict Mode Weight** for aggregation. Same
limitation as above: requires structured personality input.

- [Recio-Garcia et al. — Using Personality to Create Alliances in Group Recommender Systems, ICCBR 2011](https://link.springer.com/chapter/10.1007/978-3-642-23291-6_18)

**Deployable at HelpME2C scale?** No — same personality-data
prerequisite.

---

## 6. Explanation / transparency for group recommendations

Tintarev & Masthoff's chapter is the canonical reference on
explanations in recommender systems generally; it identifies seven
benefits explanations can provide (transparency, scrutability, trust,
effectiveness, persuasiveness, efficiency, satisfaction) and is the
single most cited piece of work on the topic. The crucial *group*
finding — replicated in study after study — is that **for groups,
explanation often moves perceived satisfaction more than the choice
of aggregation function does**. A merely-OK aggregator with a good
"recommended because both of you like X" explanation beats a
sophisticated aggregator with no explanation.

Najafian & Tintarev (UMAP 2018) introduced **social-choice-based
explanations**: short natural-language excerpts that surface the
aggregation logic ("we picked this because every member rated similar
items highly", "we picked this even though one member usually dislikes
X, because the rest of you are very enthusiastic"). Tran et al. (2019)
extended this with a user study across six aggregation strategies and
found ADD-style and majority-style explanations most increased
perceived fairness, consensus, and satisfaction.

- [Tintarev & Masthoff (2011) — *Designing and Evaluating Explanations for Recommender Systems*, in Ricci et al. (eds.) Recommender Systems Handbook (1st ed.), Springer, pp. 479–510](https://link.springer.com/chapter/10.1007/978-0-387-85820-3_15)
- [Najafian & Tintarev (2018) — *Generating Consensus Explanations for Group Recommendations*, UMAP 2018 Adjunct Proceedings](https://dl.acm.org/doi/10.1145/3213586.3225231)
- [Tran et al. (2019) — *Towards Social Choice-based Explanations in Group Recommender Systems*, UMAP 2019](https://www.researchgate.net/publication/345420694_Towards_Social_Choice-based_Explanations_in_Group_Recommender_Systems)
- [Najafian, Inel, Tintarev (2023) — *Evaluating explainable social choice-based aggregation strategies for group recommendation*, UMUAI](https://link.springer.com/article/10.1007/s11257-023-09363-0)
- [Felfernig et al. (2021) — *Designing Explanations for Group Recommender Systems*, arXiv:2102.12413](https://arxiv.org/pdf/2102.12413)

**Deployable at HelpME2C scale?** Yes, and this is the single highest-
leverage area to invest in. ADR-0020 already commits to this ("UX
transparency layer matters more than the algorithm"); the literature
fully supports that prioritisation.

---

## 7. Direct comparison: HelpME2C's AWM + disagreement-penalty vs. alternatives

### Where it sits in the literature

AWM + a soft disagreement (stddev) penalty is a **hybrid** that combines
two well-established ideas from independent lines of work:

1. **AWM** (Masthoff 2004/2011/2015/2022) — the misery floor.
2. **Disagreement-aware aggregation** (Amer-Yahia et al., VLDB 2009)
   — the literal founding paper for "an item is good for a group iff
   it's both *relevant* to the group AND has *low disagreement* among
   members". Amer-Yahia et al. explicitly recommend a linear combination
   of a relevance term and a disagreement-penalty term, parameterised
   by a `λ` ∈ [0,1]. **This is precisely the functional form HelpME2C
   uses.** Their large user study on Mechanical Turk demonstrated that
   disagreement-aware aggregation outperforms pure relevance.

The HelpME2C formula is therefore the **direct composition** of these two
results: Amer-Yahia's relevance-minus-disagreement form, evaluated only
on the AWM-filtered subset. It is a defensible, mainstream choice — not a
novel invention, but also not a known-bad heuristic. It corresponds to
what Masthoff calls a "fairness-aware utility aggregator" and what
Amer-Yahia calls "consensus-based group recommendation".

- [Amer-Yahia, Roy, Chawla, Das, Yu (2009) — *Group Recommendation: Semantics and Efficiency*, Proceedings of VLDB Endowment 2(1)](http://www.vldb.org/pvldb/vol2/vldb09-858.pdf)
- [Masthoff (2015) — *Group Recommender Systems: Aggregation, Satisfaction and Group Attributes*](https://link.springer.com/chapter/10.1007/978-1-4899-7637-6_22)
- [Stratigi, Pitoura, Nummenmaa, Stefanidis (2022) — *Sequential group recommendations based on satisfaction and disagreement scores*](https://link.springer.com/article/10.1007/s10844-021-00652-x)
- [Performance Evaluation of Aggregation-based Group Recommender Systems for Ephemeral Groups, ACM TIST 13(6), 2022](https://dl.acm.org/doi/10.1145/3542804)

### Position on the fairness ↔ utilitarian spectrum

- Pure ADD = full utilitarian (sum/mean only, no fairness term)
- HelpME2C's AWM + λ·stddev = **mid-spectrum**: utilitarian core
  (mean) + a Rawlsian floor (veto) + a Gini-like penalty (stddev). This
  is essentially a **welfare function from social-choice theory** that
  encodes mild inequality aversion.
- Pure MIN = full Rawlsian (only the worst-off member counts)
- Sequential / proportional fairness across sessions = explicit
  long-term Rawlsian — strictly more expressive but requires history

The HelpME2C position is mainstream and defensible. It will not produce
research-novel results, but it will not produce well-known failure
modes either.

### Known failure modes (relevant to HelpME2C)

1. **Normalisation max dominated by a single outlier candidate.**
   If member A's score distribution is bimodal — most items at 3-5,
   one item rated 10 — min-max normalisation compresses A's "real"
   preferences into a narrow band, making A's `stddev` contribution
   trivial and their `min` contribution noisy. Mitigation: use
   robust scaling (percentile-based) or z-scores rather than min-max,
   and clip outliers above the 95th percentile before normalising.
2. **Cold-start members produce noisy floor signal.** A member with
   3 ratings has predicted scores with high posterior variance; their
   `min` is essentially random, so the veto threshold rejects items
   stochastically. Mitigation: shrink the veto threshold toward the
   group mean for low-confidence members (formally: confidence-weighted
   misery threshold), or switch to a "diverse picks" mode for groups
   where ≥1 member is cold (already noted in ADR-0020 §"what would
   change our mind").
3. **`λ` is global but disagreement-aversion is heterogeneous.**
   Some couples want safe consensus picks; others want spicy
   disagreement-worthy picks they argue about. A fixed `λ = 0.5`
   averages these. Mitigation: a single user-facing slider ("how
   adventurous?") that maps to `λ`, or learn `λ` per-group from
   thumbs-up/thumbs-down feedback after recommendations (Phase 1B).
4. **One member's veto floor blocks the entire cross-medium bridge
   set.** Specifically called out in ADR-0020 — anime+TV couples
   where one partner's cross-medium predictions are uniformly low
   will have every candidate vetoed. Mitigation already noted: a
   relaxed "bridge mode" for cross-medium recommendations.
5. **Sequential unfairness drift.** AWM has no memory; the same
   member can be the "near-miss veto" candidate every session,
   producing a slow accumulation of "their" picks. This is the
   exact problem Stratigi/Kaya/Stefanidis attack with sequential
   reweighting and is why ADR-0020 defers a multi-session fairness
   layer to Phase 1B.
6. **Borda-style ordinal robustness is lost.** Because the formula
   operates on scores rather than ranks, miscalibrated raters (one
   user uses 1-10, another uses 7-10) can distort both the mean and
   the stddev. The normalisation step mitigates this, but only
   imperfectly — z-score normalisation handles it better than
   min-max.

### Verdict

HelpME2C's AWM + disagreement-penalty + UX-explanation triple is a
**defensible, mainstream choice** with explicit support from both
Masthoff (AWM line) and Amer-Yahia et al. (disagreement-penalty line),
and the prioritisation of explanation over algorithmic sophistication
matches the empirical finding from the Tintarev/Najafian line that
**explanation moves satisfaction more than aggregation choice**. The
known failure modes (above) are also acknowledged in ADR-0020's "what
would change our mind" section. The right Phase 1B upgrades, if user
testing surfaces issues, are (in order of probable impact):

1. **Per-group `λ`** (adventurous-slider or learned-from-feedback).
2. **Confidence-weighted veto threshold** to handle cold-start members.
3. **Sequential reweighting** à la Stratigi (SDAA/SIAA/Average+) once
   session history exists.
4. **Rank-sensitive re-ranking** à la Kaya/Bridge/Tintarev as a final
   pass to ensure no member gets a zero-recall result.

No literature finding suggests HelpME2C's current approach is *wrong*
for Phase 1A; the gaps are well-known and well-mapped to known Phase 1B
upgrades.

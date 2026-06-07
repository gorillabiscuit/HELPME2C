# Spouse / Partner Modeling in Recommender Systems

> Raw notes for HelpME2C ghost-profile-design research, gathered 2026-05-17.
> Topic: has academic recsys looked at "infer a partner's preferences from
> the registered user's description"? Short answer: not directly. The closest
> work is adjacent — household / group / co-watching / cross-domain mediation /
> reciprocal-dating. Documenting the gap is itself a finding.

## 1. Is there academic work on proxy modeling of an explicitly-related non-user?

**Direct answer: no, not as a named subfield.** Search across RecSys, TOIS,
UMAP, and ACM Computing Surveys for terms like "proxy user modeling",
"partner profile inference", "spouse modeling recommender", "describe your
partner" returns only oblique hits. "Proxy preference modeling" exists as a
phrase but means something else entirely — disentangling a stated rating
from a latent underlying preference for the *same* user
([Emergent Mind topic page](https://www.emergentmind.com/topics/proxy-preference-modeling)).
"Proxy" in the federated-recommender literature also refers to a synthetic
client representation, not a described non-user
([Cho et al., Unsupervised Proxy Selection, arXiv 2107.03564](https://arxiv.org/pdf/2107.03564)).

The conceptual neighbours that *do* exist:

- **Group recommender systems** (Masthoff 2004, 2011) — recommend to a known
  group of registered users by aggregating their individual models.
- **Reciprocal recommender systems** — recommend a *person* to a *person*
  (dating), where both sides have profiles.
- **Cross-domain / cross-representation mediation** (Berkovsky, Kuflik,
  Ricci 2008) — use one source of UM data to inform another.
- **Co-watching / household-CTV** — model what a *household* watches together.

None of these solve "given user A's description of user B, infer B's
preferences for use in group rec." The gap is real.

## 2. Co-watching literature

### 2.1 Berkovsky & Freyne — group-based recipes (RecSys 2010)

Berkovsky and Freyne studied group recipe recommendation by aggregating
ratings from families ([RecSys 2010 PDF](https://shlomo-berkovsky.github.io/files/pdf/RecSys10a.pdf),
[ACM DOI](https://dl.acm.org/doi/abs/10.1145/1864708.1864732)). Key findings:
(a) group recommendation accuracy does not necessarily degrade as group
size grows; (b) when individual recs are weak, group recs can outperform
them; (c) homogeneous groups get better recs than heterogeneous ones. All
members had individual rating histories — no proxy inference.

### 2.2 Masthoff — group recommender survey (Recommender Systems Handbook 2011)

Masthoff's chapter, "Group Recommender Systems: Combining Individual
Models" ([Springer chapter](https://link.springer.com/chapter/10.1007/978-0-387-85820-3_21),
[author preprint](https://pro.unibz.it/projects/schoolrecsys17/JudithMasthoff.pdf)),
catalogues 11 aggregation strategies (Average, Least Misery, Most Pleasure,
Average Without Misery, Borda, Copeland, Approval Voting, Plurality Voting,
Most Respected Person, Median, Multiplicative). Every strategy assumes
each group member already has a model. Masthoff explicitly discusses
modeling group members' affective states and pairwise emotional contagion
between members — but the members are first-class users with their own
data, not described-by-proxy.

### 2.3 Sun et al. — co-watching YouTube (CSCW 2017)

Emily Sun, Rodrigo de Oliveira, Joshua Lewandowski at Google Research,
"Challenges on the Journey to Co-Watching YouTube"
([PDF](https://research.google.com/pubs/archive/46602.pdf),
[ACM DOI](https://dl.acm.org/doi/10.1145/2998181.2998228)). Qualitative
diary study (12 participants, 1 week). Findings relevant to HelpME2C:
(a) co-watchers use different search/selection methods than solo viewers;
(b) they engage in *impression management* — selecting videos that signal
something about themselves to the co-watcher; (c) negotiation and
turn-taking dominate the choice flow; (d) users often end up watching
content they don't enjoy as a social compromise. This validates the
mechanism (group rec is real and unsolved) without proposing a proxy-profile
solution.

### 2.4 Cross-representation mediation — Berkovsky, Kuflik, Ricci (2008)

The closest formal precedent to "use one user's data to inform another's
profile" is Berkovsky, Kuflik, Ricci, "Mediation of user models for
enhanced personalization in recommender systems"
([UMUAI 2008](https://link.springer.com/article/10.1007/s11257-007-9042-9),
[author PDF](https://shlomo-berkovsky.github.io/files/pdf/VDM09.pdf)).
They coin "mediation" as importing UM data collected by *other* recommenders
to bootstrap a target system. The mediation is between systems and domains,
not between humans. But the mechanism — partial UM, augmented from an
external source — is the closest formal kin to what HelpME2C wants to do.

## 3. Dating-app proxy modeling

### 3.1 OkCupid — the closest real-world precedent

OkCupid's question battery is *exactly* the proxy-preference shape, just
applied symmetrically. Per OkCupid's own help docs and the widely-cited
Sinha writeup
([OkCupid help](https://okcupid-app.zendesk.com/hc/en-us/articles/22982200783771-How-Does-OkCupid-Work-Our-Complete-Guide-to-Match-Questions-the-Algorithm-and-Setting-Up-Your-Account),
[HackerEarth notes](https://www.hackerearth.com/practice/notes/okcupids-matching-algorithm-1/)),
each question has three parts:

1. **My answer** (e.g. "I would date someone who keeps a gun").
2. **The answer I want from a match** (proxy preference for partner).
3. **Importance weight** (Irrelevant=0, Little=1, Somewhat=10, Very=50,
   Mandatory=250).

Part 2 *is* proxy modeling — the user describes the target person's
preferred answer. The compatibility score is the weighted overlap of A's
desired-B answers with B's actual answers (and vice versa). The
methodological transfer to HelpME2C: a question battery where the user
*describes* a non-user can be operationalised the same way, except you
score against the *corpus* (a TV show vector) rather than against another
user's actual answers.

### 3.2 Hinge — Gale-Shapley + deep learning + "We Met"

Hinge uses Gale-Shapley-style stable matching layered on behavioural
embeddings, with a 2025 deep-learning upgrade for Discover
([InDepth analysis](https://www.indepth.work/blog/how-the-hinge-algorithm-works),
[Cornell INFO2040 blog](https://blogs.cornell.edu/info2040/2021/09/30/hinge-and-its-implementation-of-the-gale-shapley-algorithm/),
[Hinge help: "We Met"](https://help.hinge.co/hc/en-us/articles/360010692913-What-is-We-Met)).
The "We Met" feedback loop is interesting because it grounds the model in
real-world outcomes rather than only in-app behaviour. There's no
public description of a "describe-your-partner" question battery; Hinge's
Prompts elicit *self-presentation*, not partner-spec.

### 3.3 Reciprocal recommender survey work

Pizzato et al. and follow-up reciprocal-recsys research formalises the
two-sided problem ([Pizzato et al. RecSys 2010, ACM DOI](https://dl.acm.org/doi/10.1145/1864708.1864787),
[Tay et al. arXiv 1501.06247](https://arxiv.org/abs/1501.06247),
[UMUAI survey 2020](https://link.springer.com/article/10.1007/s11257-020-09279-z)).
Both sides have profiles; nothing in the literature handles "user A
describes user B."

## 4. Household-CTV systems — what they actually do

| System | Approach | Proxy inference? |
|---|---|---|
| **Netflix** | Per-profile, deliberate. Up to 5 profiles, each maintains its own watch history, recommendations, parental controls ([Gibson Biddle, ex-Netflix CPM](https://gibsonbiddle.medium.com/a-brief-history-of-netflix-personalization-1f2debf010a1)). | No. |
| **Hulu** | Up to 7 profiles per account, each isolated ([Hulu help](https://help.hulu.com/article/hulu-subscription-sharing), [TechHive](https://www.techhive.com/article/582614/hulu-finally-makes-subscriber-accounts-easier-to-share-with-multi-user-profiles.html)). | No. |
| **Amazon Household / Prime Video** | "Shopping Profiles" — adults/teens on shared account get separated personalisation; activity bleeds between profiles unless explicitly separated ([Amazon help](https://www.amazon.com/gp/help/customer/display.html?nodeId=T0MhVXZmePWB0G6ttw)). | No — profile isolation, not group fusion. |
| **Google TV / Android TV** | Per-profile watchlist + recommendations ([Google TV help](https://support.google.com/googletv/answer/10070483?hl=en)). | No. |
| **YouTube TV "Family Library"** | Shares the *subscription*, not the rec model. | No. |

The pattern is unanimous: every major household-CTV product solves
multi-viewer with *profile isolation*, not *household fusion*. None
publishes a "shared-couple recommender." This is the white space.

## 5. Netflix's deliberate non-answer

Gibson Biddle, who ran personalisation product at Netflix during the
profile rollout, describes the decision explicitly in his retrospective
([Brief History of Netflix Personalization](https://gibsonbiddle.medium.com/a-brief-history-of-netflix-personalization-1f2debf010a1)).
Key points:

- Profiles were launched to recognise that **multiple family members use a
  shared account** and were therefore polluting each other's
  recommendations.
- Initial adoption was only **~2% of members** despite aggressive
  promotion.
- Netflix planned to *kill* the feature, but capitulated when a small,
  loud subset (including ~50% of the Netflix board) said they feared
  losing it "would ruin their marriages."
- The strategic choice was per-profile (separation) over
  household-fusion (synthesis).

The reasoning, reading between the lines: per-profile is robust against
the "my partner watched horror and now my recs are broken" failure mode.
Household-fusion would have required solving the hard problem (who's
watching now? whose preference dominates? how do we elicit shared taste?)
and Netflix chose to push that complexity to users. No published Netflix
Tech Blog post directly defends the choice — the closest is operational
work on personalisation foundations
([Netflix Tech Blog: foundation model integration](https://netflixtechblog.medium.com/integrating-netflixs-foundation-model-into-personalization-applications-cf176b5860eb))
which still operates at the profile (= individual) granularity.

## 6. Relevance to ghost profile

The literature null result *is* the finding. Mainstream recsys has not
formalised "infer a non-user's preferences from a registered user's
description." Group recommender systems assume all members are
first-class users with their own data. Reciprocal recommenders assume
both sides have profiles. Household-CTV products solve the multi-viewer
problem by *isolating* viewers, not synthesising them. Netflix made the
deliberate choice not to do household fusion. HelpME2C's ghost profile
is, as far as this survey can tell, novel in academic recsys and absent
from disclosed industry methodology. That's a moat opportunity (per
PROJECT.md §revenue) — but it's also a warning, because nobody has
published a validated technique for HelpME2C to copy.

The two closest practical precedents are: (1) **OkCupid's three-part
question battery**, which formalises "describe your ideal partner" as a
weighted-overlap scoring problem and offers a clean transfer if HelpME2C
substitutes "a show vector" for "another user's answers"; and (2)
**Berkovsky et al.'s mediation framework**, which gives the formal
machinery for "use one source of UM data (the registered user's
description) to bootstrap another UM (the ghost profile)." Combined with
the interview-elicitation literature (see companion note), these form the
minimum viable theoretical scaffolding. The load-bearing UX problem
remains: what handful of questions does the registered user actually
answer about their partner, and how confidently can the answers be turned
into a usable preference vector?

## Sources and References

1. [Emergent Mind — Proxy Preference Modeling topic](https://www.emergentmind.com/topics/proxy-preference-modeling) — confirms "proxy preference modeling" is a different technical term.
2. [Cho et al., Unsupervised Proxy Selection for Session-based Recommender Systems, arXiv 2107.03564](https://arxiv.org/pdf/2107.03564) — confirms "proxy" in recsys ≠ described non-user.
3. [Berkovsky & Freyne, Group-Based Recipe Recommendations, RecSys 2010 (PDF)](https://shlomo-berkovsky.github.io/files/pdf/RecSys10a.pdf) / [ACM DOI](https://dl.acm.org/doi/abs/10.1145/1864708.1864732).
4. [Masthoff, Group Recommender Systems: Combining Individual Models, Recommender Systems Handbook 2011 (Springer chapter)](https://link.springer.com/chapter/10.1007/978-0-387-85820-3_21) / [author preprint](https://pro.unibz.it/projects/schoolrecsys17/JudithMasthoff.pdf).
5. [Sun, de Oliveira, Lewandowski — Challenges on the Journey to Co-Watching YouTube, CSCW 2017 (Google PDF)](https://research.google.com/pubs/archive/46602.pdf) / [ACM DOI](https://dl.acm.org/doi/10.1145/2998181.2998228).
6. [Berkovsky, Kuflik, Ricci — Mediation of user models for enhanced personalization in recommender systems, UMUAI 2008](https://link.springer.com/article/10.1007/s11257-007-9042-9) / [author PDF](https://shlomo-berkovsky.github.io/files/pdf/VDM09.pdf).
7. [OkCupid official: How Does OkCupid Work? (matching algorithm explainer)](https://okcupid-app.zendesk.com/hc/en-us/articles/22982200783771-How-Does-OkCupid-Work-Our-Complete-Guide-to-Match-Questions-the-Algorithm-and-Setting-Up-Your-Account).
8. [Sinha, OkCupid's Matching Algorithm walkthrough (HackerEarth)](https://www.hackerearth.com/practice/notes/okcupids-matching-algorithm-1/).
9. [InDepth — How the Hinge Algorithm Actually Works](https://www.indepth.work/blog/how-the-hinge-algorithm-works).
10. [Cornell INFO2040 student blog — Hinge and Gale-Shapley](https://blogs.cornell.edu/info2040/2021/09/30/hinge-and-its-implementation-of-the-gale-shapley-algorithm/).
11. [Hinge — What is "We Met"? (help.hinge.co)](https://help.hinge.co/hc/en-us/articles/360010692913-What-is-We-Met).
12. [Pizzato et al., RECON: a Reciprocal Recommender for Online Dating, RecSys 2010 (ACM DOI)](https://dl.acm.org/doi/10.1145/1864708.1864787).
13. [Tay et al., Reciprocal Recommendation System for Online Dating, arXiv 1501.06247](https://arxiv.org/abs/1501.06247).
14. [Neve & Palomares, Supporting users in finding successful matches in reciprocal recommender systems, UMUAI 2020](https://link.springer.com/article/10.1007/s11257-020-09279-z).
15. [Gibson Biddle — A Brief History of Netflix Personalization (Medium)](https://gibsonbiddle.medium.com/a-brief-history-of-netflix-personalization-1f2debf010a1) — primary source for the Netflix profile decision.
16. [Netflix Tech Blog — Integrating Netflix's Foundation Model into Personalization Applications](https://netflixtechblog.medium.com/integrating-netflixs-foundation-model-into-personalization-applications-cf176b5860eb).
17. [Hulu help — Subscription sharing and profiles](https://help.hulu.com/article/hulu-subscription-sharing).
18. [TechHive — Hulu finally makes subscriber accounts easier to share with multi-user profiles](https://www.techhive.com/article/582614/hulu-finally-makes-subscriber-accounts-easier-to-share-with-multi-user-profiles.html).
19. [Amazon help — What are Shopping Profiles?](https://www.amazon.com/gp/help/customer/display.html?nodeId=T0MhVXZmePWB0G6ttw).
20. [Google TV help — Personalised recommendations](https://support.google.com/googletv/answer/10070483?hl=en).
21. [Informative household recommendation with feature-based matrix factorization, CAMRA 2011 (ACM DOI)](https://dl.acm.org/doi/10.1145/2096112.2096116) — the one academic household-rec paper that uses MF; still assumes per-user history.

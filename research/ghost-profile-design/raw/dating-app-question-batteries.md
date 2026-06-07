# Dating-app onboarding question batteries

**Scope.** Closest industry analogue to "describe your partner to seed their profile" is dating-app onboarding: these apps systematically extract preferences for a person the user *doesn't have* yet. Most ask both about self ("I am") and target ("I want"); HelpME2C ghost profile is closer to the latter axis ("describe what your partner likes"). Self-description patterns generalise to ghost profile because the *battery design* (count, type, framing, privacy posture, failure modes) is the load-bearing part.

Research conducted 2026-05-17. Per-platform sections below, then design principles, then HelpME2C relevance.

---

## 1. Hinge

**Signal set.** Three categories: (i) **Basic info** — age, height, location, ethnicity, religion, kids/wants-kids, drinking, smoking, education, job, politics, languages, pets, dating intention; (ii) **Prompts** — pick 3 from a catalogue of ~105 free-text "prompt + answer" pairs (e.g. "Two truths and a lie", "My ideal Sunday", "Best travel story"). One additional video prompt is optional; (iii) **Dealbreakers** — same axes as basic info, but flagged as non-negotiable filters. The mix is heavily free-text on the visible profile side, structured-categorical on the matching side. ([PureWow on the 105 prompts][purewow]; [Hinge help on We Met][hinge-wemet])

**Stage.** Onboarding is required-minimal (a handful of basics + 3 prompts + 6 photos) to land on the swiping surface; everything else drips in via profile-edit nudges over weeks.

**Inferred attributes.** Hinge runs a deep-learning recommendation system, not a single algorithm, combining: profile signals (photos, prompts), intent signals (swipe behaviour, reply speed, dealbreakers) and outcome signals (mutual likes, replies, "We Met" feedback). The "Most Compatible" feature surfaces one daily pick per user from a modified Gale–Shapley (stable-marriage) implementation, refreshed every 24 h. Users are reportedly ~8× more likely to date a Most Compatible match than a random one. ([Hinge "How we connect"][hinge-howwe]; [TechCrunch 2018][tc-mostcomp]; [Cornell Networks blog on Gale–Shapley][cornell-gs])

**Privacy framing.** Basic-info fields are profile-visible by default; sensitive axes (religion, politics, drugs) are togglable as "show on profile" or "use for matching only". Dealbreakers are private. "We Met" feedback is explicitly private and never shown to past or future matches; Hinge frames it as feedback to the algorithm only. ([Hinge We Met help][hinge-wemet])

**Failure modes.** 105 prompts is far past most users' patience — the average profile has the minimum 3. Hinge addresses this with aggressive nudging ("add one more prompt to get 30% more likes" UX patterns) rather than mandatory completion. Prompts are aspirational/performative (selected for likeability, not accuracy) — they're advertising copy, not honest signal.

---

## 2. Bumble

**Signal set.** (i) **Basic info / "My basics" badges** — work, education, location, hometown, height, activity level, star sign, drinking, smoking, kids, religion, politics, dating intention; (ii) **Interest badges** — pick up to 5 from ~200 across 12 categories (Creativity, Sports, Going out, Staying in, Film & TV, Reading, Music, Food & drink, Travel, Pets, Values & traits, Bumble values & allyship); (iii) **Profile prompts** — pick up to 3 from a catalogue of 40+; (iv) **Bio** — free-text, 300-char cap. Mostly pick-from-grid, deliberately less free-text than Hinge. ([Bumble badges][bumble-badges]; [Bumble self-care badges][bumble-selfcare])

**Stage.** Standard fields collected upfront at signup (name, DOB, gender, sexual orientation); badges + prompts are encouraged but skippable. Bumble shows community guidelines at the *end* of onboarding (vs. Tinder at the start). ([App Fuel onboarding analysis][appfuel-bumble])

**Inferred attributes.** Bumble does not publish a deep-learning compatibility claim equivalent to Hinge's. The "Question Game" is a *post-match* icebreaker — both sides answer a pre-written question simultaneously and answers are revealed once both have submitted. It is conversation-starting, not algorithmic. ([Bumble Question Game][bumble-qg])

**Privacy framing.** Interest badges and prompts are public profile fields by design. Bumble has no equivalent of OkCupid's private-question toggle. Sensitive axes (politics, religion) are user-controlled — visible only if the user adds the badge.

**Failure modes.** Pick-from-grid suppresses honesty in favour of belonging: users pick badges that signal *the kind of person they want to be seen as*, not what they actually do. 5-interest cap forces a curation game (more aesthetic management than signal extraction).

**Bumble BFF.** The friendship sub-product (now spinning out as "Bumble For Friends") historically reused the dating profile structure with no question redesign. Notable that the BFF redesign analyses missed both the 5-interest grid and the Question Game — implying these features are weakly load-bearing for matching even on the dating side. ([Calhoun BFF redesign analysis][calhoun-bff])

---

## 3. OkCupid

**Signal set.** Three layers: (i) thin profile basics; (ii) **prompts** (free-text essays, e.g. "Self-summary", "What I'm doing with my life", "On a typical Friday night I am…"); (iii) the canonical **Match Questions** battery. The Match Questions battery is the famous part — OkCupid maintains 3,000+ multiple-choice questions and users are *required* to answer 15 to use the product; average user answers ~50, power users hit hundreds. ([OkCupid help][okc-howworks]; [tinderprofile.ai analysis][okc-tp])

**Question structure.** Per question, the user supplies *three* values: their own answer; the answers they would accept from a match (one or more from the same option set); and an importance rating on the scale **Irrelevant / A little important / Somewhat important / Very important / Mandatory**, worth 0 / 1 / 10 / 50 / 250 points respectively. Match percentage is the geometric mean of each side's satisfaction score (multiply, square-root). ([Sinha algorithm writeup][okc-sinha]; [profilesharp algorithm explainer][okc-ps])

**Inferred attributes.** OkCupid's pitch is *direct compatibility computation* — no latent factor inference, the user explicitly states what they want. The published company analyses (OkTrends, Logic Mag interview with former CTO Tom Quisel) have noted surprising predictive power in low-information questions: the founders' often-cited example is that "Do you like the taste of beer?" was the single strongest predictor of openness to first-date sex. ([Logic Mag — Quisel interview][okc-logic])

**Privacy framing.** Each question has a public/private toggle ("Make answer public to my profile"). The default is public for the answer, private for the "what I want from a match" axis and importance weighting. Critically, the privacy box is **not sticky** — the user must re-toggle on every question. ([OkCupid privacy controls][okc-privacy])

**Failure modes.** Massive selection bias: power users (high count) get artificially boosted match percentages vs. low-count users. Polarising / culture-war questions ("Would you date someone with very different politics?") dominate the average user's exposure because they are *higher information per bit* (more diagnostic of latent disposition) — but they also produce the well-documented OkCupid effect of strangers leading with politics. OkCupid blog famously argued in 2010 that "polarising" photos (1 or 5 stars, not 3) led to more messages — same principle applied to questions. ([Mic on OkCupid prediction questions][okc-mic])

---

## 4. Tinder

**Signal set.** Historically near-zero: photos + age + gender + a 500-char bio. Modern Tinder (2024–2026) has expanded to a "5-Point Select Screen" — 5 interest badges, 4+ photos, profile verification, relationship goal, bio of 15+ characters — but these remain optional for the free tier and only required to *qualify* for the premium $499/mo Select tier. Onboarding remains the lightest in the industry. ([VIDA Tinder Select review][tinder-vida]; [Fox Business — Tinder Select launch][tinder-fox])

**Stage.** All swipeable after the bare minimum. Profile depth is encouraged *after* engagement, not before.

**Inferred attributes.** Tinder's matching is collaborative-filter based on swipe behaviour (an ELO-style scoring system, abandoned officially in 2019 but suspected still active in modified form). The 2025 "Modes" announcement (Double Date, College Mode, "For You") signals a strategic shift toward intent signals + life-stage badges feeding algorithmic sorting. ([TechCrunch Tinder Modes][tinder-tc])

**Privacy framing.** Standard public-profile model; no per-field privacy toggles. Tinder takes special-category data (sexual orientation, gender identity) at signup with explicit consent — the Article 9 GDPR pattern. ([Privacy Guides queer dating apps article][queer-privacy])

**Failure modes.** The Tyson et al. 2016 ASONAM paper ("A First Look at User Activity on Tinder") established empirically that with near-zero question signal, behaviour collapses to physical-attractiveness sorting with sharp gender asymmetry — 91% of women report swiping right only on profiles they're attracted to vs. 35% of men casually liking most. Sparse signal -> behaviour-only matching -> well-documented attractiveness skew. ([arXiv 1607.01952][tyson-arxiv])

---

## 5. Coffee Meets Bagel

**Signal set.** ~5 prompts (selected from a catalogue, e.g. "I am…", "I like…", "My ideal date…", "I appreciate when my date…", "Favorite weird food combo"), basic-info fields including ethnicity / religion / political view as opt-in special-category data, and filtered preferences for age / religion / ethnicity that *define the match pool*, not just sort it. ([CMB profile template][cmb-eddie]; [CMB privacy notes][cmb-priv])

**Stage.** Front-loaded — CMB explicitly requires more info upfront than Hinge/Bumble because of the curated daily-bagel model (limited daily matches, 5–6 for women, more for men).

**Inferred attributes.** CMB's stated philosophy is forced slow-down: limited daily picks make users read profiles instead of judging photos. ([UX Planet CMB redesign analysis][cmb-uxplanet])

**Privacy framing.** Special-category data (race, religion, political views, sex life) is collected with explicit consent for matching purposes. This is GDPR-Article-9 compliant in form but has produced *real* litigation surface: CMB's algorithm was reported to disproportionately match same-ethnicity pairs even when users selected "no preference", and the founders' public justification (data shows in-group preference is the latent reality) became its own controversy. ([AI Incident DB #280][cmb-incident]; [BuzzFeed reporting][cmb-buzzfeed])

**Failure modes.** The CMB ethnicity story is the cleanest example in the industry of *stated preference != revealed preference*, and of why "use this special-category answer to refine matching, even with consent" is legally and reputationally hazardous.

---

## 6. The League / Inner Circle

**Signal set.** The vetting-gated premium segment. The League collects standard fields plus career, education (with selectivity tier as a matching axis), and runs an application-review queue with 20–30% acceptance. Inner Circle uses a manual-vetting team (4 full-time staff reportedly reviewing ~4,000 applications/day, 50/50 approve/waitlist). Both apps then use lightweight prompts + compatibility-question badges layered on. ([The League FAQ][league-faq]; [Inner Circle review][inner-vida])

**Stage.** Application + vetting *before* matching — the question battery functions partly as gating signal (who passes the bar), not just compatibility input.

**Inferred attributes.** Education selectivity is an explicit matching axis on The League. This is a regulated-elsewhere proxy (US Civil Rights / EU equality law treat education-as-proxy as risky for discrimination claims), and the apps lean into it as a feature.

**Privacy framing.** Vetting team has full access to applications. Premium-segment apps generally have lighter user-facing privacy controls because the business model is curation, not user-data minimisation.

**Failure modes.** Selection bias is the *point* — but it also means the question battery is optimised for "passes our bar" not "predicts long-term compatibility". The data is a thin slice of high-income, high-education users; generalisations don't transfer.

---

## 7. Match.com (the legacy)

**Signal set.** The maximum-fields anti-pattern. Multi-screen registration: 5 short basic-info screens followed by 8 lengthy profile screens covering essays, lifestyle fields, and an open-ended self-description battery. Lengthy but fully skippable. Match's questionnaire is the canonical "fill in 50 fields" pattern that Hinge/Bumble were built to react against. ([Match profile guide][match-eddie]; [internetdating.ca Match sign-up][match-process])

**Stage.** Fully front-loaded; the platform's UX bet is that users who fill more fields get better matches and stay subscribed longer.

**Inferred attributes.** Match's algorithm has been criticised as outdated; the FTC sued Match Group in 2019 for misleading "you have a message" emails directing free users to convert. Algorithmic transparency is essentially zero. ([Mentor Research Institute summary of criticisms][match-mri])

**Privacy framing.** Standard public-profile model. No per-field private toggles.

**Failure modes.** Length-induced dropoff is the textbook case. SurveyMonkey's industry data shows ~17% completion-rate drop above 12 questions / 5 min, climbing to 40% above 10 min. Match's full registration is well past both thresholds. The platform retains users via subscription lock-in, not via question-quality. ([SurveyMonkey survey length data][sm-length])

---

## 8. Question-design principles that emerge

### Question count — the empirical sweet spot

| Platform | Required | Typical | Mode |
|---|---|---|---|
| Tinder | ~0 | ~0 | photos-only |
| Hinge | 3 prompts + 6 basics | 3 prompts | curated minimal |
| Bumble | 0 prompts + basics | 3 prompts + 5 badges | pick-grid |
| OkCupid | 15 match Qs | ~50 | self-paced expansion |
| eHarmony | 80 Qs | 80 | mandatory pre-match |
| Match | many | many (skippable) | front-loaded |

SurveyMonkey's general-purpose data: 10-Q surveys complete at ~89%, 30-Q at ~85%, 40-Q at ~79%; 10+ min surveys drop ~40%. In-app survey research (Refiner 2025) puts the modern sweet spot at **4–5 questions**. Hinge's 3 prompts + lazy-load of basics is the closest deliberate match to that finding. ([SurveyMonkey][sm-length]; [Refiner 2025 in-app survey report][refiner])

### Question type

- **Binary / multi-choice** dominates the matching layer everywhere (OkCupid, Hinge basics, Bumble badges). >80% of users in education-survey research prefer binary over Likert ([MDPI binary vs Likert][mdpi-binary]). Granularity above 3-level adds rating time without adding stability of preference.
- **Likert / importance-weighted** is OkCupid's distinctive twist. Adding the importance axis turns ordinary multi-choice into a Bayesian prior-strength signal — high-importance answers contribute 250× more weight than low.
- **Free-text prompts** function as profile *display* (advertising the user) more than as matching signal — they don't feed compatibility scoring directly on Hinge or Bumble. The classical Rashid 2002 "Getting to know you" cold-start paper argues that **info-theoretically-selected items** (high disagreement in the population) beat free-form input for fast preference learning. ([Rashid 2002 PDF][rashid-pdf])
- **Pick-from-grid** (Bumble badges) maximises completion speed but suppresses honesty — users pick aspirationally.

### Polarising vs. neutral

Christakopoulou et al. (KDD 2016, "Towards Conversational Recommender Systems") shows that with a probabilistic latent-factor model, asking just 2 well-chosen questions can move personalisation +25% over a static baseline — *if* the questions discriminate latent groups. OkCupid's "do you like the taste of beer?" beating obviously-relevant questions is the same effect: high-discrimination low-stakes questions are info-theoretically richer than direct-but-correlated questions. ([Christakopoulou 2016 PDF][christ-pdf])

### Aspirational vs. actual

Multiple studies converge: ~25% of dating-app users admit some misrepresentation (age 14%, marital status 10%, appearance 10%); in one Chinese-adult study 83% admitted lying to some degree. Misrepresentation correlates with motivation: users with relational goals present more authentically, users with self-validation goals more deceptively. The "I read books" trope is real and survives even strong nudging. Design implication: assume aspirational drift on positive self-description; rely on negative-preference axes for hard signal. ([Toma/Hancock deception research][deception-sciencedirect])

### Negative-preference vs. positive-preference

Jonason et al. (Personality & Social Psychology Bulletin 2015, "Relationship dealbreakers"): across 6 studies and 6,500+ participants, **dealbreakers are weighted more heavily than dealmakers** (asymmetric negativity bias). Effect is stronger for women and stronger in long-term contexts. Hinge has operationalised this as the Dealbreakers feature ("we'll only show you each other if you both meet each others' dealbreakers"). The recommender-systems theoretical literature has caught up (Frolov & Oseledets 2022 on negative preferences in collaborative filtering) and supports the same conclusion: negative preferences are *less elicited* but *more diagnostic*. ([Jonason 2015 PSPB][jonason]; [Frolov negative preferences framework][negpref])

---

## 9. Relevance to HelpME2C ghost profile

The closest dating-app analogue to HelpME2C's "describe what your partner likes" is OkCupid's *third* per-question axis — "what answer would you want from a match" — because that axis is literally a user describing a person they don't have access to. The lessons from this body of work for the ghost-profile question battery:

**Keep it small.** Hinge's 3 prompts + ~6 basic-info badges exists as a deliberate reaction to eHarmony's 80 and Match's 50+. Survey-length dropoff data (SurveyMonkey, Refiner) puts the sweet spot at 4–5 questions; preference-elicitation research (Christakopoulou) shows 2 well-chosen questions can do 25% of the work. The ghost-profile battery should sit firmly in the Hinge end of this distribution — under 10 questions, ideally 5–7. Anything Match-shaped is an immediate completion-rate failure.

**Allow negative preferences explicitly.** Jonason 2015 and the recommender-systems negative-preference literature converge: "what would they *not* watch with you" is structurally more diagnostic per question than "what would they enjoy". A dedicated dealbreaker question ("anything they hate-watch?" or "anything they refuse to watch?") is high-information-per-bit and avoids the aspirational-positive bias documented above. Hinge's Dealbreakers product is the design template — small set, hard filter, separate from positive preferences in the UI.

**Frame everything as relationship-aware.** The OkCupid "what I want from a match" axis is *relational* by construction — it's not "what is X like" but "what would I accept from X". For ghost profile this maps to a couch-co-watcher framing: "what would they enjoy *with you*", "what would they want to watch *on date night*", "what's a show that's only fun if you watch it *together*". This is also defensive against the aspirational-self-presentation trap — the user is rating a *joint behaviour*, not certifying their partner's personality.

**Avoid sensitive-axes questions.** The CMB ethnicity-algorithm story is the clearest cautionary tale in the industry: collecting religion / ethnicity / politics / sexual-orientation answers with explicit consent is *legal* under GDPR Article 9 but is **operationally hazardous** — even when the answer is taste-correlated, the legal and reputational exposure is much higher. For HelpME2C this means: even if "does your partner like Christian films" is a strong taste predictor, the cost of asking is higher than the benefit. Use behavioural-taste axes (action vs. drama, dark vs. light, long-form vs. one-shot) that are correlated with the latent traits without naming them. This aligns with ADR-0012's privacy posture (special-category data minimisation).

**Use multi-choice + importance, not free-text or Likert.** Binary or 3–5-option multi-choice has dominant completion behaviour (>80% preference per MDPI), is fast, and is what every successful app uses on the matching layer. OkCupid's importance-weight axis adds Bayesian prior strength without adding question count — a high-value pattern to consider for ghost profile (let the user mark 1–2 questions as "really important" rather than asking more questions).

---

## Sources

[purewow]: https://www.purewow.com/wellness/best-hinge-prompts
[hinge-wemet]: https://help.hinge.co/hc/en-us/articles/360010692913-What-is-We-Met
[hinge-howwe]: https://hinge.co/how-we-connect-daters
[tc-mostcomp]: https://techcrunch.com/2018/07/11/hinge-employs-new-algorithm-to-find-your-most-compatible-match-for-you/
[cornell-gs]: https://blogs.cornell.edu/info2040/2021/09/30/hinge-and-its-implementation-of-the-gale-shapley-algorithm/
[bumble-badges]: https://bumble.com/en-us/the-buzz/bumble-badges
[bumble-selfcare]: https://bumble.com/en-us/the-buzz/bumble-self-care-badge
[appfuel-bumble]: https://theappfuel.com/examples/bumble_onboarding
[bumble-qg]: https://bumble.com/en/the-buzz/bumble-question-game
[calhoun-bff]: https://njcalhoun.medium.com/bumble-ing-through-friendship-redesigning-bumble-bff-105220087600
[okc-howworks]: https://okcupid-app.zendesk.com/hc/en-us/articles/22982200783771-How-Does-OkCupid-Work-Our-Complete-Guide-to-Match-Questions-the-Algorithm-and-Setting-Up-Your-Account
[okc-tp]: https://tinderprofile.ai/blog/how-the-okcupid-algorithm-works/
[okc-sinha]: https://www.hackerearth.com/practice/notes/okcupids-matching-algorithm-1/
[okc-ps]: https://profilesharp.com/en/blog/how-okcupid-algorithm-works
[okc-logic]: https://logicmag.io/sex/tom-quisel-on-algorithmic-arrangements/
[okc-privacy]: https://okcupid-app.zendesk.com/hc/en-us/articles/22977894800411-Privacy-Controls
[okc-mic]: https://www.mic.com/articles/85297/these-3-simple-questions-can-predict-if-an-okcupid-date-will-succeed
[tinder-vida]: https://www.vidaselect.com/tinder-select
[tinder-fox]: https://www.foxbusiness.com/technology/tinder-rolls-out-exclusive-499-monthly-membership-called-tinder-select
[tinder-tc]: https://techcrunch.com/2025/09/10/tinder-evolves-some-features-into-dating-modes/
[queer-privacy]: https://www.privacyguides.org/articles/2025/06/24/queer-dating-apps-beware-who-you-trust/
[tyson-arxiv]: https://arxiv.org/abs/1607.01952
[cmb-eddie]: https://eddie-hernandez.com/coffee-meets-bagel-profile-template-prompts-bio/
[cmb-priv]: https://www.coffeemeetsbagel.com/privacy
[cmb-uxplanet]: https://uxplanet.org/rethinking-the-design-of-modern-dating-apps-for-ultimate-user-experience-coffee-meets-bagel-df818c06991a
[cmb-incident]: https://incidentdatabase.ai/cite/280/
[cmb-buzzfeed]: https://www.buzzfeednews.com/article/katienotopoulos/coffee-meets-bagel-racial-preferences
[league-faq]: https://www.theleague.com/faqs-app/
[inner-vida]: https://www.vidaselect.com/the-inner-circle-dating-app-review
[match-eddie]: https://eddie-hernandez.com/biggest-mistakes-made-on-match-com-profiles/
[match-process]: https://internetdating.ca/match-sign-up-process/
[match-mri]: https://www.mentorresearch.org/criticisms-of-tinder-hinge-matchcom-plenty-of-fish-and-okcupid
[sm-length]: https://www.surveymonkey.com/curiosity/survey_questions_and_completion_rates/
[refiner]: https://refiner.io/blog/in-app-survey-response-rates/
[mdpi-binary]: https://www.mdpi.com/2076-3417/14/10/4189
[rashid-pdf]: https://cs.fit.edu/~pkc/apweb/related/rashid-iui02.pdf
[christ-pdf]: https://www.microsoft.com/en-us/research/wp-content/uploads/2016/06/rfp0063-christakopoulou.pdf
[deception-sciencedirect]: https://www.sciencedirect.com/science/article/abs/pii/S0747563211002548
[jonason]: https://journals.sagepub.com/doi/10.1177/0146167215609064
[negpref]: https://link.springer.com/article/10.1007/s10844-022-00705-9

1. [PureWow — *I've Gone Through All 105 Hinge Prompts*][purewow]
2. [Hinge Help — *What is "We Met?"*][hinge-wemet]
3. [Hinge — *How We Connect Daters*][hinge-howwe]
4. [TechCrunch (2018) — *Hinge employs new algorithm to find your 'most compatible' match*][tc-mostcomp]
5. [Cornell INFO 2040 Blog — *Hinge and Its Implementation of the Gale–Shapley algorithm*][cornell-gs]
6. [Bumble — *How to Use Bumble's Basic Info and Interest Badges*][bumble-badges]
7. [Bumble — *Self-Care Interest Badges & Profile Prompts*][bumble-selfcare]
8. [App Fuel — *Bumble Onboarding flow*][appfuel-bumble]
9. [Bumble — *How to Play the Question Game on Bumble*][bumble-qg]
10. [Nick Calhoun on Medium — *Redesigning Bumble BFF*][calhoun-bff]
11. [OkCupid Help — *How Does OkCupid Work? Match Questions & Algorithm*][okc-howworks]
12. [Sinha (HackerEarth) — *OkCupid's Matching Algorithm*][okc-sinha]
13. [profilesharp — *How the OkCupid Algorithm Works (2026)*][okc-ps]
14. [Logic Mag — *"Algorithmic Arrangements": A Conversation with Tom Quisel, Former CTO of OkCupid*][okc-logic]
15. [OkCupid Help — *Privacy Controls*][okc-privacy]
16. [Mic — *These 3 Simple Questions Can Predict if an OkCupid Date Will Succeed*][okc-mic]
17. [VIDA Select — *Tinder Select Explained*][tinder-vida]
18. [Fox Business — *Tinder Select $499 Membership Launch*][tinder-fox]
19. [TechCrunch (2025) — *Tinder evolves some features into dating 'modes'*][tinder-tc]
20. [Privacy Guides — *Queer Dating Apps: Beware Who You Trust*][queer-privacy]
21. [Tyson et al. (arXiv 1607.01952) — *A First Look at User Activity on Tinder* (2016)][tyson-arxiv]
22. [Eddie Hernandez — *Coffee Meets Bagel Profile Template*][cmb-eddie]
23. [Coffee Meets Bagel — *Privacy Policy*][cmb-priv]
24. [UX Planet — *Insights From Redesigning Coffee Meets Bagel*][cmb-uxplanet]
25. [AI Incident Database #280 — *Coffee Meets Bagel ethnicity-matching incident*][cmb-incident]
26. [BuzzFeed News — *The Dating App That Knows You Secretly Aren't Into Guys From Other Races*][cmb-buzzfeed]
27. [The League — *In-App FAQs*][league-faq]
28. [VIDA Select — *Inner Circle Dating App Reviews*][inner-vida]
29. [Eddie Hernandez — *Match.com Profile, Bio, Questions Guide*][match-eddie]
30. [internetdating.ca — *Match Profile Questions and Sign Up Process*][match-process]
31. [Mentor Research Institute — *Criticisms of Tinder, Hinge, Match.com, Plenty of Fish, and OkCupid*][match-mri]
32. [SurveyMonkey — *Does Adding One More Question Impact Survey Completion Rate?*][sm-length]
33. [Refiner — *In-app Survey Response Rates (2025 Report)*][refiner]
34. [MDPI Applied Sciences — *Binary Surveys versus Likert Scales (Bayesian Analysis)*][mdpi-binary]
35. [Rashid et al. (IUI 2002) — *Getting to Know You: Learning New User Preferences in Recommender Systems*][rashid-pdf]
36. [Christakopoulou, Radlinski, Hofmann (KDD 2016) — *Towards Conversational Recommender Systems*][christ-pdf]
37. [Toma & Hancock (ScienceDirect) — *Dating deception: Gender, online dating, and exaggerated self-presentation*][deception-sciencedirect]
38. [Jonason et al. (PSPB 2015) — *Relationship Dealbreakers: Traits People Avoid in Potential Mates*][jonason]
39. [Frolov & Oseledets (Springer 2022) — *How to deal with negative preferences in recommender systems: a theoretical framework*][negpref]

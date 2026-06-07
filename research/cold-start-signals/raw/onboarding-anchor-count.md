# Signal: Onboarding anchor count (how many "picks you love" to ask for)

**Currently collected:** Yes (current copy: "Five or six is plenty to start")
**Recommended tier:** MUST-ASK — the number itself is the design decision. **Recommended target: ask for 3 minimum, suggest 5, allow up to 10. Show "Done" affordance from pick 3 onward.**

## What it is

The number of titles HelpME2C asks a new user to mark as "things you love" during onboarding. These anchor picks are the *primary* signal feeding the rule-based scorer in `packages/ml/src/recommendation.ts` — every recommended title is scored against them via theme overlap and (Phase 1A) tag-overlap. Unlike "have you watched anime?" or "what mood are you in?", this signal is non-negotiable: without anchors, the scorer has nothing to score against. The interesting question is therefore not *whether* to ask but *how many to ask for*, and how to phrase the minimum/maximum so the system extracts enough signal without burning the user's onboarding patience.

The current product copy reads "Five or six is plenty to start". This file evaluates whether that number is evidence-based and whether it is the right number for HelpME2C's specific case (group co-watching as primary archetype, rule-based scoring in Phase 1A, registered-only MVP).

## Predictive value (literature / industry)

### The marginal-value curve is steep early, flat after ~5–7 ratings

The classic empirical result on cold-start preference elicitation comes from Rashid et al.'s 2002 IUI paper "Getting to Know You" — the most-cited single source on this question. Rashid et al. tested several strategies for selecting which items to show new MovieLens users, and in their online experiment **asked each new user to rate 20 movies** during signup ([Rashid et al., "Getting to Know You", IUI 2002](https://cs.fit.edu/~pkc/apweb/related/rashid-iui02.pdf), [GroupLens blog: Onboarding New Users in Recommender Systems](https://grouplens.org/blog/onboarding-new-users-in-recommender-systems/)). The 20-movie target was not optimised for user experience; it was the experimental design upper bound. The follow-up MovieLens research is the more important data point: GroupLens explicitly retired the "rate 15 movies" baseline because it took over 5 minutes and *discouraged some users so much they dropped out before ever making it to the site home page* ([GroupLens blog: Onboarding New Users in Recommender Systems](https://grouplens.org/blog/onboarding-new-users-in-recommender-systems/)). Their replacement design — preference elicitation via item *groups* rather than individual items — collected equivalent signal in **less than half the time**.

The Cremonesi/Garzotto/Turrin "User effort vs. Accuracy in rating-based elicitation" paper at RecSys 2012 frames the problem precisely:

> One of the unresolved issues when designing a recommender system is the number of ratings — i.e., the profile length — that should be collected from a new user before providing recommendations.

They formalise the trade-off as two conflicting requirements: enough ratings to learn preferences, few enough to not exhaust the user. The 2018 follow-up "Preference elicitation as an optimization problem" argues that the optimal cold-start design asks the *minimum, most diverse* set of questions ([Sepliarskaia et al., RecSys 2018](https://dl.acm.org/doi/10.1145/3240323.3240352)). The active-learning literature is more concrete on numbers: a comparative review of active-learning strategies notes that experimental designs typically collect "at least 3 items and at most 20 items to ensure that enough information was collected regarding the user's preferences without testing the user's patience too much during the interviews" ([Eliciting Auxiliary Information for Cold Start User Recommendation: A Survey, MDPI 2021](https://www.mdpi.com/2076-3417/11/20/9608)).

The shape of the learning curve from this literature is consistent across studies: a **steep accuracy gain from 0 → 3 ratings, continued meaningful gains 3 → 7, then a diminishing-returns flattening after roughly 7–10 ratings**, with marginal value approaching zero past 15–20 for cold-start scoring on standard MovieLens benchmarks. The exact inflection depends on the algorithm (matrix factorization plateaus later than neighbour-based CF, but neither matters in Phase 1A where scoring is rule-based) and the rating diversity (random ratings plateau early; entropy-selected ratings plateau later because each rating carries more information). Active-learning research using MovieLens 1M and 10M datasets consistently shows that RMSE improvements past 10 elicited ratings are within 1–2% of the asymptote ([Active learning algorithm for alleviating the user cold start problem of recommender systems, Nature Scientific Reports 2025](https://www.nature.com/articles/s41598-025-09708-2), [Exploiting Past Users' Interests and Predictions, MDPI Informatics 2018](https://www.mdpi.com/2227-9709/5/3/35)).

### Industry numbers cluster tightly around 3–5

Industry has converged. The cluster is striking:

- **Netflix: 3** — Netflix's onboarding asks new users to pick "3 movies you like" before showing the personalised home ([UserOnboarding Academy: Netflix's signup onboarding](https://useronboarding.academy/user-onboarding-inspirations/netflix-signup-onboarding), [Monks Technology Services: Netflix onboarding lessons](https://www.zemoga.com/insights/blog/user-onboarding-process/)). Netflix itself explains: "When you create your Netflix account, or add a new profile in your account, Netflix asks you to choose a few titles that you like, and uses these titles to 'jump start' your recommendations" — and crucially, "Choosing a few titles you like is optional" ([Netflix Help Center: How Netflix's Recommendations System Works](https://help.netflix.com/en/node/100639)).
- **Spotify: 3 minimum, no upper cap** — Spotify's onboarding screen 5 reads "Choose 3 or more artists" with a semi-endless list for users who want to keep adding ([Deep-dive into Spotify's User Onboarding Experience, Medium](https://medium.com/@smarthvasdev/deep-dive-into-spotifys-user-onboarding-experience-f2eefb8619d6)).
- **Pinterest: 5** — Pinterest asks new users to "Follow 5 topics" with the rationale "it will build a custom home feed for you" ([Appcues: How Pinterest perfected user onboarding](https://www.appcues.com/blog/casey-winters-pinterest-user-onboarding)).
- **Letterboxd: 4** — Letterboxd asks for "four favorite films" pinned permanently to the user's profile ([Letterboxd FAQ](https://letterboxd.com/about/faq/), [Popular Science: How to use Letterboxd](https://www.popsci.com/diy/how-to-use-letterboxd/)).
- **TikTok: ~3–8 categories** — TikTok asks users to select interest categories (pets, travel, etc.) at signup but emphasises that the feed personalises mostly through scroll behaviour afterwards ([TikTok Help Center: How TikTok recommends content](https://support.tiktok.com/en/using-tiktok/exploring-videos/how-tiktok-recommends-content), [Appcues: TikTok onboarding](https://goodux.appcues.com/blog/tiktok-user-onboarding)).
- **Trakt: open-ended, but seeds with genres first** — Trakt asks for genres before titles, treating individual title picks as optional ([Trakt Forums: New account adding shows](https://forums.trakt.tv/t/new-account-adding-shows/23957)).

Two patterns matter. First, **every major consumer recommender lands between 3 and 5** as the minimum, with the upper bound either unbounded or implicit. Second, **Netflix — the gold-standard production cold-start system — chose 3 and made it optional**, which is significant because they have the most rating data on Earth and could justify any number. The Netflix choice reflects a deliberate trade-off favouring conversion over signal: they would rather have a signed-up user with weak preferences than no signed-up user. They also know that *post-onboarding behaviour* (clicks, dwell, completes) dominates the long-run profile, so the onboarding signal is a seed, not a complete preference fingerprint.

### Drop-off cost is steep and non-linear

The drop-off literature is unforgiving on this point. Multi-step form data is the most directly relevant:

- **Multi-step forms peak at 3 steps with 62% completion**, declining to 53% at 4 steps and **44% at 5+ steps** ([Userpilot: Customer Onboarding Checklist Completion Rate Benchmarks 2025](https://userpilot.com/blog/onboarding-checklist-completion-rate-benchmarks/), [Memberstack on multi-step form completion](https://www.memberstack.com/features/multi-step-onboarding)).
- **Each additional form field reduces completion by 3–5%** (Baymard Institute, via [SaaSFactor: Steps to Reduce Drop-Off](https://www.saasfactor.co/blogs/what-steps-should-your-signup-and-onboarding-include-to-reduce-drop-off)).
- **Reducing a signup form from 7 fields to 3 cuts abandonment by 44.7%** in a 2026 study of 3.9 million sessions across 480 SaaS products ([Amraandelma: Top 20 Funnel Drop-off Rate Statistics 2026](https://www.amraandelma.com/funnel-drop-off-rate-statistics/)).
- **Anything above ~15 steps correlates with >50% abandonment** (Baymard Institute checkout research).

Critically, these are *form field* numbers — and HelpME2C's anchor picking is materially less expensive per item than a typed form field. Picking a title from a grid is closer to a *tap*, not a *typed field*. A grid of 50 candidate titles where the user taps 5 they love is psychologically closer to one form action than five. But the drop-off curve still applies once the user perceives the task as "still going" — past about 8–10 taps, fatigue compounds and users start asking "when does this end?". The Pinterest model — *visible* progress ("Follow 5 topics", with a counter) — is the empirically proven shape: a known finite endpoint with visual progress feedback bumps finish rates 30–50% over open-ended selection ([Userpilot Benchmarks 2025](https://userpilot.com/blog/onboarding-checklist-completion-rate-benchmarks/)).

### Does group recommendation need more signal per user?

This is HelpME2C's load-bearing question and the literature is thinner here. The intuition is that group recs (couch co-watching) require *less* per-person signal in some respects (the system can find compromise points more easily with multiple users) but *more* in others (a single bad picks list contaminates everyone's recs). The active-learning research on group preference profiling doesn't give a definitive number, but the consensus framing is that group recs benefit from *higher diversity* of picks per user rather than *higher count* — getting one comedy, one drama, and one genre-spanning pick from each member is worth more than five samey picks from one ([An entropy empowered hybridized aggregation technique for group recommender systems, ScienceDirect 2020](https://www.sciencedirect.com/science/article/abs/pii/S0957417420308617)).

For HelpME2C's primary couch co-watcher archetype, this argues for **asking each person to pick across at least two genres or moods explicitly** within their 3–5 picks rather than asking for more picks total. That UX shape — "pick 3-5 things you love, ideally not all the same genre" — is cheaper than "pick 10" and produces a more useful profile for group blending.

## GDPR / consent cost

Low. Anchor picks are the user's *stated preference signal*, not behavioural surveillance, and they map cleanly onto the lawful basis of consent + the data-minimisation principle ("we collect picks only because we need them to recommend"). The consent affordance ("why we're asking") is already obvious from the UX context ("pick titles so we can recommend").

The only consent-cost wrinkle is **upper bound**. If the system allows a user to pick 50 titles, the profile becomes a richer behavioural fingerprint than necessary, and the deletion/export burden grows linearly. Capping at ~10 anchors is sensible from both a data-minimisation and a "the user shouldn't be encouraged to over-share" angle.

## UX / drop-off cost

Direct. Every additional anchor pick beyond 3 trades signal for friction. The literature gives us:

- Asking for fewer than 3 → insufficient signal for the scorer to differentiate users, plus loses the diversity-across-picks signal that helps group blending.
- 3–5 → the sweet spot industry has converged on; Netflix's exact choice (3) and Pinterest's exact choice (5) bracket this.
- 6–10 → marginal accuracy gain, increasing drop-off cost. Justifiable only if presented as *optional* ("keep adding" mode like Spotify).
- 11+ → diminishing returns are severe and drop-off cost compounds rapidly. The 2002 MovieLens "rate 15 movies" experience was painful enough that GroupLens redesigned around it.

The current copy "Five or six is plenty to start" is *almost* right but has two problems. First, "five or six" sets the floor too high — users who'd happily click 3 and move on now feel they're under-delivering. Netflix's "Choose 3" sets a low floor and lets enthusiasm carry users past it; HelpME2C's copy currently sets a higher floor without the upside. Second, "is plenty to start" implies more is better, which mildly invites over-picking; Pinterest's "Follow 5" is cleaner because it sets a target, not a floor with an open ceiling.

## Path into scoring

The current `packages/ml/src/recommendation.ts` consumes anchor picks as the primary signal — every candidate is scored on theme overlap with the anchor set. The change implied by this research is **structural to the UI/copy, not to the scoring function**: keep the scorer as-is, change the elicitation shape to ask for 3 minimum / 5 target / 10 cap, with a visible "Done" CTA from pick 3 onward. Internally, the scorer's behaviour at 3 anchors should be validated — if the rule-based scorer produces noticeably worse recs with 3 anchors than with 5 (per the 4/5-quality-rating success metric), the floor lifts back to 5. If it produces equivalent recs, drop the floor to 3 and watch conversion improve.

For group recs (the primary archetype), the per-person target stays the same (3–5) but the system explicitly encourages *one pick from each of 2+ genres* — this is a copy/UX nudge ("Add something from a different genre?") not a hard rule.

## Tier justification

**Recommended: MUST-ASK** for the signal itself, with a specific recommended target of **3 minimum / 5 suggested / 10 maximum**, presented as Pinterest-style "Pick 5" copy with a visible counter and an early "Done" affordance.

The constraint box is decisive here: anchor picks ARE the primary signal in `packages/ml/src/recommendation.ts`, and the cold-start success metric explicitly mentions "5–10 onboarding likes" — so the question is not whether to ask but *how* to ask. The literature (Rashid 2002, Cremonesi 2012, Sepliarskaia 2018) and industry consensus (Netflix 3, Pinterest 5, Letterboxd 4, Spotify 3+) both point to the 3–5 minimum range. The current "Five or six is plenty to start" copy is in the right neighbourhood but slightly mis-shaped: lower the floor to 3, present 5 as the target, and let enthusiasts go to 10. This change is consistent with the GDPR data-minimisation principle, with the drop-off literature on multi-step forms (peak completion at 3 steps), and with the success metric's stated 5–10 range. The cost of asking less than 3 is more dangerous than the cost of asking up to 10, but the cost of *requiring* 5–6 — where a non-trivial fraction of testers will abandon — is the largest single risk in the current shape.

## Sources

- [Rashid et al., "Getting to Know You: Learning New User Preferences in Recommender Systems", IUI 2002](https://cs.fit.edu/~pkc/apweb/related/rashid-iui02.pdf)
- [Sepliarskaia et al., "Preference elicitation as an optimization problem", ACM RecSys 2018](https://dl.acm.org/doi/10.1145/3240323.3240352)
- [Cremonesi, Garzotto & Turrin, "User effort vs. Accuracy in rating-based elicitation", RecSys 2012 (ResearchGate)](https://www.researchgate.net/publication/254464296_User_effort_vs_Accuracy_in_rating-based_elicitation)
- [GroupLens blog: Onboarding New Users in Recommender Systems](https://grouplens.org/blog/onboarding-new-users-in-recommender-systems/)
- [Active learning algorithm for alleviating the user cold start problem of recommender systems, Nature Scientific Reports 2025](https://www.nature.com/articles/s41598-025-09708-2)
- [Exploiting Past Users' Interests and Predictions in an Active Learning Method for Cold Start, MDPI Informatics 2018](https://www.mdpi.com/2227-9709/5/3/35)
- [Eliciting Auxiliary Information for Cold Start User Recommendation: A Survey, MDPI 2021](https://www.mdpi.com/2076-3417/11/20/9608)
- [An entropy empowered hybridized aggregation technique for group recommender systems, ScienceDirect 2020](https://www.sciencedirect.com/science/article/abs/pii/S0957417420308617)
- [Netflix Help Center: How Netflix's Recommendations System Works](https://help.netflix.com/en/node/100639)
- [UserOnboarding Academy: Netflix's signup onboarding is designed to be quick and personal](https://useronboarding.academy/user-onboarding-inspirations/netflix-signup-onboarding)
- [Monks Technology Services: User Onboarding Process — Conversion Optimization Lessons from Netflix](https://www.zemoga.com/insights/blog/user-onboarding-process/)
- [Deep-dive into Spotify's User Onboarding Experience (Medium)](https://medium.com/@smarthvasdev/deep-dive-into-spotifys-user-onboarding-experience-f2eefb8619d6)
- [Appcues: How Pinterest perfected user onboarding (Casey Winters)](https://www.appcues.com/blog/casey-winters-pinterest-user-onboarding)
- [Letterboxd FAQ — four favorite films](https://letterboxd.com/about/faq/)
- [Popular Science: How movie lovers can make the underrated Letterboxd feel like home](https://www.popsci.com/diy/how-to-use-letterboxd/)
- [TikTok Help Center: How TikTok recommends content](https://support.tiktok.com/en/using-tiktok/exploring-videos/how-tiktok-recommends-content)
- [Appcues: TikTok's addictive, activation-focused user onboarding](https://goodux.appcues.com/blog/tiktok-user-onboarding)
- [Trakt Forums: New account adding shows](https://forums.trakt.tv/t/new-account-adding-shows/23957)
- [Userpilot: Customer Onboarding Checklist Completion Rate — 2025 Benchmark Report](https://userpilot.com/blog/onboarding-checklist-completion-rate-benchmarks/)
- [Foundry CRO: Form Conversion Rate Benchmarks 2026 — Fields & CPL Cost](https://foundrycro.com/blog/form-conversion-rate-benchmarks-2026/)
- [Amraandelma: Top 20 Funnel Drop-off Rate Statistics 2026](https://www.amraandelma.com/funnel-drop-off-rate-statistics/)
- [SaaSFactor: What Steps Should Your Signup and Onboarding Include to Reduce Drop-Off (Baymard data)](https://www.saasfactor.co/blogs/what-steps-should-your-signup-and-onboarding-include-to-reduce-drop-off)
- [Memberstack: Multi-Step Onboarding Forms](https://www.memberstack.com/features/multi-step-onboarding)

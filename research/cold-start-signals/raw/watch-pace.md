# Signal: Watch pace (hours per week)

**Currently collected:** No
**Recommended tier:** DON'T-ASK

## What it is

Watch pace is a self-reported estimate of how many hours of TV / film / anime a user
consumes in a typical week, often bucketed into "casual" (under ~3h), "regular"
(~3–10h), and "heavy / power viewer" (~10h+) bands. The hypothesised use is twofold:
to segment users into pace cohorts (analogous to Spotify's lean-back vs lean-forward
listener split) and to filter recommendations that demand more commitment than the
user has time for — e.g. avoid surfacing a 24-season epic to someone with two
hours a week. For HelpME2C this maps roughly to the casual-watcher vs power-tracker
archetype split in Phase 1A.

## Predictive value (literature / industry)

Industry segmentation by pace is real but operationally derived from behaviour, not
asked at signup. Spotify's "lean-back vs lean-forward" framing distinguishes passive
algorithmic / radio streams from active deliberate plays, but both labels are
inferred from session telemetry (search vs autoplay, skip rates, library saves)
rather than from a self-report at registration ([Music Industry Blog on
playlist economics](https://musicindustryblog.wordpress.com/tag/playlist-economics/),
[Music Insights — Active vs Passive streams](https://help.musicinsights.com/hc/en-us/articles/360007993973-What-are-Active-and-Passive-streams)).
Netflix's "binge scale" (devoured > 2h/day, savored < 2h/day) is similarly a
per-title behavioural property the platform measures post-hoc, not a user-declared
attribute ([Collider — Netflix Binge Scale](https://collider.com/netflix-binge-scale-tv-series/)).
Academic clustering on Netflix users yields four pace cohorts (recreational,
regulated binge-watcher, avid binge-watcher, unregulated binge-watcher) — but again,
those labels come from frequency / duration logs, not from a question
([Castro et al. 2021, *The binge-watcher's journey*](https://journals.sagepub.com/doi/10.1177/1354856519890856)).

The literature on self-reported media consumption is unambiguous: it is bad. Studies
comparing self-reported TV / screen time to objective measures (camera diaries,
device-recorded screen time, accelerometers) consistently find large discrepancies.
Self-report overestimates frequency and underestimates duration; the peak-end rule
and recall heuristics distort estimates further; users with lower verbal-reasoning
scores under-report more
([npj Mental Health Research 2025 — ABCD study](https://www.nature.com/articles/s44184-025-00131-z),
[Sage / Ohme et al. 2021 — iOS Screen Time vs self-report](https://journals.sagepub.com/doi/10.1177/2050157920959106),
[Wonneberger & Irazoqui 2017 — Response errors of self-reported TV exposure](https://journals.sagepub.com/doi/10.1177/1077699016629372),
[Gershuny et al. 2020 — diary vs wearable camera](https://journals.sagepub.com/doi/abs/10.1177/0081175019884591)).
Gershuny et al. found wearable-camera measurement of TV viewing averaged ~91 minutes
where self-report diaries reported ~141 minutes — a ~55% overstatement.

The length-of-show filtering claim ("don't recommend long shows to low-pace users")
also has weaker empirical backing than it sounds. Completion rate research shows
that what matters for satisfaction is pacing, cliffhangers and tight construction,
not raw episode count — Squid Game (a 9-episode season) and Fargo (anthology, low
per-season commitment) hit ~87% completion, whereas big-budget long shows like 1899
abandoned at ~32% ([Nicolas Derouet — completion rates](https://mrnicolasderouet.com/en/how-many-viewers-actually-finish-a-tv-series/),
[Slashdot — How many episodes before quitting](https://entertainment.slashdot.org/story/25/03/03/1424248/how-many-episodes-should-you-watch-before-quitting-a-tv-show-a-statistical-analysis)).
A "filter long shows for casual viewers" rule would have penalised Squid Game and
flattered 1899. The signal is too lossy to act on deterministically.

Critically, pace can be derived from anchor picks plus a few weeks of post-signup
behaviour. If a user's six onboarding picks are all sub-90-minute films or 8-episode
limited series, their implicit commitment ceiling is visible without asking. This
matches Netflix's documented approach: behavioural data collection over explicit
questioning, with "because you watched" supplanting any initial preference
([Spotify / Netflix progressive profiling overview — Music Tomorrow](https://www.music-tomorrow.com/blog/how-spotify-recommendation-system-works-complete-guide),
[Netflix Tech Blog — long-term satisfaction](https://netflixtechblog.com/recommending-for-long-term-member-satisfaction-at-netflix-ac15cada49ef)).

## GDPR / consent cost

Watch pace is low-sensitivity personal data — it does not by itself identify a
person or reveal a special category under Article 9. But under data minimisation
(Article 5(1)(c)) the bar is "adequate, relevant and limited to what is necessary".
If the signal is inaccurate (per the self-report literature above) and can be
derived from anchor picks, asking for it fails the necessity test
([Andrew Swan Law — Data minimisation under GDPR](https://www.andrewswanlaw.co.uk/post/data-minimisation-a-core-principle-of-gdpr)).
Just-in-time and progressive-disclosure consent patterns are now the
recommended posture: collect when needed for a specific function, not upfront
([Secure Privacy — Personalization without privacy violations](https://secureprivacy.ai/blog/personalization-privacy-compliance)).

There is no special-category exposure here, so the consent cost is not the
deal-breaker — it's the combination of low predictive value with non-zero collection
that pushes the cost-benefit ratio underwater.

## UX / drop-off cost

Each additional onboarding field reduces completion by roughly 3–5%, and forms
beyond ~15 fields cross 50% abandonment ([Baymard / SaaSFactor synthesis](https://www.saasfactor.co/blogs/why-users-drop-off-during-onboarding-and-how-to-fix-it),
[Form QR Code Generator — 133 form statistics](https://www.form-qr-code-generator.com/blog/online-form-statistics-facts/)).
Nielsen Norman frames onboarding as the highest-risk interaction point in the
lifecycle. HelpME2C's signup already asks for 5–10 anchor picks; a pace question
on top is direct deadweight.

The "open question vs bucketed answer" choice is a side issue. An open numeric
question ("how many hours per week?") amplifies the self-report inaccuracy problem
and adds cognitive load. Predefined buckets ("under 3h / 3–10h / 10h+") are slightly
better but still inherit the recall-bias problem and force a quantitative judgement
the user is unlikely to have ready. Neither variant rescues the signal.

The deeper UX problem: asking "how much do you watch" right after asking the user
to pick favourite titles primes them to anticipate filtering ("if I say 'casual'
will it hide good long shows from me?"). That defensiveness corrupts the answer
in the same direction as the literature predicts — users over- or under-claim to
shape what they get served, not to describe their real consumption.

## Path into scoring

Phase 1A scoring (`packages/ml/src/recommendation.ts`) is rule-based on anchor picks
and rated titles. A pace signal could plug in as a deterministic episode-count or
runtime penalty: e.g. multiply a candidate's score by 0.5 if total runtime > N hours
and user is in the "casual" bucket. The implementation is trivially deterministic.

The problem is not the path — it's that the input is too unreliable to drive a
penalty that big without producing visible bad recommendations (casual user gets
Squid Game suppressed; power user gets a 2-hour film boosted past Breaking Bad).
A derived equivalent — "median anchor-pick runtime" or "max anchor-pick episode
count" — runs through exactly the same scoring path with strictly more signal and
zero user-friction cost. The path into scoring is not the bottleneck; the quality
of the input is.

## Tier justification

**Recommended: DON'T-ASK.**
Self-reported watch pace is well-documented to be inaccurate; pace cohorts at
Spotify and Netflix are derived behaviourally, not asked; the "filter long shows
for casual viewers" rule has weak empirical support (Squid Game and Fargo would be
penalised, 1899 flattered); and a derived equivalent — median runtime or max
episode count of anchor picks — runs through the same rule-based scoring path with
strictly better signal and zero GDPR / drop-off cost. Phase 1A targets the
casual-watcher and power-tracker archetypes specifically, but those archetypes are
better separated by what they pick than by what they claim about their week.
Defer; revisit only if A/B testing on real anchor-pick-derived pace shows the rule
is too noisy and an explicit anchor would help.

## Sources

- [Castro et al. 2021 — The binge-watcher's journey (Convergence)](https://journals.sagepub.com/doi/10.1177/1354856519890856)
- [npj Mental Health Research 2025 — ABCD study, self-report vs passive screen-time](https://www.nature.com/articles/s44184-025-00131-z)
- [Ohme et al. 2021 — iOS Screen Time vs self-report (Mobile Media & Communication)](https://journals.sagepub.com/doi/10.1177/2050157920959106)
- [Wonneberger & Irazoqui 2017 — Response errors of self-reported TV exposure](https://journals.sagepub.com/doi/10.1177/1077699016629372)
- [Gershuny et al. 2020 — Time-use diaries vs wearable camera](https://journals.sagepub.com/doi/abs/10.1177/0081175019884591)
- [Nicolas Derouet — How many viewers actually finish a TV series?](https://mrnicolasderouet.com/en/how-many-viewers-actually-finish-a-tv-series/)
- [Slashdot — How many episodes should you watch before quitting](https://entertainment.slashdot.org/story/25/03/03/1424248/how-many-episodes-should-you-watch-before-quitting-a-tv-show-a-statistical-analysis)
- [Collider — Netflix Binge Scale (devoured vs savored)](https://collider.com/netflix-binge-scale-tv-series/)
- [Netflix Tech Blog — Recommending for Long-Term Member Satisfaction](https://netflixtechblog.com/recommending-for-long-term-member-satisfaction-at-netflix-ac15cada49ef)
- [Music Industry Blog — playlist economics / lean-back](https://musicindustryblog.wordpress.com/tag/playlist-economics/)
- [Music Insights — Active vs Passive streams](https://help.musicinsights.com/hc/en-us/articles/360007993973-What-are-Active-and-Passive-streams)
- [Music Tomorrow — Spotify recommendation guide (taste profile, lean-back)](https://www.music-tomorrow.com/blog/how-spotify-recommendation-system-works-complete-guide)
- [SaaSFactor — Why users drop off during onboarding (Baymard synthesis)](https://www.saasfactor.co/blogs/why-users-drop-off-during-onboarding-and-how-to-fix-it)
- [Form QR Code Generator — 133 form statistics](https://www.form-qr-code-generator.com/blog/online-form-statistics-facts/)
- [Andrew Swan Law — Data minimisation under GDPR](https://www.andrewswanlaw.co.uk/post/data-minimisation-a-core-principle-of-gdpr)
- [Secure Privacy — Personalization without privacy violations](https://secureprivacy.ai/blog/personalization-privacy-compliance)

# Signal: Medium balance preference (% anime vs TV vs film)

**Currently collected:** No
**Recommended tier:** DON'T-ASK (derive from anchor picks instead)

## What it is

Medium balance preference is a per-user prior over the three media HelpME2C spans:
anime, live-action TV, and film. The hypothesised collection method is an explicit
onboarding question — either a category-fluency probe ("do you watch anime?
yes / no / sometimes") or a slider ("what's your rough mix?"). The intended use is
to bias scoring toward the user's preferred medium and to avoid surfacing, say,
heavy anime to a user who doesn't recognise the category. Since cross-medium is
one of HelpME2C's two stated moats (per PROJECT.md), how this prior is acquired
is product-defining, not just an ergonomic choice.

## Predictive value (literature / industry)

Cross-domain recommender research is unambiguous that a medium prior is useful —
domains with high genre / latent-factor overlap (movies–books, movies–TV, anime–manga)
transfer preference signal well, and explicit cross-domain weighting improves
sparsity-cold-start performance. Berkovsky and Cantador's cross-domain RS survey
documents that movies are paired with books in 33% of cross-domain studies, with
music in 19%, and with TV in 7%, suggesting practitioners routinely treat medium
as a useful axis ([Berkovsky et al. — Cross-Domain Recommender Systems,
Springer 2015](https://shlomo-berkovsky.github.io/files/pdf/Springer15a.pdf),
[Cantador et al. — Cross-domain RS state of the art](http://arantxa.ii.uam.es/~cantador%20/doc/2012/ceri12a.pdf),
[Improving RS Performance with Cross-domain: Anime and Manga Domains](https://www.researchgate.net/publication/365463261_Improving_Recommender_Systems_Performance_with_Cross-domain_Scenario_Anime_and_Manga_Domain_Studies)).
The question is not whether the prior is useful — it is — but how to obtain it.

The strongest argument against asking is that the prior is fully reconstructible
from anchor picks. If five of six picks are anime, the prior is anime-heavy; if
two are anime, two are prestige TV, two are arthouse film, the prior is balanced.
This is a derived signal in the strict sense Wouter's brief calls out: the user
is already doing the work of revealing the prior by picking titles. Asking on top
collects the same signal twice, less reliably the second time. Netflix's
progressive-profiling philosophy makes exactly this trade — behavioural data
collection over explicit questioning, with initial picks superseded by viewing
behaviour as soon as it accumulates
([Music Tomorrow — Spotify / Netflix recommendation guide](https://www.music-tomorrow.com/blog/how-spotify-recommendation-system-works-complete-guide),
[Monks Tech — Netflix onboarding lessons](https://www.monkstechservices.com/insights/user-onboarding-process)).

The category-fluency framing deserves explicit attention. Asking "do you watch
anime?" presupposes the user holds "anime" as a category at the same granularity
HelpME2C does. Anime is not a genre — it spans Studio Ghibli children's films,
seinen psychological thrillers, shonen action, slice-of-life, and adult animation —
and a sceptical answer ("not really") often means "I haven't seen one I'd seek
out" rather than "I would dislike Spirited Away or Your Name". Netflix's disclosure
that 50% of its global users regularly watch anime
([Variety — Sony / Crunchyroll strategy](https://variety.com/2022/digital/news/crunchyroll-sony-funimation-anime-streaming-strategy-1235207122/amp))
is informative here: many users who would not self-identify as "anime watchers"
nonetheless consume anime. A category-fluency probe in onboarding both
under-captures these users and reinforces the very dichotomy ("anime vs TV") that
HelpME2C is trying to dissolve. This is the deepest reason to derive rather than
ask: the question itself imposes a worldview the product is built to refuse.

Industry case studies on the anime side support the same conclusion. Crunchyroll
(now consolidated with Funimation under Sony) does not ask new users an upfront
medium probe — onboarding centres on a discoverability quiz that surfaces
recommendations from genre selections, not a category-membership question
([Crunchyroll signup](https://www.crunchyroll.com/pages/sign-up/),
[Crunchyroll quiz / Play Store editorial](https://play.google.com/store/apps/editorial?id=mc_apps_editorial_trending_crunchyroll_quiz_fcp&hl=en_US)).
AniList and MAL, both anime-only platforms, skip the question entirely because
the platform itself is the answer ([Achriom — anime tracker comparison](https://www.achriom.com/blog/best-anime-tracking-apps/)).
Across general streaming, Netflix's "pick three" early-preferences flow
([UserOnboarding.Academy — Netflix signup onboarding](https://useronboarding.academy/user-onboarding-inspirations/netflix-signup-onboarding))
elicits the medium prior implicitly through the titles chosen, never explicitly.
The convergent pattern: no major streaming or tracker product asks a medium
question, and the anime-specific products explicitly use derived signals.

## GDPR / consent cost

Medium preference is low-sensitivity personal data. It is not special-category
under Article 9 and the consent burden is light. However, under data minimisation
(Article 5(1)(c)) the bar is necessity, not "useful in theory"
([Andrew Swan Law — Data minimisation under GDPR](https://www.andrewswanlaw.co.uk/post/data-minimisation-a-core-principle-of-gdpr)).
If the prior is fully derivable from anchor picks the user already submits, the
explicit question fails the necessity test — collecting a second time data that
can be inferred from the first violates minimisation in spirit even when the
sensitivity is low. Best-practice posture is staged / just-in-time consent and
progressive disclosure ([Secure Privacy — Personalization without privacy violations](https://secureprivacy.ai/blog/personalization-privacy-compliance)).

## UX / drop-off cost

The signup form-length literature is consistent: each added field reduces
completion by 3–5%, and HubSpot's classic 11→4 field reduction increased
conversion by 120% ([SaaSFactor — onboarding drop-off](https://www.saasfactor.co/blogs/why-users-drop-off-during-onboarding-and-how-to-fix-it)).
HelpME2C's onboarding success metric (4/5 rating with 5–10 likes) already places
weight on the anchor-pick step. A medium question on top is direct deadweight if
the same signal can be derived.

The harder UX cost is qualitative. A "do you watch anime?" question early in
signup risks coding the product as anime-first to users who answer yes (raising
expectations the cross-medium scoring won't reliably meet) and as anime-optional
to users who answer no (training them to expect anime suppression they may not
actually want). For the "anime fan with non-anime partner" archetype specifically,
the question is actively misleading — the right answer for them is "yes for me,
sometimes for us together" and no single-user toggle captures that.

## Path into scoring

Phase 1A scoring is rule-based over anchor picks plus rated titles. The derived
path is mechanically straightforward: compute the medium distribution of the
user's anchor picks (e.g. 4 anime, 1 film, 1 TV → {anime: 0.67, film: 0.17,
tv: 0.17}), then use that vector as a multiplicative weight on candidate scores
by medium. This is deterministic, debuggable, and aligns exactly with the
constraint that signals must have a deterministic path into rule-based scoring.

If the explicit signal were asked, the path is structurally identical — the
weight vector just comes from a slider instead of a count. The choice between
them is a quality-of-input question, and the derived signal wins on three counts:
(1) it costs no extra UX and no extra consent surface; (2) it reflects what the
user actually wants to watch, not what they think they want to watch; (3) it
updates organically as the user rates more titles, where the asked signal goes
stale unless re-prompted.

There is a real edge case worth flagging: users with strongly cross-medium taste
(the central archetype HelpME2C is built for) may pick a balanced anchor set
and the derived prior will be ~uniform — exactly the right answer for them.
Asked-priors, by contrast, force them to commit to a mix they may not have a
prior on. The derived path handles the moat case correctly; the asked path
fights it.

## Tier justification

**Recommended: DON'T-ASK** — derive from anchor-pick medium distribution instead.
Cross-medium scoring is a moat (per PROJECT.md), so the prior is essential, but
the prior is already present in the anchor picks. Explicitly asking "do you watch
anime?" presupposes the user-as-category-member framing that HelpME2C is built to
dissolve, costs onboarding completion, and adds a redundant data-collection
surface that fails GDPR data-minimisation in spirit. Industry confirms: Netflix's
"pick three" derives the prior implicitly; Crunchyroll's quiz works at the genre
level, not the medium level; AniList / MAL don't ask because their platform is
the answer. Compute the derived prior in `packages/ml/src/recommendation.ts` as a
medium-distribution weight vector over anchor picks; revisit only if testing on
the 10-tester cohort shows the derived prior is systematically wrong for one of
the four target archetypes (most plausibly the "anime fan with non-anime partner"
case, where the partner's prior may be invisible to the picker).

## Sources

- [Berkovsky et al. — Cross-Domain Recommender Systems (Springer 2015)](https://shlomo-berkovsky.github.io/files/pdf/Springer15a.pdf)
- [Cantador et al. — Cross-domain recommender systems: A survey of the state of the art](http://arantxa.ii.uam.es/~cantador%20/doc/2012/ceri12a.pdf)
- [Improving Recommender Systems Performance with Cross-domain Scenario: Anime and Manga Domain Studies (ResearchGate)](https://www.researchgate.net/publication/365463261_Improving_Recommender_Systems_Performance_with_Cross-domain_Scenario_Anime_and_Manga_Domain_Studies)
- [Variety — Sony / Crunchyroll anime streaming strategy (50% Netflix users watch anime)](https://variety.com/2022/digital/news/crunchyroll-sony-funimation-anime-streaming-strategy-1235207122/amp)
- [Crunchyroll signup page](https://www.crunchyroll.com/pages/sign-up/)
- [Crunchyroll "Which anime genre is right for you?" quiz (Play Store editorial)](https://play.google.com/store/apps/editorial?id=mc_apps_editorial_trending_crunchyroll_quiz_fcp&hl=en_US)
- [Achriom — Best anime tracking apps 2026 (AniList vs MAL onboarding)](https://www.achriom.com/blog/best-anime-tracking-apps/)
- [Music Tomorrow — Spotify / Netflix recommendation system guide (progressive profiling)](https://www.music-tomorrow.com/blog/how-spotify-recommendation-system-works-complete-guide)
- [Monks Tech Services — Netflix user onboarding conversion lessons](https://www.monkstechservices.com/insights/user-onboarding-process)
- [UserOnboarding.Academy — Netflix signup onboarding ("pick three")](https://useronboarding.academy/user-onboarding-inspirations/netflix-signup-onboarding)
- [SaaSFactor — Why users drop off during onboarding (Baymard synthesis)](https://www.saasfactor.co/blogs/why-users-drop-off-during-onboarding-and-how-to-fix-it)
- [Andrew Swan Law — Data minimisation under GDPR](https://www.andrewswanlaw.co.uk/post/data-minimisation-a-core-principle-of-gdpr)
- [Secure Privacy — Personalization without privacy violations](https://secureprivacy.ai/blog/personalization-privacy-compliance)
- [Wikipedia — Cold start (recommender systems)](https://en.wikipedia.org/wiki/Cold_start_(recommender_systems))
- [MDPI — Eliciting Auxiliary Information for Cold Start User Recommendation: A Survey](https://www.mdpi.com/2076-3417/11/20/9608)

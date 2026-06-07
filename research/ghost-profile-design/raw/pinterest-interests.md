# Pinterest's "Pick 5" Interests Onboarding — Cold-Start Reference Pattern

Research date: 2026-05-17. Context: HelpME2C ghost-profile design — Pinterest's topic picker is the canonical reference for "bootstrap a recommendation profile from a small, finite set of picks."

## 1. Approach

Pinterest asks brand-new users — before any browsing data exists — to **select a minimum number of topics** from a curated pool. The picker is presented as a tiled grid of visually rich topic cards (each backed by a representative pin image), and the user must select **at least five** before the "Done" button activates. Topic picks immediately seed the home feed, so the user lands on personalized content in the first session ([Casey Winters / Appcues writeup](https://www.appcues.com/blog/casey-winters-pinterest-user-onboarding); [Casey Winters via Medium](https://medium.com/appcues/casey-winters-reveals-how-pinterest-perfected-user-onboarding-639fcc7486d7); [Mobbin screenshot capture](https://mobbin.com/explore/flows/792ba540-b695-43d6-8fcc-28bc3fe9b6c0)).

This is the pattern that crystallised circa 2013-2015 under Casey Winters and the activation team, and which "hundreds of experiments" iterated on ([Appcues](https://www.appcues.com/blog/casey-winters-pinterest-user-onboarding)). It is the canonical industry reference for cold-start onboarding — Netflix, Spotify, Twitter and Quora all adopted topic/entity pickers in the same window.

## 2. Signal set — exact mechanics

- **Minimum picks:** ≥5 topics; the CTA stays disabled until met ([Pinterest UI capture, UI Sources via screensdesign.com](https://uisources.com/explainer/pinterest-login)).
- **Pool size at picker time:** ~30-50 top-level tiles shown initially; user can scroll/expand for more. Pinterest's current top-level *taxonomy* is ~21 verticals like "Women's Fashion" and "DIY and Crafts" but the picker historically displayed a denser tile grid drawn from popular sub-interests ([Pinterest Engineering — Interest Taxonomy](https://medium.com/pinterest-engineering/interest-taxonomy-a-knowledge-graph-management-system-for-content-understanding-at-pinterest-a6ae75c203fd); [PinTalk on Pinterest categories](https://www.pintalk.net/all-pinterest-categories/)).
- **Presentation:** each topic is a visual card with a pin-derived image — *not* a text checkbox. This is load-bearing for Pinterest specifically (visual product) but the principle generalises: showing concrete *exemplars* under each topic raises pick accuracy.
- **Paired signals:** the picker is combined with browser-derived locale to localise the initial feed ([Appcues](https://www.appcues.com/blog/casey-winters-pinterest-user-onboarding)).

## 3. Inference mechanism

The full system is described across Pinterest's engineering posts. The picker output feeds three mapping systems ([Interest Taxonomy](https://medium.com/pinterest-engineering/interest-taxonomy-a-knowledge-graph-management-system-for-content-understanding-at-pinterest-a6ae75c203fd)):

- **Pin2Interest (P2I):** every pin is mapped to taxonomy nodes via text descriptions, board titles, visual embeddings, and NLP. Coverage: "more than 99% of the Pins" map to ≥1 category; >200B pins mapped.
- **User2Interest (U2I):** a user-interest vector is built from the pins they engage with. At signup, the picker's 5+ selections become the initial U2I seed; subsequent clicks/saves/skips update it via a daily batch job ("over 35 Hadoop jobs") ([Pinterest Engineering — Building the Interests Platform](https://medium.com/@Pinterest_Engineering/building-the-interests-platform-73a3a3755c21)).
- **Query2Interest (Q2I):** maps search to the same taxonomy nodes, closing the loop.

Mathematically: the early system was a **propagation model** — each picked topic activates a set of pins (via P2I), which are then candidates for the home feed. As the user engages, U2I converges from the discrete seed picks toward a dense weighted vector. Modern Pinterest is embedding-first (PinSage and successors), but the picker still seeds the same vector for new accounts ([NVIDIA blog on Pinterest recsys](https://developer.nvidia.com/blog/pinterest-uses-ai-to-enhance-its-recommendations-system/)).

## 4. Validation results

- **+5-10% activation lift** abroad from the localised-picker experiment combining interests + browser locale ([Appcues / Casey Winters](https://www.appcues.com/blog/casey-winters-pinterest-user-onboarding)). This is the disclosed number that gets repeatedly cited in growth-PM literature.
- Casey's qualitative framing: "you really need to accomplish showing the main value in the first session. Or else there's no guarantee there will be a next session" — the picker exists to make the *first* feed non-empty and non-generic ([Appcues](https://www.appcues.com/blog/casey-winters-pinterest-user-onboarding)).
- Pinterest's broader cold-start work (Pixie + freshness pipeline) increased Related Pins freshness by 1,400% with neutral engagement — relevant for the parallel "cold-start of content" problem ([Pinterest Engineering — Pixie update](https://medium.com/pinterest-engineering/an-update-on-pixie-pinterests-recommendation-system-6f273f737e1b)).

## 5. Failure modes

- **Picker-pool seeding (cold-start of cold-start).** Someone has to curate the initial tile pool with broadly-appealing options or sparse-taste users see nothing they like. Pinterest's pool is derived from popular pins, which creates a "popular by default" bias — niche users get a worse first experience.
- **Shallow signal.** Picking "Fashion" is low-information: it disambiguates almost nothing. Information-theory framing: each pick should *maximally split* the user-cluster space. Pinterest mitigates this by sub-categorising as the user engages, but the initial picks are blunt.
- **Aspirational lying.** Users pick what they *want* to be into, not what they are into. ("I'll pick Cooking even though I order takeout.") This is well-documented across cold-start systems and one reason Spotify shifts away from onboarding signals within ~weeks ([Spotify Research — Generalized user representations](https://research.atspotify.com/2025/9/generalized-user-representations-for-large-scale-recommendations)).
- **Choice overload.** Netflix discovered early that "providing too many options would lead users to abandon the sign-up process" — they simplified the genre-feedback step accordingly ([Gibson Biddle — Brief History of Netflix Personalization](https://gibsonbiddle.medium.com/a-brief-history-of-netflix-personalization-1f2debf010a1)).

## 6. Analogues

- **Spotify** — pick favourite artists/genres at signup; without these, performance on onboarding-aligned clusters drops 13.8%; signals decay over weeks as behavioural data accumulates ([Spotify Research](https://research.atspotify.com/2025/9/generalized-user-representations-for-large-scale-recommendations); [Medium deep-dive on Spotify onboarding](https://medium.com/@smarthvasdev/deep-dive-into-spotifys-user-onboarding-experience-f2eefb8619d6)).
- **Netflix (2014-era)** — "pick 3 shows you like" after signup; explicitly framed as a seed for the recommendation engine, with later refinement via rating + watch behaviour ([Netflix Help](https://help.netflix.com/en/node/100639); [Gibson Biddle](https://gibsonbiddle.medium.com/a-brief-history-of-netflix-personalization-1f2debf010a1)).
- **Twitter** — optional topic-following + mandatory "follow at least one account" at signup; cold-start recommendations generated near-real-time as picks land ([X Help on Topics](https://help.x.com/en/using-x/follow-and-unfollow-topics); [Social Media Today on Topics launch](https://www.socialmediatoday.com/news/twitter-launches-new-option-to-follow-specific-topics-in-addition-to-user/566772/)).
- **Quora** — "follow 9 more topics" framed as ongoing activation prompts, not just one-shot signup ([Ameya Kulkarni — Quora onboarding analysis](https://ameyakulkarni.com/2016/02/10/how-could-quora-improve-their-onboarding-flow/)).
- **LinkedIn** — industry + role pickers at signup serve the same cold-start role; less openly documented.

## 7. Relevance to ghost-profile design

The Pinterest picker is the closest mainstream pattern to what HelpME2C needs for the partner-ghost-profile UX. The relevant transfers:

1. **A small finite set of high-signal picks beats a long free-text questionnaire.** 3-5 picks from a 30-60 item curated pool of *themes/genres/vibes* would give us a usable initial vector for the ghost profile. The picker pool design is the real work — it must be expressive enough to distinguish typical taste clusters but small enough to scan in <30s. Information-theory framing: pre-compute the *separability* of each candidate theme on the existing registered-user corpus, then pick the 30-60 themes that maximally partition the population.
2. **Visual exemplars matter.** Pinterest succeeds partly because each tile is a *concrete pin*, not an abstract word. For a TV+anime ghost profile, the analogous move is showing a small poster/still/clip per theme — the picker is "Pick 3-5 vibes your partner is into" with each tile being e.g. "Cozy small-town mystery" backed by a Murder, She Wrote still next to a Midsomer Murders still.

Caveat for the ghost case specifically: Pinterest assumes the *picker is the picked-for*. Our user is picking *for someone else*, which adds two problems Pinterest doesn't have: (a) the registered user's mental model of their partner is noisy, so we should expect higher aspirational/idealising bias than in self-onboarding; (b) the partner has no agency to correct it. Both argue for a smaller, more confident initial vector (3 picks not 5) plus an explicit "tell me if I got your partner wrong" feedback loop in the first co-watch session.

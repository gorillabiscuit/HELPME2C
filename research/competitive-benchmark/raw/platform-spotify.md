# Platform benchmark: Spotify

Reference point for HelpME2C as the **canonical cold-start parallel**.
Spotify's "tap 3+ artists you like" onboarding is the most-imitated
preference-elicitation pattern in consumer recommendation, and HelpME2C faces
the structurally identical problem in a different domain (TV + anime instead
of music).

Time range bias: industry sources from 2022 onward; academic papers no time
limit (the foundational BaRT paper is from RecSys 2018 and remains the best
single description of Spotify's exploration-exploitation framing).

---

## 1. Signup signals

Spotify's free-account signup is heavier than Netflix's. Captured fields
include:

1. Email or phone (or Facebook / Apple / Google SSO).
2. Password.
3. **Date of birth.**
4. **Gender** (with non-binary options).
5. Display name.
6. Marketing-consent checkboxes (regional).
7. Then the taste-onboarding flow (see §2): language/genre tap, then
   3+ artists.

Sources for the screen sequence:
- [Smarth Vasdev — Deep-dive into Spotify's User Onboarding Experience](https://medium.com/@smarthvasdev/deep-dive-into-spotifys-user-onboarding-experience-f2eefb8619d6)
- [Mobbin — Spotify iOS Onboarding Flow](https://mobbin.com/explore/flows/2ca9968b-a50d-4910-89e7-e894023d7d21)
- [Page Flows — Spotify iOS Onboarding](https://pageflows.com/post/ios/onboarding/spotify/)

What Spotify explicitly collects vs Netflix:

- **Demographics up-front** (age + gender) where Netflix collects none.
  These feed cold-start personalisation and ads targeting.
- **Language preference** as an explicit selection during onboarding.
- **No payment capture for free tier** — Premium upsell appears later in
  the flow (the Smarth Vasdev write-up notes a Premium prompt before first
  playback).
- **Account linking** is offered (Facebook / Apple / Google) but not
  required, and Spotify does not request access to other media services'
  data at signup.
- **Followed creators** — once the user picks artists, Spotify treats those
  as a *follow* relationship that persists and updates the social graph.
  ([Spotify — Understanding recommendations](https://www.spotify.com/us/safetyandprivacy/understanding-recommendations)
  lists "general location, device type, language, age, and followed
  creators" among the signals that shape recommendations.)

---

## 2. Cold-start UX — the most important section

The Spotify taste-onboarding screen is the most-imitated cold-start UX in
consumer software. It is a colourful grid of artist photos with the prompt
**"Choose 3 or more artists if you like"**
([Smarth Vasdev — Deep-dive](https://medium.com/@smarthvasdev/deep-dive-into-spotifys-user-onboarding-experience-f2eefb8619d6)).

### The flow, screen by screen

1. **Language / genre prompt.** *"What music do you like?"* — typically
   10 visible language or genre chips, with more available behind a "show
   more" affordance.
2. **Artist picker.** *"Choose 3 or more artists."* The grid is
   dynamic — the artists shown adapt to the genre/language tap from
   step 1, plus regional popularity. Each tile is a circular artist photo
   plus name. There's a "Done" CTA that activates at 3 picks. The supply
   of artists is semi-endless (scrollable list refreshed by genre).
3. **Premium upsell** (regional / cohort-dependent).
4. First "Home" feed loads, dominated by playlists derived from the picks
   (Made For You section seeded from the picks before any listening
   history exists).

### Why artists, not songs

Two reasons, both consistent with the public Spotify Research literature:

- **Artists are higher-information units.** A single artist tap implies a
  cluster of dozens to hundreds of tracks, lifting the signal-to-noise
  ratio of a binary tap massively above a per-song tap. The
  [Generalized User Representations paper](https://research.atspotify.com/2025/9/generalized-user-representations-for-large-scale-recommendations)
  explicitly lists *"selected artists, genres, or languages"* as the
  onboarding signals fed into the same embedding pipeline as established
  users' behavioural signals: *"As behavioral data accumulates, the
  system gradually shifts from onboarding-based features to
  behavior-driven signals, ensuring a smooth transition from cold-start
  to fully personalized experiences."*
- **Artist recognition is faster than song recognition.** Photo +
  name = instant recognition; a song title alone often isn't. This is a
  UX choice in service of completion-rate.

### Why "3 or more"

3 is the minimum that empirically unlocks a non-degenerate first
recommendation. Spotify Research's
[Generalized user representations](https://research.atspotify.com/2025/9/generalized-user-representations-for-large-scale-recommendations)
post quantifies the value: removing onboarding signals *"resulted in a
13.8% drop in recommendation quality metrics on onboarding-aligned
clusters"* — i.e., onboarding signals continue to matter measurably even
after users have generated behavioural data.

### What the cold-start system actually does with the picks

From the same Spotify Research post (which is the most explicit public
description as of 2025):

> *"New users present a unique challenge: without listening history,
> embeddings risk being empty or uninformative."*

> *"The framework uses onboarding signals, such as selected artists,
> genres, or languages, [encoded] using the same embedding pipeline as
> established users."*

In other words: cold-start is solved by **forcing the user into the same
embedding space as everyone else**, using artist picks as a thin proxy for
listening history. The implication for HelpME2C is direct: if our
title-and-theme picker can map a new user into the same embedding space
as an established user, we get usable recs from the first session.

### Other relevant context

- [Spotify — Understanding recommendations](https://www.spotify.com/us/safetyandprivacy/understanding-recommendations)
  is the official user-facing disclosure of which signals power recs.
- [Ahmad Kabir — How Spotify Onboards New Users (And What I'd Improve as a PM)](https://medium.com/@TheAhmadkabir/how-spotify-onboards-new-users-and-what-id-improve-as-a-pm-c05b4eb318df)
  is a PM-perspective teardown.

---

## 3. Group-recommendation feature

**Spotify has built explicit group rec, twice.** This is the most
operationally relevant comparison for HelpME2C.

### Blend (2021)

Two-user shared playlist that updates daily. Each Blend has a **"taste
match" percentage** indicating overlap.

How the two tastes are combined (per public sources, no full algorithm
disclosure):

- The algorithm analyses both users' listening history (artists, genres,
  playlists, podcasts), identifies *"common ground as well as unique
  tastes of each person,"* and outputs a single playlist that *"reflects
  the overlap and the individual preferences"*
  ([Followeran — What is Spotify Blend](https://followeran.com/en/blog/what-is-spotify-blend/)).
- The taste-match score is computed from common artists, genre overlap,
  and song play counts.
- Originally 2 users; later extended to up to 10 users in a single Blend
  ([Spotify Community — How does Spotify Blend affect my own algorithm?](https://community.spotify.com/t5/Content-Questions/How-does-Spotify-Blend-affect-my-own-algorithm/td-p/5502631),
  [Scotsman — Spotify Blend explainer](https://www.scotsman.com/lifestyle/tech/spotify-blend-what-is-spotify-blend-and-how-to-make-a-spotify-blend-playlist-with-your-friends-3743295)).

From the Spotify newsroom launch
([2021-08-31](https://newsroom.spotify.com/2021-08-31/how-spotifys-newest-personalized-experience-blend-creates-a-playlist-for-you-and-your-bestie/)),
Product Manager Arjun Narayen: *"Blend is one of the first products we've
developed that requires multiuser personalization, which has unique
challenges."* The launch post is light on algorithmic detail — Spotify
publishes BaRT-style papers but not Blend-specific ones.

### Jam (2023)

Real-time collaborative listening session. Up to ~32 participants
(varies by source; Spotify's launch post does not commit to a maximum).
The official launch post
([Spotify Newsroom 2023-09-26](https://newsroom.spotify.com/2023-09-26/spotify-jam-personalized-collaborative-listening-session-free-premium-users/)):

> *"a personalized, real-time listening session for your group to tune
> into together"*

> *"finds the overlaps in your listening preferences"*

> *"music recommendations that everyone will love"*

Algorithmic mechanics from the launch post and third-party explainers:

- Recommendations are generated *"based on every group member's musical
  tastes and songs they've manually added thus far"*
  ([Slashgear — Spotify Jam Explained](https://www.slashgear.com/1404992/spotify-jam-session-explained-how-to-use/)).
- "Group recommendations" is a labelled section in the add-songs UI.
- Premium users can start a Jam; both free and Premium users can join.
- *"Combines [social features] with our personalization technology"* —
  but the post is careful not to specify whether it's intersection,
  union, weighted average, or something more elaborate.

### Implication for HelpME2C

Spotify discloses the *outcome* of multi-user personalisation (taste
match %, "group recommendations" section) but **not the aggregation
function**. Whether they use centroid-of-embeddings, intersection of
top-K, weighted re-ranking, or pairwise least-misery is opaque. This is
the algorithmic territory HelpME2C is operating in — and the
state-of-the-art public art at Spotify is "we did it, here's the surface,
here's the disclosure, the maths is not described in detail."

The PM quote — *"Blend is one of the first products we've developed that
requires multiuser personalization, which has unique challenges"* — is
itself useful framing: the largest music platform on earth treats
group rec as a hard, distinct problem from single-user rec.

---

## 4. Cross-medium / cross-domain

Spotify spans **music + podcasts + audiobooks**, all "audio." Cross-domain
recommendation is an active research area and the closest precedent to
HelpME2C's cross-medium ambition.

### Cross-domain podcast recommendation from music history

The most directly relevant paper:

**Nazari, Chandar, Mehrotra, Bouchard, Lalmas — "Recommending Podcasts
for Cold-Start Users Based on Music Listening and Taste"**
([arXiv 2007.13287](https://arxiv.org/pdf/2007.13287)). Studies how to
bootstrap podcast recommendations for users with no podcast listening
history, using only their music listening history. Direct analogue of
HelpME2C's "bootstrap anime recs from TV-watching history" problem.

Additional academic exploration: [Hofmaier 2024 TU Wien thesis —
Exploration of Content-Based Cross-Domain Podcast Recommender Systems](https://repositum.tuwien.at/bitstream/20.500.12708/205267/1/Hofmaier%20Matthias%20-%202024%20-%20Exploration%20of%20content-based%20cross-domain%20podcast...pdf).

### Official disclosure on cross-domain

From [Spotify — Understanding recommendations](https://www.spotify.com/us/safetyandprivacy/understanding-recommendations),
under "Content Characteristics":

> *"Genre, release date, and category help identify similar content"*

This is the explicit acknowledgement that podcasts and music share a
recommendation surface. Third-party explainers note that *"if a podcast
is popular with listeners of your favorite musician, Spotify might
recommend that podcast to you"* and that *"if you listen to a podcast
episode which has a guest who has written a book, the system might
recommend the guest's book to you"*
([Music-Tomorrow — Inside Spotify's Recommendation System](https://www.music-tomorrow.com/blog/how-spotify-recommendation-system-works-complete-guide)).

### How they do it (high-level)

The 2025 [Generalized User Representations](https://research.atspotify.com/2025/9/generalized-user-representations-for-large-scale-recommendations)
post is the strongest public hint: an autoencoder compresses
*"multi-modal, multi-timescale signals"* into a single user vector;
downstream task heads (music recs, podcast recs, search, generation)
apply *"lightweight heads"* on top. Same user vector, different heads —
which is structurally how cross-domain works at Spotify scale.

For HelpME2C: this is the exact pattern we want. One user-embedding
trained on TV-watching signals; separate retrieval heads for anime and
TV; theme-overlap as a shared interpretable layer over the two heads.

---

## 5. Recommendation algorithm

Spotify publishes extensively on engineering.atspotify.com and
research.atspotify.com. Highlights:

### Discover Weekly (2015) — the breakthrough

Launched July 2015 by Matt Ogle's team
([musically.com 2016-03-21 — Matt Ogle interview](https://musically.com/2016/03/21/matt-ogle-discover-weekly-spotify/),
[Quartz 2015-12 — "The magic that makes Discover Weekly so damn good"](https://qz.com/571007/the-magic-that-makes-spotifys-discover-weekly-playlists-so-damn-good)).
First year: **40M+ users, ~5B streams.** In its first 10 weeks: ~1B
plays, $7M paid in royalties.

The three-model recipe (well-documented across many secondary sources):

1. **Collaborative filtering.** Implicit and explicit signals across the
   user base; the engine for "people who play A also play B."
2. **NLP over text.** Web crawls of blogs, news, reviews to extract
   descriptive language used about each track/artist (energetic,
   workout, melancholy, etc.). This came from
   [The Echo Nest](https://en.wikipedia.org/wiki/The_Echo_Nest)
   (acquired March 2014).
3. **Audio analysis** via convolutional neural networks: tempo, key,
   loudness, danceability, instrumentalness. Important because it
   counters the popularity bias of (1) and (2) — long-tail and new
   tracks have audio features even with no streams or text.

### BaRT — Bandits for Recommendations as Treatments

**McInerney, Lacker, Hansen, Higley, Bouchard, Gruson, Mehrotra —
"Explore, Exploit, and Explain: Personalizing Explainable
Recommendations with Bandits"**, RecSys 2018
([ACM DOI 10.1145/3240323.3240354](https://dl.acm.org/doi/10.1145/3240323.3240354),
[Spotify Research listing](https://research.atspotify.com/publications/explore-exploit-explain-personalizing-explainable-recommendations-with-bandits),
[author's blog](https://jamesmc.com/blog/2018/10/1/explore-exploit-explain),
[PDF](https://static1.squarespace.com/static/5ae0d0b48ab7227d232c2bea/t/5ba849e3c83025fa56814f45/1537755637453/BartRecSys.pdf)).

This is the single most-cited Spotify recsys paper. Contextual
bandit framework that:

- Jointly learns *which recommendations* each user responds to,
- *Which explanations* ("because you liked X") each user responds to,
- And balances **exploration** (gather information about uncertain
  items) vs **exploitation** (recommend known-good items) via
  epsilon-greedy-like strategies.

Directly relevant to HelpME2C: HelpME2C's "what do we surface to a brand-new
user, given we know nothing" is the contextual bandit cold-start problem.
BaRT is the canonical industrial example.

### Homepage personalization

**Semerci, Gruson, Bouchard et al. — "Homepage Personalization at Spotify"**,
RecSys 2019
([ACM DOI 10.1145/3298689.3346977](https://dl.acm.org/doi/10.1145/3298689.3346977)).
Describes the multi-armed bandit framework that picks which shelves
appear on the home page and in what order, and counterfactual training
to evaluate new algorithms without always running fresh A/B tests.

### Annoy and Voyager — the ANN substrate

[**Annoy**](https://github.com/spotify/annoy) (2013) — Spotify's
open-sourced approximate-nearest-neighbour library, the basis for "find
me tracks near this user's location in embedding space" lookups for
millions of users × tens of millions of tracks.

[**Voyager**](https://engineering.atspotify.com/2023/10/introducing-voyager-spotifys-new-nearest-neighbor-search-library)
(October 2023) — the HNSW-based successor. From the engineering blog:
*"More than 10 times the speed of Annoy (at the same recall) or up to
50% more accuracy (at the same speed)"*, and *"Up to 4 times less memory
usage than Annoy."* Voyager powers *"features like Discover Weekly,
Home, and countless others."*

For HelpME2C scale we're nowhere near needing Voyager-class infra, but
the architectural pattern — pre-compute embeddings, store in an ANN
index, look up at request time — is the right starting target.

### AI DJ (2023)

Launched February 2023 ([Spotify Newsroom 2023-02-22](https://newsroom.spotify.com/2023-02-22/spotify-debuts-a-new-ai-dj-right-in-your-pocket/),
[behind-the-scenes 2023-03-08](https://newsroom.spotify.com/2023-03-08/spotify-new-personalized-ai-dj-how-it-works/)).
Combines three layers:

1. **Personalization stack** (the same one that powers Discover Weekly,
   Daily Mix, etc) for music selection.
2. **Generative AI** (OpenAI) for the spoken commentary script.
3. **AI voice** (Sonantic acquisition, 2022) modelled after Spotify's
   Xavier "X" Jernigan, for delivery.

VP of Personalization Ziad Sultan: *"combine state-of-the-art technology
with human passion and expertise."* Reported metric: *"On days when users
tune in, fans spend 25% of their listening time with DJ, and more than
half of first-time listeners come back to listen to DJ the very next
day."*

For HelpME2C: AI DJ is interesting as the model of "personalised
recommendation surface with *explainability narration*." HelpME2C's
"reason hint" surface is structurally similar.

### AI Playlist / Prompted Playlists (2024–2026)

Natural-language playlist generation. *"Get focused at work with
instrumental electronica"*, *"get pumped up with fun, upbeat, and
positive songs"*
([Spotify Newsroom 2024-04-07](https://newsroom.spotify.com/2024-04-07/spotify-premium-users-can-now-turn-any-idea-into-a-personalized-playlist-with-ai-playlist-in-beta/),
[TechCrunch 2026-01-22 — US/Canada rollout](https://techcrunch.com/2026/01/22/spotify-brings-ai-powered-prompted-playlists-to-the-u-s-and-canada/)).
The 2024 Wrapped layered an AI-generated "your year as a podcast" on top
of the same personalisation stack
([Spotify Newsroom 2024-12-04](https://newsroom.spotify.com/2024-12-04/your-spotify-wrapped-ai-podcast-is-here-to-help-you-reconnect-with-the-music-that-defined-your-year/)).

### RecSys 2025 portfolio

[Beyond the Next Track: Spotify Research at RecSys 2025](https://research.atspotify.com/2025/9/beyond-the-next-track-spotify-research-at-recsys-2025).
Eight papers spanning:

- *Calibrated Recommendations with Contextual Bandits* — content-type
  balance on the home page via bandits.
- *Generalized User Representations for Large-Scale Recommendation and
  Downstream Tasks* — see §4 and §2.
- *AudioBoost: Increasing Audiobook Retrievability in Search* —
  cold-start via synthetic query generation.
- *You Say Search, I Say Recs: A Scalable Agentic Approach to Query
  Understanding and Exploratory Search* — LLM router between search
  and rec.
- *Prompt-to-Slate: Diffusion Models for Prompt-Conditioned Slate
  Generation* — generative recommendation.
- *Semantic IDs for Joint Generative Search and Recommendation.*
- *Describe What You See with Multimodal LLMs for Video
  Recommendations.*
- *Evaluating Podcast Recommendations with Profile-Aware
  LLM-as-a-Judge.*

The portfolio shape says: Spotify in 2025 is heavily invested in
**LLM/generative recommendation, cold-start handling, and bandit-based
calibration** — all of which are directly relevant to HelpME2C.

---

## 6. Visible failure modes

Spotify's recommender is generally praised but the documented failure modes
are real and recur across years.

### "Same bad songs every week" — the algorithmic rut

The most-cited Discover Weekly complaint. Sample threads:

- [Spotify Community — Same (bad) songs keep appearing](https://community.spotify.com/t5/Content-Questions/Discover-Same-bad-songs-keep-appearing-in-my-recommendations/td-p/5538269)
- [Spotify Community — Discover Weekly Constantly Bad](https://community.spotify.com/t5/Desktop-Windows/Discover-Weekly-Constantly-Bad/td-p/4997143)
- [Spotify Community — Why are recommendations so terrible](https://community.spotify.com/t5/iOS-iPhone-iPad/Why-are-recommendations-so-terrible/td-p/4769866)
- [Spotify Community — Discover Weekly keeps giving me the same genre](https://community.spotify.com/t5/Your-Library/Discover-Weekly-keeps-giving-me-the-same-genre-that-I-m/td-p/5065068)

The pattern in the third-party analysis
([trending.fm — Why Spotify Plays Same Songs](https://trending.fm/blog/why-spotify-plays-same-songs/)):

> *"One study of long-time Spotify users found that the average listener
> heard the same ~70 unique tracks across 80% of their listening
> sessions — even though their library contained thousands of songs.
> This happens because every modern music app optimizes for one thing
> above all: finishing the session. Playing songs you'll definitely
> like (read: songs you've already heard) is the safest way to do
> that."*

This is the **exploitation-collapsing-out-exploration** failure mode
that BaRT was designed to mitigate but, in practice, optimising for
session-completion appears to push the system back toward exploitation.

### Difficulty in negative feedback

A recurring user complaint:

> *"the hide button reportedly not working effectively, with hidden
> songs and artists very likely appearing again the next week"*

> *"No proper mechanism in Spotify to dislike songs or artists, with
> music being entirely subjective yet the platform making it
> intentionally difficult for users to exclude content they don't
> like"*

(Sourced via aggregated community complaints; see the threads linked
above.)

### AI-generated music in algorithmic playlists

A 2024–2026 complaint:

- [Spotify Community — Half of the weekly playlists are filled with AI generated](https://community.spotify.com/t5/Music-Discussion/Half-of-the-weekly-playlists-are-filled-with-AI-generated/td-p/6288755)

User reports of "four AI-generated songs in the first five entries" of
Discover Weekly. Not a recommendation-algorithm failure per se but a
catalog-quality failure that the algorithm surfaces.

### Discovery Mode (commercial influence)

From Spotify's own
[Understanding recommendations](https://www.spotify.com/us/safetyandprivacy/understanding-recommendations)
disclosure:

> *"Discovery Mode allows artists/labels to prioritize songs for
> recommendation in exchange for commission charges, though this 'does
> not guarantee' placement and engagement is still monitored."*

This is the Spotify analogue of Netflix's "Originals get pushed" — a
business-logic conflict baked into the recommender. Worth knowing about
because it's the kind of commercial-bias HelpME2C should explicitly *not*
have in MVP, and the *absence* of it is a differentiator.

### General Hacker News critique

- [HN 25519067 — discussion of bad/great Spotify recs](https://news.ycombinator.com/item?id=25519067).
  Mixed sentiment; the recurring critique is the filter-bubble.
- [Yahoo / Insiders piece — "Spotify fans say it's going downhill. Company insiders agree."](https://www.yahoo.com/news/spotify-great-helping-discover-music-081001547.html)

---

## Notes for HelpME2C

- **3 picks is the universal cold-start number.** Both Spotify and Netflix
  converged on this independently. Use it.
- **Higher-information units beat per-item ticks.** Spotify picks *artists*
  (proxy for a cluster of songs), Netflix picks *titles* (single binary
  but rich). HelpME2C should pick **titles** for recognisability, then
  infer themes server-side — *not* ask users to tap themes directly at
  onboarding. Themes are the differentiator on the *output* surface, not
  the input surface.
- **Map onboarding picks into the same embedding space as established
  users.** This is the 2025 Spotify-Research best-practice
  ([Generalized User Representations](https://research.atspotify.com/2025/9/generalized-user-representations-for-large-scale-recommendations))
  and the most direct guidance available for HelpME2C's embedding pipeline.
- **Group rec is hard *and* opaque.** Spotify built it twice, ships it,
  but doesn't disclose the aggregation function. HelpME2C's ghost-profile
  + theme-overlap approach is operating in genuinely-unsolved territory.
- **Bandits-with-explanations is the right framing for "new title we want
  to test on you."** BaRT's joint learning of *recommendation* and
  *explanation* is directly relevant to HelpME2C's "reason hint" surface.
- **The filter-bubble failure mode is real even at Spotify.** Any
  HelpME2C design needs an explicit exploration knob; otherwise we will
  reproduce the "same 70 tracks across 80% of sessions" outcome with
  shows instead of songs.
- **Cross-domain (music → podcast) is the closest published parallel to
  cross-medium (TV → anime).** The arXiv 2007.13287 paper is the single
  most relevant prior work and worth a deep read.


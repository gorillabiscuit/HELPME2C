# "Describe a Non-User to Seed Their Profile" — Industry Prior Art

Research date: 2026-05-17. Context: HelpME2C ghost-profile inference. The core question — is there documented industry precedent for "the registered user describes a non-registered third party so we can build a recommendation profile for them"? The short answer below is: **almost not**, and that is itself the most useful finding.

## 1. Streaming services

All major SVOD platforms support **multiple profiles per account**, but every one I checked treats each profile as a self-driven cold-start surface: the *user of that profile* picks the initial preferences, not someone describing them.

- **Netflix.** Up to 5 profiles per account, each with its own taste-graph built from that profile's *own* ratings/watches. Netflix's documentation describes seeding from "a few TV shows or movies they love" — picked by whoever signs in to that profile, not by a household primary describing a co-viewer ([Netflix Help — How recommendations work](https://help.netflix.com/en/node/100639); [Gibson Biddle — Brief History of Netflix Personalization](https://gibsonbiddle.medium.com/a-brief-history-of-netflix-personalization-1f2debf010a1)). No "describe your partner" step is documented [as of 2026-05-17].
- **Hulu.** Kids profiles can be configured with a birthdate + gender, *or* the "Kids" toggle (which sets age-band filtering without any taste input). The parent supplies *demographic gating*, not a taste profile — the kid's recs build from their own clicks ([Hulu Help — Kids Profiles & Parental Controls](https://help.hulu.com/article/hulu-restrict-content)). Not a ghost profile.
- **Disney+.** Profiles support kid-mode + PIN protection. Personalisation is per-profile from in-profile behaviour; no "describe my child's taste" onboarding step documented ([Disney+ profile help](https://help.disneyplus.com/article/disneyplus-profiles); [Disney+ parental controls explainer](https://www.disneyplus.com/explore/articles/parental-controls-guide-disney-plus)).
- **HBO Max / Max.** Up to 5 profiles, age-rated filters, customisable avatars. Personalisation uses collaborative filtering + in-profile signals; no "describe a co-viewer" input ([HBO Max Help — Profiles](https://help.hbomax.com/us/Answer/Detail/000002539); [StreamingMedia on HBO Max personalisation](https://www.streamingmedia.com/Articles/Editorial/Short-Cuts/How-HBO-Max-Drives-Engagement-with-Personalization-145732.aspx)).
- **Amazon Prime Video.** Up to 6 profiles per account; each profile gets its own watchlist + recs from its own activity. No documented co-viewer / "describe another adult in the household" feature ([Amazon — Prime Video Profiles](https://www.amazon.com/gp/help/customer/display.html?nodeId=GEM24ZP4GX39MKU4)).
- **Apple TV+, Paramount+, Peacock.** All follow the same per-profile self-cold-start pattern. None documents a "describe a co-viewer" step [as of 2026-05-17].

**Verified absence:** searches for "streaming service describe your partner onboarding co-viewer profile" return zero documented product features matching the pattern. The closest streaming-adjacent move is *group-recommendation research papers* on profile merging (see §4 below) — but no consumer-facing product surfaces it.

## 2. Books / music

- **Goodreads.** Has a *gift guide* surface and lets you recommend a specific book to a friend with a freeform message, but the recipient must already be a Goodreads user — the recommendation rides on top of the *friend's existing* taste graph, not a constructed ghost profile ([Goodreads Help — Recommend to a Friend](https://help.goodreads.com/s/article/How-to-recommend-a-book-to-a-friend-1553870935350); [Goodreads Gift Guide blog post](https://www.goodreads.com/blog/show/751-goodreads-gift-guide-ultimate-friends-family-guide)). No "describe a reader who isn't on Goodreads, get a per-person recommendation engine" feature.
- **Spotify Blend.** *Combines two users' tastes* into a shared playlist — both must be Spotify users. The blend algorithm optimises for "relevance, coherence, equality, and democratic decisions" across common artists, genre overlap and play counts ([Spotify Engineering — Behind Blend](https://engineering.atspotify.com/2021/12/a-look-behind-blend-the-personalized-playlist-for-youand-you); [Spotify Newsroom — Blend launch](https://newsroom.spotify.com/2021-08-31/how-spotifys-newest-personalized-experience-blend-creates-a-playlist-for-you-and-your-bestie/); [Spotify Design — Blend social listening](https://spotify.design/article/spotify-blend-designing-for-a-social-listening-experience)). Blend is *taste fusion*, not ghost-profile inference — confirmed: both users are registered and have listening histories.

## 3. Gifting tools — the closest analogue

This is the only commercial space where "describe a non-user" is a *first-class* product surface. None of these tools build durable per-recipient profiles — they answer a one-shot question — but the *question-battery shape* is directly transferable.

- **WtfDoTheyWant.** Personality quiz about a recipient → ranked gift list; filters for price, NSFW, Prime ([WtfDoTheyWant](https://www.wtfdotheywant.com/); [MakeUseOf roundup](https://www.makeuseof.com/gift-recommendation-ideas-by-real-people-ai/)).
- **Outdone.** AI-driven series of recipient-questions (hobbies, dislikes, style) → curated gifts ([MakeUseOf roundup](https://www.makeuseof.com/gift-recommendation-ideas-by-real-people-ai/)).
- **Gretchen Rubin's Gift-Giving Quiz.** Eight short questions → "gift-appreciation profile" for the recipient ([Gretchen Rubin](https://gretchenrubin.com/articles/gift-giving-quiz/); [quiz page](https://gretchenrubin.com/quiz/the-gift-giving-quiz/)).
- **GiftWhisper, SmartGiftAI, GetPerfectGifts, Freudly Gift Finder.** All variations on the same recipe: 5-10 questions describing the recipient → ranked product list ([GiftWhisper](https://giftwhisper.ai/); [Smart Gift AI](https://smartgiftai.com/); [GetPerfectGifts](https://www.getperfectgifts.com/); [Freudly](https://freudly.ai/tests/gift-finder-quiz-blank/)).
- **Elfster.** Gift-exchange organiser around named recipients with wishlists — but the recipient supplies their *own* wishlist; not a "describe them" surface in the cold-start sense.
- **Buzzfeed-style "What gift for your dad" quizzes.** Pure marketing funnel; useful only as reference for question shape ([HowStuffWorks Father gift quiz](https://play.howstuffworks.com/quiz/what-to-gift-your-father-based-on-his-personality); [Toddler in Action — Dad quiz](https://toddlerinaction.com/the-ultimate-gift-finder-quiz-for-the-best-christmas-gifts-for-dad/)).

**Privacy framing on gifting tools.** None I reviewed surface any notice or rights for the *described non-user*. The data is treated as belonging to the *giver* — which is workable for one-shot gift suggestion, but legally weaker for a durable inferred profile.

## 4. Co-watching apps

- **Teleparty (formerly Netflix Party), Scener, Watch2Gether, Vemos, Hulu Watch Party.** All synchronous-playback + chat overlays on top of an existing streaming service. None does *predictive group recommendation* — they assume the group has already picked what to watch ([Teleparty](https://www.teleparty.com/); [Scener](https://www.scener.com/); [Best Watch Party Apps roundup, syncup.tv](https://syncup.tv/blog/best-watch-party-apps-2026); [A Good Movie to Watch — best watch-party services](https://agoodmovietowatch.com/cord-cutting/best-watch-party-streaming-services/)). Verified absence: no documented taste-fusion / pre-watch group rec in this category [as of 2026-05-17].

## 5. Family-sharing / child-account systems

- **Apple Family Sharing.** Shares subscriptions, storage, App Store purchases across up to 6 members. No documented preference-seeding mechanism for a child or other member ([Apple/Switched On Family overview](https://www.switchedonfamily.com/blog/sharing-and-managing-your-digital-content-with-your-family)).
- **Google Family Link.** Parental controls, app approvals, screen-time. No "describe your child's interests" preference surface ([Google Family Link](https://families.google/familylink/); [Google Play Help — Manage family](https://support.google.com/googleplay/answer/6286986)).
- **Microsoft Family Safety.** Same shape — controls and reporting, not taste seeding.

Smart-home / shared-device (Sonos, Alexa, smart-TV "who's watching?") all default to device-side ambiguity or per-user voice ID; none has a "describe the other household members" feature.

## 6. The null-result finding

Across SVOD, books, music, co-watching apps, and family-sharing systems, **I found zero mainstream consumer products with "describe a non-registered third party so we can build them a recommendation profile" as a feature**. The closest analogues are:

- Gifting quizzes — but they're one-shot, not durable profiles.
- Spotify Blend — but both parties are registered.
- Profile-merging research papers ([PLOS One — hybrid group movie recs](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0266103); [TV Program Recommendation for Multiple Viewers / profile merging, Springer](https://link.springer.com/article/10.1007/s11257-006-9005-6); [Shin & Woo — Socially-Aware TV Recommender](http://icserv.gist.ac.kr/mis/publications/data/2009/IEEE_TCE_Socially_aware_TV_Program_Recommender.pdf)) — but these all merge *existing* per-user profiles; none constructs one from a partner-description.

This is a meaningful absence, not a search artefact. Cross-checked with five query variants and direct help-doc inspection on Netflix, Hulu, Disney+, HBO Max, Prime Video.

## 7. Relevance to ghost-profile

Two implications.

**The absence is a moat.** No mainstream rec product has "describe your partner / kid / housemate so I can recommend for both of you" as a first-class surface. The space is occupied by *post-hoc* group merging (academic; not productised) and *gift quizzes* (transactional; not durable). HelpME2C's ghost-profile-inference + group-rec pairing has no direct consumer-product precedent in TV/anime — that means defensible product wedge, but also means the UX must be invented rather than borrowed.

**Closest references for design.** The gifting-quiz space is the model for the *question battery shape* — 5-10 questions about a non-user, low-friction, accepts vague answers. The streaming per-profile world is the model for the *privacy boundary* — multi-profile precedent normalises the idea that "someone in this account who isn't on the screen has preferences worth tracking", though none of those products lets one user describe another. The synthesis: a Pinterest-style topic picker (see [pinterest-interests.md](./pinterest-interests.md)) bolted onto a gifting-style "tell me about them" battery, with the streaming-profile world's privacy framing (clearly-labelled, deletable, never used outside the household's recommendation context). Worth budgeting design effort here — there is no prior art to copy, only adjacent patterns to graft.

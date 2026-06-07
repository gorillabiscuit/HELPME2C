# Trakt.tv — competitive benchmark

**Platform:** [trakt.tv](https://trakt.tv) — the largest dedicated TV + movie scrobbler / tracker, claiming "2+ million active users" and powering integrations with Kodi, Plex, Infuse, Stremio and a long tail of third-party apps. Founded ~2010, originally a Kodi-scrobble companion; later acquired by / partnered with Younify.

**Researched:** 2026-05-17. Primary sources include the official Trakt forums (`forums.trakt.tv`), the Trakt API on Apiary, the Trakt API help repo on GitHub, the Trakt blog, third-party walkthroughs, Trustpilot, and the AlternativeTo news desk.

**Why Trakt matters for HelpME2C:** Trakt is the dominant cross-medium tracker for TV + film in the West, and it added anime support later (as ordinary TV titles, not as a first-class medium). Its API is the de-facto integration substrate for the Plex/Kodi ecosystem. Its weaknesses around recommendations and its 2025 paywall pivot have created a visible window of user migration.

---

## 1. Signup signals

The Trakt join page is at [`trakt.tv/auth/join`](https://trakt.tv/auth/join) (WebFetch returned 403 directly; flow reconstructed from third-party walkthroughs and Trakt's own forum tutorials).

Required fields at signup ([Troypoint walkthrough](https://troypoint.com/trakt/), [MakeUseOf walkthrough](https://www.makeuseof.com/tag/track-tv-movies-using-trakt/)):

- **Email**
- **Username**
- **Password**
- Terms-of-use / privacy-policy checkbox.
- Social-SSO alternatives: Google, Apple.
- An "email magic code" sign-in flow is now the default — users get a code in their inbox and paste it into the site rather than re-typing a password ([Email Sign-In Flow tutorial](https://forums.trakt.tv/t/email-sign-in-flow/44549), [About the new email sign in flow Q&A](https://forums.trakt.tv/t/about-the-new-email-sign-in-flow/46269)).

Immediately *after* the email/username/password step, the onboarding wizard collects (per MakeUseOf / Troypoint walkthroughs, dated 2022–2023):

- **Display name and location** ("personalize your profile by typing in your preferred display name and location").
- **Date of birth and gender** (optional, on the profile-completion step).
- **Favourite genre picker** — a list of genres to select from, per the walkthroughs: *"choose your favorite genres for movies and TV shows and select Next Step."*
- **A "favourite movies and TV shows" step** — add a few titles you've watched.
- Social-share opt-ins (real-time activity sharing on social media).
- A "Continue To Dashboard" CTA finishes the wizard.

In November 2024, Trakt added a **list-importer to the onboarding flow itself**: announced by `@trakt` on X — *"Trakt importer is here! Bring your watched history & watchlist from IMDB & Letterboxd during onboarding!"* ([tweet, 2024-11-16](https://x.com/trakt/status/1857854684104400993)). Existing users can access the same flow at `https://trakt.tv/welcome/7`.

Compared to Simkl, Trakt collects **more onboarding signal** (genre picker + favourites picker + IMDb/Letterboxd import), with the trade-off of more friction.

---

## 2. Cold-start UX

Trakt's cold-start is the **most-structured of any TV/anime tracker in this benchmark.** Per the walkthroughs cited in §1, the wizard explicitly asks for genre preferences and asks the user to add a handful of favourite movies / shows during signup. This is then used to seed:

- The personalised dashboard ("Improved dashboard recommendations! In addition to the favorites from people you're following it also uses your watched history to recommend shows and movies" — [@trakt on X, 2024-08-23](https://x.com/trakt/status/1826741367680500188)).
- The `/recommendations/movies` and `/recommendations/shows` API surfaces.

Whether the seeded recommendations are *actually good* is a different question — see §5 and §6.

For users arriving with an existing IMDb or Letterboxd list, the in-onboarding importer ([trakt.tv/welcome/7](https://trakt.tv/welcome/7)) materially reduces cold-start friction and is a genuine UX strength.

---

## 3. Group-recommendation feature

**Not supported.** There is no Trakt equivalent of Simkl's Watch-With-Friends room. The closest features are:

- **Following / followers** (asymmetric social graph).
- **Collaborative lists** (multi-user editable lists) — *"a movie night with friends and have everyone add items to a shared list"* (Trakt forum / wako comparison).
- A long-standing feature request: [A find friends page where you could find people that watch/like the same movies as you](https://forums.trakt.tv/t/a-find-friends-page-where-you-could-find-people-that-watch-like-the-same-movies-as-you/7229) — i.e. the social-discovery / taste-matching surface that would enable group recs is itself missing.
- Another open request: [Smart List Combining 2 or More Manual Lists?](https://forums.trakt.tv/t/smart-list-combining-2-or-more-manual-lists/17001) — the building block for "let's watch something we both want to watch" is not natively offered.

There is **no watch-party UX, no multi-user "what should we watch tonight" picker, and no algorithmic taste-fusion**. The shared-list mechanism is purely manual curation. Confirmed by walkthrough of Trakt forum search 2026-05-17.

---

## 4. Cross-medium scoring

**Functionally siloed: separate recommendation endpoints per medium, no documented cross-medium scoring, and anime is not a first-class category at all.**

The Trakt API exposes [`/recommendations/movies`](https://trakt.docs.apiary.io/) and [`/recommendations/shows`](https://trakt.docs.apiary.io/) as separate endpoints with separate "dismiss" actions ([node-trakt-api endpoints.json](https://github.com/robertklep/node-trakt-api/blob/master/endpoints.json)). There is no `/recommendations/anime` and no `/recommendations/cross` — anime is shelved under shows as ordinary TV, which Simkl explicitly calls out as a Trakt weakness: *"often treated as a standard TV show, missing the nuances of Japanese release cycles"* ([SIMKL vs Trakt](https://docs.simkl.org/how-to-use-simkl/faq/frequently-asked-questions/simkl-alternatives/simkl-vs-trakt)).

The dashboard *does* mix mediums visually — but as two side-by-side widgets (one for shows, one for movies), not as a unified taste model. Per Trakt's own X announcement, the dashboard recs use *"the favorites from people you're following [plus] your watched history"* — but there is no public documentation of cross-medium taste transfer (e.g. "you liked these movies, here are TV shows with the same themes").

Effective conclusion: **three media (movies, shows, anime-as-shows) — three siloed ranking surfaces.** Same shape as Simkl's V1/V2 silos, but worse on anime metadata.

---

## 5. Recommendation algorithm

Trakt has the *least-documented* recommendation algorithm of any platform in this benchmark — and what is known about it is mostly through staff admissions on the forum and through user complaint patterns.

What the API and library docs say:

- The Python `pytrakt` wrapper documents `get_recommended_movies()` as: *"Get a list of Movie's recommended based on your watching history and your friends. Results are returned with the top recommendation first."* ([pytrakt docs](https://pytrakt.readthedocs.io/en/latest/movies.html)) — i.e. two stated signals: (a) personal watch history, (b) social graph.
- The API exposes `DELETE /recommendations/shows/{id}` and a corresponding movie hide endpoint, so users can suppress titles they don't want recommended again.
- No public ranking-signal documentation, no published model details, no engineering blog on the algorithm.

What staff have said on the forum:

- Justin (Trakt staff), in the [Performing recommendation algorithm](https://forums.trakt.tv/t/performing-recommendation-algorithm/10892) and ["if you like X" recommendations are kinda bad](https://forums.trakt.tv/t/if-you-like-x-recommendations-are-kinda-bad/9609) threads, has acknowledged that the *per-title* "if you like X" recommendations are not personalised at all — they fall back to TMDB-style generic genre/popularity matching rather than user-specific scoring.
- Justin, in the [Recommendations thread (April 2022)](https://forums.trakt.tv/t/recommendations/9823), acknowledged the bug that recommendations were not filtering out already-watched titles: *"It shouldn't be recommending things you've already seen"* — confirming the recommendation pipeline doesn't reliably consult the user's watched list.

What's observable:

- The "if you like X" surface appears to be a near-direct TMDB / genre-overlap lookup with a popularity prior — users repeatedly describe the same blockbusters appearing as recs across very different seed titles (see §6 quotes).
- The dashboard surface uses social-graph favourites plus the user's own watched history (per [@trakt on X, Aug 2024](https://x.com/trakt/status/1826741367680500188)) — i.e. a hybrid "friends + history" approach, not collaborative filtering at the catalogue scale.
- Third-party developers building on Trakt routinely *replace* the recommendation layer rather than use it — e.g. [Couchmoney](https://couchmoney.tv) ("written from scratch in Java... tens of millions of film and television ratings... finds people with similarly weird tastes to you"), the [Gemini AI Recommender Stremio addon](https://stremio-addons.net/addons/gemini-ai-recommender) (uses Trakt history + Google Gemini + TMDB to generate recs externally), and [AI_Personalized_Watch_Recommendations](https://github.com/kuzhagan143/AI_Personalized_Watch_Recommendations) on GitHub (Trakt history → Gemini → TMDB). The existence of this cottage industry is a strong tell that Trakt's native recommendations are widely regarded as inadequate.

**Could not verify:** whether Trakt uses any form of collaborative filtering or matrix factorisation under the hood. The platform has never published any engineering material on this, and reverse-engineering from API output suggests popularity + genre overlap dominate.

---

## 6. Visible failure modes

Trakt has the **richest and most-cited body of user complaint** of any tracker in this benchmark, spanning four distinct failure categories.

**a) Recommendation quality — repetitive, popularity-anchored, not personalised.**

From the forum thread ["if you like X" recommendations are kinda bad](https://forums.trakt.tv/t/if-you-like-x-recommendations-are-kinda-bad/9609):

- **benjick:** *"every single show that has some element of sci-fi just recommends me GoT and Walking Dead"*
- **marathone:** *"Mine are crap too!"*
- **Showtime416:** *"I barely even look at my recommendations anymore because they are all sub 50 percent movies I would be interested in"*

From the [Recommendations thread, April 2022](https://forums.trakt.tv/t/recommendations/9823):

- **Thatguy008:** recommendations *"never change"* and the system was recommending content already marked as watched, asking *"This is supposed to be a personalized thing that 'Trakt's' what you've watched right?"*
- Justin (staff) confirmed the bug: *"It shouldn't be recommending things you've already seen."*

**b) 2025 freemium pivot — the migration event.**

Trakt announced the new freemium limits in early 2025 ([Freemium Experience: More Features for All with Usage Limits](https://forums.trakt.tv/t/freemium-experience-more-features-for-all-with-usage-limits/41641), [AlternativeTo news](https://alternativeto.net/news/2025/2/trakt-tv-has-set-stricter-limits-for-free-users-and-raised-vip-subscription-prices-by-100-/)): free users capped at 2 personal lists × 100 items, 100-item watchlist, 100-item collection; VIP price doubled from $30 → $60/year.

Verbatim user reactions from the forum thread (with like-counts as proxies for community agreement):

- **LexTheOne** (100+ likes): *"That's low-key predatory marketing... removing or limiting a list size is straight up bs"*
- **Marcozz** (87 likes): *"The 100 items watchlist limit is really bad... The free users loses the best feature"*
- **Nevery_y** (74 likes): *"from 2000 items in a list to only 100? byeee"*
- **rnpasinos** (76 likes): *"this change from trakt.tv is ridiculous... a limit of 100 collections is absurd"*
- **Ljransom** (86 likes): *"You could have been decent and allowed existing users to keep their current limits"*

The AlternativeTo write-up notes that *"users have migrated to competing platforms offering more generous free tiers, specifically mentioning Simkl, Letterboxd, and Showly"* — and that **Trakt closed the discussion thread on its own forum**, which the community read as suppression of feedback.

**c) Desktop UX regression.**

From [Honest Review of New Trakt (The Good and The Bad)](https://forums.trakt.tv/t/honest-review-of-new-trakt-the-good-and-the-bad/98941):

- *"Scrolling on Desktop is a nightmare, shows with many seasons I have to use the arrow keys to navigate"*
- *"Seasons (Not Shows) that have been added to the watchlist do not show"*
- Missing progress page, lost total-runtime display, history page no longer filterable by show name.

A separate thread is bluntly titled [Trakt Turned a Great Desktop Experience Into Mobile-Looking Garbage](https://forums.trakt.tv/t/trakt-turned-a-great-desktop-experience-into-mobile-looking-garbage/103938).

**d) Anime as second-class.**

Per Simkl's competitive doc (admittedly biased, but the *substance* is unchallenged): Trakt anime is *"often treated as a standard TV show, missing the nuances of Japanese release cycles"* and lacks AniDB metadata, filler lists, and seasonal-anime nuance ([SIMKL vs Trakt](https://docs.simkl.org/how-to-use-simkl/faq/frequently-asked-questions/simkl-alternatives/simkl-vs-trakt)). No Trakt API endpoint exists for `anime` as a distinct category.

**e) Support / community responsiveness.**

The web-search summary of Trustpilot reviews ([trakt.tv reviews](https://www.trustpilot.com/review/trakt.tv)) flagged a recurring theme: *"the service has gone downhill with the site being buggy, support being nonexistent, and features that were once free now requiring VIP subscriptions at higher prices"* — and that the official forum has gone *"silent from developers, with user feedback being ignored, while critical posts get hidden and accounts restricted."*

---

## Quick-take for HelpME2C

| Dimension | Trakt status | HelpME2C wedge |
|---|---|---|
| Cross-medium catalogue | TV + movies first-class; anime stuffed under TV | **Open wedge** — anime first-class is a credible position. |
| Cross-medium recommendations | Siloed `/recommendations/movies` and `/shows`, no anime endpoint | **Open wedge.** Cross-medium theme scoring is not done. |
| Group recommendations | Not supported at all (only collaborative lists, manually edited) | **Wide-open wedge.** Trakt has nothing here. |
| Cold-start UX | Strong — genre picker + favourites picker + IMDb/Letterboxd importer | **Must match.** This is Trakt's actual strength. |
| Recommendation algorithm quality | Widely complained-about; staff admit it's not personalised; third parties replace it | **Open wedge.** Trakt is the platform users *want* to leave for better recs. |
| Pricing perception | 2025 freemium pivot triggered visible user revolt → migration event | **Timing wedge.** Free tier with real personalisation is a credible counter-position right now. |
| Anime metadata | Weak — no AniDB, no filler lists, no seasonal-anime structure | **Open wedge.** |

**Citation density:** ~14 unique sources cited above (Trakt's own forums × 6, Trakt API on Apiary, GitHub helper repos × 2, AlternativeTo news, Trustpilot summary, X/Twitter announcements × 2, Couchmoney, two third-party AI-replacement projects, MakeUseOf and Troypoint walkthroughs).

**Strongest gap in evidence:** the Trakt.docs.apiary.io reference page is now password-protected (returns "Enter the site's password to view it" on direct fetch), so the exact parameter list for `/recommendations/movies` and `/recommendations/shows` could not be captured first-hand — only via the `pytrakt` wrapper docs and third-party endpoint dumps. The `r/trakt` and `r/Simkl` subreddits returned zero results to site-restricted search on 2026-05-17, so all user-complaint evidence is from `forums.trakt.tv` and third-party news aggregation rather than Reddit directly.

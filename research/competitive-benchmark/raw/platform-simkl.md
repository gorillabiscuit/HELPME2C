# Simkl — competitive benchmark

**Platform:** [simkl.com](https://simkl.com) — a cross-medium tracker covering TV shows, anime, movies, and (more recently) Asian dramas. Positions itself as the "everything-in-one" alternative to Trakt + MyAnimeList + Letterboxd.

**Researched:** 2026-05-17. Primary sources include Simkl's own documentation (`docs.simkl.org`), the official Simkl blog on Medium, the Simkl UserVoice support forum, and third-party comparisons (wako.app, AlternativeTo, SaaSHub).

**Why Simkl matters for HelpME2C:** Simkl is the closest existing product to HelpME2C's TV + anime cross-medium positioning. It explicitly markets anime as a first-class top-level category alongside TV and movies, and ships a "Watch With Friends" group feature — both rare in the tracker space.

---

## 1. Signup signals

The Simkl signup form is documented in [Creating a Simkl Account](https://docs.simkl.org/how-to-use-simkl/getting-started-with-simkl/account-creation/creating-a-simkl-account) and the [signup help FAQ](https://docs.simkl.org/how-to-use-simkl/faq/more-faq/how-do-i-sign-up-for-a-simkl-account-and-get-started). Fields:

- **Email** (required; Yahoo addresses are rejected — the form returns "Yahoo emails are not allowed").
- **Name / username** (required; rejected as "Name too short" below a minimum length).
- **Password** (required; rejected as "Password is too short" below a minimum length).
- **Social SSO alternatives:** Google, Apple, Facebook (via [`passport.simkl.com`](https://passport.simkl.com)).
- Email verification afterwards.

What is **not** asked at signup:

- No birthday / age / gender / location / language field.
- No genre preference picker, no "favourite shows" elicitation, no taste survey.
- No anime-specific demographic question (e.g. shounen/seinen/josei preference).

Note: WebFetch on `https://simkl.com/sign-in/` returned HTTP 403, so the live form could not be directly captured; field descriptions above come from Simkl's own documentation and the signup FAQ ([source 1](https://docs.simkl.org/how-to-use-simkl/getting-started-with-simkl/account-creation/creating-a-simkl-account), [source 2](https://docs.simkl.org/how-to-use-simkl/faq/more-faq/how-do-i-sign-up-for-a-simkl-account-and-get-started)).

---

## 2. Cold-start UX

There is **no explicit "rate these to start" cold-start step.** A fresh Simkl account is dropped into the dashboard with no preference elicitation wizard. The platform's stated solution to cold-start is **list import**: the [SIMKL vs Trakt comparison doc](https://docs.simkl.org/how-to-use-simkl/faq/frequently-asked-questions/simkl-alternatives/simkl-vs-trakt) brags about "one-click importers for Trakt, IMDb, Netflix, and MyAnimeList" — i.e. the assumption is that you arrive *with* an existing list elsewhere, not that Simkl will scaffold one for you. The full set of importers spans 14+ services including Trakt, Letterboxd, TV Time, MAL, AniList, IMDB, Netflix, plus CSV / API ([wako comparison](https://www.wako.app/guide/trakt-vs-simkl)).

For a user with no importable history, discovery is via:

- The default "Popular" / "Trending" lists per medium.
- The community Custom Lists library at [`simkl.com/lists/`](https://simkl.com/lists/).
- Manual browse by genre / year / streaming-platform filters.
- Friend connections (which trigger comparison views, see §3).

Critically, personalized recommendations are **paywalled** to PRO / VIP tiers ([Recommendations doc](https://docs.simkl.org/how-to-use-simkl/core-features/search-and-discovery/recommendations)). A brand-new free user therefore sees no personal recs whatsoever — they see popularity lists and a "Free account... invitation to upgrade shown" prompt on the recs page.

---

## 3. Group-recommendation feature

**Yes, Simkl ships a group feature — but it is list-intersection, not algorithmic group recommendation.**

The feature is called **Watch With Friends** (also "Watch Party With Friends") and is documented at [`docs.simkl.org/.../watch-party-with-friends`](https://docs.simkl.org/how-to-use-simkl/core-features/social-and-community/watch-party-with-friends). Behaviour, per Simkl's own docs:

- Supports **up to three friends** in a single room (you + 3 = max 4 participants).
- Computes the **intersection of "Plan to Watch" lists** across the selected friends and excludes anything anyone has already seen. Quoted from the docs: *"Instantly find movies that multiple friends haven't seen but want to watch."*
- Movie posters show avatars of which friends have it on their Plan-to-Watch.
- Filters available on the result set: theatrical release, DVD / digital availability, release year (no taste-based filter).
- Generates a shareable room URL.
- Optional memo field for group notes (e.g. snack ideas).

**No algorithmic ranking.** The docs do not mention any preference fusion, taste-vector merging, or compromise scoring across the participants — it is a deterministic set-intersection over manually-curated Plan-to-Watch lists. If none of the four people has explicitly added a title, it cannot surface. (See WebFetch summary of the Watch Party doc, 2026-05-17.)

This is functionally similar to the "shared watchlist" pattern offered by some streaming-service group features, not the "ghost-profile group inference" that HelpME2C is targeting.

---

## 4. Cross-medium scoring

**Mostly siloed, with one cross-medium escape hatch.** The Simkl Recommendations page renders **separate sections** for TV, anime, and movies — and within each medium there are two engines ("V1" and "V2") running side by side. The Recommendations doc states explicitly: *"You will see separate sections for TV shows, anime, and movies"* ([Recommendations doc](https://docs.simkl.org/how-to-use-simkl/core-features/search-and-discovery/recommendations), 2026-05-17 fetch). Per the launch blog post, *"2 different lists for each type — 2 for TV, 2 for Anime, and 2 for Movies"* ([Introducing Personalized Recommendations on Simkl](https://simkl.org/introducing-personalized-recommendations-on-simkl-a-game-changer-5d83046f2236)).

The escape hatch is the **Mixed List** custom-list type ([FAQ on Mixed List](https://docs.simkl.org/how-to-use-simkl/core-features/watchlists-and-custom-lists/custom-lists/custom-list-types/faq-on-mixed-list)), which lets a *user* manually compose a list spanning TV + anime + movie items. But mixed lists are user-curated, not algorithmically generated from cross-medium taste signals — Simkl does not appear to produce "you liked this anime, here's a TV show with the same themes" as an automatic recommendation.

So the answer is: **the three media are first-class as catalogue and tracking, but recommendation generation is per-medium-silo by default.** There is no documented "anime taste → TV recommendation" engine; that gap is exactly the HelpME2C wedge.

---

## 5. Recommendation algorithm

Simkl publicly describes **two parallel recommendation engines per medium**, but only thinly documents how they work.

From the December 2024 launch blog post [Introducing Personalized Recommendations on Simkl — A Game Changer!](https://simkl.org/introducing-personalized-recommendations-on-simkl-a-game-changer-5d83046f2236) and the [Recommendations doc](https://docs.simkl.org/how-to-use-simkl/core-features/search-and-discovery/recommendations):

- **Two engines, labelled V1 and V2,** running in parallel for each medium.
- One engine is described as an **"AI LLM-powered engine"** that *"analyzes tags and themes from your watched content and crafts around 40 unique tag combinations for each media type."*
- Stated input signals: watch history, ratings (10-point star scale), Plan-to-Watch / Watched lists (used to exclude already-known titles).
- **20+ filters available** on the result set: year range, min/max average rating, streaming-platform availability, tag combinations, sort by rank / avg rating / vote count / watched-or-planning population.
- Recommendations refresh is rate-limited to **once per 24 hours per user** via a manual "Refresh Recommendations" button.
- The doc does not disclose whether collaborative filtering, content-based filtering, or neural embeddings are used. The "tag combinations" framing implies **content-based tag-overlap scoring** layered with LLM-generated tag clusters — but this is inferred, not stated.

**Paywall:** Personalized Recommendations were launched as a **PRO / VIP only** feature in December 2024. Free users see no personal recs ([Simkl VIP / PRO page](https://simkl.com/vip/)).

Simkl also offers a separate **ChatGPT export flow** ([Get AI recommendations for your custom list using ChatGPT](https://docs.simkl.org/how-to-use-simkl/core-features/watchlists-and-custom-lists/clipboard-feature/get-ai-recommendations-for-your-custom-list-using-chatgpt)) which lets the user copy a formatted prompt + list to paste into ChatGPT externally — i.e. this is *not* an in-product LLM call, just a copy-paste helper, but it exists.

**Could not verify:** whether the V1/V2 split is "content-based vs collaborative filtering," "popularity-anchored vs taste-anchored," or something else. The docs explicitly decline to differentiate them.

---

## 6. Visible failure modes

Simkl gets noticeably less public complaint volume than Trakt, but the recurring criticisms are:

**a) Bad / confusing UI and navigation.** Multiple users on app-store reviews and third-party reviews describe the dashboard as cluttered: *"both the app and website have really bad and confusing design, especially regarding navigation"* and *"a lot of clicks just to get to episode details, like air date, synopsis, etc."* (summarised in [Nerdy Student review](https://www.thenerdystudent.com/2019/07/simkl-review/) and app-store roundups).

**b) iOS app not actually native.** App Store reviews complain it's *"not a true native iOS app but rather a web or progressive app with bugs throughout and glitches"* ([Apple App Store listing](https://apps.apple.com/us/app/simkl-lists-tv-anime-movies/id1229691035) review aggregation, summarised via search 2026-05-17).

**c) Recommendations historically weak; personalization was the #1 requested feature for years.** The Simkl team's own December 2024 launch post describes Personalized Recommendations as *"the #1 most requested feature on Simkl"* — i.e. for the platform's first ~10 years it had no personal recs at all, only per-title "similar to X" lists ([launch blog](https://simkl.org/introducing-personalized-recommendations-on-simkl-a-game-changer-5d83046f2236)). The UserVoice thread [Recommendations](https://support.simkl.org/forums/264009-top-ideas-from-the-community/suggestions/6897549-recommendations) documents users repeatedly requesting "personal recommendations based on things watched and personal ratings" rather than per-title similarity.

**d) Re-watch tracking gap.** Users report no native way to mark films as re-watched, which they call *"crucial data for this kind of service to track. Other services can, and Simkl should too"* ([rewatched series/movies/anime suggestion thread](https://support.simkl.org/forums/264009-top-ideas-from-the-community/suggestions/35023525-rewatched-series-movies-anime)). For a system that wants to use viewing history as recommendation signal, this is a meaningful data-quality hole.

**e) Slightly weaker community / social.** Per [wako.app's comparison](https://www.wako.app/guide/trakt-vs-simkl): *"Simkl does have a social side... however many shows don't have much activity on them in the social section"* — i.e. the social graph and per-title discussion volume is thin compared to Trakt or MAL.

**No structural complaints found** about: privacy, deletion, data export (Simkl actually positions itself well here vs Trakt), recommendation racism / bias, or filter-bubble effects.

---

## Quick-take for HelpME2C

| Dimension | Simkl status | HelpME2C wedge |
|---|---|---|
| Cross-medium catalogue | Yes — TV / anime / movies as equal pillars | Match required; this is table stakes, not a moat |
| Cross-medium *recommendations* | No — siloed per medium with separate V1/V2 engines | **Open wedge.** Theme-based scoring across media is not done. |
| Group recommendations | List-intersection only (max 3 friends), no algorithm | **Open wedge.** Ghost-profile inference and taste-fusion is not done. |
| Cold-start UX | None — relies on import or popularity | **Open wedge** for non-importer users (the "I'm new to tracking" segment). |
| Personalization | Paywalled PRO/VIP only, ~6 months old at time of research | Free personalization is a credible counter-position. |
| Anime-as-first-class | Yes (AniDB + filler lists) | Must match; do not under-invest in anime metadata. |

**Citation density:** ~12 unique sources cited above. Strongest gap in evidence: no direct Reddit thread on r/Simkl was indexed (site-restricted search returned zero on 2026-05-17); all user-complaint evidence comes from Simkl's own UserVoice forum, third-party comparisons, and app-store review summaries.

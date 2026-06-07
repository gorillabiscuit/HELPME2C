# Letterboxd — competitive benchmark (raw)

**Scope:** Letterboxd is the leading film-tracking platform with strong social signals. The relevant question is what they do for **recommendation**, despite branding themselves as a "social network for film." Letterboxd is a comparator for HelpME2C, not an operational benchmark — they are film-only (TV in development), don't index anime as a first-class category, and have explicitly *resisted* building a personalised recommender for years.

**Date of capture:** 2026-05-17.
**Sources:** marked inline. Important caveat: WebFetch against `letterboxd.com/*` consistently returned **HTTP 403** — Letterboxd blocks automated fetches of journal articles, FAQ pages, and the signup form. Quotes from those pages are therefore second-hand via search-result snippets, Wikipedia, and third-party guides. Where a primary URL exists, it is cited even when direct fetch was not possible.

---

## 1. Signup signals — what does signup ask for?

- **Account fields:** standard email + username + password. The signup form is at [letterboxd.com/create-account/](https://letterboxd.com/create-account/) (HTTP 403 on direct fetch).
- **No country question** at signup — Letterboxd has no country-localised front door the way JustWatch does. The country signal only matters later, indirectly, via the JustWatch streaming-services integration for Pro/Patron members.
- **No streaming-services question** at signup. Selecting favourite streaming services is a **Pro-tier** feature: "select and filter by favorite streaming services (pick from any service listed on JustWatch) and get notified when films in their watchlist arrive on those services" ([Five Star Insider — Letterboxd Pro vs Patron](https://www.fivestarinsider.com/letterboxd-pro-vs-patron/)).
- **No taste quiz / no "pick films you like."** The first screen tells users what the platform *is* — "Track films you've watched. Save those you want to see. Tell your friends what's good." — and then drops them into the Popular page to begin marking films as watched / liked. ([Boxd In — how to sign up](https://www.letterboxdguide.com/signing-up-for-letterboxd/); UX walkthrough in [Medium — Occupying Social Media: Letterboxd](https://medium.com/@nehaagumamidi926/occupying-social-media-letterboxd-c78553dea7b5)).
- A 2025 student UX redesign on Behance critiques the lack of structured cold-start — "Recent design improvements include a cleaner welcome flow to reduce cognitive load, instant feedback throughout sign-up and reviews, a tailored content setup to encourage early engagement" ([Behance — Improving New-User Flow & Onboarding in Letterboxd](https://www.behance.net/gallery/223558121/Improving-New-User-Flow-Onboarding-in-Letterboxd)) — implicitly confirming that the current real flow does not do this.

**Net:** Letterboxd's signup collects almost no signal beyond identity. The product assumes users will self-bootstrap by marking films they have seen on the Popular page.

---

## 2. Cold-start UX

- The official onboarding pattern is **"go to Popular, click the eye"** — "you can visit the Popular section and mark a few films you've seen by clicking the 'eye' on any film poster to tell us you've watched it (add a 'like' if you liked it and/or a rating)" ([Five Star Insider signup guide](https://fivestarinsider.com/signing-up-for-letterboxd/)).
- The UX walkthrough confirms the same flow: "Letterboxd utilizes the concept of inducing users into a state of flow by walking the user through the main affordances of adding a movie to your Watched list with a simple eye icon and adding a like or rating through the heart icon" ([Medium walkthrough](https://medium.com/@nehaagumamidi926/occupying-social-media-letterboxd-c78553dea7b5)).
- **No region / country selection.** No streaming-service selection. No mood / genre quiz. No social-graph import wizard.
- Cold-start *for recommendation purposes* therefore relies entirely on (a) how many films the user marks watched/liked in the first few sessions, and (b) the per-film **Similar Films** surface (Nanocrowd-powered — see §5) which works without any user history.

---

## 3. Group-recommendation feature

- **Watchlist comparison ("intersection") — yes, this exists, since Feb 2016.**
  - Mechanism: visit another member's watchlist, use the "In your Watchlist" filter to see overlap. Letterboxd's own X/Twitter announcement: "We added the ability to compare Watchlists! Go to a member's Watchlist and use the 'In your Watchlist' filter to see the intersection." ([@letterboxd on X, Feb 2016](https://x.com/letterboxd/status/699356719843921920)).
  - Help-centre walkthrough: "open another person's profile, go to Watchlist, click the eye icon (far right), and choose 'Show films in watchlist' to see where your watchlist matches up with theirs, or 'Hide films in watchlist' to see where it differs." ([letterboxd.zendesk.com — "Can I compare my watchlist with another member's?"](https://letterboxd.zendesk.com/hc/en-us/articles/15179318694287-Can-I-compare-my-watchlist-with-another-member-s)).
  - Friction: this is **pairwise only**, manual, and produces a *list* (films both want to watch), not a *recommendation* (a film both will probably like).
- **Pro-only "see friends' average ratings"** ([Five Star Insider — Pro vs Patron](https://www.fivestarinsider.com/letterboxd-pro-vs-patron/)) — closest thing to a friend-graph signal.
- **Between Us / private list sharing** ([letterboxd.com/journal/between-us-private-lists-sharing/](https://letterboxd.com/journal/between-us-private-lists-sharing/)) — private list collaboration, again list-based not recommendation-based.
- **No native "pick a film for our group tonight" surface.** Explicit absence. The community has noticed and built third-party tools to fill the gap:
  - `jjoej15/letterboxd-recs` — "Blend mode" pairwise recommendation for two users via SVD collaborative filtering ([GitHub](https://github.com/jjoej15/letterboxd-recs)).
  - `recommendations.victorverma.com/watchlist-picker` — third-party Watchlist Picker + Compatibility score ([recommendations.victorverma.com](https://recommendations.victorverma.com/watchlist-picker)).
  - `joshkeating/letterbox-wl-overlap` — CLI for watchlist intersection ([GitHub](https://github.com/joshkeating/letterbox-wl-overlap)).

The existence of a small ecosystem of third-party "Blend for Letterboxd" tools is strong evidence that **the group/pair recommendation slot is unmet on the platform itself** — directly relevant to HelpME2C's group-rec wedge.

---

## 4. Cross-medium scoring

- **Letterboxd is film-only.** "No TV show tracking. If you watch TV series, Letterboxd cannot help you." ([Moviebase — Letterboxd alternatives](https://moviebase.app/resources/best-letterboxd-alternatives-for-android)).
- **TV is "still on the way"** — announced for "later in 2024" in Jan 2024, in-progress as of Dec 2024, still not shipped as of Nov 2025 per the official Letterboxd X account ([Collider — "Letterboxd Is Officially Adding TV Shows"](https://collider.com/letterboxd-tv/); [Five Star Insider — "Is TV Coming to Letterboxd?"](https://www.fivestarinsider.com/tv-on-letterboxd/); [Boxd In — TV on Letterboxd](https://www.letterboxdguide.com/tv-on-letterboxd/)). Letterboxd has signalled a **siloed approach** when it ships: "planning to do it in a way that doesn't disrupt the current experience", "an often-suggested middle ground to silo TV behind tabs or filters."
- **Anime is treated as film, not as TV series.** Letterboxd has user-curated "Top 250 Anime TV Miniseries" lists ([letterboxd.com/jumpy/list/letterboxds-official-top-250-anime-tv-miniseries/](https://letterboxd.com/jumpy/list/letterboxds-official-top-250-anime-tv-miniseries/)) but only because **anime miniseries and films** can be catalogued — "returning" TV anime is excluded. The Letterboxd Zendesk explicitly: "Letterboxd does not support 'returning' TV shows, though they do allow some exceptions like limited series and miniseries." ([letterboxd.zendesk.com — Do you support TV shows?](https://letterboxd.zendesk.com/hc/en-us/articles/15269096507407-Do-you-support-TV-shows)).
- **Implication for HelpME2C:** Letterboxd does **not** do cross-medium scoring at all today, and when TV ships it intends to silo. HelpME2C's cross-medium theme-based recs are unambiguously not Letterboxd's territory.

---

## 5. Recommendation algorithm

Letterboxd's public position for years was that they **deliberately do not run a personalised recommender**.

- **Help-centre answer "Can Letterboxd generate recommendations for me?"** ([support.letterboxd.com](https://support.letterboxd.com/hc/en-us/articles/15178828078223-Can-Letterboxd-generate-recommendations-for-me)) summarised in search: Letterboxd "doesn't have a dedicated recommendation engine section, but instead views the whole platform as 'one big, organic recommendation engine' and offers sorting and filters to find films of interest." (Direct WebFetch returned 403; quoted via search-result snippet.)
- **Community reading of the official stance:** "When one user contacted Letterboxd, the team explained they are a small, self-funded team with other priorities, and that they want any recommendation feature to be done well rather than half-baked." (search-result summary of r/Letterboxd discussions).

**What does exist:**

1. **Similar Films (per-title) — Nanocrowd-powered, March 2022.**
   - "In March 2022, Letterboxd partnered with Nanocrowd to show 'nanogenres' and recommendations for similar films" ([Nanocrowd / Letterboxd press](https://nanocrowd.com/nanocrowd-letterboxd/); [Letterboxd journal — "Film Feelings: using 'nanogenres' to find similar films"](https://letterboxd.com/journal/film-feelings-nanogenres/) — 403 on direct fetch).
   - How it works: "These lists are created with Nanocrowd's ViewerVoice™ platform, which analyzes viewer reactions to a movie or series. The passion that viewers put into their reviews is the emotion-packed data the platform uses to cluster movies and series into Nanogenre® collections – each one capturing a specific reaction." ([Nanocrowd](https://nanocrowd.com/nanocrowd-letterboxd/)). So it is **review-text clustering**, not collaborative filtering over ratings.
   - Coverage: "more than 20,000 of their most popular titles" — i.e. long tail not covered.
   - Visible at e.g. [letterboxd.com/film/challengers/similar/](https://letterboxd.com/film/challengers/similar/) (`/film/{slug}/similar/`).

2. **Weighted average rating algorithm (June 2023).**
   - Letterboxd's journal article: "The Score: we've updated our weighted-rating calculations" ([letterboxd.com/journal/the-score-new-weighted-average-ratings/](https://letterboxd.com/journal/the-score-new-weighted-average-ratings/) — 403 on direct fetch).
   - The previous system was "swayed (up or down) by a concerted effort or campaign, or because a film was beloved in one region, or because superfans were attracted to it first" — Letterboxd had been "making manual adjustments to ratings eligibility." (search-snippet of the journal post).
   - The 2023 update introduced a less manual, more automated weighting that compresses extreme scores toward the mean. Independent academic paper documents this: ["Behind the Stars: Uncovering Hidden Adjustments in Letterboxd Film Ratings"](https://sol.sbc.org.br/index.php/webmedia/article/download/37951/37729) (SBC WebMedia) — "systematic algorithmic compression that pulls extreme scores toward the mean, with a strong negative correlation between a film's true rating and its displayed score" and "niche genres like documentaries and musicals, which often exhibit polarized or extremely high ratings, are penalized most heavily."

3. **Themes / Nanogenres — title-level taxonomy.** Same Nanocrowd partnership. Filters by decade, rating, **and crucially "save your streaming services so the lists only show the things you can watch right away"** ([Nanocrowd press](https://nanocrowd.com/nanocrowd-letterboxd/)) — this is the Pro-tier JustWatch integration meeting the rec surface.

4. **Editorial / curated lists ("HQ" accounts).** Letterboxd Showdown, Year in Review, HQ-curated lists from theatres / studios / Academy. The 2020 introduction of HQ accounts is the editorial-curation layer ([Wikipedia — Letterboxd](https://en.wikipedia.org/wiki/Letterboxd)). Editorial > algorithmic is the explicit choice.

**Pro / Patron tiers and recommendations:**

- **Pro** ([letterboxd.com/pro/](https://letterboxd.com/pro/) — 403 on direct fetch; details via [Five Star Insider](https://www.fivestarinsider.com/letterboxd-pro-vs-patron/) and [letterboxd.com/about/pro/](https://letterboxd.com/about/pro/)): personalised stats, favourite streaming services + arrival notifications, friends' average ratings, filtering activity feed, pinning content, duplicating lists.
- **Patron**: per-film poster customisation, bulk-add-to-list, early access to new features.
- **Neither tier unlocks a personalised recommendation engine.** The closest is "friends' average ratings" — a social signal you must read manually. ([Five Star Insider](https://www.fivestarinsider.com/letterboxd-pro-vs-patron/)).

**Founders / dev voice:**

- Founders Matthew Buchanan and Karl von Randow are Auckland-based, deliberately keep the team small ([Wikipedia — Letterboxd](https://en.wikipedia.org/wiki/Letterboxd)). The "self-funded, small team" justification for not building a recommender comes from this posture.
- Letterboxd Journal ([letterboxd.com/journal/](https://letterboxd.com/journal/)) is the closest thing to a dev / editorial blog and is mostly editorial film writing rather than engineering. Could not find a Karl von Randow / Matthew Buchanan podcast interview with substantive recommender content within the time budget — **noted gap**.

---

## 6. Visible failure modes

**The well-documented "Letterboxd ratings reflect Film-Twitter taste, not yours" problem:**

- Will Hesly's substack essay "You didn't actually enjoy that movie, you were just biased by the Letterboxd rating" — frames the social-proof / conformity effect of the average rating on the user's own opinion. ([willhesly.substack.com](https://willhesly.substack.com/p/you-didnt-actually-enjoy-that-movie)).
- Datawrapper analysis "How rating scales shape movie reviews" — quantifies the discontinuities. ([datawrapper.de](https://www.datawrapper.de/blog/movie-reviews-rating-scales)).
- Film critic Alice Moody, summarised in search: contemporary cinephiles "become biased by online communities focused on film and become 'insecure about their own opinions'", "if a favorite account gave it a different rating, they start to rethink their own opinions."
- "Letterboxd reviewers are more likely to give low ratings, with people on Letterboxd avoiding half-star ratings compared to corresponding ratings on IMDb, a phenomenon known as round number bias."
- ResetEra megathread "Do you think IMDB/Letterboxd is less reliable than it used to be?" ([resetera.com](https://www.resetera.com/threads/do-you-think-imdb-letterboxd-is-less-reliable-than-it-used-to-be.1032096/)) — community consensus is "yes, Letterboxd skews younger, is prone to hype campaigns and (users suspect) corporate astroturfing from boutique film labels."

**Niche-genre bias from the 2023 weighting algorithm:**

- Academic paper [Behind the Stars (SBC WebMedia)](https://sol.sbc.org.br/index.php/webmedia/article/download/37951/37729): "niche genres like documentaries and musicals, which often exhibit polarized or extremely high ratings, are penalized most heavily."
- Bleeding Fool aggregated user reaction: "Letterboxd Review Site Accused of Xenophobia After Algorithm Update" ([bleedingfool.com](https://bleedingfool.com/news/letterboxd-review-site-accused-of-xenophobia-after-algorithm-update/)) — argues the update disproportionately suppressed non-English-language and regional-favourite films.

**The "they have all our data and still no recs" complaint:**

- r/Letterboxd thread cited in search results: "it's strange Letterboxd themselves can't" build recs, noting "they have more data on my movie taste than anyone." The community-built tooling at [letterboxd.samlearner.com](https://letterboxd.samlearner.com/), [recommendations.victorverma.com](https://recommendations.victorverma.com/), [sdl60660/letterboxd_recommendations](https://github.com/sdl60660/letterboxd_recommendations), [npogeant/letterboxd-recommender](https://github.com/npogeant/letterboxd-recommender), and [jjoej15/letterboxd-recs](https://github.com/jjoej15/letterboxd-recs) is the direct evidence of unmet demand.

**Trustpilot baseline:** Letterboxd's Trustpilot is "Average" at 2.8/5 ([trustpilot.com/review/letterboxd.com](https://www.trustpilot.com/review/letterboxd.com)) — bulk of complaints are moderation / account-deletion / harassment, not recommendation. The recommendation gap is a *feature request*, not a *broken feature*.

**Coverage gaps the community names:**

- No TV (yet) — see §4.
- No returning-series anime — see §4.
- No native blend / group rec — see §3.
- No "what to watch tonight given my mood + free time" surface — Letterboxd's [Decision at Sundown journal piece](https://letterboxd.com/journal/how-to-find-something-good-on-streaming-tonight/) acknowledges this is a hard problem and offers editorial workarounds rather than algorithmic ones.

---

## Summary read for HelpME2C

1. Letterboxd's recommendation surface is **deliberately minimal**: per-title "Similar Films" via Nanocrowd review-text clustering, plus editorial / HQ lists, plus a Pro-tier "friends' average ratings" social signal. There is no personalised "For You" rail. This is a stated product position, not a gap they are racing to close.
2. The **group-rec surface is unbuilt natively** and visibly demanded — third-party blend tools exist. HelpME2C's group-recommendation wedge has direct evidence of pull.
3. **Cross-medium is not a Letterboxd play** — they are film-only, TV is years late, anime is film-only, and when TV ships it will be siloed. HelpME2C's cross-medium theme-based recs are unambiguously orthogonal.
4. The well-documented **"average rating reflects Film-Twitter taste, not yours"** failure mode is a real reputational liability — and a cautionary tale for HelpME2C against ever surfacing a single global average as the primary signal. Personal + group context is the right axis.
5. Letterboxd's signup collects **no taste signal at all**, relying on the user to bootstrap themselves on the Popular page. JustWatch's quiz-based bootstrap is a stronger pattern.

### Notable gaps in evidence

- WebFetch blocks (HTTP 403) on every `letterboxd.com/*` URL meant primary-source quotes had to come via search-result snippets. The Zendesk URL above (Can Letterboxd generate recommendations for me?) is the canonical primary source and I cite the URL, but the verbatim quote is via search-snippet — verify if quoting publicly.
- Could not find a substantive Karl von Randow or Matthew Buchanan **podcast / dev-talk interview** within the time budget. The "Letterboxd Show" podcast exists but is interview-with-filmmakers, not engineering. No equivalent of JustWatch's Snowplow talk surfaced.
- The 2023 weighted-rating algorithm change is documented in [the journal post](https://letterboxd.com/journal/the-score-new-weighted-average-ratings/) and in the SBC WebMedia academic paper, but the **exact mathematical form** of the new weighting is undisclosed.

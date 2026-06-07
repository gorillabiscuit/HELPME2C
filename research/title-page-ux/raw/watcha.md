# Platform: Watcha (Watcha Pedia + Watcha streaming)

**One-line key takeaway:** Watcha treats the rating widget as the product — a half-star 0-10 scale (10 half-star steps) that explicitly trains a predicted-rating model, and the title page is built around showing that prediction *before* the user has seen the film.

## Information hierarchy

### Above the fold (no scroll)
- Poster art on the left of a clean hero band, title in Latin and Hangul stacked, genre / country / year / runtime metadata.
- **Rating widget as the most visually loaded element** — a half-star track running from 0.5 to 5.0 (functionally a 0–10 scale, ten half-star steps) that doubles as the **predicted rating slot** when the user has not rated the title.
- Watchlist button, Comment button, "Don't like" (explicit negative-signal button — unusually direct compared to Western apps), and a More menu.
- Aggregate community average displayed as an "Avg" score (e.g. "Avg 3.8") rather than out of 5 or 10 — a deliberately granular two-decimal float.

### Mid-page (one scroll)
- Synopsis paragraph.
- **Cast & Crew** row with portrait thumbnails — each tappable into a person-level page.
- **Where to Watch** strip (when applicable) — Watcha's own streaming surface plus other Korean OTTs (Tving, Wavve, Coupang Play) and global services where licensed.
- Comments / Reviews — user-written reviews surfaced inline, each tagged with the writer's own star rating, often the most-engaged-with section on Korean titles.
- "Watcha Party" CTA when the title is currently playable on Watcha's streaming service [[Screen Daily — Watcha global push](https://www.screendaily.com/features/how-koreas-watcha-is-taking-on-streaming-giants-and-readying-a-global-push/5172618.article)].

### Bottom of page (deep scroll)
- **Similar Titles** carousel — the cross-medium-aware recommendation block, which mixes films, series and books on the same row when the source title is part of a franchise or shares thematic clusters.
- **Galleries** — stills and posters.
- Trivia / awards / production country.
- Trailer / video clips.

## Sections present (top → bottom, with verbatim names)

1. Poster + Title (Latin + Hangul) + metadata
2. Rating widget (half-star, 0.5–5.0)
3. Watchlist / Comment / Don't like / More
4. Synopsis
5. Cast/Crew
6. Where to Watch (OTT strip)
7. Comments / Reviews
8. Similar Titles
9. Galleries
10. Production details / footer

## Primary user actions (in visual prominence order)

1. **Rate** — the half-star widget is the dominant call-to-action; the rest of the recommendation engine pivots off it.
2. **Add to WatchList**
3. **Comment** (write a short review)
4. **Don't like** (explicit negative signal feeding the model — distinct from "unrated")
5. Tap a streaming-service tile to deep-link out
6. Tap a similar-title tile

## How recommendations are surfaced

Watcha's recommendation engine is the whole reason the product exists, so the title page is engineered to **harvest more ratings** rather than to dump pre-computed recommendations. The "Similar Titles" carousel at the bottom is the visible output, but the more important UX choice is that the rating widget displays a **predicted score** for any title the user has not yet rated — Watcha's algorithm tells you "you'll probably rate this X" before you've watched it. CEO TaeHoon Park framed this as the key competitive lever: *"Unlike other platforms, where star ratings are more like a popularity vote, people know that the more star ratings you give within Watcha, the better your recommendations"* [[Screen Daily](https://www.screendaily.com/features/how-koreas-watcha-is-taking-on-streaming-giants-and-readying-a-global-push/5172618.article)]. The platform requires a **minimum of 15 movie ratings on a 0–10 scale** before personal recommendations start flowing [[Korea Times, 2018](https://www.koreatimes.co.kr/www/tech/2018/05/133_235534.html)], and at last public reporting it had over **700 million ratings** across movies, TV, books and webtoons [[Watcha Pedia homepage](https://pedia.watcha.com/en-US/)]. Cross-medium discovery is genuinely cross-medium: the same user account rates films, series, books and webtoons against the same taste model, so Similar Titles for a film can legitimately surface a manga adaptation.

## How "where to watch" is shown

When a title is licensed on Watcha's own streaming service, the page leads with a **"Play"** button that opens the player directly. When the title is not on Watcha but is on a partnered Korean OTT (Tving, Wavve, Coupang Play, Netflix Korea), the page renders a horizontal strip of service tiles in the mid-section. For titles available nowhere streaming, the strip is absent and the surface degrades to a database-style page (closer to Letterboxd's posture). The where-to-watch strip is intentionally less visually dominant than the rating widget — the design hypothesis is that a Watcha user rating a film they have not seen yet is more valuable to the model than a one-tap deep-link out [[Watcha NamuWiki](https://en.namu.wiki/w/%EC%99%93%EC%B1%A0)].

## Logged-in vs logged-out

Watcha Pedia (the free database product, pedia.watcha.com) is browsable logged-out — title pages render with synopsis, cast, average rating and similar titles. The **predicted-rating widget**, the watchlist, comments authoring and Watcha Party are all gated behind sign-in. Watcha-the-streaming-service is fully gated. The product strategy is clearly to use Pedia as a free funnel into the paid streaming tier — title pages are designed so the value of being logged in is obvious within two seconds.

## Visible failures and complaints

Watcha is a smaller community than Plex, Letterboxd or MAL, so public complaint volume is lower in English. The most-cited business-level failure is that despite **~12 million Watcha Pedia users and a recommendation engine widely regarded as best-in-class in Korea**, Watcha has struggled to convert that into paid streaming subscriptions against Netflix, Tving and Coupang Play [[Screen Daily](https://www.screendaily.com/features/how-koreas-watcha-is-taking-on-streaming-giants-and-readying-a-global-push/5172618.article)]. The product story is "the recommendations are great, but the catalog is smaller than the giants, so the moat doesn't convert".

On the UX side, the **Watcha Party beta** had a notable failure: during a test screening of *Chappie*, concurrent party members crossed 3,000 within minutes and the synchronous-watch infrastructure failed — early proof that synchronous social-watch is harder to operate than to ship [[Watcha NamuWiki](https://en.namu.wiki/w/%EC%99%93%EC%B1%A0)]. The granular half-star rating widget also has a known cold-start UX wrinkle: new users land on a title page and see a predicted rating that is essentially the global average until they have rated 15+ titles, which makes the headline feature feel broken for the first session. Watcha mitigates this with an aggressive onboarding flow that asks the user to rate ~50 titles from a curated list before letting them land in the main app [[Korea Times](https://www.koreatimes.co.kr/www/tech/2018/05/133_235534.html)] [[Watcha Pedia Google Play](https://play.google.com/store/apps/details?id=com.frograms.watcha)].

## Wireframe-style description of the hero band

Two-column layout. Left column: poster (~2:3, ~30% of viewport width). Right column: title (Latin) on line one, Hangul title in a lighter weight directly beneath, then a compact metadata row (genre · country · year · runtime). Below the metadata sits the **rating widget as a row of ten half-stars** spanning the full width of the right column — visually larger than the title text itself. If the user has not rated, the stars are pre-illuminated to the predicted value with a hint label like "Predicted for you". Beneath the stars: four equal-weight icon buttons (Watchlist, Comment, Don't like, More). The community average ("Avg 3.8") sits to the right of the rating widget as a smaller, quieter typographic element.

## What HelpME2C could learn

The most transferable single pattern is **the predicted-rating widget as the primary above-fold element**. HelpME2C's couch-co-watcher archetype is trying to answer "is this worth our evening?", and a confident, model-driven *"we predict your group will rate this 8.4 / 10"* is a much sharper answer than the current synopsis + add button. Crucially, HelpME2C's group-rec moat means this prediction can be **group-aware** in a way Watcha's per-user prediction cannot — *"Predicted for the three of you: 7.9"* surfaces the group-rec engine on the title page directly, without inventing a new UI primitive. This is the closest design idiom to HelpME2C's actual differentiator currently visible anywhere on the market.

The second transferable lesson is the **explicit "Don't like" button** — a first-class negative-signal action that is distinct from "unrated". HelpME2C currently has no way for a user to say "no" to a title without rating it low, which conflates two different states (haven't seen, actively avoid). A "Not for us" button feeding a group-level dismissal would directly improve group recommendation quality and is a cheap UI addition.

The third lesson is more cautionary: Watcha's aggressive ~50-title onboarding works because the *entire* product value proposition is predicated on the recommendation model being warm. HelpME2C is broader (group + cross-medium), so a 50-title cold start would feel disproportionate. The right adaptation is a **shorter group-aware onboarding** — perhaps 10–15 titles per group member, sampled to overlap — that explicitly explains why the rating step is necessary. Watcha's CEO quote is the design north star: users rate carefully *because they know it improves recommendations*. The onboarding screen must make that causal link explicit, not implicit.

## Sources

- [Watcha Pedia homepage (English)](https://pedia.watcha.com/en-US/)
- [Watcha Pedia: Tarot (2024) title page example](https://pedia.watcha.com/en-US/contents/md7Ymz8)
- [Watcha Pedia on Google Play](https://play.google.com/store/apps/details?id=com.frograms.watcha)
- [Watcha NamuWiki entry](https://en.namu.wiki/w/%EC%99%93%EC%B1%A0)
- [Watcha Pedia NamuWiki entry](https://en.namu.wiki/w/%EC%99%93%EC%B1%A0%ED%94%BC%EB%94%94%EC%95%84)
- [Screen Daily: How Korea's Watcha is taking on streaming giants](https://www.screendaily.com/features/how-koreas-watcha-is-taking-on-streaming-giants-and-readying-a-global-push/5172618.article)
- [Korea Times: Watcha creator confident to beat Netflix (2018)](https://www.koreatimes.co.kr/www/tech/2018/05/133_235534.html)
- [BB Media: Watcha availability, business model, partners](https://bb-media.com/platform-essentials/watcha/)
- [Watcha Pedia on the App Store](https://apps.apple.com/us/app/watcha-pedia/id644185507)

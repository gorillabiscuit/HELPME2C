# AniList — competitive benchmark

**Platform:** [anilist.co](https://anilist.co) — modern anime/manga tracker, second-largest after MAL. Open GraphQL API, vibrant developer ecosystem, strong third-party client surface ([docs.anilist.co](https://docs.anilist.co/)).

**Researched:** 2026-05-17. Primary sources include AniList's GraphQL API documentation, GraphQL example libraries that reveal the `Recommendation` object surface, AniList forum threads, Trustpilot, head-to-head third-party comparisons. The actual `anilist.co/signup` page returned **HTTP 403** to scraping — signup details below are partially inferred from API docs and the publicly visible signup-completion flow ([`anilist.co/setup/complete`](https://anilist.co/setup/complete)). Where signup specifics could not be verified live, this is flagged inline.

---

## 1. Signup signals

**Could not directly verify the live signup form** — `anilist.co/signup` returned HTTP 403 to WebFetch on 2026-05-17. AniList's signup page is JS-rendered and search engines also expose limited content from it ([search summary](https://anilist.co/signup)).

What can be confirmed from adjacent sources:

- AniList uses **OAuth2** as its auth primitive ([Authentication | AniList API Docs](https://docs.anilist.co/guide/auth/)). Direct signup is via email + password (with no Google/Apple SSO documented in the same way MAL offers).
- An *account-setup-complete* destination exists at [`anilist.co/setup/complete`](https://anilist.co/setup/complete), suggesting a **multi-step onboarding flow** rather than a single-page form.
- The AniList `User` type in the GraphQL schema is documented at [User Reference | AniList API Docs](https://docs.anilist.co/reference/object/user) — it does **not** expose required `birthday` or `gender` fields at the schema level (those are optional profile attributes, set later).
- Email-change and re-signup flow is a known pain point — a 2024+ forum thread complains *"Can't signup under new email account/change my email"* ([anilist.co/forum/thread/67931](https://anilist.co/forum/thread/67931)) — implying email is the unique identifier and not trivially changeable post-signup.

What is **probably true** but could not be verified live:

- No anime-taste survey at signup (no source confirms one exists; multiple third-party clients use the AniList OAuth flow and none document a taste-elicitation step).
- No demographic gating beyond a likely date-of-birth field for the platform's mature-content toggle.

**Verdict:** flag as "partial evidence." Confirmed AniList uses OAuth2 + a multi-step setup flow; **did not** verify the literal field list on the signup page. No source surfaces a "rate these 10 shows" onboarding gate at AniList signup.

---

## 2. Cold-start UX

There is **no documented preference-elicitation step** at AniList signup or in the first session. As with MAL, the platform's stance is that recommendation quality follows the size of your list:

> *"Users rate the anime they have seen, which trains the recommendation algorithm to suggest new shows that align with their tastes."* — [Oreate AI blog, "Understanding AniList"](https://www.oreateai.com/blog/understanding-anilist-the-criteria-behind-your-anime-recommendations/e122b584be802b80e2ccd3fe25e6b63b)

> *"Status tracking data—monitoring whether you're planning to watch, currently watching, or have completed shows—feeds into the recommendation algorithms over time, so consistently marking certain types of shows as 'completed' leads to similar suggestions."* — same source.

The primary cold-start workaround AniList itself provides is **bulk list import**:

- Import lists from MyAnimeList via XML export
- Import from AniDB via `mylist.json` ([SIMKL docs on AniList import](https://docs.simkl.org/how-to-use-simkl/advanced-usage/import-export-data/importing-to-simkl/supported-platforms/anilist))

So the implicit assumption is: *if you're a new AniList user, you likely already have a MAL list to migrate from.* A truly first-time anime viewer arrives at an empty list and the seasonal-charts / top-100 grid, same shape as MAL.

A community forum thread captures the cold-start frustration directly — see §6.

**Verdict:** no explicit cold-start scaffold. List-import primitive exists but assumes prior history elsewhere.

---

## 3. Group-recommendation feature

**Not supported natively.** A 2024-era AniList forum thread *"Is there a way to watch anime together from a long distance?"* ([anilist.co/forum/thread/32808](https://anilist.co/forum/thread/32808)) confirms that group-watching and group-rec feature requests are surfaced to community rather than to a built-in feature.

What exists is entirely **third-party** built against the public GraphQL API:

- **[AniList Comparison](https://github.com/AbstractUmbra/Anilist-Comparison)** — *"a small webserver to compare two people's Anilist planning entries to find things to watch"*
- **[AniTogether](https://github.com/FichteFoll/anitogether)** — *"Monitor anime progress of multiple people on AniList (to watch them together)"*
- **[Jerry](https://github.com/justchokingaround/jerry)** — *"watch anime with automatic anilist syncing"*, supports Syncplay for synchronized playback

These are user-built one-offs. None merge taste profiles into a group rec model — at best they intersect "planning to watch" lists.

**Verdict:** group recommendation is a gap on AniList. Confirmed by absence of native feature + presence of community-built band-aids.

---

## 4. Cross-medium / cross-domain

AniList covers **anime + manga only**. The site's tagline is literally *"Track, Discover, Share Anime & Manga"* ([anilist.co](https://anilist.co/)). Search surface is split into `/search/anime` and `/search/manga`; no /search/film, /search/tv, or live-action vertical exists ([anilist.co/search/anime](https://anilist.co/search/anime)).

There is **no documented cross-medium recommendation**: no anime↔live-action bridge, no anime↔Western TV bridge, no anime↔film recommendation. The closest AniList comes is the `format` field on the `Media` type (`TV`, `MOVIE`, `OVA`, `ONA`, `SPECIAL`, `MUSIC`, `MANGA`, `NOVEL`, `ONE_SHOT`) — all of which are Japanese animation or manga subtypes ([Media | AniList API Docs](https://docs.anilist.co/guide/graphql/queries/media)).

**Verdict:** anime/manga only. No cross-medium. Same constraint as MAL.

---

## 5. Recommendation algorithm

Here AniList's architecture is **meaningfully more transparent than MAL's**, because the recommendation surface is partially exposed via the public GraphQL API.

### The `Recommendation` object is user-submitted + community-voted

The AniList GraphQL `Media.recommendations` query returns a list of `Recommendation` edges. Each `Recommendation` carries a `rating` field — and that rating is **the net upvote/downvote tally from the community**, not a system-generated relevance score. Example query shape ([Miyo / Postman AniList example](https://miyo.my/docs/graphql-examples/)):

```graphql
query ($id: Int) {
  Media(id: $id) {
    recommendations {
      edges {
        node {
          id
          rating              # community upvote/downvote tally
          mediaRecommendation { id title { romaji english } type format averageScore }
        }
      }
    }
  }
}
```

Independent search aggregation confirms the user-voted nature:

> *"Recommendations are sorted based on how many people approved them, and those votes are displayed underneath the title."* — search aggregation summary, 2026-05-17.

In other words, AniList's per-title "Recommendations" tab is **fundamentally a Goodreads-style user-submitted recommendation list with upvote weighting**, not a learned personalised model. Anyone can submit "if you liked X, also try Y" and the community ranks it.

### What's *not* publicly documented

AniList does **not** publish an engineering blog post describing a personalised-recommendation algorithm (a separate system from the user-voted per-title recs). Most "how it works" articles (e.g. [Oreate AI's "Understanding AniList"](https://www.oreateai.com/blog/understanding-anilist-the-criteria-behind-your-anime-recommendations/e122b584be802b80e2ccd3fe25e6b63b)) conflate the user-voted per-title list with personalised recs. Reasonable inference from API surface + community statements:

- AniList exposes **a rich tag taxonomy** (per-genre + subgenre tags with user-vote weights on each tag's applicability to a title) — this is more granular than MAL's flat genre tags ([Media query reference](https://docs.anilist.co/guide/graphql/queries/media)).
- Personalisation appears to lean on **tag-overlap + community-rating priors**, not deep learning. Quote from [Alibaba product-insights comparative](https://www.alibaba.com/product-insights/ai-powered-anime-rec-engines-like-anilist-vs-myanimelist-why-do-their-recommendations-diverge-so-wildly.html): *"AniList recommends shows that occupy the same conceptual territory as ones you've engaged with whether or not they're popular… AniList asks 'What shares the same DNA?'"*

### Community-weighted framing

> *"AniList—a platform built by and for the anime community—refined its open-source, community-weighted AI model, integrating nuanced behavioral signals beyond watch history. The platform treats recommendation as collaborative sense-making."* — [Alibaba, AniList AI vs MAL](https://www.alibaba.com/product-insights/ai-powered-anime-recommendation-engines-anilist-ai-vs-myanimelist-s-new-algorithm-which-handles-niche-genres-like-iyashikei-better.html)

Caveat: this is third-party marketing-adjacent content. The claim of an "open-source AI model" was **not corroborated** by anything in AniList's official docs or GitHub presence ([AniList GitHub organisation](https://github.com/AniList)). Treat as suggestive, not verified.

### Third-party recommenders built on AniList API

The richness of the AniList GraphQL surface has spawned more third-party recommenders than MAL:

- [Sprout (Ameobea)](https://anime.ameo.dev/) — autoencoder neural model, optionally pulls from AniList lists.
- [AlimU11/Anime-Recommender](https://github.com/AlimU11/Anime-Recommender) — *"Anime recommender system for Anilist user profiles and individual titles."*

**Verdict:** AniList per-title rec = **user-submitted, community-voted "if you liked X" lists** (transparent, partially API-exposed). Personalised rec algorithm = **partially-documented tag-overlap-leaning approach** with no published technical write-up. Materially more transparent than MAL on surface mechanics; equally opaque on personalisation internals.

---

## 6. Visible failure modes

### Trustpilot

AniList holds **2.3 / 5 stars on Trustpilot** — explicitly "Poor" ([www.trustpilot.com/review/anilist.com](https://www.trustpilot.com/review/anilist.com)). Could not pull individual quotes (HTTP 403 on fetch) but aggregated themes:

- Community toxicity / moderation friction
- Database discrepancies from third-party source reliance
- Strict moderation with limited appeal process

### Recommendation-page complaints

A standout AniList forum thread titled directly *"Recommendations page is useless"* exists at [anilist.co/forum/thread/74446](https://anilist.co/forum/thread/74446) — couldn't fetch contents (HTTP 403), but the title alone is a strong signal that user-perception of the rec surface is poor. A second forum thread *"Recommendation system based on your list"* at [anilist.co/forum/thread/26838](https://anilist.co/forum/thread/26838) explicitly asks for a personalised list-aware rec system — implying it doesn't satisfactorily exist today.

### Community / moderation complaints (aggregated)

From SaaSHub / Sitejabber aggregation:

> *"Members are constantly messaging users with insults that go from petty to outright insensitive and even racist, and the community is represented by a very toxic part and extremist moderators, which does not invite sharing opinions or discussions, lowering the offer and quality of Anilist.co."* — [Sitejabber AniList review summary](https://www.sitejabber.com/reviews/anilist.co)

From a forum thread *"Were AniList's social features better, I'd be deleting my…"* ([anilist.co/forum/thread/65988](https://anilist.co/forum/thread/65988)) — a user is on the verge of leaving for social/UX reasons but retains AniList for the rec/track tooling, telling.

### Database quality

> *"AniList relies on third-party sources for some information, which can sometimes lead to discrepancies or outdated information in its database."* — search aggregation summary, 2026-05-17.

### What we could not verify

- Could not extract verbatim user quotes from AniList forum threads — `anilist.co/forum/thread/*` URLs returned HTTP 403 to WebFetch (Cloudflare / JS-render gating). Thread titles are visible via search but body text is not.
- Could not load `trustpilot.com/review/anilist.com` directly (HTTP 403) — relied on Trustpilot's snippet text.
- `site:reddit.com AniList recommendations not personalized` returned **zero indexed results**; Reddit content is largely deindexed from third-party search and could not be sampled.
- AniList does not publish an engineering blog; could not find a technical "how our recs work" post from the AniList team itself.

---

## Summary for HelpME2C product gap-analysis

| Question | AniList answer | HelpME2C gap |
|---|---|---|
| Signup elicits taste? | Multi-step setup flow (verified by URL existence), no taste survey verified | HelpME2C onboarding survey is differentiated |
| Cold-start? | Assumes you'll import from MAL; otherwise empty list | HelpME2C plans active cold-start scaffold |
| Group recommendation? | Not supported; only third-party list-intersection hacks | **Differentiator confirmed** |
| Cross-medium? | Anime/manga only; no live-action TV/film | **Differentiator confirmed** |
| Algorithm transparency? | Per-title recs = community-voted user submissions (transparent); personalisation = undocumented but leans tag-overlap | HelpME2C theme-based taxonomy is potentially competitive — AniList tag taxonomy is the closest competitor on this axis |
| Failure modes documented? | Forum thread titled "Recommendations page is useless"; 2.3/5 Trustpilot; community toxicity dominant complaint | AniList rec UX is a known sore spot — opportunity |

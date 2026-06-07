# Platform: Apple TV / Apple TV+ (in-app title page on tvOS, macOS, iOS, and tv.apple.com)

**One-line key takeaway:** Apple's title page is a quiet, full-bleed cinematic surface that trusts a single dominant Play CTA, generous whitespace, and rich-but-restrained metadata (cast filmography links, "What is…?" intro copy, Rotten Tomatoes score) — a pattern aspirationally portable to HelpME2C, but only the *restraint and metadata depth*, not the licensed editorial visuals.

## Information hierarchy

### Above the fold (no scroll)
- Full-bleed cinematic key art / backdrop (often a hand-crafted poster composition, not a film still), edge-to-edge, sometimes Ken-Burns animated ([Design+Code](https://designcode.io/ui-design-handbook-designing-for-apple-tv/))
- Title logo art (large, designed wordmark)
- Sparse metadata under the title: year · maturity rating · seasons or runtime · audio/CC badges
- Single dominant **Play** button (filled white pill) — secondary "+" (add to Up Next) and trailer affordances
- Rotten Tomatoes Tomatometer score for film/TV (via macOS TV app and tv.apple.com) ([Apple Community](https://discussions.apple.com/thread/252423218))
- One-line tagline or subtitle, sometimes the "What is [show] about?" question framing as a heading for the synopsis

### Mid-page (one scroll)
- Synopsis paragraph (longer than Netflix; often 4–6 lines, not aggressively truncated)
- For series: **Episodes** strip — horizontal-scroll row of episode tiles with stills, titles, runtimes
- **Cast & Crew** row — large circular/portrait headshots with names; *each headshot is a link* to a per-person filmography page within the app ([Apple TV — Cast & Crew](https://tv.apple.com/us/collection/cast--crew/uts.col.CastAndCrew.umc.cmc.58u4yoh3wsvq09gzti8lbb7bq); [9to5Mac](https://9to5mac.com/2024/08/02/tvos-18s-insight-feature-is-a-lot-like-prime-videos-x-ray-but-with-a-secret-weapon/))
- **Trailers** / extras row (for Apple Originals, "bonus content" is a partner-defined classification — trailers, behind-the-scenes, deleted scenes) ([Apple TV for Partners](https://tvpartners.apple.com/support/3721-deliver-previews-bonus-content))

### Bottom of page (deep scroll)
- **You May Also Like** / "Related" row — algorithmic recs in the same poster grid
- Detailed credits — full cast list, creators, executive producers, studios
- Languages, subtitles, accessibility features
- Available "Ways to Watch" or pricing tier for non-Originals (the unified-search "anywhere you can watch this" panel is the defining Apple TV app feature — see below)

## Sections present (top → bottom, with verbatim names)

1. Hero (full-bleed key art, often Ken Burns)
2. Title + metadata + Play CTA + Tomatometer
3. Synopsis ("What is [title] about?" framing on many Apple Originals)
4. Episodes (for series)
5. Cast & Crew
6. Trailers / Extras / Bonus Content
7. You May Also Like / Related
8. Additional Details (creators, languages, accessibility)
9. Ways to Watch (for non-Originals, when the title is not on Apple TV+)

## Primary user actions (in visual prominence order)

1. **Play** — large filled pill, white on dark; the single hero CTA
2. **+ Up Next** — outlined pill, adds to watchlist queue ([Apple Support](https://support.apple.com/en-us/118593))
3. **Trailer** — outlined button or play-on-poster affordance
4. **Buy / Rent** (for transactional titles) — replaces Play when the user doesn't have access
5. **Open in [provider app]** — for unified-search hits where Apple isn't the licensor

## How recommendations are surfaced

Apple TV's "You May Also Like" / Related row sits low on the page and is presented as a quiet, unannotated grid — no per-tile reason hint, no match score, no tag chips. The recommendation engine is comparatively opaque; Apple compensates with **Cast & Crew filmography links** as a discovery surface. Tapping an actor's headshot opens a per-person page listing everything they're in, which the user can browse — this is effectively a *user-driven similarity discovery* mechanism orthogonal to algorithmic recs. The **InSight** feature (tvOS 18, 2024) extends this in-playback: swipe down on the remote and you see on-screen actors and music in real time, with click-through to filmography and Apple Music ([TechCrunch](https://techcrunch.com/2024/06/10/apple-tv-insight-feature-wwdc-2024/); [iMore](https://www.imore.com/music-movies-tv/apple-tv/apple-tvs-insight-is-its-best-feature-in-years-even-if-it-did-rip-off-prime-video)). InSight is currently limited to Apple TV+ Originals.

## How "where to watch" is shown

This is the Apple TV app's defining trick: for content Apple doesn't own (most of the catalogue when you search), the title page surfaces a **"Ways to Watch"** panel listing every service licensed to stream the title — Netflix, Max, Hulu, Disney+, etc — with deep-link launchers into those apps ([Apple Support](https://support.apple.com/en-us/118593)). For Apple TV+ Originals, this panel collapses to "Apple TV+" with the Play CTA. For transactional titles (iTunes legacy), prices appear inline (HD, 4K, rent vs buy). This is the closest big-platform analogue to HelpME2C's "where to watch" card and is worth studying carefully — Apple treats provider availability as a *first-class structured field*, not an afterthought.

## Logged-in vs logged-out

On tv.apple.com (web), a non-subscriber can browse most title pages and watch trailers, but the **Play** button transforms into "Try It Free" / "Subscribe" for Apple TV+ exclusives. On tvOS, the app prompts subscription gating inline. Up Next requires Apple ID. For non-Original content (iTunes catalogue), pricing is shown to all users; purchase requires sign-in. There is no "match" or personalisation surface for logged-out users; the page is essentially editorial. This is similar to Netflix's posture except Apple is less aggressive about wall-gating browse.

## Visible failures and complaints

The Apple TV app redesign (pre-tvOS 26) drew sustained criticism for prioritising aesthetics over information density. Tom's Guide called the redesign one they "hate", citing reduced clarity in the home view ([Tom's Guide](https://www.tomsguide.com/opinion/apples-tv-app-gives-apple-tv-a-new-look-and-i-hate-it)). Users on Apple Community forums consistently complain about (a) autoplaying trailers above the icon row that cannot be silenced without diving into Accessibility → Motion → Auto-Play Video Previews ([Apple Community thread](https://discussions.apple.com/thread/253553453); [thread](https://discussions.apple.com/thread/256078853)), (b) trailers playing but full content failing to launch due to entitlement / subscription state mismatches ([Apple Community thread](https://discussions.apple.com/thread/253334476); [thread](https://discussions.apple.com/thread/255481334)), and (c) absent or stale Rotten Tomatoes scores on some title pages ([Apple Community thread](https://discussions.apple.com/thread/252423218)).

The tvOS 26 "Liquid Glass" redesign (Sept 2025) repositioned title posters as vertical-orientation cinematic art, allowing more titles per screen ([Apple Newsroom](https://www.apple.com/newsroom/2025/06/apple-tv-brings-a-beautiful-redesign-and-enhanced-home-entertainment-experience/); [AppleInsider](https://appleinsider.com/articles/25/06/18/tvos-26-hands-on-sleek-liquid-glass-redesign-new-control-center-and-more)). Pushback so far has focused on hardware gating (only 2nd/3rd-gen Apple TV 4K supports Liquid Glass) and concerns about how the translucency style will age ([MacRumors](https://www.macrumors.com/2025/06/09/tvos-26-liquid-glass-redesign-older-models/); [Macworld](https://www.macworld.com/article/2808771/sorry-folks-the-fancy-apple-tv-redesign-is-for-new-models-only.html)). Critics note the title page itself is the least controversial part of the app — most criticism targets navigation and home; the title page's restraint has aged better than Netflix's.

## Wireframe-style description of the hero band

A full-bleed backdrop fills roughly the top 65–70% of the viewport — typically a hand-composed key-art frame (not a film still), often with the show's hero character(s) and a subtle Ken-Burns slow zoom. A dark gradient covers the lower third for legibility. The title's *logo wordmark* sits anchored low-left over the gradient, sized prominently (around 30–40% of viewport width on tvOS). Immediately beneath: a thin metadata line (year · rating · season count · audio badges), then the synopsis lead-in (often phrased as the question **"What is [title] about?"**), then the single white-pill **Play** button with an outlined **+ Up Next** beside it. Rotten Tomatoes Tomatometer score appears as a small inline badge on macOS / web. No persistent chrome — the navigation fades over the hero and re-appears on scroll. The overall feeling is "movie poster, not product page."

## What HelpME2C could learn (with explicit "NOT applicable" notes)

**NOT applicable (Apple-scale-only):** The full-bleed hand-composed cinematic key-art requires editorial/design investment per title — Apple curates a tight catalogue (a few hundred Originals) and licenses key-art per show; HelpME2C will never license, generate, or curate at this fidelity for a long-tail catalogue derived from TMDB/AniList. Don't attempt full-bleed editorial hero art. The **InSight** in-playback overlay is irrelevant — we don't host playback. Apple's **"Ways to Watch"** panel is rich because Apple has commercial relationships with every major streamer for deep-linking and indexing; HelpME2C's "where to watch" must rely on JustWatch / TMDB watch-provider data and may have lower completeness. The **per-actor filmography page** is a meaningful piece of routing surface area (we'd need person pages); a viable Phase-2 feature but not MVP.

**Transferable patterns:** (1) The **single dominant CTA + restrained secondaries** discipline is universal and free — for HelpME2C, the "Watch on [provider]" or "Add to watchlist" button can carry the same hierarchy. (2) **Generous synopsis space** rather than aggressive truncation — Apple trusts the reader; for a recsys this serves the "should I watch this?" question better than Netflix's 2-line stub. (3) **Cast headshots with hover/click to filmography** is the cheapest "discovery via adjacency" pattern available — even without a person page (yet), linking actor names to a search-by-actor view is high-leverage and a known cross-medium bridge (a voice actor's anime credits next to their Western roles). (4) The **"What is [title] about?" question heading** is a tiny copywriting trick that makes the synopsis feel like an answer rather than boilerplate — directly portable. (5) The **Rotten Tomatoes inline badge** validates a third-party-score affordance; HelpME2C can carry an MAL / IMDb / RT inline score with similar visual weight without re-deriving anything. (6) **Quiet restraint over autoplay** — Apple's redesigns have been criticised for autoplay too, but the title page itself doesn't blast a trailer; respect this. (7) **"Ways to Watch" as a structured first-class section** — this is exactly the shape HelpME2C's "Where to watch" card should take, not a footnote.

**Anime treatment:** Apple TV+ has minimal anime exposure, so we can't observe a treatment. The platform's design language is uniform across content types — there's no special "anime mode". For HelpME2C, this is *permission*, not a recipe: a single design language for both mediums is defensible. Where Apple lacks anime entirely, HelpME2C's theme-bridging across mediums is *the* differentiator; Apple's silence here is the gap, the same as Netflix.

## Sources

- [Apple TV brings a beautiful redesign and enhanced home entertainment experience — Apple Newsroom](https://www.apple.com/newsroom/2025/06/apple-tv-brings-a-beautiful-redesign-and-enhanced-home-entertainment-experience/)
- [tvOS 26 hands on: Sleek Liquid Glass redesign — AppleInsider](https://appleinsider.com/articles/25/06/18/tvos-26-hands-on-sleek-liquid-glass-redesign-new-control-center-and-more)
- [Apple TV+ introduces InSight at WWDC 2024 — TechCrunch](https://techcrunch.com/2024/06/10/apple-tv-insight-feature-wwdc-2024/)
- [tvOS 18's InSight is like Amazon's X-Ray, but with a secret weapon — 9to5Mac](https://9to5mac.com/2024/08/02/tvos-18s-insight-feature-is-a-lot-like-prime-videos-x-ray-but-with-a-secret-weapon/)
- [Apple TV's Insight is its best feature in years — iMore](https://www.imore.com/music-movies-tv/apple-tv/apple-tvs-insight-is-its-best-feature-in-years-even-if-it-did-rip-off-prime-video)
- [Apple's TV app gives Apple TV a new look — and I hate it — Tom's Guide](https://www.tomsguide.com/opinion/apples-tv-app-gives-apple-tv-a-new-look-and-i-hate-it)
- [tvOS 26 Liquid Glass Redesign Excludes Older Apple TV Models — MacRumors](https://www.macrumors.com/2025/06/09/tvos-26-liquid-glass-redesign-older-models/)
- [Sorry, folks: The fancy Apple TV redesign is for new models only — Macworld](https://www.macworld.com/article/2808771/sorry-folks-the-fancy-apple-tv-redesign-is-for-new-models-only.html)
- [Watch baseball, soccer, and Formula 1 in the Apple TV app — Apple Support](https://support.apple.com/en-us/118593)
- [Deliver previews and bonus content — Apple TV for Partners](https://tvpartners.apple.com/support/3721-deliver-previews-bonus-content)
- [Apple TV Cast & Crew collection — tv.apple.com](https://tv.apple.com/us/collection/cast--crew/uts.col.CastAndCrew.umc.cmc.58u4yoh3wsvq09gzti8lbb7bq)
- [Apple Community: Stop autoplay of trailers above the icons](https://discussions.apple.com/thread/253553453)
- [Apple Community: Apple TV app does not stop auto-playing](https://discussions.apple.com/thread/256078853)
- [Apple Community: Apple TV + shows trailer but show not playing](https://discussions.apple.com/thread/253334476)
- [Apple Community: Apple TV+ app only shows trailer but not content](https://discussions.apple.com/thread/255481334)
- [Apple Community: Why aren't there any ratings on movies (Rotten Tomatoes)](https://discussions.apple.com/thread/252423218)
- [Designing for tvOS — Apple Developer](https://developer.apple.com/design/human-interface-guidelines/designing-for-tvos)
- [Designing for Apple TV — Design+Code](https://designcode.io/ui-design-handbook-designing-for-apple-tv/)
- [OTT app design lessons from Apple's accessibility backlash — Wiztivi](https://www.wiztivi.com/blog/ott-ui-design-accessibility-lessons)

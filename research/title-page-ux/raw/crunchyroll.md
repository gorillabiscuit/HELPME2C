# Platform: Crunchyroll

**One-line key takeaway:** Crunchyroll's series page is the canonical anime watch-funnel — a dark, cinematic key-art hero collapses straight into a paywall-aware episode list, while the rest of the page (synopsis, "More Like This", source-material metadata) is intentionally thin because the platform assumes the user came to *watch*, not to *decide*.

## Information hierarchy

### Above the fold (no scroll)
- Full-bleed dark hero with blurred key-art background; localised English title overlaid in large display type; under-title chips/badges (rating e.g. "TV-14", release year, season count, average star rating out of 5, "Subtitled" / "Dubbed" indicator) ([Kurt Henderson — Crunchyroll UI Redesign](https://www.kurthenderson.com/blog/crunchyroll-redesign), [Crunchyroll Help — Audio language](https://help.crunchyroll.com/hc/en-us/articles/20762279453076-How-do-I-change-the-audio-language)).
- Primary action: a large red **"Start Watching S1 E1"** button (label changes to "Resume" / "Continue Watching S2 E4" once progress exists).
- Secondary actions immediately adjacent: **"Add to Watchlist"** (heart/plus icon), **"Add to Crunchylist"** (Premium-only custom-lists button), share icon ([Crunchyroll Help — Watchlist & Crunchylist](https://help.crunchyroll.com/hc/en-us/articles/18184740052628-How-do-I-add-shows-to-my-Watchlist-Crunchylist)).
- Short truncated synopsis (≈2 lines) with a "Read More" expand.

### Mid-page (one scroll)
- **"Episodes"** section with a **season dropdown** at top-left. The dropdown is the centre of gravity for the entire page — it confusingly mixes language ("Season 1 (English Dub)" listed as a separate "season" from "Season 1") and arc/cour splits ([Crunchyroll Help — find dubbed content](https://help.crunchyroll.com/hc/en-us/articles/22743917983892-How-can-I-find-dubbed-content-only), [HowToGeek — Crunchyroll's big problem](https://www.howtogeek.com/this-anime-streaming-service-has-a-big-problem/)).
- Episode cards: thumbnail + episode number + title + duration + premium-lock padlock for paywalled episodes. New simulcast episodes carry a yellow "NEW" badge.
- Continue-watching indicator (progress bar across thumbnail) per episode if logged in.

### Bottom of page (deep scroll)
- **"More Like This"** carousel — Crunchyroll's only on-page recommendation surface (no genre/cast/studio facets, just one horizontal rail).
- **"You May Also Like"** / additional carousel pulled from editorial collections in some skins.
- Footer / global nav (Browse, Simulcasts, News, Manga, Games, Store, Help).
- No comments. No reviews. No cast page. ([Escapist — Crunchyroll comments removed](https://www.escapistmagazine.com/what-happened-to-crunchyroll-comments-explained/), [Kidscreen — Crunchyroll removes comments](https://kidscreen.com/2024/07/15/crunchyroll-removes-its-comments-section/)).

## Sections present (top → bottom, with verbatim names)

1. **Hero band** (no label) — key art, title, badges, primary CTA
2. **About** / synopsis (often unlabelled — sits directly under the action row)
3. **Episodes** (with **Season** dropdown)
4. **Extras** (only on titles that have trailers / promos / "PVs" — typically absent on most series)
5. **More Like This**
6. **You May Also Like** (sometimes, on a subset of titles)

Crunchyroll does NOT, on the public web series page, show: a "Cast" section, "Crew" / Director / Studio breakdowns (studio is often missing from the page entirely), a "Where to Watch" section (because Crunchyroll *is* the where-to-watch), a "Reviews" tab (removed July 2024), a "Comments" / discussion section (removed July 2024), or a dedicated "News" tab per-title.

## Primary user actions (in visual prominence order)

1. **Start Watching / Resume** (large red CTA — the page exists for this click)
2. **Add to Watchlist** (one-tap heart/plus, the canonical "save for later")
3. **Add to Crunchylist** (Premium-gated custom multi-list — up to 10 lists × 100 titles each ([Crunchyroll Help — Crunchylist](https://help.crunchyroll.com/hc/en-us/articles/18184740052628-How-do-I-add-shows-to-my-Watchlist-Crunchylist)))
4. **Rate** (5-star rating — the comments system was killed in July 2024 but star ratings were explicitly retained ([Escapist — Comments removed](https://www.escapistmagazine.com/what-happened-to-crunchyroll-comments-explained/)))
5. **Switch season / dub track** (season dropdown — the de-facto dub/sub switch on the page)
6. **Share** (social share)

There is no "Mark as watched" surface from the series page itself — watch progress is implicit via the player, with a separate help article for marking shows watched ([Crunchyroll Help — mark episodes watched](https://help.crunchyroll.com/hc/en-us/articles/31320247305748-How-do-I-mark-episodes-seasons-and-shows-as-watched)).

## How recommendations are surfaced

Crunchyroll surfaces recommendations almost exclusively through a single **"More Like This"** horizontal carousel at the bottom of the series page. There is no "Because you watched X", no genre-pivot rail, no "Same studio" rail, no "If you liked the manga…" — those are all on the *home* page or browse pages, not on the title page. The recommendation algorithm is opaque and not segmented by signal (the way Netflix segments into multiple themed rows, or AniList by tag overlap). Industry coverage frames Crunchyroll's discovery as weak relative to its catalogue size — "more like this" is described as something users "can play with on watchlists" rather than a confident editorial layer ([VeePN — Crunchyroll alternatives](https://veepn.com/blog/crunchyroll-alternatives/)). The implicit assumption is that anime fans use *off-platform* discovery (MAL, AniList, r/anime) and arrive at Crunchyroll already knowing what they want — the title page is the booking page, not the deciding page.

## How "where to watch" is shown

Crunchyroll is itself the answer to "where to watch", so there is no "available on" surface — but the tiering replaces it. Until 31 December 2025, the page exposed three viewing states on each episode card: (1) **free with ads** (open, no padlock), (2) **Premium** (padlock + "PREMIUM" badge, clicking opens an upsell), and (3) **simulcast / early-access** (Premium-only for the first 7 days after airing, then sometimes released to free) ([Gizmodo — Crunchyroll ends free streaming](https://gizmodo.com/crunchyroll-ends-free-streaming-with-ads-1848709335), [Cord Cutters News — free plan shutdown](https://cordcuttersnews.com/crunchyroll-is-shutting-down-its-free-ad-supported-plan/)). From 1 January 2026 the free-with-ads tier was discontinued entirely on the main service — every episode is now paywalled, with select shows still available free via Crunchyroll's YouTube channel, Pluto TV, The Roku Channel, and Sling ([Yahoo Entertainment — free plan ending](https://www.yahoo.com/entertainment/tv/articles/crunchyroll-ending-free-plan-heres-231700581.html)). Region-locking is enforced silently: licensing differs per country, so EU users see catalogue holes and the page shows "This show is not available in your region" rather than redirecting to a competitor ([Crunchyroll Help — region restrictions](https://help.crunchyroll.com/hc/en-us/articles/43269213267092-Why-can-t-I-watch-certain-shows-in-my-region)).

## Logged-in vs logged-out

Logged-out: the page still loads, key art and synopsis render, but the **"Start Watching"** CTA routes to a sign-up wall and **"Add to Watchlist"** is gated. The free trial (7 days Premium) is heavily promoted via banner ([Crunchyroll Premium](https://www.crunchyroll.com/premium)). Logged-in free users (until end of 2025): same page, but premium-locked episodes show padlocks with inline upsell on click. Logged-in Premium: padlocks disappear, simulcast episodes light up the moment they go live in Japan, "Crunchylist" becomes available, and any in-progress show shows a "Continue Watching S2 E4" CTA replacing the default "Start Watching S1 E1". Watch progress, watchlist state and Crunchylist membership all decorate the episode cards.

## Anime-specific conventions

Crunchyroll's title page encodes several anime-native conventions HelpME2C will want to mirror:

- **Title localisation:** the page leads with the English-localised title; the Japanese / romaji original is generally **not shown on the series page** — this is a frequent complaint among Japanese-learners and is a contrast to AniList/MAL which expose all three forms ([Crunchyroll Forum — show original Japanese title](https://www.crunchyroll.com/forumtopic-1012837/how-can-i-see-the-anime-original-title-instead-of-english-version)).
- **Dub vs sub:** post-Funimation-merger (Funimation shut down April 2024), Crunchyroll inherited a large dub catalogue and chose to expose dubs as *separate "seasons"* in the season dropdown rather than as an audio-track toggle on a unified season ([Crunchyroll Help — find dubbed content](https://help.crunchyroll.com/hc/en-us/articles/22743917983892-How-can-I-find-dubbed-content-only)). Audio switching exists in-player via the gear icon but **the page-level UX still treats "Season 1 (English Dub)" as a sibling of "Season 1"**, which industry critics and a popular browser extension ("Crunchyroll With Better Seasons") explicitly try to fix ([Chrome Web Store — Better Seasons](https://chromewebstore.google.com/detail/crunchyroll-with-better-s/ianobidcnpbeejlkclkfacnipclgiiak)). Crunchyroll has publicly committed to a unified audio-switcher rollout but it is not universal.
- **Simulcast indicator:** new simulcast episodes carry a yellow "NEW" badge on the episode card. There is **no per-title countdown** to the next episode on the series page itself — countdowns live only on the global Simulcast Calendar ([Crunchyroll Simulcast Calendar](https://www.crunchyroll.com/simulcastcalendar), [Crunchyroll Help — release calendar](https://help.crunchyroll.com/hc/en-us/articles/22745725145364-Is-there-a-release-calendar-available)). This is widely considered a miss — third-party extensions exist precisely to add per-show countdowns ([Release Calendar Filter extension](https://chromewebstore.google.com/detail/release-calendar-filter-f/epkclcbkefpikbpopcpjjlbajhnglged)).
- **Source-material badge:** Crunchyroll does **not** display "Adaptation from manga / light novel / original" badging on the series page — a notable omission given the platform now operates Crunchyroll Manga (launched October 2025, [Newsweek — Crunchyroll flips to manga](https://www.newsweek.com/entertainment/crunchyroll-flips-page-manga-10856335), [Animation Magazine — manga app at CES 2025](https://www.animationmagazine.net/2025/01/crunchyroll-announces-new-manga-app-at-ces/)). The cross-link between anime and manga is bidirectional inside the *manga* app, but on the canonical web series page there is no "Read the manga" CTA.
- **Season / cour / part:** the season dropdown is the only structural navigation. There is no "cour" awareness — multi-cour seasons like Jujutsu Kaisen S2 are often split into separate "seasons" or lumped under one, inconsistently. Films get pinned in the season dropdown as one-episode "seasons" (the infamous Spy×Family *Code: White* listing ([HowToGeek — Crunchyroll's big problem](https://www.howtogeek.com/this-anime-streaming-service-has-a-big-problem/))).
- **Studio / Director / Voice actors:** essentially absent from the page. There is no cast/crew section on the public web series page.

## Visible failures and complaints

The Funimation merger (completed by Funimation's April 2024 shutdown) is the single biggest source of UX debt. A 2023 Anime News Network survey found **42% of former Funimation users felt they received less value post-migration** due to missing content or reduced customer support ([Anime News Network — Funimation merger explained](https://www.animenewsnetwork.com/feature/2022-03-11/what-we-know-about-the-funimation-crunchyroll-merger/.183405)). Specific persistent complaints: lost watch progress and watchlists that did not migrate; pre-2015 Funimation-exclusive dubs that never appeared on Crunchyroll; loss of Funimation's curated collections, behind-the-scenes featurettes, and cast interviews — none of which were ported to a Crunchyroll-equivalent "Extras" surface ([Bleeding Fool — is the merger good?](https://bleedingfool.com/news/is-the-crunchyroll-funimation-merger-good-for-anime-fans/), [Shortform — merger mistake?](https://www.shortform.com/blog/crunchyroll-and-funimation/)).

In July 2024 Crunchyroll removed user comments and reviews platform-wide after review-bombing of *Twilight Out of Focus* and *My Deer Friend Nokotan* — citing "a safe and respectful community environment" but widely understood as a response to homophobic harassment campaigns ([CBR — Crunchyroll comment removal](https://www.cbr.com/crunchyroll-comment-removal-fan-confusion/), [Kidscreen — comments removed](https://kidscreen.com/2024/07/15/crunchyroll-removes-its-comments-section/), [Popverse — safe community](https://www.thepopverse.com/anime-crunchyroll-removes-comments-from-site-twilight-out-of-focus-review-bombed-july-2024)). The community split — many agreed the harassment was real, but argued the right answer was moderation, not deletion. Star ratings were retained but the page lost its community layer entirely. Compounding this, the *Fall 2025* anime season triggered a major subtitle quality crisis: Crunchyroll reportedly migrated subtitling from Aegisub to the Israeli AI-tooling vendor OOONA, producing missing English subs, wrong-language subs (Portuguese / Thai shown where English was expected), and abandoned typesetting on signs/lyrics ([Anime News Network — internal system problems](https://www.animenewsnetwork.com/news/2025-10-09/crunchyroll-cites-internal-system-problems-regarding-subtitles-for-fall-2025-anime/.229669), [ScreenRant — over its head](https://screenrant.com/crunchyroll-anime-streaming-fall-2025-season-fail-problem-subtities-controversy/), [Daiz.moe — destroying its subtitles](https://daiz.moe/crunchyroll-is-destroying-its-subtitles-for-no-good-reason/)). Crunchyroll publicly attributed the issues to "internal systems" rather than vendors or AI.

Reliability and pricing complaints round out the picture. TrustPilot reviews and aggregator data put Crunchyroll at a "Real Score" of **3.5/5 across 58,500 reviews** despite a higher App Store score of 4.5/5, suggesting power-user dissatisfaction ([VerifiedAppReviews — Crunchyroll](https://verifiedappreviews.com/app/crunchyroll/)). Frequent complaints: mid-episode app crashes, ad-frequency (pre-2026 free tier — 5 minutes of content followed by 10 ads, then repeat), subscriptions failing to register, and price increases of roughly 10–15% across tiers in 2022 and 2023 ([SmartCustomer — Crunchyroll reviews](https://www.smartcustomer.com/reviews/crunchyroll.com), [TrustPilot — Crunchyroll](https://www.trustpilot.com/review/www.crunchyroll.com)). The October 2025 launch of mandatory Crunchyroll Manga bundling — no separate manga-only subscription — drew its own wave of pushback ([ScreenRant — manga app backlash](https://screenrant.com/crunchyroll-manga-new-app-problem-backlash-subscription-cost/)).

## Wireframe-style description of the hero band

Full-bleed darkened hero with the show's key art bleeding off the right edge and a vertical gradient ramping from transparent at top to near-black at the synopsis line. On the left: the English title in large display weight; below it a horizontal chip row — content rating (e.g. "TV-14"), year (e.g. "2024"), season count, star rating ("4.9 ★"), audio indicator ("Sub | Dub"). Beneath the chips, the truncated synopsis (~2 lines) with a "Read More" affordance. A red "Start Watching S1 E1" (or "Resume S2 E4") button anchors the action row, with secondary icon buttons — Watchlist (heart/plus), Crunchylist (list icon, Premium only), share — sitting to its right. No tabs above the fold; the page is a single scroll, not a tabbed interface.

## What HelpME2C could learn

HelpME2C's anime title pages currently looking identical to its TV title pages is **partially defensible** — Crunchyroll itself proves you can run an anime-only product with a layout that's structurally indistinguishable from a Western streaming title page (Netflix, Disney+, Hulu all converge on the same hero → episode list → "more like this" pattern). The anime-native pieces that genuinely *don't* appear on a Western TV page and that HelpME2C should consider adding are narrow: (1) **dub-vs-sub awareness** — even if HelpME2C is not the watch surface, surfacing "Dub available" alongside "Sub only" as a metadata badge respects what anime users actually filter on, (2) **source material** — "Adaptation from manga / light novel / web novel / original" is the metadata anime fans want and that Crunchyroll *fails* to expose, making it a low-effort differentiator, (3) **simulcast / airing status** — "Airing now, new episode every Sunday" is genre-defining metadata; Crunchyroll only ships this on a separate calendar, leaving an opening, and (4) **Japanese / romaji title** alongside English — a recurring Crunchyroll user complaint that costs nothing to fix.

The anti-patterns to avoid are clear and well-evidenced. Do **not** model dub-vs-sub as separate "seasons" — every external observer treats this as a UX bug; a single audio-track toggle (or even a metadata badge for non-watch products like HelpME2C) is the right shape. Do **not** ship a "More Like This" rail with no algorithmic transparency — Crunchyroll's single opaque carousel is widely treated as a discovery weakness, and HelpME2C's whole moat is the *opposite* (theme-based, cross-medium, explainable). HelpME2C's BridgeCard "shares themes X, Y, Z" framing is exactly the credibility layer Crunchyroll lacks, and it should be louder on anime pages than it currently is on TV pages, not quieter.

Crunchyroll-specific patterns that **don't** apply to HelpME2C: subscription gating / padlock icons / "PREMIUM" badges (HelpME2C is not the watch surface — JustWatch-style "Available on Crunchyroll / Netflix / HiDive" affiliate-out is the right pattern), in-player audio/subtitle switching, region-locked silent failures, and the comment-section question (Crunchyroll's removal proves a comments layer is liability without active moderation; HelpME2C's registered-users-only posture and group-rec scope mean it should *not* default-on per-title comments). The cross-medium anime↔manga link that Crunchyroll Manga gestures at but does not actually wire from the anime page is, in fact, exactly the kind of bridge HelpME2C's cross-medium taxonomy is built for — the anime-watcher-with-a-non-anime-partner archetype maps cleanly to a "watched the anime, here are three TV dramas with the same themes" surface that no Crunchyroll/Funimation/HiDive offers natively.

## Sources

- [Kurt Henderson — Crunchyroll UI Redesign](https://www.kurthenderson.com/blog/crunchyroll-redesign)
- [Matthew Akins — Design Pattern Analysis: Crunchyroll](https://akins-matthew.medium.com/design-pattern-analysis-crunchyroll-cb90a577949a)
- [Crunchyroll Help — How do I change the audio language?](https://help.crunchyroll.com/hc/en-us/articles/20762279453076-How-do-I-change-the-audio-language)
- [Crunchyroll Help — How do I change the subtitle language?](https://help.crunchyroll.com/hc/en-us/articles/22934571555476-How-do-I-change-the-subtitle-language)
- [Crunchyroll Help — How do I add shows to my Watchlist & Crunchylist?](https://help.crunchyroll.com/hc/en-us/articles/18184740052628-How-do-I-add-shows-to-my-Watchlist-Crunchylist)
- [Crunchyroll Help — How can I find dubbed content only?](https://help.crunchyroll.com/hc/en-us/articles/22743917983892-How-can-I-find-dubbed-content-only)
- [Crunchyroll Help — How do I mark episodes, seasons, and shows as watched?](https://help.crunchyroll.com/hc/en-us/articles/31320247305748-How-do-I-mark-episodes-seasons-and-shows-as-watched)
- [Crunchyroll Help — Why can't I watch certain shows in my region?](https://help.crunchyroll.com/hc/en-us/articles/43269213267092-Why-can-t-I-watch-certain-shows-in-my-region)
- [Crunchyroll Help — Is there a release calendar available?](https://help.crunchyroll.com/hc/en-us/articles/22745725145364-Is-there-a-release-calendar-available)
- [Crunchyroll Help — Why is Crunchyroll Disabling Comments?](https://help.crunchyroll.com/hc/en-us/articles/28154006791188-Why-is-Crunchyroll-Disabling-Comments)
- [Crunchyroll — Simulcast Calendar](https://www.crunchyroll.com/simulcastcalendar)
- [Crunchyroll — Premium Free Trial Offer](https://www.crunchyroll.com/premium)
- [Crunchyroll Forum — How can I see the anime original title instead of English version](https://www.crunchyroll.com/forumtopic-1012837/how-can-i-see-the-anime-original-title-instead-of-english-version)
- [Anime News Network — What We Know About the Funimation-Crunchyroll Merger](https://www.animenewsnetwork.com/feature/2022-03-11/what-we-know-about-the-funimation-crunchyroll-merger/.183405)
- [Anime News Network — Crunchyroll Cites Internal System Problems Regarding Subtitles for Fall 2025](https://www.animenewsnetwork.com/news/2025-10-09/crunchyroll-cites-internal-system-problems-regarding-subtitles-for-fall-2025-anime/.229669)
- [The Escapist — What Happened to Crunchyroll Comments? Explained](https://www.escapistmagazine.com/what-happened-to-crunchyroll-comments-explained/)
- [The Escapist — Crunchyroll's Removed Comments Section Is a Huge Insult to Anime Fans](https://www.escapistmagazine.com/crunchyrolls-removed-comments-unforgivable-insult-anime-fans/)
- [Kidscreen — Crunchyroll removes its comments section](https://kidscreen.com/2024/07/15/crunchyroll-removes-its-comments-section/)
- [CBR — Crunchyroll Reveals Why It Removed All Site Comments Amid Major Fan Confusion](https://www.cbr.com/crunchyroll-comment-removal-fan-confusion/)
- [CBR — Crunchyroll Beta Just Gave Viewers a Whole New Kind of Watchlist](https://www.cbr.com/crunchyroll-beta-viewers-new-watchlist/)
- [Popverse — Crunchyroll removes all comments](https://www.thepopverse.com/anime-crunchyroll-removes-comments-from-site-twilight-out-of-focus-review-bombed-july-2024)
- [ScreenRant — Anime's Fall 2025 Season Proves Crunchyroll Is in Over Its Head](https://screenrant.com/crunchyroll-anime-streaming-fall-2025-season-fail-problem-subtities-controversy/)
- [ScreenRant — Crunchyroll Manga New App Backlash](https://screenrant.com/crunchyroll-manga-new-app-problem-backlash-subscription-cost/)
- [ScreenRant — Crunchyroll Disables Comments Due To Safety and Toxicity Concerns](https://screenrant.com/crunchyroll-disables-comments-safety-toxicity-review-bombing/)
- [HowToGeek — This Anime Streaming Service Has a Big Problem](https://www.howtogeek.com/this-anime-streaming-service-has-a-big-problem/)
- [Gizmodo — Crunchyroll Ends Free Streaming With Ads](https://gizmodo.com/crunchyroll-ends-free-streaming-with-ads-1848709335)
- [Cord Cutters News — Crunchyroll Is Shutting Down Its Free Ad-Supported Plan](https://cordcuttersnews.com/crunchyroll-is-shutting-down-its-free-ad-supported-plan/)
- [Yahoo Entertainment — Crunchyroll Is Ending Its Free Plan](https://www.yahoo.com/entertainment/tv/articles/crunchyroll-ending-free-plan-heres-231700581.html)
- [Newsweek — Crunchyroll flips the page to manga](https://www.newsweek.com/entertainment/crunchyroll-flips-page-manga-10856335)
- [Animation Magazine — Crunchyroll Announces New Manga App at CES](https://www.animationmagazine.net/2025/01/crunchyroll-announces-new-manga-app-at-ces/)
- [Bleeding Fool — Is the Crunchyroll + Funimation Merger Good for Anime Fans?](https://bleedingfool.com/news/is-the-crunchyroll-funimation-merger-good-for-anime-fans/)
- [Shortform — Crunchyroll and Funimation: Is the Merger a Mistake?](https://www.shortform.com/blog/crunchyroll-and-funimation/)
- [TrustPilot — Crunchyroll reviews](https://www.trustpilot.com/review/www.crunchyroll.com)
- [SmartCustomer — Crunchyroll reviews](https://www.smartcustomer.com/reviews/crunchyroll.com)
- [VerifiedAppReviews — Crunchyroll Real Score 3.5/5](https://verifiedappreviews.com/app/crunchyroll/)
- [VeePN — Crunchyroll alternatives](https://veepn.com/blog/crunchyroll-alternatives/)
- [Daiz.moe — Crunchyroll is destroying its subtitles for no good reason](https://daiz.moe/crunchyroll-is-destroying-its-subtitles-for-no-good-reason/)
- [Chrome Web Store — Crunchyroll With Better Seasons extension](https://chromewebstore.google.com/detail/crunchyroll-with-better-s/ianobidcnpbeejlkclkfacnipclgiiak)
- [Chrome Web Store — Release Calendar Filter for Crunchyroll](https://chromewebstore.google.com/detail/release-calendar-filter-f/epkclcbkefpikbpopcpjjlbajhnglged)

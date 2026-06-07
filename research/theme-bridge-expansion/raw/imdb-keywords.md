# IMDb Keywords — research raw notes

**Source:** community-curated keyword vocabulary attached to IMDb titles.
**Why we care:** IMDb is the canonical reference for what a large, mature, open-contribution film keyword system looks like — its scars, its category model, its failure modes are the prior art HelpME2C is downstream of (indirectly, via TMDB's policy of "do not copy IMDb keyword lists" — see TMDB notes).
**Research date:** 2026-05-17.

---

## 1. Vocabulary structure

IMDb's keyword vocabulary is **flat in identity but categorised at the attachment level** — every keyword is a single hyphenated lowercase string (e.g. `jungle-adventure`, `timeframe-1950s`, `mother-teaches-her-daughter-how-to-crack-an-egg`), and each *attachment of a keyword to a title* is tagged with one of eight categories.

The eight categories are documented as part of "Title Essential v2":

> "subgenre; plot-detail; plot-timeframe; other; adult-only; potentially-offensive; character; and title-display."
> — [IMDb keyword categories list, surfaced via community forum and IMDb dev docs](https://help.imdb.com/article/contribution/titles/keywords/GXQ22G5Y72TH8MJ5)

Per-category notes from IMDb's own contributor docs / forum announcements:

- **Subgenre** — suffixed with a genre name. Example: `jungle-adventure` on *The Jungle Book (1967)*. "A subgenre should play a meaningful part in the overarching plot/setting/medium." ([IMDb forum announcement, Jan 2022](https://community-imdb.sprinklr.com/conversations/data-issues-policy-discussions/introducing-subgenre-plot-timeframe-keywords/61eae11f08dc6165edbd2086))
- **Plot-detail** — "open-ended — they are not constrained to a specific list of words." The bulk of the vocabulary. ([keyword help](https://help.imdb.com/article/contribution/titles/keywords/GXQ22G5Y72TH8MJ5))
- **Plot-timeframe** — historically prefixed `timeframe-` (e.g. `timeframe-1950s`, `timeframe-20th-century`). The prefix is now optional because the category field carries the same information. ([Nov 2022 mobile-display announcement](https://community-imdb.sprinklr.com/conversations/imdbcom/keywords-now-displayed-on-the-imdb-ios-and-android-apps/63695ea1df460178b1369a05))
- **Character** — denotes a recurring named character (e.g. `superman-character`). The `-character` suffix is the convention.
- **Title-display** — describes the title itself rather than plot (e.g. `based-on-novel`, `based-on-comic-strip`, `sequel`). This is the bucket that holds the "source material" axis.
- **Adult-only**, **potentially-offensive**, **other** — buckets for filtering/policy reasons.

**Format conventions (verbatim from IMDb contributor help):**

- "Use dashes between words (e.g., `world-war-two`)"
- "Apply lowercase formatting"
- "Avoid plurals, accents, and non-English words"
- "No production/distribution company names"
- "No uncontextualized personal names (exceptions: `reference-to-[name]`, parodies, satire)"
- "No duplicate genres already available as genre tags"

**Linking between keywords:** there is no explicit synonym / parent / child structure in the vocabulary. Categories are the only structural grouping; the rest of the relationships are emergent (which titles share which keywords). No SKOS-style "broader" / "narrower" / "related" relations are exposed.

**Curated overlay:** IMDb maintains a hand-picked "Interesting Keywords" list of 150 items at [imdb.com/search/keyword/](https://www.imdb.com/search/keyword/). Per a forum thread, this list has remained essentially unchanged since 2014; contributor suggestions are "forwarded to the team in charge" with no public visibility on the decision process. ([IMDb forum, 2022](https://community-imdb.sprinklr.com/conversations/data-issues-policy-discussions/imdbs-interesting-keywords-list-suggestions-for-modifications/6366dbbaeda63e18141c372d))

---

## 2. Vocabulary size + growth

IMDb does not publish a vocabulary count. Indirect evidence:

- The *Cataloguing, Lies, and Videotape* paper (Hoffman, 2009) and the *Comparisons of Aboutness of OCLC FAST Headings and IMDb Plot Keywords* paper (Journal of Library Metadata, vol. 22, 2022) both treat IMDb keywords as a vocabulary in the hundreds of thousands, but neither pins an exact count.
- A single title can accumulate astonishing numbers. From an IMDb forum thread on rule enforcement: *Inland Empire* (2006) — **1,672 keywords**; *The Directive* — **1,542 keywords**. ([forum link](https://community-imdb.sprinklr.com/conversations/data-issues-policy-discussions/are-there-any-rules-that-are-actually-enforced-regarding-keywords/5f4a7a408815453dba9f5986))
- "Orphan keywords" — keywords attached to exactly one title — are explicitly identified as a vocabulary-health problem. A contributor in the "highly specific keywords" thread proposed capping orphans at "no more than 2 per every 50 newly created keywords" — implying the current ratio is far worse. ([forum link](https://community-imdb.sprinklr.com/conversations/data-issues-policy-discussions/whats-up-with-all-the-highly-specific-keywords/616d2d1e3a9f396d8e5c22dc))

**Growth:** unbounded. Plot-detail is open-ended. Any contributor can mint a new keyword by typing one that does not already exist.

**Retire / merge:** IMDb staff can merge keywords (forum references to "no longer exist, since it has been merged" appear), but there is no public merge log, no contributor-visible merge tooling, and merges happen opaquely. Keyword deletion in `plot-timeframe` and `subgenre` categories is restricted: a contributor in May 2025 reported that 11 of their deletion submissions in those two categories were rejected, with an IMDb employee (Maya) suggesting resubmission. ([forum link](https://community-imdb.sprinklr.com/conversations/data-issues-policy-discussions/is-there-a-block-on-deleting-keywords-in-the-plot-timeframe-and-subgenre-categories/6809b9bc51193908c538ff60))

---

## 3. Editorial workflow

- **Who can contribute:** any IMDb account. The contributor help page does not list an eligibility gate (no "must have X contributions first").
- **Approval:** submissions go through "a series of consistency checks before it goes live." Contributors can track approve/reject status in their Contribution History. ([Wikipedia: IMDb](https://en.wikipedia.org/wiki/IMDb))
- **In-line moderation:** none visible. There is no public "queue", no per-keyword reviewer credit, no inter-rater agreement metric, no ADR equivalent.
- **Voting:** any logged-in user can vote a keyword on a specific title as "relevant" or "not relevant". The top five most-voted-as-relevant keywords are surfaced on the title's main page. From [an IMDb employee in the forum](https://community-imdb.sprinklr.com/conversations/data-issues-policy-discussions/how-does-the-plot-keywords-section-get-filled/61fec8eb23c1a32f12e16263): "plot keywords are often contributed by either members of the production of the title or by fans/viewers of the title."
- **Spoiler keywords:** "very few keywords (like `death-of-mother` and `death-of-father`) are automatically placed at the bottom of keyword lists" — a hard-coded denylist, not a general spoiler-detection mechanism. ([forum link](https://community-imdb.sprinklr.com/conversations/data-issues-policy-discussions/keywords-spoilers-on-title-main-pages/5f4a7c9d8815453dba0c2a4a))

**Industry-vs-fan asymmetry:** production members do contribute on their own titles. IMDbPro accounts have direct edit affordances on titles they represent, though I could not find an explicit policy that IMDbPro contributions get different review.

---

## 4. Tooling

- **Contributor UI (web):** "Edit page" → keywords subsection on a title page. Add field, category dropdown, submit. No bulk operation visible to general contributors.
- **Mobile (Nov 2022):** keywords now display on a dedicated section on iOS and Android title pages with category sections ("Subgenres", "Plot Timeframes", "Plot Details", "Other"). Mobile also exposes add / modify / delete via the contribution interface. At time of announcement, *keyword voting on mobile was missing*, and category display on web was also "missing". ([forum link](https://community-imdb.sprinklr.com/conversations/imdbcom/keywords-now-displayed-on-the-imdb-ios-and-android-apps/63695ea1df460178b1369a05))
- **Bulk operations:** none for general contributors. Moderators can merge, but the tools are internal.
- **Conflict resolution:** vote-driven. There is no tag-warring lockout; competing contributors can re-add / re-delete keywords. Editing wars are addressed reactively when staff notice.
- **Audit history:** per-contributor history exists ("track the status of your keyword submission"), but per-keyword history (who added it, when, on which titles) is not contributor-visible.

---

## 5. Quality measurement

- **Per-title-keyword relevance voting:** the only structural quality signal. Vote drives display order and the top-5 surfaced on the title main page. No global "this keyword is bad" mechanism — only per-attachment voting.
- **Spam reports:** no per-keyword "report spam" affordance visible. Contributors report problems via IMDb Community Forums, which IMDb staff scan inconsistently. From the rule-enforcement thread: "Guidelines are there, but they are not always followed" (Bradley Kent).
- **Inter-rater agreement:** not measured publicly. Probably not measured at all — the voting is binary thumbs and one-shot.
- **Anti-spam / anti-vandalism:** weak in practice. Documented complaints include sock-puppet upvoting:
  > "Some contributors have promoted personal sexual fetishes by adding dozens of keywords describing women's and girls' attire and body parts to titles across hundreds of IMDb pages, whether or not these keywords are relevant to the plot. These spammers have used dozens of sock accounts to upvote their own keywords and sometimes downvote other more appropriate keywords added by other contributors."
  > — [IMDb forum, vandalism thread](https://community-imdb.sprinklr.com/conversations/data-issues-policy-discussions/vandalism/5f4a79548815453dba79512c)
- **Academic measurement:** the [2022 *Journal of Library Metadata* paper](https://www.tandfonline.com/doi/abs/10.1080/19386389.2022.2056408) compared IMDb plot keywords against OCLC FAST headings on 100 documentary films (604 FAST headings analysed). Result: **average recall 23.38%, average precision 18.89%**. IMDb keywords captured "relatively little of the subject content represented by the professional FAST headings." This is the only published external quality measurement I found.

---

## 6. Failure modes (documented)

| Failure mode | Evidence |
|---|---|
| **Synonym proliferation** | Plurals, misspellings, hyphenation variants persist. The keyword help explicitly says "avoid plurals" — meaning the rule exists because contributors break it. Forum threads cite "duplications, plurals, misspellings" across keyword sections. |
| **Orphan keywords** | Highly specific one-title-only keywords like `mother-teaches-her-daughter-how-to-crack-an-egg`, `teenage-boy-sings-in-the-bathtub`, `wife-eats-an-hors-d'oeuvres-off-her-husband's-boot`. Each adds a row to the vocabulary that will never aid discovery. ([forum link](https://community-imdb.sprinklr.com/conversations/data-issues-policy-discussions/whats-up-with-all-the-highly-specific-keywords/616d2d1e3a9f396d8e5c22dc)) |
| **Reference-as-keyword spam** | Keywords like `avengers-infinity-war`, `oscar-nominated-film`, `the-dark-knight-rises`, `the-matrix` get added to unrelated titles. IMDb has a "use Title Connections instead" rule but it is not enforced. ([forum link](https://community-imdb.sprinklr.com/conversations/data-issues-policy-discussions/references-to-films-as-keywords/623566b1cdd0e45fc28c083a)) |
| **Sock-puppet upvoting** | See §5 quote. Sock accounts both inflate spam keywords and suppress legitimate ones. |
| **Keyword inflation per title** | *Inland Empire* with 1,672 keywords; *The Directive* with 1,542. Top-5 voting partially mitigates display but the underlying noise is permanent. |
| **Spoilers in keywords** | Spoiler keywords surface on the title main page via top-5 voting. Only a hand-coded list (`death-of-mother`, `death-of-father`) is auto-downranked. |
| **Coverage skew** | Popular titles (Marvel, Nolan, prestige TV) get heavily tagged; mid-tail and obscure titles are sparsely tagged. No evidence IMDb actively addresses this. |
| **Vocabulary drift** | The 2022 Title Essential v2 reorganisation reclassified keywords into new categories; older keywords retain old conventions. Some "interesting keywords" on the curated list "no longer exist, since they have been merged." |
| **Personal / political keywords** | The forum thread "inappropriate plot keywords" documents this category but is largely behind a moderation reporting mechanism that is not real-time. |
| **Tag-warring** | Edit wars happen but are reactively managed; no lockouts visible. |

---

## Recent UI evolution (context for transferability)

- **2017-02-20:** IMDb permanently removed all message boards, citing trolling and operational costs. ([Wikipedia: IMDb](https://en.wikipedia.org/wiki/IMDb)) Discussion of keyword quality migrated to Sprinklr-hosted community forums.
- **2022-01-21:** Subgenre and plot-timeframe categories formally introduced. ([announcement](https://community-imdb.sprinklr.com/conversations/data-issues-policy-discussions/introducing-subgenre-plot-timeframe-keywords/61eae11f08dc6165edbd2086))
- **2022-11-07:** Keywords first displayed on iOS / Android apps. Category sections introduced in mobile UI. Web keyword-voting and web category display lagged. ([announcement](https://community-imdb.sprinklr.com/conversations/imdbcom/keywords-now-displayed-on-the-imdb-ios-and-android-apps/63695ea1df460178b1369a05))
- **2023 onwards:** Title subpage redesign rolled out incrementally. Keyword affordances continue to evolve. The classical "Plot Keywords" subpage URL pattern (`/title/tt.../keywords/`) is still live and shows the categorised list with relevance ordering.

IMDb has *not* deprecated user keyword contributions. The system is still open. What has changed is investment posture: visible additions (mobile display, categories) are clearly higher priority than moderation tooling, which remains 2010s-grade.

---

## Transferable to HelpME2C?

| Aspect | Transferable? | Notes |
|---|---|---|
| **Vocabulary structure** (flat strings + categories at attachment) | **Partially.** | HelpME2C's `THEME_MAPPINGS` is a hand-curated thin layer over upstream taxonomies — the upstream (TMDB / AniList) is the keyword identity, the bridge file is the equivalence layer. IMDb's "category on attachment, not on keyword" is *not* a great fit for HelpME2C because we want themes to mean the same thing across titles. We are not building a flat user vocabulary. |
| **Vocabulary size + growth** | **Cautionary tale.** | The orphan-keyword problem is the headline lesson: an open vocabulary without a "must reuse before minting" gate degenerates into singletons. HelpME2C does have this gate (Wouter as the only minter, plus the "exists in upstream tag table" requirement). Maintain it. |
| **Editorial workflow** (open-to-all + voting + reactive moderation) | **Inverted.** | HelpME2C is single-curator-by-design for the moat reason. IMDb's workflow is what we are explicitly *not* doing. The IMDb pathology — sock-puppet voting, vandalism — is what single-curator avoids. The trade-off is throughput (IMDb scales to millions of edits; one curator does not). |
| **Tooling** (in-page edit, category dropdown) | **Yes, conceptually.** | A "propose a theme bridge" UI on a TMDB-keyword-driven page would mirror IMDb's "add keyword" affordance. Even single-curator workflows benefit from inline ergonomics: a curator who needs to open a separate admin tool to add a bridge will add fewer bridges than one who can do it from the place they noticed the gap. |
| **Quality measurement** (per-attachment vote) | **Partially.** | Per-bridge "useful" telemetry from rec-engine click-through is a stronger quality signal than per-attachment voting — it is grounded in actual outcomes, not opinion. Borrow the *idea* (continuous per-bridge quality signal), use better instrumentation. |
| **Failure modes** | **All of them apply at different magnitudes.** | Synonym proliferation: low (single curator, slug-stable). Orphans: low (each bridge must have ≥1 TMDB *and* ≥1 AniList member to be useful). Spoilers: not applicable (themes are abstract, not plot-specific). Coverage skew: HIGH and unavoidable — Wouter will bridge themes he encounters; long-tail themes will remain unbridged until prompted. This is the real risk to actively monitor. |

**Most actionable lesson for HelpME2C:** IMDb's failure is not the vocabulary, it is *the workflow*. Open-contribution + thumbs voting at scale produces a noisy long tail that staff cannot prune. HelpME2C's choice to keep the vocabulary single-curated is a structural advantage — but only if the curator has the tooling to scale (search-before-mint, "what TMDB keywords have no bridge yet" reports, periodic vocabulary review). The IMDb "Interesting Keywords" list frozen since 2014 is the warning: even curated overlays atrophy without active maintenance.

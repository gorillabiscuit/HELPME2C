# TMDB Keywords — research raw notes

**Source:** community-curated keyword vocabulary attached to TMDB titles (movies + TV).
**Why we care:** **TMDB is HelpME2C's upstream.** Every keyword we bridge FROM on the TMDB side started life as a contributor entry in this system. Any quality issue at TMDB propagates directly into our bridge-candidate set, our `tags` table, and our `THEME_MAPPINGS` membership.
**Research date:** 2026-05-17.

---

## 1. Vocabulary structure

TMDB's keyword vocabulary is **flat free-text** with no hierarchy, no synonyms, no parents/children, no formal SKOS-style structure. Each keyword is a single row with an integer `id` and a `name` string. The keyword is exposed via `/keyword/{id}` and via the `keywords` block on movie/TV detail responses.

**Naming conventions** (extracted from the [Contribution Bible — Keywords](https://www.themoviedb.org/bible/movie/59f3b16d9251414f20000007) and from observed data):

- **Lowercase, space-separated multi-word strings.** Confirmed by example. URL slug for keyword id `818`: `818-based-on-novel-or-book`. The keyword name as returned by the API is `"based on novel or book"` — lowercase, space-separated (not hyphenated as on IMDb).
- **Singular preferred.** Bible: "Use singular forms (`teenager` not `teens`)." "Avoid creating duplicate keywords for plurals, alternative names or spellings."
- **No comma lists.** "Add keywords individually, not comma-separated lists."
- **English by default.** "Non-English keywords [are not accepted] unless commonly used in English."
- **Pre-approved trivia keywords** (otherwise generally banned): `3d`, `based on book or novel`, `woman director`, `duringcreditsstinger`. Real-world data confirms these forms appear lowercase and space-joined (or in some cases joined-without-spaces like `duringcreditsstinger`, `aftercreditsstinger`). Example movies tagged: *Minions* (`assistant|aftercreditsstinger|duringcreditsstinger|evil mastermind|minions`), *22 Jump Street* (`high school|undercover cop|buddy comedy|aftercreditsstinger|duringcreditsstinger`).

**No categorisation at the keyword level.** Unlike IMDb's eight categories, TMDB keywords are a single flat namespace. The distinction between e.g. a "subgenre" keyword and a "plot detail" keyword is implicit, not modelled.

**Case sensitivity — confirmed for HelpME2C purposes.** TMDB's contributor-facing convention is lowercase. Comments in `/Users/wouterschreuders/Code/HelpME2C/packages/ml/src/themes/mappings.ts` document the HelpME2C-side guarantee:

> "case matters because tags.name UNIQUE is case-sensitive (TMDB: `tragedy`, AniList: `Tragedy` are two separate rows that the theme bridges)."

In other words: TMDB stores `tragedy` lowercase; AniList stores `Tragedy` Title-Case; HelpME2C preserves the upstream case verbatim and bridges across the case-divide via the theme layer. There is no evidence that TMDB itself permits a `Tragedy` row to coexist with `tragedy` — the contributor bible's "avoid duplicate keywords for plurals, alternative names or spellings" rule plus moderator deletion of duplicates suggests TMDB enforces a single canonical lowercase form, but I could not find an explicit policy statement on case-folding at the database layer. Treat it as "TMDB convention is lowercase, and the moderator team prunes anything else."

---

## 2. Vocabulary size + growth

**Total keywords:** the most specific number available is **~18,432** as of a moderator estimate by `IIOS` in the [List of Keywords forum thread](https://www.themoviedb.org/talk/588418309251410457012d57): *"I ended up with 18432, but I think there's been some maintenance since bcos kw like `zombies island` result = 0."* This was years after an earlier estimate of ~1,400 in 2017, so the vocabulary has grown ~13x. (For the current count, download the daily ID export — see below.)

**Export mechanism:** TMDB publishes daily file exports including a keyword IDs export at `https://files.tmdb.org/p/exports/keyword_ids_MM_DD_YYYY.json.gz`. Files persist ~90 days. Job runs daily at 07:00 UTC, ready by 08:00 UTC. Files are newline-delimited JSON (one JSON object per line, not a single JSON array). ([Daily ID Exports docs](https://developer.themoviedb.org/docs/daily-id-exports))

**Growth rate:** unbounded, contributor-driven. Each new movie / TV entry may surface 5-20 candidate keywords; many will already exist, some will be new.

**Retire / merge:** moderator-only. From the Bible: "Unused keywords can only be removed by a moderator." Contributors are directed to post in the Support Forums to request merges or deletions for keywords that are "too trivial, similar, or not in English." There is no contributor-facing merge tool. The [Keyword report thread](https://www.themoviedb.org/talk/644471d5cee2f602fb36e45d) is the de-facto queue.

**Quantity-per-title guidelines (Bible):**

> "Around 5-10 keywords for TV shows and 15-20 keywords maximum for movies is reasonable."

This is per-title, not per-keyword — it caps the depth of tagging, not the breadth of the vocabulary.

---

## 3. Editorial workflow

**Who can contribute:** any logged-in TMDB account. From the [General Bible](https://www.themoviedb.org/bible/general): *"Our data is 100% user contributed."* No formal contributor-tier gate. Eligibility for adding new *entries* (movies, TV shows) has a "new content guidelines" check that happens after creation, but keyword additions on an existing title are immediate.

**Approval:** no pre-approval queue. Contributions go live and are moderated reactively. From the General Bible:

> "TMDB reserves the right to delete incorrect keywords and remove any non-relevant or spoilery keywords from a specific entry."

> "Please refrain from engaging in editing wars with other contributors... use the report function to ask content mods to lock fields or to report recurring issues and make a final decision."

**Moderator hierarchy:** single-tier "content moderators" (volunteers). They have powers to lock fields, delete entries, delete images, and delete keywords. No documented escalation tiers.

**Verbatim rules from the [Keywords section of the Movie Bible](https://www.themoviedb.org/bible/movie/59f3b16d9251414f20000007):**

> "Keywords should be chosen very carefully... select only the few best keywords (no spoilers) to describe the plot of a movie."

> "Copying the top IMDb keywords is generally a bad idea."

> "Quotes, taglines, titles, actors, characters, crew, original story writers, networks, companies and award ceremonies are generally not accepted as keywords."

> "Do not re-add the movie genres as keywords. For example, the `comedy` keyword shouldn't be used for comedy films, or `drama` for drama films."

> "Pornographic keywords should only be added to entries set to `adult:true`."

> "Use already existing keywords when possible. Avoid creating duplicate keywords for plurals, alternative names or spellings."

**TV-specific deviation** ([TV Bible Genre & Keywords](https://www.themoviedb.org/bible/tv/59f73eb49251416e71000024)):

> "In the TV section we allow — and encourage! — the use of popular television genres as keywords"

Examples encouraged on TV: `sitcom`, `workplace comedy`, `period/historical drama`, `medical drama`, `legal drama`, `teen drama`, `dark comedy`, `anthology`, `game show`, `talk show`, `variety show`, `singing competition`, `telenovela`, `anime`.

> "Technical and trivia keywords shouldn't be added to the TV section unless it can apply to the whole series."

(E.g. `woman director` requires every episode to be directed by women.)

**Moderator example of nuance** (lineker, July 2023, [Keyword report thread](https://www.themoviedb.org/talk/644471d5cee2f602fb36e45d)):

> "Genres can absolutely be keywords, just make sure that it's relevant for the movie and not already added as a genre."

E.g. a thriller with a 15-20 minute romance subplot can legitimately have `romance` as a keyword without being a romance-genre film.

---

## 4. Tooling

- **Contributor UI:** "Edit data" / "Contribute data" button below the cast & primary facts on each title page; keywords are an editable section. Add field accepts free-text, autocomplete suggests existing keywords. No category dropdown (no categories exist).
- **Bulk operations:** none for general contributors. Moderators have additional admin tooling but it is not documented publicly. Notably from the [duplicate-handling forum thread](https://www.themoviedb.org/talk/5ac8eb2f92514162a803c71d): *"The mods have no merge tools for handling many types of duplicates"* — and the limitation extends to keywords. Merges are essentially manual.
- **Conflict resolution:** contributors are told to stop edit-warring and use the report function. Moderators can lock fields on a per-entry basis.
- **Audit history:** per-entry contribution history is visible on the entry page. Per-keyword history (who added the keyword, when, on which titles) is not surfaced to general contributors.
- **API surface:** `GET /3/search/keyword?query={text}` returns matching keywords by name. `GET /3/keyword/{id}` returns a single keyword by id. `GET /3/movie/{id}/keywords` and `GET /3/tv/{id}/keywords` return keywords attached to a title. Daily ID exports are the bulk-discovery path.

---

## 5. Quality measurement

- **No per-keyword voting.** TMDB has no IMDb-style "vote this keyword as relevant" mechanism. Keywords are either present or absent on a title; the database does not track contributor opinion.
- **No spam-report at the keyword level.** Reporting happens at the entry level ("report this entry") or via the Support Forums (post a link + the issue).
- **No quality score per keyword.** The TMDB *content score* (per-title) is based on data completeness (director, writer, ≥4 cast, overview, poster, backdrop, release date, trailer) and does not specifically factor in keyword quality. From the General Bible: *"Good data is far more important than a 'perfect' score."*
- **Moderation cadence:** reactive. The [Keyword report thread](https://www.themoviedb.org/talk/644471d5cee2f602fb36e45d) shows a slow but steady flow of contributor reports (genre-as-keyword conflicts, misspellings, character/show names used as keywords, vague compound descriptions like `midlife identity and a crime drama`, `girl friend or colleague`, `cool summer plannings`).
- **Anti-spam / anti-vandalism:** account-level enforcement. From the [Community Guidelines](https://www.themoviedb.org/documentation/community/guidelines): bans for "deliberately incorrect edits, vulgar or offensive language, fake/trolling content, linking to illegal streaming websites, and misusing TMDB to promote your own websites/apps/YouTube channels." This is a stronger account-tier deterrent than IMDb's per-keyword reactive moderation, but it does not directly clean up bad keywords already in the vocabulary.

---

## 6. Failure modes (documented)

| Failure mode | Evidence |
|---|---|
| **Genre-as-keyword conflicts** | Movies tagged with `comedy` despite being in the Comedy genre; documentaries tagged `documentary`. The Bible explicitly bans this; the Keyword report thread shows it happens. |
| **Vague compound keywords** | Real reported examples: `midlife identity and a crime drama`, `girl friend or colleague`, `cool summer plannings`. These pass the lowercase-string check but are useless for discovery. |
| **Character / show names as keywords** | Examples: `Inspector Koichi Zenigata`, `RuPaul's Drag Race`. The Bible bans actors/characters/titles as keywords; the rule is regularly broken. |
| **Misspellings persisting** | Reported in the Keyword report thread. No spellcheck on contribution. |
| **Duplicate keywords (plurals / variant spellings)** | The Bible warns against this; the existence of the rule implies the violation. No automated normalisation. |
| **Pirated-from-IMDb keywords** | The Bible explicitly bans copying IMDb keyword lists, implying contributors do this. |
| **Coverage skew** | Popular titles (large fanbases) get heavily tagged; long-tail and foreign titles get sparse or no keywords. Implicit in the contributor model. |
| **Stale / abandoned keywords** | The IIOS comment about `zombies island` returning 0 results suggests keywords can become orphaned by moderator cleanup of the *titles* they were attached to, while the keyword row itself persists. |
| **TV-vs-movie inconsistency** | TV allows genre-keywords (`sitcom`, `dark comedy`, `anime`); movies do not. A contributor moving between sections must remember the asymmetry. |
| **Slow moderator response** | The forum-based report queue depends on volunteer moderator availability. Some reports go weeks without response. |
| **No synonym handling** | `super power` vs `superpowers` vs `superhuman` — three separate rows if all three exist, with no formal link between them. The Bible asks contributors to manually search before minting, which is a weak guarantee. |
| **Limited merge tooling** | Moderators cannot bulk-merge; deletions and merges are largely manual. Backlog grows. |
| **Vocabulary drift / "amateur films" dispute** | A 2024 Substack piece by Cody Clarke ([The TMDB Problem](https://codyclarke.substack.com/p/the-tmdb-problem-one-moderators-bizarre)) documents a moderator labelling self-funded feature-length films as `amateur films`, which several contributors view as editorial overreach. Illustrates that single-moderator decisions can have downstream-product impact (because JustWatch and others consume TMDB metadata). |

---

## What this means for HelpME2C's upstream

TMDB is the *origin* of every TMDB-side bridge candidate in HelpME2C. Concretely:

1. **Our `tags` table contains exactly the strings TMDB contributors wrote.** Lowercase, space-separated, occasionally weird (`duringcreditsstinger`, `cool summer plannings`). If a TMDB contributor minted `tragedy` and another minted `tragic`, both can end up in our tags table as separate rows — and the bridge layer (`THEME_MAPPINGS`) is the only place we can declare them equivalent.

2. **HelpME2C is downstream of TMDB's noisy long tail.** The same vocabulary-quality issues that affect TMDB consumers (JustWatch, recommendation engines, third-party metadata users) affect HelpME2C. Specifically:
   - **Synonym proliferation upstream** → our bridge growth needs to include explicit synonym merging on the TMDB side, not just cross-medium matches.
   - **Stale orphan keywords upstream** → some TMDB keywords exist but are attached to ~0 titles in our local catalogue (because they were attached to TV/film outside our sync scope). Bridging these wastes curator time. We should rank bridge candidates by *attachment count in our local catalogue*, not just upstream existence.
   - **TV-vs-movie inconsistency upstream** → if we want to bridge `sitcom`, it will exist on TV titles but not movies; the bridge needs to flag that asymmetry rather than treat it as a global theme.

3. **TMDB's moderation latency means we cannot rely on upstream to fix our bridge candidates.** If we identify a junk keyword (`cool summer plannings`) that is polluting our space, posting a TMDB forum report is the right thing to do but will not produce a fix on our timescale. We should either filter it out on ingestion or downweight it in the bridge-candidate ranking.

4. **The "do not copy IMDb keywords" rule is a positioning signal.** TMDB self-positions as a higher-quality, more curated alternative to IMDb keywords — but the moderation reality is closer to "IMDb but smaller and more polite." HelpME2C's theme-bridge layer can be the *actually-curated* layer that TMDB and IMDb both stop short of. That is the defensibility surface.

5. **Lowercase-canonical is a real assumption we depend on.** If TMDB ever changes its case-folding policy (e.g. accepting Title Case for new keywords), our case-sensitive UNIQUE constraint on `tags.name` would start producing duplicate rows. Worth a sanity-check during periodic catalogue audits: `SELECT name FROM tags WHERE source='tmdb' AND name != LOWER(name)` should always return zero.

---

## Transferable to HelpME2C?

| Aspect | Transferable? | Notes |
|---|---|---|
| **Vocabulary structure** (flat free-text lowercase) | **N/A — we inherit it directly.** | This *is* our TMDB-side vocabulary. The bridge layer is the layer that adds structure on top. |
| **Vocabulary size + growth** | **Bound it via "must exist in local catalogue" gate.** | TMDB has ~18k+ keywords; we cannot meaningfully bridge all of them. Restrict bridge candidates to keywords attached to ≥N titles in our local sync. This is the equivalent of the IMDb "orphan keyword" lesson, applied to bridge construction. |
| **Editorial workflow** (open, reactive moderation, no pre-approval) | **Do not replicate.** | HelpME2C's single-curator model is deliberately the inverse. The TMDB pattern works at TMDB scale because volume + moderation create eventual consistency; at HelpME2C scale we need every bridge to be intentional. |
| **Tooling** (in-place edit, autocomplete, no bulk) | **Borrow the autocomplete idea.** | A curator UI that suggests existing themes when typing a new bridge name will reduce accidental synonym proliferation in `THEME_MAPPINGS`. |
| **Quality measurement** (none at the keyword level; account-tier enforcement) | **Build the layer TMDB doesn't have.** | Per-bridge telemetry (was this bridge used in a rec? did the user engage with the recommendation? did they thumb-up the rec?) is the layer that grades bridge quality. This is the *moat*, not the vocabulary itself. |
| **Failure modes** | **Specific ones to monitor:** | (a) Genre-as-keyword conflicts upstream → don't bridge `comedy` as a theme; rely on genre system instead. (b) Vague compound keywords (`cool summer plannings`) → filter out on ingestion via simple heuristics (length, multi-conjunction). (c) Pre-approved trivia keywords (`3d`, `duringcreditsstinger`) → these are technical metadata, not themes — explicitly exclude from bridge candidate set. (d) Misspellings → fuzzy-match against existing AniList tags during bridge proposal. |

**Most actionable lesson for HelpME2C:** TMDB's keyword vocabulary is the raw material, not the product. The mistake to avoid is treating TMDB keywords as already-curated input — they are crowd-sourced free text with documented junk. The work that turns 41 themes into 200+ is the work of (a) deciding which TMDB keywords are bridge-worthy at all, (b) merging synonyms upstream-of-the-bridge, and (c) refusing to bridge the noisy long tail. Wouter as single curator is the right shape for this work, but only with tooling that surfaces high-value bridge candidates (high local-catalogue attachment count, no existing bridge, clear semantic content) and hides the long tail.

# Discogs — research notes

Source type: community-curated music release database with editorial governance. The biggest crowdsourced music metadata project outside MusicBrainz.
Founded: November 2000 in Portland, Oregon.
Founder: Kevin Lewandowski, an Intel programmer and electronic-music collector who built the site from a computer in his closet after three failed internal Intel startups. The domain was registered 2000-08-30; the live site launched November 2000. Originally electronic-music-only; opened to all genres later.

## 1. Vocabulary structure

Discogs's data model is fundamentally **release-centric**, not artist-centric, with a two-axis genre system layered on top.

- **Release** — a specific physical (or digital) product: a particular pressing, country, year, label, catalogue number. *"Discogs only catalogs items that are or have been available to the general public, either as commercially sold items or as free give-aways."* (Database Guidelines 1.)
- **Master Release** — a "folder" that groups all variant Releases of the same underlying work. *"A master release is a display function that gathers two or more matching releases together. It can be thought of as a folder that holds two or more Discogs releases. Master release does not change the data of the contained releases."* (Database Guidelines 16.)
- **Key Release** — within a Master, the one Release whose title + image is pulled to the Master's display surface. Selection rule: *"The Key release should best represent the title and image for all the releases in the Master release, with the title taking priority."*
- **Genre** — top-level coarse bucket (e.g. "Electronic," "Rock," "Jazz"). 15 genres total (per Discogs blog).
- **Style** — fine-grained sub-genre under a Genre (e.g. "Drum and Bass" under "Electronic"). 540 styles across all genres.
- **Format** — physical/digital format (Vinyl, LP, 12", CD, Cassette, File/FLAC/MP3, Box Set, etc.) with sub-format qualifiers ("33⅓ RPM," "Limited Edition," "Promo").
- **Country** — release country, controlled vocabulary.
- **Year** — release year.
- **Label / Catalogue Number** — controlled label entity + free-text cat#.
- **Tracklist + Credits** — fully structured per-track credits with role taxonomy (Producer, Engineer, Vocals, Bass, Mixed By, Mastered By, etc.).

Field types split into **strict controlled vocabulary** (Genre, Style, Country, Format, role-credit roles) and **free-text with conventions** (titles, notes). The Style vocabulary is the most often-debated — see §6.

Citations:
- https://support.discogs.com/hc/en-us/articles/360005006334-Database-Guidelines-1-General-Rules
- https://support.discogs.com/hc/en-us/articles/360005055493-Database-Guidelines-16-Master-Release
- https://support.discogs.com/hc/en-us/articles/360005055213-Database-Guidelines-9-Genres-Styles
- https://blog.discogs.com/en/genres-and-styles/

## 2. Vocabulary size + growth

- **Genres: 15** — Blues, Brass & Military, Children's, Classical, Electronic, Folk World & Country, Funk / Soul, Hip Hop, Jazz, Latin, Non-Music, Pop, Reggae, Rock, Stage & Screen.
- **Styles: 540** total across all genres. Distribution is heavily skewed:
  - Electronic: 119 styles (largest, reflecting founding bias)
  - Rock: 96 styles
  - Folk, World & Country: 90 styles
  - Children's: 4 styles
  - Stage & Screen: 4 styles
- **Releases: 19M+** user-submitted release listings as of 2026 (Wikipedia). Hit 10M in 2018.
- **Growth trajectory:** started electronic-only in late 2000; opened to other genres ~2004–2005; marketplace added 2005; reached 3M users and 20M monthly visits with 37 employees by 2015.

The Style vocabulary grows extremely slowly and only via formal process. *"Style requests must be internationally accepted (no regional names if possible) with no micro-styles, as styles that are too specific would clog up the system."* The community runs a "New Style Request Mega-Thread" on the forum. Many specialist communities (Berlin School electronic, Progressive Techno, Fado, Opera-as-classical-substyle) have been formally requested and rejected over years — Discogs deliberately keeps the vocabulary tight.

Citations:
- https://support.discogs.com/hc/en-us/articles/360005055213-Database-Guidelines-9-Genres-Styles
- https://www.discogs.com/forum/thread/771553
- https://en.wikipedia.org/wiki/Discogs

## 3. Editorial workflow

Discogs is the **canonical example of community-curated editorial governance with paid platform staff sitting above it**. Two layers:

- **Contributors** — any logged-in user can submit. *"Anyone with a Discogs account can contribute information to the Discogs Database, as long as they have a physical copy of the music in question in front of them while they're making new submissions."* Submissions go live immediately but become subject to voting. Every new submission earns 3 rank points; every edit, master-release update, or image earns 1 rank point. Contributor stats are displayed on the user profile.
- **Voters** — a subset of contributors with voting rights. *"New users cannot vote, and the ability to vote is automatically assigned based on your interaction with the site. Generally, you need to log in reasonably regularly, view releases, read the guidelines, comment correctly on others submissions and make good submissions and updates."* Voting rights are not permanent — they can be revoked.
- **Promotion path:** contributor → reputation accrual via vote averages on own submissions → eventually vote rights → continued good behavior maintains rights. There is no formal "editor" promotion title in the wiki sense — instead, *behavioral metrics* (vote average, contribution volume, time-on-site) gate increasingly powerful actions.
- **Platform staff** sit above this. The **Discogs Database Guidelines** are written by staff (not voted on by users — community can request changes via forum threads, but staff have final word). Staff also adjudicate edit wars and ban abuse. The platform employs paid moderators / community managers who enforce the guidelines.
- **Reference Wiki + Style Guide** — a parallel `reference.discogs.com` site documents the meaning of each Style and how to apply it. This is the closest thing to an editorial manual.

Notable: contributors are required to have *physical access* to the release. This is a strong scope rule — it filters out drive-by edits and forces submissions to come from genuine record collectors. Bootleg/counterfeit/pirated/deepfake/wholly-AI-generated releases are explicitly not eligible. (Database Guidelines 1.)

Citations:
- https://support.discogs.com/hc/en-us/articles/360004017654-Contributing-to-Discogs
- https://support.discogs.com/hc/en-us/articles/360005055593-Database-Guidelines-20-Voting-Guidelines
- https://support.discogs.com/hc/en-us/articles/360008545114-Overview-Of-How-Discogs-Is-Built
- https://reference.discogs.com/wiki/style-guide
- https://support.discogs.com/hc/en-us/articles/360005006334-Database-Guidelines-1-General-Rules

## 4. Tooling

- **Submission UI** — a long structured web form. Per-field validation. Genre and Style come from dropdowns; format is a multi-select with sub-format checkboxes; tracklist is a structured editor with per-track credit roles. The mobile site explicitly does *not* support submissions: *"the mobile version of the website doesn't include a responsive version of the submission form, and most database contributors want a full screen and keyboard when adding releases to the database."*
- **Voting UI** — four-option vote on every submission: **Correct**, **Needs Minor Changes**, **Needs Major Changes**, **Entirely Incorrect**. Voters can also add a comment explaining the call. Critical rule: *"The primary function of voting is to tag the current correctness of the information, and you are voting on the data in its entirety, not just the last edit."*
- **Edit history** — every change is logged, attributed, and reversible. Edit wars (back-and-forth reversion) are visible and triggerable for staff intervention.
- **Auto-locking** — releases that have accumulated enough "Correct" votes effectively become stable; further edits are subject to higher scrutiny.
- **Discogs API (v2.0)** — public, OAuth 1.0a authenticated. Rate limits: 60 req/min for authenticated requests, 25 req/min unauthenticated, with `X-Discogs-Ratelimit*` headers exposing budget. Two relevant endpoints exist: `/users/<username>/submissions` (read access to a user's edit history) and `/users/<username>/contributions` (read access to a user's new submissions).
- **No bulk-submission API.** *"Discogs does not have a bulk submission system or API endpoint at this time."* Programmatic creates are deliberately not supported — *"Database submissions must be made through the web interface. API and app access to the database submission form is still in development."*
- **Data dumps** — Discogs publishes monthly XML dumps of the full database (releases, masters, artists, labels). This is one of the biggest open music datasets in the world and a foundation of academic MIR work.

Citations:
- https://www.discogs.com/developers
- https://support.discogs.com/hc/en-us/articles/360004017654-Contributing-to-Discogs
- https://support.discogs.com/hc/en-us/articles/360005055773-Submission-Form-Help-Sections
- https://www.discogs.com/forum/thread/342635
- https://python3-discogs-client.readthedocs.io/en/v2.5/requests_rate_limit.html

## 5. Quality measurement

Discogs's quality model is **community vote averages + platform-enforced punishment for bad submissions**. The five mechanisms:

- **Per-submission vote averages.** Every submission you make accumulates votes. The average is displayed on your profile and is the primary visible reputation signal.
- **Vote weighting by reputation.** Newer users can't vote at all; established users with good track records can vote. This stops drive-by sabotage.
- **Contributor Improvement Program (CIP).** A throttling mechanism for contributors who get too many "Needs Major Changes" or "Entirely Incorrect" votes. *"The Contributor Improvement Program puts a submission limit on users who get too many votes that show inconsistencies (for example, 'Needs Major Changes' or 'Entirely Incorrect'), with the goal of giving these users tools to improve their submissions and protecting the Database from incorrect submissions. Once on the CIP, the user will be limited to a total of three contributions waiting for votes at any one time."* Users escape the CIP only by accumulating enough "Correct" votes to raise their average back up. This is a *negative* feedback loop — no carrot, just stick.
- **Sourcing rule.** *"Only enter or change information that you can cite a trustworthy source for (stick to provable facts!)"* and *"The physical release must always be the main source, and external sources of information must be declared in the Submission Notes, explained in the Release Notes, and be verifiable as far as possible. Additionally, unsubstantiated information may be removed or rejected."*
- **Stable-release "auto-locking" by social pressure.** Once a release has accumulated many Correct votes and high view count, edits become socially expensive — voters will tend to vote down any change. Not a hard lock but an effective one.

Critically, **vote target is the whole submission as it currently stands, not the last edit alone.** This means voting against a current state implicitly votes against all prior contributors' work too — a known source of complaint. (Threads: *"Voting on the last edit only,"* *"Votes are cast on current data, not what is shown."*)

Citations:
- https://support.discogs.com/hc/en-us/articles/360005055593-Database-Guidelines-20-Voting-Guidelines
- https://support.discogs.com/hc/en-us/articles/360005007014-Database-Guidelines-21-Contributor-Improvement
- https://support.discogs.com/hc/en-us/articles/360007185634-How-Can-I-Get-Removed-From-The-CIP
- https://www.discogs.com/forum/thread/372794

## 6. Failure modes

- **Style vocabulary is *deliberately* tight, which frustrates specialists.** Berlin School electronic music has been rejected. Fado is missing from Folk/World/Country. Opera is not available as a substyle of Classical. *"Discogs aims to limit the number of accepted styles because excess styles or sub-sub-genres cause the dropdown list on the submission form to become unmanageable and confusing to use."* — a UI constraint becomes a vocabulary constraint. Specialist communities periodically revolt; staff hold the line.
- **Edit wars.** Two contributors who disagree about a field can revert each other indefinitely. The vote-on-current-state model means whichever version was current when most votes were cast is "right" — even if the *other* version is more accurate. Forum threads document users *"having to redo the same edit multiple times"* and filing support tickets only to be reverted again.
- **Subjective tagging of Genre/Style.** Voters disagree on whether a record is "Indie Rock" vs "Alternative Rock" vs "Post-Punk." Because there is no rubric, this devolves to majority vote among voters who happen to see it. *"Styles are often too specific (difficult to guess what records are called), too general ('Indie Rock' seems to cover most small contemporary artists), or too subjective. The evolution of music is too fluid to nail down styles for many entries."*
- **Voting rings / coordinated voting** are a recurring forum complaint (threads on inexperienced voters, unfair "entirely incorrect" votes, banned-for-one-misvote). Staff respond reactively, not algorithmically.
- **Scope creep / "is this a release?" debates.** Promotional flexi-discs, white-label test pressings, AI-generated tracks, deepfakes, bootlegs — each category requires explicit guideline updates. The 2024+ guideline explicitly excludes *"Bootleg, counterfeit, pirated, deepfake, and wholly AI (Artificial Intelligence) generated files."*
- **Marketplace fee uproar, 2023–2024.** In April 2023 Discogs raised seller fees from 8% to 9% and began applying fees to shipping costs. Mike Simonetti's viral Twitter thread (July 17, 2023) accused leadership of killing the marketplace. UK seller Paul Terzulli quit publicly. Sietse van Erve's Moving Furniture Records pulled inventory to Bandcamp because *"I would only have about three or four Euros after all the fees."* The CEO posted *"Listening and Evolving"* on the forum in response.
- **Database-vs-marketplace tension.** Stereogum: *"The marketplace seems to have become the main driving force for the site, but the database is what makes Discogs trustworthy and unique among selling sites."* Database contributors (the unpaid editorial labor) feel deprioritized in product decisions.
- **Hasty UI rollouts breaking contribution workflows.** The 2023 Artist Page redesign shipped with bugs that *"remain present and prevent contributors from interacting with and improving the database."* Discogs has fired internal advocates of database quality.
- **Mobile contribution is intentionally absent.** Submitting requires a desktop; entire generations of music collectors who live on phones cannot contribute.
- **Vandalism on long-tail releases.** Rare records with few watchers can be silently mis-edited and stay wrong for years.

Citations:
- https://www.discogs.com/forum/thread/771553
- https://www.discogs.com/forum/thread/337909
- https://www.discogs.com/forum/thread/404890
- https://www.discogs.com/forum/thread/372794
- https://stereogum.com/2241158/the-discontent-at-discogs/columns/sounding-board
- https://www.discogs.com/forum/thread/1044775
- https://www.discogs.com/forum/thread/998114

## Transferable to HelpME2C?

| Aspect | Transferable? | Notes |
|---|---|---|
| Vocabulary structure (release-centric data model, Master/Release grouping) | **Conceptually yes** | HelpME2C's analogue: a Theme is the Master, individual show/film/anime mappings are the Releases. Adopt the "Master groups stable identity, Releases are specific instantiations" mental model for theme bridges. |
| Tight controlled vocabulary (~540 styles, deliberate slowness) | **Yes — strongly** | Discogs proves that holding the vocabulary line is the harder and more correct choice. For HelpME2C going 41 → 200+ themes, the discipline lesson: **resist the long tail of micro-themes**. Every theme should be requested, justified, and slow to land. |
| Editorial workflow (crowd contribution + vote-gated reputation) | **No (single-curator phase)** | A single-curator workflow has no crowd. But the *principles* — physical-source rule, sourcing rule, no-AI rule, reversibility, audit trail — all transfer directly to Wouter-as-curator. Each new theme bridge should have: a source, a reason, a timestamp, an attribution. |
| Tooling (structured submission form + per-submission votes + CIP throttling) | **Partially** | The forcing function for a single curator: instead of CIP, use the rec engine. If a theme bridge produces bad recs, that's the "Needs Major Changes" vote. Build a way to monitor per-bridge rec quality and auto-flag bridges with bad downstream signal. |
| Quality measurement (vote averages + sourcing rule + auto-stabilisation) | **Yes — the sourcing rule especially** | Adopt the Discogs sourcing rule verbatim: every theme bridge entry has a citation (a specific scene, episode, review, or moment that justifies the bridge). Without sourcing, the bridge is unfounded and gets pulled. |
| Failure mode lessons (deliberate scope tightness, edit wars, scope creep, marketplace-vs-database tension) | **Yes — all of them** | Most important: **the platform-economics-vs-database tension at Discogs is a warning about HelpME2C's own future.** If/when recommendation revenue arrives, do not let it deprioritize the theme-bridge editorial layer. The bridges are the moat. |

Strongest single lesson: **a tight, deliberately-curated controlled vocabulary with sourcing rules and an audit trail will outperform a permissive crowd vocabulary every time, but only if the curator (or staff) holds the line against scope creep.** Discogs's 540-styles-and-no-more discipline is the same discipline HelpME2C needs at 200+ themes.

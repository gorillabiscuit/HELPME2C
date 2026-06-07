# Apple Music subgenre taxonomy — research notes

Source survey of the deep-editorial end of the music-recommendation curation
spectrum. Apple Music represents the "human first, algorithm secondary"
posture in adjacent space to HelpME2C's theme-bridge problem.

Compiled 2026-05-17. Citations inline.

---

## 1. Vocabulary structure

Apple's music genre vocabulary is hierarchical and **two levels deep**: a
primary genre (e.g. `Rock`, `Jazz`, `Electronic`, `Classical`), and a flat
list of subgenres under it (e.g. `Rock > Hard Rock`, `Jazz > Cool Jazz`,
`Electronic > IDM/Experimental`). There is no third-level nesting in the
public Genre IDs schema — the published lists go `genre → subgenre` and stop.

Source: scraped iTunes Store Genre ID table at
[AquaChocomint/AppleStore-Genre-ID](https://github.com/AquaChocomint/AppleStore-Genre-ID)
— "The hierarchy is consistently two levels deep (primary genre + subgenre),
with no deeper nesting observed throughout the table." Genre ID 1621 = Rock
(primary); subgenres include 1870 Adult Alternative, 1872 Arena Rock, 1878
Hard Rock.

The Apple Music Style Guide reinforces this: in submission metadata, the
**first genre listed is the primary**, and a second genre is optional but
encouraged. Only Latin and K-Pop chart in both primary and secondary; the
rest chart only on primary.
[Apple Music Style Guide](https://help.apple.com/itc/musicstyleguide/en.lproj/static.html).

API shape mirrors this: `Get a Catalog Genre` returns a genre object with a
`subgenres` array of child genre objects, each itself a `Genres` resource —
so the tree could theoretically nest deeper, but in practice doesn't.
[Apple Developer / Music Genres](https://developer.apple.com/documentation/applemusicapi/music-genres).

Special-case rules muddy the "pure two-level" picture:

- **Classical** has its own deeper conventions encoded in metadata
  (composer / conductor / ensemble / soloist / work / part), but those are
  *metadata fields*, not subgenre nodes.
- **Indian music** requires "at least one Indian genre or Indian subgenre"
  — a regional-flavour constraint baked into the taxonomy.
- **Christmas** got country added as a sub-bucket in the March 2022 update
  ([itunespartner](https://itunespartner.apple.com/music/support/5251-new-genre-codes)).

## 2. Vocabulary size + growth rate

There is no authoritative public count. Aggregating sources:

- The community-scraped Genre ID table on GitHub covers **hundreds** of
  genre IDs across music (a single Rock subgenre list spans Adult
  Alternative, Arena Rock, Glam Rock, Hair Metal, etc — a couple dozen
  subgenres per major genre, ~25 major genres = a few hundred music
  subgenres total). The same table also covers podcasts, audiobooks, apps
  and books — IDs range from 2 to 50000093, but most numbers are unpopulated.
  [AppleStore-Genre-ID](https://github.com/AquaChocomint/AppleStore-Genre-ID).
- Apple Music's official Partner Program Chart Explorer cites **60 genres**
  across 270 countries — but that's the chart-eligible top-level set, not
  the full subgenre count.
  [Music Business Worldwide on Apple Music Partner Program](https://www.musicbusinessworldwide.com/apple-music-launches-the-apple-music-partner-program-for-labels-and-distributors-including-premium-data-analytics-tools/).
- Apple's own "New genre codes" page tracks individual additions like
  *Hörspiele* (March 2022) — implying additions are episodic and
  reviewer-paced.
  [itunespartner 5251](https://itunespartner.apple.com/music/support/5251-new-genre-codes).

**Growth rate (rough estimate from public additions):** **single-digit
genres added per year**, far short of Spotify's hundreds-per-year cadence.
The taxonomy is deliberately conservative.

For comparison: the Apple Music catalogue passed **100 million songs in
October 2022** with **20,000 new songs delivered daily** — and yet still
manages with a few hundred subgenre buckets.
[Music Ally 2022-10](https://musically.com/2022/10/03/apple-music-100m-songs-curation/).

## 3. Editorial workflow

Apple's curation DNA is unusual in the streaming era for being **journalist-
and-radio-led rather than ML-led**, a posture inherited largely from the
2014 Beats Music acquisition.

- **Beats Music acquisition (May 2014, ~$3B)**: Apple bought Beats
  Electronics and Beats Music. The Beats Music team — led at the editorial
  level by Julie Pilat (ex-iHeartMedia / KIIS-FM music director) with
  ex-Pitchfork editor-in-chief Scott Plagenhoef among the staff — became the
  curation backbone for Apple Music when it launched in 2015. Beats Music's
  team was described as "well-respected music experts with over 300 years
  of [combined] experience across all genres."
  [Apple newsroom 2014-05-28](https://www.apple.com/newsroom/2014/05/28Apple-to-Acquire-Beats-Music-Beats-Electronics/),
  [MacRumors 2014-05-28](https://www.macrumors.com/2014/05/28/apple-buys-beats/).
- **Zane Lowe** joined as global creative director and Apple Music 1
  (formerly Beats 1) anchor in 2015.
  [The Zane Lowe Show / Apple Music curator page](https://music.apple.com/us/curator/the-zane-lowe-show/990050553).
- **Ebro Darden** joined as Global Editorial Head of Hip-Hop and R&B (2019).
  [Billboard / AppleInsider 2019-01](https://appleinsider.com/articles/19/01/02/beats-1-dj-ebro-darden-appointed-apple-music-global-editorial-head-covering-hip-hop-and-rb).
- **Rachel Newman** — global head of content and editorial; 16-year Apple
  veteran originally from iTunes A&NZ music; named co-head of Apple Music
  (with Ole Obermann) in 2025.
  [Billboard / hitsdailydouble on Obermann + Newman co-heads](https://www.billboard.com/pro/apple-music-ole-obermann-rachel-newman-co-heads/).

Team size: third-party industry estimates put Apple Music curators at
**~1,000 globally**, organised by genre and region (e.g. K-Pop curators
based in Seoul, not Cupertino), and tasked with listening to "thousands of
tracks weekly" looking for *narrative flow* between songs in a playlist.
This figure is not Apple-confirmed — it's an industry estimate cited in a
third-party algorithm guide. Treat as directional, not exact.
[Beatstorapon Apple Music algorithm guide 2026](https://beatstorapon.com/blog/the-apple-music-algorithm-in-2026-a-comprehensive-guide-for-artists-labels-and-data-scientists/).

Editorial philosophy from Rachel Newman, at the 100M-songs milestone (Oct
2022): "human curation has always been the core to everything we do, both
in ways you can see, like our editorial playlists; and ways you can't, like
the human touch that drives our recommendation algorithms…with 100 million
songs, human curation is more important than ever."
[Music Ally 2022-10](https://musically.com/2022/10/03/apple-music-100m-songs-curation/).

## 4. Tooling

The editor-facing tooling is essentially invisible from outside Apple. What's
publicly knowable:

- Submission tooling lives in **iTunes Connect / Apple Music for Artists**.
  Labels and distributors pick a primary + secondary genre from the
  controlled vocabulary, plus mood tags, keywords, bio. Apple's editorial
  team then decides playlist placement.
  [Apple Music for Artists](https://artists.apple.com/measure),
  [Style Guide](https://help.apple.com/itc/musicstyleguide/en.lproj/static.html).
- **Apple Music Partner Program** (for larger labels): Chart Explorer
  surfaces 4,500+ charts across 270 countries / 60 genres in near-real
  time; "advanced" analytics dashboard.
  [MBW partner program writeup](https://www.musicbusinessworldwide.com/apple-music-launches-the-apple-music-partner-program-for-labels-and-distributors-including-premium-data-analytics-tools/).
- The internal CMS for playlist + genre management has no public
  documentation. The taxonomy itself is governed through the **iTunes
  Package Music Specification Addendum**, an internal-ish document referred
  to throughout Apple's submission docs but not published as a versioned
  developer resource.

**Net read:** the tooling is closed and conservative. Adding a genre
requires updating the spec, which appears to happen episodically (months
or years between major updates), not continuously.

## 5. Quality measurement

Apple's quality story is **editorial reputation**, not measurable accuracy.
There is no published precision/recall, no equivalent of Spotify's
listener-cluster validation, no measurable test for "is this genre real."

Genre legitimacy comes from:

- Curator consensus (genre is real if multiple curators agree it deserves a
  playlist and a chart bucket).
- Submission demand (labels pushing for a new bucket).
- Cultural-moment recognition (a genre crosses into mainstream press).

Apple's pitch to labels and listeners frames human curation as the *quality
signal itself* — Newman repeatedly emphasises that humans drive the
algorithms, not the other way round.
[Music Ally 2022-10](https://musically.com/2022/10/03/apple-music-100m-songs-curation/).

The only quantitative quality signal that leaks out is chart movement: did
the new subgenre attract enough listening to populate its charts.

## 6. Failure modes

- **Slow.** Adding a genre is a months-or-years process. Microgenres that
  spread in months on Spotify (hyperpop, drift phonk, sigilkore) take much
  longer to land — or never land at all — as official Apple genre buckets.
- **Over-coarse.** Two-level hierarchy + a few hundred subgenres can't
  represent the long tail of community-defined microgenres. A K-pop fan,
  a UK drill fan, a vaporwave fan all see the same coarse buckets.
- **Region-skewed.** The taxonomy is shaped by what Apple's editorial team
  recognises as a genre, which weights Western and large-market scenes.
  Indian/Latin/K-Pop get special-case treatment partly because the default
  taxonomy doesn't serve them well — see Style Guide rules about Indian
  subgenre being mandatory, Pop in Spanish over Pop, etc.
  [Style Guide](https://help.apple.com/itc/musicstyleguide/en.lproj/static.html).
- **No public versioning.** The Genre IDs spec is not a public, versioned
  artifact like a JSON schema — community projects like
  [AppleStore-Genre-ID](https://github.com/AquaChocomint/AppleStore-Genre-ID)
  exist precisely because the canonical list is hard to track.
- **Opaque rejection paths.** Labels submitting for a new subgenre have
  little visibility into why their submission was or wasn't accepted; the
  same opacity applies to playlist placement.
- **Editor concentration risk.** Curation depends on senior personalities
  (Zane Lowe, Ebro Darden, Rachel Newman). If one leaves, a genre area can
  drift.

---

## Transferable to HelpME2C?

| Aspect | Apple Music model | Transferable to HelpME2C theme-bridge expansion? |
|---|---|---|
| **Vocabulary structure** | 2-level genre → subgenre; conservative depth | **Yes.** Validates a shallow theme taxonomy. The 41→200+ expansion can stay flat-or-shallow. Don't build a 5-level tree. |
| **Vocabulary size + growth** | Hundreds of subgenres, single-digit additions per year | **Partially.** Apple's slowness is a discipline, not just a constraint — confirms that a single curator (Wouter) growing 41→200+ over months is *not* unreasonable. But Apple's curators-per-bucket ratio is much higher than HelpME2C can sustain. |
| **Editorial workflow** | Genre/region-specialised curators; senior editorial leadership; deep-bench team | **No (literally).** Wouter is one curator, not 1,000. **Yes (structurally):** Apple's posture — "human first, algorithm second" — is the *exact* posture HelpME2C is taking. The lesson is that this model works when buckets are coarse enough that one curator can hold the whole taxonomy in their head. |
| **Tooling** | Closed CMS + style-guide PDF + iTunes Connect submission | **No (build something better).** Apple's lack of public versioning is a known pain. HelpME2C should treat the theme-bridge set as a versioned artifact (Git-tracked, schema-validated) from the start. |
| **Quality measurement** | Curator consensus + chart movement, no published precision/recall | **Partially.** Curator consensus doesn't scale to one curator. But Apple's reliance on *chart movement* as a lagging quality signal maps to HelpME2C: "did the new theme bridge actually surface cross-medium recs users engaged with" is a quality signal HelpME2C can capture. |
| **Failure modes** | Slow, coarse, region-skewed, opaque, concentration risk | **Directly relevant.** A single-curator model amplifies all five. Mitigations: keep theme vocabulary flat; bias toward broadly-cross-medium themes over hyper-local ones; commit the theme list to a public Git artifact (avoid Apple's versioning opacity); document the "why" of every theme so a future second curator can extend. |

**The strongest single lesson from Apple Music for HelpME2C:** a small,
slowly-growing, deliberately coarse taxonomy can serve a 100M-song catalogue
*if* the curation team has authority and consistency. Wouter's 41→200+
expansion is closer in shape to Apple's model than to Spotify's, and
should be planned with Apple's discipline (slow, deliberate, justifiable
per-bucket additions) rather than Spotify's volume (thousands of micro-
genres mined from listening clusters).

---

## Citations

- [Apple newsroom — Apple to Acquire Beats Music & Beats Electronics (2014-05-28)](https://www.apple.com/newsroom/2014/05/28Apple-to-Acquire-Beats-Music-Beats-Electronics/)
- [MacRumors — Apple Announces $3 Billion Beats Acquisition (2014-05-28)](https://www.macrumors.com/2014/05/28/apple-buys-beats/)
- [Beats Music — Wikipedia](https://en.wikipedia.org/wiki/Beats_Music)
- [Apple Music Style Guide](https://help.apple.com/itc/musicstyleguide/en.lproj/static.html)
- [Apple Music Provider Support — New genre codes (5251)](https://itunespartner.apple.com/music/support/5251-new-genre-codes)
- [Apple Music Provider Support — Guidelines (5213)](https://itunespartner.apple.com/music/support/5213-guidelines)
- [Apple Developer — Music Genres documentation](https://developer.apple.com/documentation/applemusicapi/music-genres)
- [Apple Developer — Get a Catalog Genre](https://developer.apple.com/documentation/applemusicapi/get_a_catalog_genre)
- [AquaChocomint/AppleStore-Genre-ID — scraped genre ID table](https://github.com/AquaChocomint/AppleStore-Genre-ID)
- [Music Ally — Apple Music has 100m songs, says 'human curation is more important than ever' (2022-10-03)](https://musically.com/2022/10/03/apple-music-100m-songs-curation/)
- [Music Business Worldwide — Apple Music Partner Program for labels](https://www.musicbusinessworldwide.com/apple-music-launches-the-apple-music-partner-program-for-labels-and-distributors-including-premium-data-analytics-tools/)
- [AppleInsider — Ebro Darden Global Editorial Head Hip-Hop and R&B (2019-01-02)](https://appleinsider.com/articles/19/01/02/beats-1-dj-ebro-darden-appointed-apple-music-global-editorial-head-covering-hip-hop-and-rb)
- [Billboard — Apple Music Names Obermann and Newman Co-Heads (2025)](https://www.billboard.com/pro/apple-music-ole-obermann-rachel-newman-co-heads/)
- [Apple Music for Artists — Analytics](https://artists.apple.com/measure)
- [Beatstorapon — Apple Music Algorithm Guide 2026 (industry-estimate source for ~1,000 editor figure; not Apple-confirmed)](https://beatstorapon.com/blog/the-apple-music-algorithm-in-2026-a-comprehensive-guide-for-artists-labels-and-data-scientists/)

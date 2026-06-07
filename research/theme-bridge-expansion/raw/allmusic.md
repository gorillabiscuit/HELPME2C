# AllMusic — research notes

Source type: editorial music metadata, staff-curated. The original "industrial music taxonomy as product."
Founded: 1991, Big Rapids / Ann Arbor, Michigan.
Founder: Michael Erlewine. First print product was a 1,200-page guidebook + CD-ROM in 1991; first on the web (originally Gopher) in 1994.

## 1. Vocabulary structure

AllMusic ships a faceted taxonomy with four orthogonal axes:

- **Genre** — top-level coarse buckets. Current public navigation shows 16: Classical, Comedy/Spoken, Country, Easy Listening, Electronic, Folk, Holiday, International, Jazz, Latin, New Age, Pop/Rock, R&B, Rap, Reggae, Religious, Stage & Screen.
- **Style / Subgenre** — fine-grained children of genre. Wikipedia cites ~1,400 subgenres total. Styles are usually time- or region-bound (e.g. "Power Pop," "Northern Soul," "New Wave of British Heavy Metal").
- **Mood** — adjectives describing sound/feel ("Aggressive," "Bittersweet," "Cathartic," "Brooding," "Dreamy," "Atmospheric," "Cerebral"). Defined as: *"adjectives that describe the sound and feel of a song, album, or overall body of work."* The mood vocabulary is several hundred entries — partial alphabetic scan from search snippets returns 60+ entries just A through D ("Aggressive, Agreeable, Airy, Ambitious, Amiable/Good-Natured, Angry, Angst-Ridden, Anguished/Distraught, Angular, Animated, Anthemic, Apocalyptic, Arid, Athletic, Atmospheric, Austere, Autumnal, Belligerent, Benevolent, Bitter, Bittersweet, Bleak, Boisterous, Bombastic, Bouncy, Brash, Brassy, Bravado, Bright, Brittle, Brooding, Calm/Peaceful, Campy, Capricious, Carefree, Cartoonish, Cathartic, Celebratory, Cerebral, Cheerful, Child-like, Circular, Clinical, Cold, Comic, Complex, Concise, Confessional, Confident, Confrontational, Cosmopolitan, Crunchy, Cute, Cynical/Sarcastic, Dark, Declamatory, Defiant, Delicate, Demonic, Desperate, Detached, Devotional, Difficult, Dignified/Noble, Dissonant, Dramatic, Dreamy, Driving"). Internal AMG sources put the canonical mood list around 200+; this matches the cited fingerprint in HelpME2C's prior research.
- **Theme** — activity or event a song/album suits ("Road Trip," "Reflection," "TGIF," "Drinking," "In Love," "Rainy Day," "Romantic Evening," "Hanging Out," "At the Office"). Distinct from mood: mood is texture, theme is situation. The "Road Trip" theme page itself links to related themes including Vacation, Partying, Hanging Out, Freedom, Drinking, Guys Night Out, Girls Night Out, Relaxation, Pool Party, At the Office, School, Playful — useful evidence that AllMusic also maintains an explicit theme-to-theme relatedness graph.

Each axis is independently faceted: any release can have N genres, M styles, K moods, J themes. Mood and theme tags are applied at album and song granularity.

Citations:
- https://en.wikipedia.org/wiki/AllMusic
- https://www.allmusic.com/genres
- https://www.allmusic.com/moods
- https://www.allmusic.com/themes
- https://www.allmusic.com/theme/road-trip-ma0000006287/
- https://www.allmusic.com/mood/cathartic-xa0000000958/

## 2. Vocabulary size + growth

- Genres: ~16 top-level.
- Styles/Subgenres: ~1,400.
- Moods: 200+ (canonical AMG product spec figure; matches public partial-scan).
- Themes: 80–100 (smaller, situational vocabulary).
- Release coverage: "well over three million album entries and 30 million tracks." (Wikipedia)
- Editorial content as of late-1990s expansion (Feb 1999, the move to Ann Arbor): 350,000 albums catalogued, 2M tracks, 30,000 artist biographies, 120,000 record reviews, 300 essays. Staff grew "from 12 to 100 people" in that expansion (Wikipedia).
- Growth has been driven primarily by staff effort + bulk data licensing — *not* community contribution. The vocabulary itself grows slowly (years per new mood/theme); the *application* of the vocabulary to releases is the volume work.

Citations:
- https://en.wikipedia.org/wiki/AllMusic
- https://vice.com/en/article/ypwezy/the-internets-most-complete-guide-to-music

## 3. Editorial workflow

Closed editorial pipeline. Always has been.

- **Founder lineage.** Michael Erlewine (b. 1941) — folk musician who hitchhiked with Bob Dylan in 1961, formed the Prime Movers blues band in Ann Arbor (Iggy Pop was the drummer at 18, nicknamed "Iguana"), in 1977 founded Matrix Software ("the first person to program astrology on microcomputers"), and through Heart Center Publications published 40+ astrology books on Tibetan astrology / planetary nodes / feng shui. He started AllMusic in 1991 specifically because of *"frustration with the proliferation of re-recordings and poor remasterings"* in the CD reissue era — the guiding question was: *"what if we could point folks to the best recordings for each artist, no matter how obscure they were, and regardless of what style of music?"* (Vice).
- **Technical co-founder.** Vladimir Bogdanov (b. 1965), described in early reporting as a "Russian mathematician and database expert," though his Wikipedia stub now lists him as American. Bogdanov designed the AMG database schema and went on to become president of the AllMusic guide series. Edited the 4th edition *All Music Guide to Jazz* (2002), among others.
- **Editorial lineage.** Stephen Thomas Erlewine (Michael's nephew) started in 1991, became senior editor / content director by 2003. Chris Woodstra joined as an engineer in 1993 but had a music-journalism background (alt-weeklies, fanzines). Many ex-print-music-journalists rotated through — staff was described as *"a hybrid of historians, critics, and passionate collectors"* (Wikipedia).
- **Print provenance.** AMG ran a major print-encyclopedia operation in the 1990s — *All Music Guide to Jazz* (1994, Miller Freeman Books, ~10,000 jazz recordings reviewed across ~1,150 artists), *All Music Guide to Rock* (1995, multiple editions), *All Music Guide to Electronica* (1997, then 2001 2nd ed.), etc. The web product inherited the editorial DNA of professional encyclopedia editors.
- **Current state.** Editorial content is no longer produced by AllMusic-the-website — it is licensed from Xperi (formerly TiVo, formerly Rovi, formerly Macrovision). The AllMusic FAQ states explicitly: *"Errors to written content like reviews and biographies, tagged metadata like Genres, Styles, Moods, Themes and Similar artists are on the end of their data provider, Xperi."* Submissions and corrections are made via "Submit Corrections" links and pass to Xperi editors; AllMusic-the-website does *not* control which corrections are applied.
- **The 2024 inflection.** Stephen Thomas Erlewine was laid off from Xperi in July 2024 after ~32 years. Reader-side complaints since: *"The site has less coverage of new music than ever before and barely limps along in functionality"*; users now *"wait a month to give time for reviews to populate."*

Citations:
- https://en.wikipedia.org/wiki/Michael_Erlewine
- https://en.wikipedia.org/wiki/Stephen_Thomas_Erlewine
- https://en.wikipedia.org/wiki/Vladimir_Bogdanov_(editor)
- https://vice.com/en/article/ypwezy/the-internets-most-complete-guide-to-music
- https://www.allmusic.com/faq
- https://x.com/sterlewine/status/1818341610763018393
- https://areyouengaged.substack.com/p/the-continuing-story-of-allmusiccom

## 4. Tooling

Closed internal CMS — there is no public submission UI for editorial content. External signal is limited to:

- **"Submit Corrections" links** at the bottom of artist/album pages → route to Xperi editorial intake.
- **Product Submissions** page for new artists to register basic metadata.
- **Site Feedback** form for general issues.
- **No public API for taxonomy / mood / theme retrieval.** Historically, the **Rovi Music API** (later TiVo Music API) was the B2B product — see §5. Public AllMusic-branded API ceased being a developer-facing product after the Rovi era.
- **Five-star rating system** internally; the FAQ notes *"Users can rate albums on the same five star rating scale as AllMusic's editors do."*
- **Behind the scenes**, the Rovi/TiVo metadata pipeline powered Spotify artist biographies, Microsoft Windows Media Player CD/track information, Pandora supplemental data, and others (see §5).

Net: from a HelpME2C standpoint, AllMusic is a **read-only reference**. There is no community contribution surface. There is no public taxonomy file. Mood/theme assignments are visible per release on the public site but are *not* downloadable in bulk.

Citations:
- https://www.allmusic.com/data-corrections
- https://www.allmusic.com/product-submissions
- https://www.allmusic.com/faq
- https://www.vice.com/en/article/there-is-a-subtle-power-struggle-for-control-of-music-metadata/

## 5. Quality measurement

AllMusic's quality model is **editorial review + paid staff curation**, not crowd voting. The five mechanisms:

- **Staff-written reviews.** Each album review is written by a named staff/freelance critic. Bylines persist on the public page. This is the legacy of the print encyclopedia format.
- **Hierarchical editing.** Senior editors (historically Stephen Thomas Erlewine, Vladimir Bogdanov) reviewed staff content before publication.
- **Critic selection bias as quality control.** AllMusic's criteria for which albums get reviewed was always biased toward *"pre-release buzz, favoring commercial music styles, heavily-marketed albums and established artists with a large fan base"* — i.e. coverage was a function of editorial bandwidth, not crowdsourced demand. Long-tail coverage came from passion-project specialist writers (jazz, blues, classical specialists).
- **Five-star ratings.** Editors apply 1–5 star ratings; users can rate on the same scale (added later) but user ratings did not flow back into the editorial dataset.
- **The B2B feed.** Rovi Music (now Xperi/TiVo Music Metadata) was the quality-validation pressure: this same data was licensed to Spotify (artist bios), Microsoft (Windows Media Player CD info), Pandora, and many others. Customer pressure on B2B accuracy was the real quality forcing function — *"Rovi Music offers metadata on over 3 million album releases and 30 million tracks worldwide."*

The system has no crowd-vote layer. There is also no public per-tag rating ("is this album really Bittersweet?"). The tag is editorial fiat — you either trust the editor or you don't.

Citations:
- https://www.allmusic.com/faq
- https://www.vice.com/en/article/there-is-a-subtle-power-struggle-for-control-of-music-metadata/
- https://business.tivo.com/products-solutions/metadata/music-metadata

## 6. Failure modes

- **Subjective genre debates / writer voice bias.** Because reviews and tags are written by individuals, the writer's taste leaks. Stephen Thomas Erlewine's reviews were widely loved but also widely critiqued for a specific aesthetic posture (rock-canon-leaning, suspicious of dance music). This is a known editorial liability — the same problem any opinionated print encyclopedia has.
- **Slow updates.** A staff pipeline cannot keep pace with release volume. The AllMusic FAQ admits coverage skews to *"commercial music styles, heavily-marketed albums and established artists."* Long-tail and recent releases are under-served — a problem that has worsened post-2024 layoffs.
- **Ownership instability degrades editorial.** Sale chain: AMG / All Media Group → Alliance Entertainment (1996, $3.5M) → Yucaipa Equity Fund / Burkle (1999, post-bankruptcy) → Macrovision (2007, $72M) → Rovi (Macrovision rename, 2009) → TiVo Corporation (Rovi/TiVo merger, 2016) → Xperi (TiVo–Xperi merger, 2019). On the *editorial* side, by 2013 Rovi had spun off the consumer-facing AllMusic and sister sites to All Media Network; subsequent owners include BlinkX/RhythmOne (2015), then Taptica/Tremor International/Nexxen, with current operator Netaktion LLC. Each transition cost institutional knowledge.
- **The data-licensing tail wagging the dog.** Because the Rovi/TiVo/Xperi B2B feed is the *real* product (paying B2B customers — Spotify, Microsoft, Pandora — fund the editorial work), AllMusic.com became increasingly a marketing surface for the metadata business rather than a destination of its own. Users complain the site itself has bugs, intrusive ads, and shrinking new-music coverage.
- **No mood/theme governance documentation is public.** Unlike Discogs's Style Guide or Pandora's MGP whitepaper, there is no AllMusic editorial manual visible externally. The taxonomy's evolution is a black box — moods are added or merged without public changelog.
- **2024 layoffs at Xperi removed the last visible byline.** Stephen Thomas Erlewine's departure marks the end of the named-critic era for the AllMusic dataset.

Citations:
- https://en.wikipedia.org/wiki/AllMusic
- https://en.wikipedia.org/wiki/TiVo_Corporation
- https://x.com/sterlewine/status/1818341610763018393
- https://forums.stevehoffman.tv/threads/stephen-thomas-erlewine-laid-off-at-allmusic.1206754/
- https://areyouengaged.substack.com/p/the-continuing-story-of-allmusiccom

## Transferable to HelpME2C?

| Aspect | Transferable? | Notes |
|---|---|---|
| Vocabulary *structure* (faceted: genre × style × mood × theme) | **Yes** | This is the gold-standard editorial shape. HelpME2C's theme-bridge work is already structurally similar — themes-as-activities map cleanly to AllMusic's "themes" axis; moods-as-textures map to AllMusic's "moods." Worth explicitly adopting the genre/style/mood/theme separation as a mental model. |
| Vocabulary *size* (200+ moods, 80+ themes, 1,400 styles) | **As a ceiling, yes** | 200+ themes is in the AllMusic range. The growth rate (years per new mood) suggests vocabulary additions should be deliberate. |
| Editorial workflow (paid staff, named critics, slow hierarchy) | **No, but the *principle* yes** | One curator (Wouter) cannot replicate the AMG staff. But the *principle* — every tag has a writer who is accountable for it, with a documented rationale — is the right inheritance. |
| Tooling (closed CMS, B2B feed, no public submission) | **No** | HelpME2C wants the opposite: visible reasoning, public reproducibility. |
| Quality measurement (editorial fiat + B2B customer pressure) | **Partially** | Editorial fiat is the only realistic model for a single curator. The "B2B customer pressure" analogue for HelpME2C is the recommendation engine itself — bad tags will produce bad recs, which the curator-as-user will notice. Treat the rec engine as the forcing function. |
| Failure mode lessons (writer bias, slow updates, ownership instability, no governance docs) | **Yes — all of them are warnings** | Specifically: write down the theme-bridge governance rules (the lack of public AMG governance is a permanent liability). Resist single-writer aesthetic monoculture by deliberately tagging some bridges in genres the curator dislikes. Don't tie the editorial work to a corporate roadmap that can be acquired away. |

Strongest single lesson: **the four-axis faceted shape (genre / style / mood / theme) is the right scaffolding for cross-medium bridging.** AllMusic proves the model works at scale; their failures are governance failures, not structural failures.

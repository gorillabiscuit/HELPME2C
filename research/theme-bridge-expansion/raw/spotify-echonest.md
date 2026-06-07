# Spotify + Echo Nest taxonomy lineage — research notes

Source survey of the algorithm-led / data-substrate end of the music-
recommendation curation spectrum. Spotify (via the 2014 Echo Nest
acquisition and Glenn McDonald's Every Noise at Once work) is the closest
adjacent-domain analogue to "what happens when ML scales a curation
vocabulary by 100x."

Compiled 2026-05-17. Citations inline.

---

## 1. Vocabulary structure

Spotify's genre vocabulary is **flat-with-clustering**, not hierarchical.
There is no formal "rock > hard rock" tree the way Apple Music has. Instead
there's a single very large set of genre labels (thousands of them), each
of which is positioned in a multi-dimensional space derived from listener
behaviour and audio features. Every Noise at Once visualises this on two
axes:

- **Vertical**: organic (bottom) → mechanical / electric (top).
- **Horizontal**: denser / atmospheric (left) → spikier / bouncier (right).
  ([NiemanLab on EveryNoise / TechCrunch 2024-02-12](https://techcrunch.com/2024/02/12/every-noise-shut-down-spotify-layoffs/)).

Genres are clusters of artists, not nodes in a taxonomy tree. Glenn
McDonald (the Spotify Data Alchemist who built and maintained this
substrate):

> "I had all these tools at Spotify that would find unlabeled clusters
> that we had some data evidence to say belonged together."
>
> "Sometimes you'd listen and be like, 'I know these artists. They make
> sense together.' Naturally, the next thing you'd ask is, 'Does this
> have a name?'"
> — Glenn McDonald, [Can't Get Much Higher interview](https://www.cantgetmuchhigher.com/p/spotifys-former-data-guru-sets-the).

This sits on top of a separate **audio-features layer** inherited from the
Echo Nest acquisition. Each track had a feature vector exposed via the
public API:

- `danceability` (0.0–1.0): combination of tempo, rhythm stability, beat
  strength, regularity.
- `energy` (0.0–1.0): perceptual intensity from dynamic range, loudness,
  timbre, onset rate, entropy.
- `valence` (0.0–1.0): musical positiveness — high = happy/cheerful, low
  = sad/depressed/angry.
- `acousticness` (0.0–1.0): confidence track is acoustic.
- `instrumentalness`, `liveness`, `loudness`, `speechiness`, `tempo`,
  `time_signature`, `key`, `mode`, `duration`.
  [Spotify Web API / get-audio-features](https://developer.spotify.com/documentation/web-api/reference/get-audio-features),
  [SoundNet on deprecation timeline](https://medium.com/@soundnet717/spotify-audio-analysis-has-been-deprecated-what-now-4808aadccfcb).

These are **ML-derived from audio signal processing**, not editorial; they
were the Echo Nest's original product surface and Spotify migrated them
into the Spotify API after the acquisition.

**Net structure:** genre = community label attached to a listener-behaviour
cluster. Audio features = independent per-track acoustic measurements. Both
layers feed into recommendation; they are not formally linked into a
single tree.

## 2. Vocabulary size + growth

At the December 2023 layoff snapshot, Spotify's genre vocabulary covered
**6,291 named genres** spanning tracks from approximately one million
artists. Examples of internal granularity from McDonald's own quote: 56
kinds of reggae, 202 kinds of folk, 230 kinds of hip hop.
[Wikipedia — Glenn McDonald (data engineer)](https://en.wikipedia.org/wiki/Glenn_McDonald_(data_engineer)),
[Wikipedia — Every Noise at Once](https://en.wikipedia.org/wiki/Every_Noise_at_Once).

Growth rate: McDonald and team added new genres **continuously** — Every
Noise at Once was visibly growing month-over-month from 2013 to late 2023.
For comparison, an earlier 2017–2018 snapshot reported on the Spotify For
Artists blog showed the catalogue at "over 1,700 genres" — so the
vocabulary roughly **3.5×'d in ~5 years** (1,700 → 6,291). That's
**hundreds of new genres per year**, sustained for nearly a decade by a
small data-alchemist team.
[Spotify for Artists — How Spotify Discovers the Genres of Tomorrow](https://artists.spotify.com/blog/how-spotify-discovers-the-genres-of-tomorrow).

Each genre is also attached to an internally-maintained "Sounds of …"
playlist on Spotify and a representative sample on Every Noise — so adding
a genre is not just a label, it's a triple of (cluster definition + name
+ canonical playlist).

## 3. Editorial workflow

The pipeline McDonald describes is **algorithm-first, curator-second**:

1. Internal clustering tooling surfaces unlabeled groups of artists with
   shared listening patterns, shared lyrical content, shared musical style,
   shared geography or shared history.
2. A human (McDonald or team) listens to representative tracks.
3. If the cluster sounds coherent, find an existing community name for it
   (most names already exist in subreddits, blogs, Bandcamp tags); if no
   name exists, coin one. (Example: McDonald coined "Alt Z" based on
   demographics + sound; he labelled "hyperpop" in 2018 after first
   spotting the term in 2014 PC Music coverage.)
4. Bind the cluster name to the artists, generate the "Sounds of …"
   playlist, surface to recommendation pipelines.

The hyperpop story is the cleanest example of the pipeline:
- 2014: McDonald sees "hyperpop" used to describe PC Music.
- 2018: McDonald adds "hyperpop" to Spotify metadata — at that point a
  cluster of artists, not a public-facing genre.
- August 2019: Spotify senior editor Lizzy Szabo (separately from
  McDonald) spots the metadata tag, launches the "Hyperpop" editorial
  playlist; 100 gecs go viral; mainstream press treats Spotify as having
  "invented" the genre.
  [Wikipedia — Hyperpop](https://en.wikipedia.org/wiki/Hyperpop),
  [Far Out Magazine — Did Spotify invent hyperpop?](https://faroutmagazine.co.uk/did-spotify-invent-hyperpop/).

McDonald's framing of the pipeline:

> "If we can identify an audience, if we can identify a scene or cluster
> of artists, or a rationale … then we're interested … those people with
> hundreds or thousands of listeners, particularly when there are a bunch
> of them."
> — Glenn McDonald, [Spotify for Artists — Trap Queen and the Data Scientist](https://artists.spotify.com/blog/trap-queen-and-the-data-scientist-how-a-subgenre-is-born).

**Team size:** the genre-curation function was an extremely small team —
in interviews McDonald frequently refers to "I" rather than "we"; on the
editorial-playlist side Spotify has a larger team (Lizzy Szabo etc), but
the **taxonomy layer was essentially one person plus tooling**. This is
the inverse of Apple's ~1,000-editor model.

## 4. Tooling

The two key pieces of tooling:

- **Every Noise at Once** (everynoise.com) — Glenn McDonald's
  externally-published map of the Spotify genre vocabulary. Public-facing
  side effect of the internal curation work; functioned as both a
  discovery tool for users and a debugging tool for the genre system
  itself. McDonald: a "massive map containing 1,742 genres that lets
  McDonald see how machines were working and how styles of music related
  to one another."
  [everynoise.com](https://everynoise.com/),
  [Ari's Take interview](https://aristake.com/glenn-mcdonald/).
- **Truffle Pig** — internal sonic search engine for editors, built post-
  Echo-Nest-acquisition. Editors set thresholds on audio features
  (acousticness, speechiness, loudness, tempo, hotness, recording date) to
  pull candidate tracks for playlists. This is the editor-facing UI for
  the Echo Nest's audio-features layer.
  [TechCrunch — Inside The Spotify-Echo Nest Skunkworks (2014-10-19)](https://techcrunch.com/2014/10/19/the-sonic-mad-scientists/),
  [Music Ally — Could Spotify open up Truffle Pig?](https://musically.com/2015/07/22/spotify-open-truffle-pig-playlist-analytics/).

Echo Nest's data substrate, pre-acquisition, was scraping **10M+
music-related web pages daily**, tracking 2M+ artists and 30M+ songs,
processing **over a trillion data points** across cultural vectors (NLP
on blog posts, reviews, Wikipedia) and acoustic vectors (the audio
features). Brian Whitman quote: *"Every word anyone utters about music
goes through our system."*
[Music Business Journal — Spotify's Secret Weapon (2014-10)](https://www.thembj.org/2014/10/spotifys-secret-weapon/).

## 5. Quality measurement

Spotify's quality test for a genre is **listener-cluster evidence**, not
editorial consensus. McDonald:

> "the fact that there's a cluster of listening means that the genre is a
> real thing, even though I might have made up the name."
> — [Spotify for Artists — How Spotify Discovers the Genres of Tomorrow](https://artists.spotify.com/blog/how-spotify-discovers-the-genres-of-tomorrow).

A genre is "real" if:
- A cluster of artists has co-listening evidence (people who listen to one
  listen to others in the cluster).
- The cluster is large enough to matter (hundreds or thousands of
  listeners per artist, with a bunch of artists in the cluster).
- The cluster is sonically coherent enough that a human listening to
  samples can recognise the kinship.

The name is treated as **disposable / strategic**: McDonald has said
naming a cluster is a service to surface it to listeners (e.g. "Trap
Queen" was named to elevate female trap artists who otherwise got
collapsed into general trap).
[Spotify for Artists — Trap Queen and the Data Scientist](https://artists.spotify.com/blog/trap-queen-and-the-data-scientist-how-a-subgenre-is-born).

For audio features, the quality measurement is less clear: Spotify never
published precision/recall on `danceability`, `valence`, etc. Academic
attempts to validate them exist but are mixed
([ResearchGate — Validating Spotify's Valence, Energy, Danceability](https://www.researchgate.net/publication/395985412_Validating_Spotify's_'Valence'_'Energy'_and_'Danceability'_Audio_Features_for_Music_Psychology_Research)).
The features were "Echo Nest's product" — the validation was that they
were *useful* in downstream recommendation, not that they corresponded to
any ground-truth musicological label.

## 6. Failure modes

- **Hallucinated / opaque microgenre names.** Critics have flagged Every
  Noise entries like "vapor twitch," "drift phonk," "sigilkore,"
  "deep filthstep," "weirdcore," "glitchcore," "hypnagogic pop" as
  machine-generated nonsense. McDonald's defence: the cluster is real
  even if the name is invented. The reverse-Turing problem is unsolved —
  it's hard to tell from the outside whether a genre is a recognised
  community label or McDonald-coined.
  [everynoise.com](https://everynoise.com/) (page text observed 2026-05).
- **Catastrophic single-person dependency.** McDonald was laid off on
  4 December 2023 as part of Spotify's 1,500-person / 17%-workforce cut.
  Every Noise immediately stopped getting fresh data. New-release feeds,
  daily updates, and several "Sounds of …" playlist refreshes broke or
  froze. Fan reaction was severe: nine pages of complaint threads on
  Spotify's community forum.
  [TechCrunch 2024-02-12](https://techcrunch.com/2024/02/12/every-noise-shut-down-spotify-layoffs/),
  [Digital Music News 2024-02-14](https://www.digitalmusicnews.com/2024/02/14/every-noise-at-once-engineer-impacted-by-spotify-layoffs/).
- **Wider API deprecation.** On 27 November 2024 Spotify deprecated public
  access to audio-features, audio-analysis, related-artists, and
  algorithmic-playlist endpoints for new apps — framed officially as
  "addressing security challenges" but widely read as removing the data
  substrate that powered third-party AI music-recommendation competitors.
  [TechCrunch 2024-11-27](https://techcrunch.com/2024/11/27/spotify-cuts-developer-access-to-several-of-its-recommendation-features/),
  [Spotify Developer Blog 2024-11-27](https://developer.spotify.com/blog/2024-11-27-changes-to-the-web-api).
- **"What is even a genre" debates.** With 6,291 genres and continuous
  cluster mining, redundancy and overlap are unavoidable. McDonald's own
  comment after the layoff: "Categorizing the world's genre communities
  shouldn't fall on the shoulders of a corporation. The fact that I got
  laid off is proof of that."
  [Can't Get Much Higher interview](https://www.cantgetmuchhigher.com/p/spotifys-former-data-guru-sets-the).
- **Drift.** With no data alchemist actively curating, the existing
  vocabulary degrades: new artists aren't classified, dead clusters
  aren't pruned, new microgenres aren't named. Spotify Wrapped 2024 was
  widely criticised as worse, and fans blamed the McDonald layoff
  (correlation, not causation, but the perception is the failure mode).
  [Tune My Music — Users Slam Wrapped 2024](https://blog.tunemymusic.com/spotify-wrapped-2024-bad-users-complain/).

---

## Transferable to HelpME2C?

| Aspect | Spotify / Echo Nest model | Transferable to HelpME2C theme-bridge expansion? |
|---|---|---|
| **Vocabulary structure** | Flat cluster-of-clusters + parallel audio-features ML layer | **Partially.** HelpME2C doesn't have an audio-features-equivalent ML substrate (yet), so the parallel-layers trick isn't directly available. But the *flat-with-positioning* idea (each theme positioned in a similarity space, not just a tree) is a useful design pattern for the 200+ set. |
| **Vocabulary size + growth** | 6,291 genres mined from listener clusters; ~hundreds added per year | **Cautionary.** Spotify's volume only works because clusters are evidence-based (real listener co-occurrence). HelpME2C doesn't have user-listening data at MVP scale; a single curator inventing 200 themes without behavioural evidence risks the "vapor twitch" failure mode. Implication: anchor new theme-bridges to *evidence external to Wouter* (TMDB tag co-occurrence, AniList tag co-occurrence, MyAnimeList genre overlap) wherever possible. |
| **Editorial workflow** | Cluster-first, name-second pipeline; single data alchemist + tooling | **Highly relevant.** Wouter is effectively the HelpME2C data alchemist. The McDonald pipeline (cluster → listen → name → bind → expose) is a much better template than the Apple "editor reviews submissions" pipeline. Implication: build internal tooling to surface candidate theme-bridges from existing data (TMDB/AniList tag overlap) *before* Wouter names them, not after. |
| **Tooling** | Every Noise at Once (public-facing debug map) + Truffle Pig (internal curator UI) | **Yes — strongly.** Both patterns map directly. An internal "candidate theme-bridge" surface where Wouter can scan high-overlap tag pairs across TMDB+AniList is the HelpME2C Truffle Pig. A public theme-bridge map (showing what bridges exist, what they cover) would build trust and surface gaps — the HelpME2C Every Noise. |
| **Quality measurement** | Listener-cluster evidence ("the cluster is real even if the name isn't") | **Adapt.** HelpME2C's analog to "listener cluster evidence" is: *do users who engaged with one side of a theme bridge actually engage with the other side?* This is the only honest quality signal for a bridge — and it's measurable from MVP launch. Build the telemetry hook now. |
| **Failure modes** | Hallucinated names, single-person dependency, API deprecation cascades, drift after key person leaves | **Directly relevant — Wouter is at the highest risk of every one.** Mitigations: (1) every theme-bridge has a written rationale committed to Git, so a second curator can extend; (2) bias toward bridges with broad cross-medium evidence over esoteric one-off bridges; (3) treat the bridge set as a versioned artifact reviewable by an outside collaborator (the "bus factor of one" mitigation McDonald's case proves Spotify failed at). |

**The strongest single lesson from Spotify / Echo Nest for HelpME2C:**
**Anchor names to evidence-bearing clusters, not to a priori taxonomies.**
The reason Spotify's 6,291 genres mostly hold up is that each is grounded
in a real co-listening cluster — even when McDonald invented the name, the
*thing being named* existed in user behaviour. HelpME2C should not try to
hand-design 200+ theme-bridges purely from Wouter's taste; it should mine
candidate bridges from cross-tag co-occurrence in existing TMDB / AniList /
MAL data and have Wouter act as the *judge-and-namer*, not the
*designer-from-scratch*. That keeps the volume Spotify-shaped while
protecting against the vapor-twitch failure mode.

**The second strongest lesson:** **Don't be one person.** McDonald's
layoff froze the entire substrate within hours; Spotify Wrapped 2024 was
visibly worse for it. HelpME2C's theme-bridge set must be legible enough
that a hypothetical second curator could pick it up — which argues for
committing rationale per bridge to Git, not just the bridge labels.

---

## Citations

- [Spotify Acquires The Echo Nest — TechCrunch (2014-03-06)](https://techcrunch.com/2014/03/06/spotify-acquires-the-echo-nest/)
- [The Echo Nest — Wikipedia](https://en.wikipedia.org/wiki/The_Echo_Nest)
- [Finding harmony with big data — MIT News on Echo Nest founders (2013-07-10)](https://news.mit.edu/2013/echo-nest-harmony-with-big-data-0710)
- [Music Business Journal — Spotify's Secret Weapon (2014-10)](https://www.thembj.org/2014/10/spotifys-secret-weapon/)
- [TechCrunch — Inside The Spotify-Echo Nest Skunkworks (2014-10-19)](https://techcrunch.com/2014/10/19/the-sonic-mad-scientists/)
- [Spotify Web API — Get Audio Features documentation](https://developer.spotify.com/documentation/web-api/reference/get-audio-features)
- [Spotify Developer Blog — Changes to the Web API (2024-11-27)](https://developer.spotify.com/blog/2024-11-27-changes-to-the-web-api)
- [TechCrunch — Spotify cuts developer access to recommendation features (2024-11-27)](https://techcrunch.com/2024/11/27/spotify-cuts-developer-access-to-several-of-its-recommendation-features/)
- [Glenn McDonald (data engineer) — Wikipedia](https://en.wikipedia.org/wiki/Glenn_McDonald_(data_engineer))
- [Every Noise at Once — Wikipedia](https://en.wikipedia.org/wiki/Every_Noise_at_Once)
- [everynoise.com](https://everynoise.com/)
- [Spotify for Artists — How Spotify Discovers the Genres of Tomorrow (Glenn McDonald)](https://artists.spotify.com/blog/how-spotify-discovers-the-genres-of-tomorrow)
- [Spotify for Artists — Trap Queen and the Data Scientist (Glenn McDonald)](https://artists.spotify.com/blog/trap-queen-and-the-data-scientist-how-a-subgenre-is-born)
- [TechCrunch — Spotify layoffs end Every Noise (2024-02-12)](https://techcrunch.com/2024/02/12/every-noise-shut-down-spotify-layoffs/)
- [Digital Music News — Every Noise engineer impacted by Spotify layoffs (2024-02-14)](https://www.digitalmusicnews.com/2024/02/14/every-noise-at-once-engineer-impacted-by-spotify-layoffs/)
- [Can't Get Much Higher — Spotify's Former Data Guru interview](https://www.cantgetmuchhigher.com/p/spotifys-former-data-guru-sets-the)
- [Ari's Take — How Spotify's Algorithm Works (Glenn McDonald)](https://aristake.com/glenn-mcdonald/)
- [Hyperpop — Wikipedia](https://en.wikipedia.org/wiki/Hyperpop)
- [Far Out Magazine — Did Spotify invent hyperpop?](https://faroutmagazine.co.uk/did-spotify-invent-hyperpop/)
- [Music Ally — Could Spotify open up Truffle Pig and playlist analytics? (2015-07-22)](https://musically.com/2015/07/22/spotify-open-truffle-pig-playlist-analytics/)
- [Billboard Canada — Spotify's Former Data Alchemist Gives Every Song a Genre](https://ca.billboard.com/business/streaming/spotify-s-former-data-alchemist-gives-every-song-a-genre)
- [Tune My Music — Users Slam Spotify Wrapped 2024](https://blog.tunemymusic.com/spotify-wrapped-2024-bad-users-complain/)

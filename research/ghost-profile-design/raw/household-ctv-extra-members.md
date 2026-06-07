# How household-CTV systems handle the "extra members" privacy boundary

Research for HelpME2C ghost-profile design (Phase 1B). The CTV / streaming / smart-home industry is the closest commercial precedent we have for "data about a non-user in a shared environment." The dominant industry pattern is *per-profile, no fusion*. HelpME2C's ghost-profile is consciously breaking that pattern; this file documents what we are deviating from and why each platform chose what it did.

---

## 1. Per-platform analysis

### Netflix profiles

Netflix is the canonical "per-profile, no fusion" architecture. Up to five profiles per account, each with its own viewing history, "My List," maturity controls, language preferences, and — most importantly — its own recommendation surface ([Netflix Help: profiles](https://help.netflix.com/en/node/10421)). Netflix Research is explicit that "Recommendation and Search algorithms … provide members with personalized entertainment suggestions" *per profile*, and the [Netflix Tech Blog Foundation Model post](https://netflixtechblog.com/foundation-model-for-personalized-recommendation-1a0bd8e02d39) confirms personalisation runs at the profile, not account, level.

The choice was driven by **quality first, privacy second**: Netflix discovered early that household members watching together with one profile produced incoherent recommendations — the "kids' shows mixed with horror" problem. The privacy benefit (one user can't see another's history) followed from the architectural choice rather than driving it. Crucially, Netflix's [Help Center recommendations page](https://help.netflix.com/en/node/100639) notes that the recommendation system "does not include demographic information (such as age or gender) as part of the decision-making process" — a deliberate constraint that limits cross-profile inference even at the model level. With the 2023 "household" enforcement, Netflix added an "Extra Member" slot that is *still* a separate profile with its own history, not a fused signal.

### Hulu kids profiles

Hulu's parental controls are notably thin compared with Disney+ ([Plugged In review](https://www.pluggedin.com/blog/parental-controls-hulu/), [Screenwise guide](https://screenwiseapp.com/guides/disney-plus-parental-controls-and-guide)). A profile is either a "Kid's profile" (capped at PG / TV-PG) or it is not — no granular age band, no PIN-protected switches in older versions of the app. The parent provides a binary classification signal; that is the entire data model for the child. No per-child preference, no taste profile, no inferred demographic on the child. The Hulu PIN protection now applies to creating *and* accessing non-kid profiles, which is a privacy gesture but does not introduce data fusion.

### Disney+ profiles (including kids)

Disney+ ships Junior Mode, profile-level content rating, and a profile PIN ([Disney+ parental controls](https://help.disneyplus.com/article/disneyplus-parental-controls)). Like Netflix, every profile has its own recommendation surface; there is no documented fusion of viewing across profiles within an account. The parental signal is again coarse: age band / rating cap, set by the parent on the kid profile. No taste profile is built for the child *by the parent*. The child accumulates their own watching history under their profile; the parent can audit it but does not provide preferences on the child's behalf.

### Amazon Household / Amazon Family

The most interesting case for HelpME2C. Amazon Household (rebranded Amazon Family in 2025–2026 — [Amazon Family help](https://www.amazon.com/gp/help/customer/display.html?nodeId=GXULX24SE2RD7EXS)) explicitly supports two adults and up to four children sharing benefits. Critically: **each adult keeps their own Amazon account.** Order history is *not* visible across adults; recommendations are *not* fused ([Of Zen and Computing privacy guide](https://www.ofzenandcomputing.com/can-amazon-prime-household-members-see-your-purchases/), [iSeePassword guide](https://www.iseepassword.com/blog/can-amazon-prime-household-members-see-each-others-purchases/)). The only fused thing is the payment method and the entitlement-sharing layer (Prime delivery, Prime Video access). Amazon's design choice is to share *entitlements* across the household but to keep *taste data* per individual — which is the inverse of HelpME2C's instinct.

### YouTube Premium family plan

Six members, each with their own Google account, "their own personal library, subscriptions, and recommendations" ([YouTube Premium family plan help](https://support.google.com/youtube/answer/7507349?hl=en)). Family manager has billing control but no access to other members' watch history. The notable wrinkle: [Lauren Weinstein documented "suggestion leakage"](https://lauren.vortex.com/2023/08/16/youtube-suggestion-leakage) where one family member's viewing appears to influence recommendations on other accounts on the plan, despite the formal privacy claim. This is *unintended* fusion that Google has framed as a bug, not a feature — and it surfaces the privacy expectation: users on a family plan *expect* no fusion, and are upset when they see signs of it.

### Apple Family Sharing

The most privacy-conservative model. Apple Music, Apple TV+, Apple Arcade, Apple News+, Apple Fitness+ are all shared as subscriptions, but each family member continues to "sign in to each service using their own Apple Accounts, which keeps their individual content and media libraries and recommendations private and separate" ([Apple Family Sharing](https://www.apple.com/family-sharing/), [Apple Legal — Family Sharing & Privacy](https://www.apple.com/legal/privacy/data/en/family-sharing/)). iCloud+ doesn't expose photos/files cross-member. Apple is explicit in its marketing: "Everyone maintains privacy on their own devices, so the whole household gets more of what they want." No fusion, by deliberate choice, framed as a *brand value* rather than a constraint.

### Google Family Link

Child-account-focused. Parents can manage content filters, screen time, and approve downloads, but [Google's docs are explicit](https://guidebooks.google.com/family-link/supervised-account/what-parents-see-child) that "parents are unable to see private messages, search history, or previously watched videos on YouTube with their own Google account on Family Link." The data model gives the parent administrative power (block, time-limit, location-track) but *not* fused taste/behavioural data on the child. The child's recommendations are their own.

### Sonos / Alexa "household members"

Alexa Voice ID and Alexa Profiles allow per-voice recognition for personalised responses ([The Ambient Voice ID guide](https://www.the-ambient.com/how-to/multiple-alexa-accounts-voice-profiles-513/)). When one household member says "Alexa, call my mother," Alexa routes to *their* contacts, not the account-owner's. Sonos's voice integration sends recordings to the chosen voice partner without retaining a copy on the speaker ([Sonos privacy statement](https://www.sonos.com/en-us/legal/privacy)). The Sonos / Alexa model treats voice as a per-individual identifier; there is no fused household profile, though there is a shared-content layer (music subscription, lists).

### Spotify

Spotify Family is per-account: all plan members "have separate accounts and log in with their own details. Because you have separate accounts, music recommendations are tailored to your individual tastes" ([Spotify Family help](https://support.spotify.com/us/article/family-plan/)). Spotify Blend ([Spotify Newsroom on Blend](https://newsroom.spotify.com/2021-08-31/how-spotifys-newest-personalized-experience-blend-creates-a-playlist-for-you-and-your-bestie/)) is the rare exception — a *deliberately* fused product. Blend takes up to 10 users' listening data and produces a shared playlist. Crucially, all participants are themselves registered Spotify users who opt in to the Blend invitation. There is no Spotify product that fuses a registered user's data with an *inferred* profile of a non-user.

### The "YouTube co-watching" research paper (Sun et al., 2017)

Emily Sun (Cornell Tech) with co-authors at Google, "Challenges on the Journey to Co-Watching YouTube," ACM CSCW 2017 ([ACM DL](https://dl.acm.org/doi/10.1145/2998181.2998228), [Google Research listing](https://research.google/pubs/challenges-on-the-journey-to-co-watching-youtube/)). The paper combined a large-scale survey with a one-week diary study (n=12). The empirical findings worth noting for HelpME2C:

- Co-watching is a *negotiation*, not a fusion. Users switch between solo and joint modes constantly; they don't blend taste, they take turns or pick to a shared denominator.
- Device-sharing creates friction because the platform is designed around a single account/identity. Users compensate with workarounds (logging out, using "incognito" tabs, picking the "least personalised" device).
- Users engage in *impression management* — they're aware that watching certain things on a partner's account will skew that partner's recs, and they avoid it.
- Design recommendations cluster around: explicit "co-watching mode" UX, separation of recommendation signal between solo and group sessions, and supporting the *decision-making* step rather than the playback step.

The headline implication: co-watching users don't want their tastes silently merged. They want explicit modes and explicit control over which signals count for which person's profile.

---

## 2. The dominant pattern: per-profile, no fusion

Counting the platforms above: Netflix, Hulu, Disney+, Amazon Household (for adults), YouTube Premium Family, Apple Family Sharing, Google Family Link, Spotify Family — eight out of nine systems default to *per-individual data, separate recommendation surfaces*. Sonos/Alexa similarly partitions by voice identity. The industry has converged on **privacy by isolation** rather than **privacy by fusion-with-consent**.

Three forces drive this convergence:

1. **Recommendation quality.** Mixing two people's signal degrades the model for both; better recs come from separating them. (Netflix learned this early.)
2. **Privacy expectation.** Users *expect* their watch history to be theirs. Suggestion leakage (YouTube Premium Family) generates user complaints precisely because the expectation is violated.
3. **Regulatory caution.** Each fused profile is a separate compliance problem (whose consent, whose Article 14, whose deletion?). Per-profile sidesteps it.

---

## 3. The exceptions: where fusion happens

Fusion is the rare, deliberate, *opt-in* feature:

- **Spotify Blend** — all participants are registered users who explicitly join.
- **Amazon shared payment / shared entitlements** — fused *entitlement*, not *taste* (the consent boundary is much lower for "we share Prime").
- **Suggestion leakage on YouTube Premium Family** — not a feature; treated as a bug.

There is no commercial precedent for *unconsented fusion of an inferred non-user profile into the registered user's recommendation surface*. The closest analogue is the "shadow profile" controversy (Facebook, LinkedIn) — and that is precisely the pattern that has drawn enforcement and noyb complaints (see File 1 §7).

---

## 4. What HelpME2C learns from this

The industry has decided, near-unanimously, that the path of least legal and product resistance is **per-profile, no fusion**. HelpME2C is consciously taking a different path: the *group recommendation for couples* product requires *some* signal about the partner, and the registered-user-only model gives us none.

The trade-off:

- **Industry default**: ship a multi-profile UI, require both partners to be users, accept worse couples coverage in the cold-start window where only one partner has registered.
- **HelpME2C ghost-profile path**: invent a derived profile for the partner, get useful couples recs from day one, take on the legal/UX/ethical work that the industry has avoided.

The ghost-profile decision is justifiable only if the legal posture (File 1 §8) and the UX posture (this file §6) are *both* solid. If either is weak, the feature is exposed.

---

## 5. The Sun et al. co-watching paper, applied

The empirical findings translate directly into ghost-profile design constraints:

- **Co-watching is negotiation, not blend.** The ghost profile should not pretend to be a "fused us." It should model the partner as a separate axis the system *consults* when generating group recs, alongside the registered user — not a mean of the two.
- **Users engage in impression management.** They are uncomfortable when watching something will skew an absent partner's signal. By symmetry, the registered user is likely uncomfortable inputting things about their partner that they wouldn't want to be wrong about. The UX should make the partner-input low-stakes, easily revisable, and explicitly distinct from the registered user's own profile.
- **Decision-making is the bottleneck, not playback.** The product value of the ghost profile is in the *selection* moment ("what should we watch tonight"), not in long-running personalisation. This suggests scoping the ghost profile to that moment — light-weight, session-anchored, easily reset — rather than as a persistent shadow.

---

## 6. Relevance to ghost profile

Two paragraphs of synthesis:

The industry default — per-profile, no fusion — exists because every alternative (silent fusion, inferred profiles, shadow data) has been either avoided as a quality problem (Netflix) or punished as a privacy problem (Facebook, the Belgian DPA datr decision, the noyb shadow-profile complaints). Every commercial system that fuses taste data does so on opt-in (Spotify Blend) and only between *registered* users. HelpME2C's ghost-profile is, in this landscape, an unusual move: it fuses on the registered user's say-so, about a non-user, without the non-user's opt-in.

The mitigations that have to do the work, given the industry context: (a) **explicit registered-user disclosure to the partner** at the moment of partner-add (the Article 14 channel from File 1 §5), so the ghost profile cannot be a "shadow" in the Facebook sense — the registered user has been instructed to inform their partner; (b) **bounded scope** — only signals genuinely required for group selection, mirroring Hulu's coarse-grained parental signal rather than Spotify's full taste profile; (c) **session-anchored, not persistent** — Sun et al. tell us the value is in the decision moment; we should resist the temptation to build a 24-month behavioural archive; (d) **the responsible defaults from File 1 §8** — time-bounded retention, no analytics fusion, hard deletion, claim-on-register. Each of these is the platform doing voluntarily what the industry default has done by architectural choice.

---

## Citations

1. [Netflix Help — How to create, edit, or delete profiles](https://help.netflix.com/en/node/10421)
2. [Netflix Help — How Netflix's Recommendations System Works](https://help.netflix.com/en/node/100639)
3. [Netflix Tech Blog — Foundation Model for Personalized Recommendation](https://netflixtechblog.com/foundation-model-for-personalized-recommendation-1a0bd8e02d39)
4. [Netflix Research — Recommendations](https://research.netflix.com/research-area/recommendations)
5. [Hulu Help — Kids profiles and parental controls](https://help.hulu.com/article/hulu-restrict-content)
6. [Plugged In — Hulu parental controls review](https://www.pluggedin.com/blog/parental-controls-hulu/)
7. [Disney+ Help — Parental controls](https://help.disneyplus.com/article/disneyplus-parental-controls)
8. [Disney+ — Parental Controls: A Guide](https://www.disneyplus.com/explore/articles/parental-controls-guide-disney-plus)
9. [Amazon Family — What Is Amazon Family?](https://www.amazon.com/gp/help/customer/display.html?nodeId=GXULX24SE2RD7EXS)
10. [Of Zen and Computing — Amazon Prime Household privacy guide](https://www.ofzenandcomputing.com/can-amazon-prime-household-members-see-your-purchases/)
11. [iSeePassword — Can Amazon Prime Household members see each other's purchases](https://www.iseepassword.com/blog/can-amazon-prime-household-members-see-each-others-purchases/)
12. [YouTube Help — Premium & YouTube Music family plan requirements](https://support.google.com/youtube/answer/7507349?hl=en)
13. [Lauren Weinstein — YouTube Premium Family "suggestion leakage"](https://lauren.vortex.com/2023/08/16/youtube-suggestion-leakage)
14. [Apple — Family Sharing](https://www.apple.com/family-sharing/)
15. [Apple Legal — Family Sharing & Privacy](https://www.apple.com/legal/privacy/data/en/family-sharing/)
16. [Apple Support — How Family Sharing works](https://support.apple.com/en-us/105062)
17. [Google Family Link — Manage your child's Google Account](https://support.google.com/families/answer/7103262?hl=en)
18. [Google Guidebooks — What Your Parents See on Family Link](https://guidebooks.google.com/family-link/supervised-account/what-parents-see-child)
19. [Sonos — Privacy Statement](https://www.sonos.com/en-us/legal/privacy)
20. [The Ambient — Set up Household Profiles and Voice ID for Alexa](https://www.the-ambient.com/how-to/multiple-alexa-accounts-voice-profiles-513/)
21. [Spotify Support — Family plan](https://support.spotify.com/us/article/family-plan/)
22. [Spotify Newsroom — Blend launch](https://newsroom.spotify.com/2021-08-31/how-spotifys-newest-personalized-experience-blend-creates-a-playlist-for-you-and-your-bestie/)
23. [Sun et al., "Challenges on the Journey to Co-Watching YouTube," CSCW 2017 — ACM DL](https://dl.acm.org/doi/10.1145/2998181.2998228)
24. [Sun et al., paper on Google Research](https://research.google/pubs/challenges-on-the-journey-to-co-watching-youtube/)
25. [Sun et al., paper PDF (Google Research archive)](https://research.google.com/pubs/archive/46602.pdf)

# Preference Elicitation Research Report
_Topic: Preference elicitation questions for content recommenders — dislike signals, cold-start, and the gap between folk explanations of taste and system-usable features_
_12 items researched_
---
## Table of Contents
1. [Appraisal & Affective Disposition Theory (Zillmann, Raney, Oliver)](#appraisal-affective-disposition-theory-zillmann-raney-oliver) — **cold start applicability:** yes — a user can state "I dislike rooting for unli… | **cognitive load:** medium — recognising and selecting "I didn't like… | **abstraction level:** concept-level — moral/character alignment, protago… | **negative positive symmetry:** symmetric — disposition theory is inherently two-s…
2. [Choice overload, friction, and psychological reactance as rejection causes](#choice-overload-friction-and-psychological-reactance-as-rejection-causes) — **cold start applicability:** yes — choice overload and reactance can occur on t… | **cognitive load:** low — a single 'too many options / couldn't decide… | **abstraction level:** viewer-state / meta-level — the rejection is a pro… | **negative positive symmetry:** Specialised negative channel — captures a non-cont…
3. [Cold-start preference elicitation research](#cold-start-preference-elicitation-research) — **cold start applicability:** yes — purpose-built for the first session before a… | **cognitive load:** medium — pairwise comparison ("which of these two?… | **abstraction level:** feature-level (attributes such as genre) combined…
4. [Critique-based recommender systems (FindMe, Entree; survey Springer/UMUAI)](#critique-based-recommender-systems-findme-entree-survey-springerumuai) — **cold start applicability:** yes (a notable strength) — critiquing is the class… | **cognitive load:** medium to high — higher than a thumb. Unit critiqu… | **abstraction level:** Predominantly feature-level — critiques are bound… | **negative positive symmetry:** Symmetric and directional — critiquing is inherent…
5. [Folk psychology of taste (Nisbett & Wilson lineage)](#folk-psychology-of-taste-nisbett-wilson-lineage) — **cold start applicability:** yes — works on first session (it is about in-the-m… | **cognitive load:** high — reason-analysis is the explicit manipulatio… | **abstraction level:** Concept-level and meta-level. The work is about wh… | **negative positive symmetry:** Symmetric in scope — the confabulation effect appl…
6. [Folk theories of algorithms (DeVito; "Beyond Explicit and Implicit" 2025)](#folk-theories-of-algorithms-devito-beyond-explicit-and-implicit-2025) — **cold start applicability:** partial — folk theories are weakest and most uncer… | **cognitive load:** low per action (a swipe), but high cumulative cogn… | **abstraction level:** Meta-level (mental model of the system) plus viewe… | **negative positive symmetry:** Severely asymmetric in practice. Users WANT a nega…
7. [Mood Management Theory & viewer state effects (Zillmann, Reinecke)](#mood-management-theory-viewer-state-effects-zillmann-reinecke) — **cold start applicability:** yes — applies from the first session; current mood… | **cognitive load:** low — a single 'not in the mood right now' tap; th… | **abstraction level:** viewer-state — the dislike is about the user's tra… | **negative positive symmetry:** symmetric in intent — it is explicitly a negative-…
8. [Netflix taste preference UI & signal design](#netflix-taste-preference-ui-signal-design) — **cold start applicability:** yes — the onboarding 'pick titles you like' grid i… | **cognitive load:** low — one tap. The 2017 redesign was explicitly ju… | **abstraction level:** Title-level / item-level only. The thumb attaches… | **negative positive symmetry:** Asymmetric in richness. Positive has gradation (th…
9. [REASONER dataset (arXiv 2303.00168) & aspect-based preference modeling](#reasoner-dataset-arxiv-230300168-aspect-based-preference-modeling) — **cold start applicability:** partial — the dataset itself is collected with int… | **cognitive load:** medium — labelling reasons by aspect (pick aspects… | **abstraction level:** feature/aspect-level — reasons are decomposed into… | **negative positive symmetry:** symmetric — REASONER collects ground-truth reasons…
10. [Reasons For and Reasons Against framing (arXiv 2009.01953)](#reasons-for-and-reasons-against-framing-arxiv-200901953) — **cold start applicability:** partial — the paper's evaluated use is at recommen… | **cognitive load:** medium — selecting from structured reasons-against… | **abstraction level:** concept-level / structural — the framing is about… | **negative positive symmetry:** symmetric — this is the canonical source for the s…
11. [Spotify implicit negative signal (skips, replays, explicit dislikes)](#spotify-implicit-negative-signal-skips-replays-explicit-dislikes) — **cold start applicability:** no for the implicit signal (skips require an activ… | **cognitive load:** very low — skip is a single tap embedded in normal… | **abstraction level:** Track-level / item-level, with strong viewer-state…
12. [YouTube / TikTok "Not interested" signal quality (Mozilla 2022)](#youtube-tiktok-not-interested-signal-quality-mozilla-2022) — **cold start applicability:** no — these controls act on already-recommended ite… | **cognitive load:** low — one tap / one long-press. But the low load b… | **abstraction level:** Video-level / item-level, mostly. 'Don't recommend… | **negative positive symmetry:** Nominally symmetric (explicit negative buttons exi…

---
## Detailed Findings
### Appraisal & Affective Disposition Theory (Zillmann, Raney, Oliver) {#appraisal-affective-disposition-theory-zillmann-raney-oliver}
**Elicitation Method** _How the question/signal is collected from the user_

> Theory, not a method — explains the underlying cause of emotional like/dislike. Implies a structured categorical elicitation: let users name a character/moral reason for dislike (e.g. "I was asked to root for a bad person") as a selectable reason rather than a free-text or rating.

**Abstraction Level** _At what conceptual level the reason is captured — feature-level (specific content property like violence or pacing), concept-level (narrative/moral, e.g. "too dark"), or viewer-state (not in the mood, wrong context).
_

> concept-level — moral/character alignment, protagonist likability, antihero discomfort, the viewer's role as a 'moral monitor'. These are narrative-property concepts, above feature-level (gore, pacing) and distinct from viewer-state.

**Signal Quality For Recommender** _How well the captured reason maps to filterable content metadata or features the system can actually act on. Does the stated reason have a clear content counterpart, or is it too vague / context-dependent to filter on?
_

> Moderate-to-high IF mapped to narrative metadata. Disposition reasons map to filterable narrative properties such as protagonist morality (hero vs antihero vs villain-protagonist), moral ambiguity, sympathetic-character presence, and just-vs-unjust outcomes. The map exists but requires a narrative taxonomy the system maintains; raw moral judgement is not in standard genre metadata.

**Reason Attributability** _Can the captured reason be attributed to a stable, system-usable cause (content property, viewer state, social context, friction/fatigue)? Distinct from signal quality — attributability asks whether it's a content fact at all. Mozilla/YouTube data shows much negative signal is unattributable.
_

> Strong — disposition theory says the dislike is rooted in a stable, identifiable cause (moral evaluation of characters), making it attributable to a content fact (character moral framing) rather than noise or mood.

**Cold Start Applicability** _Does the method work before the system has watch history? Some elicitation approaches require prior interactions to make sense.
_

> yes — a user can state "I dislike rooting for unlikable/immoral protagonists" with no watch history; it is a stable disposition, not a history-derived signal.

**Cognitive Load** _Effort required for the user to answer honestly and accurately. High cognitive load increases drop-off and increases the Wilson & Schooler introspection-harm risk (articulating reasons degrades preference quality).
_

> medium — recognising and selecting "I didn't like being asked to root for a bad person" from a list is low; articulating it unprompted in free text is high. Offering it as a pre-named category keeps load low.

**Introspection Harm Risk** _Does this elicitation method risk degrading the underlying preference signal by asking the user to consciously articulate reasons? (Wilson & Schooler 1991: thinking too much can make stated preferences worse-predicting of later satisfaction.) Flagging where "tell us why" backfires.
_

> Moderate — moral-character reactions are relatively accessible to introspection (people readily report disliking a protagonist), so the Wilson & Schooler degradation risk is lower than for diffuse aesthetic preferences, but forcing rationalisation of a gut moral reaction could still distort it. Prefer recognition (pick a label) over generation (write a reason).

**Folk Theory Dependence** _Does the method require the user to correctly model what the system will do with their answer? E.g. "not interested" only works if the user's mental model of the system matches its actual behaviour — a documented failure point.
_

> Low — the user reasons about the story (a character was unlikable), not about the recommender's machinery, so no correct mental model of the system is required.

**Negative Positive Symmetry** _Does the method capture dislike as a first-class signal, or only as absence / weak-negative? Most systems treat implicit signals as positive-only; dislike needs its own channel ("Reasons Against").
_

> symmetric — disposition theory is inherently two-sided (liking sympathetic characters with good outcomes; disliking immoral characters and unjust outcomes), so it naturally supplies a first-class dislike axis as well as a like axis.

**Confounded With Friction Flag** _Whether the captured rejection could actually be decision fatigue, search friction, or psychological reactance rather than a taste signal at all. Must be isolable to avoid corrupting the content-preference profile.
_

> Low — a moral/character objection is a genuine content-property reaction, clearly distinguishable from decision fatigue or search friction.

**Key Finding** _The primary empirical finding or design recommendation from this source/concept that a system designer should act on.
_

> Enjoyment is governed by moral judgement of characters: viewers act as 'untiring moral monitors', favouring characters whose actions are morally justified and enjoying narratives where liked characters succeed and disliked ones fail (Zillmann & Cantor 1977; Raney; antihero work by Krakowiak/Oliver). Dislike is frequently rooted in being positioned to sympathise with a morally objectionable protagonist — a concept-level, filterable taste axis.

**Gap From Real Practice** _Difference between what the research recommends and what major industry systems (Netflix, Spotify, YouTube, TikTok) currently do. The gap is the design opportunity for HelpME2C.
_

> No mainstream consumer recommender exposes a 'protagonist morality / who am I asked to root for' axis. Industry collapses this into coarse genre tags; the research says character-moral alignment is a primary driver of enjoyment that deserves its own elicitable dimension.

**Proposed Taxonomy Contribution** _What specific dislike/like reason category or axis does this item suggest for a cold-start onboarding taxonomy? Concrete labels a user would recognise immediately, plus the content signal each label maps to.
_

> Adds a 'character/moral alignment' dislike-and-like axis. Concrete labels users recognise: "I didn't want to root for a bad person" / "unlikable main character" / "no one to root for" (dislike) and "morally complex/antihero is fine" / "clear hero to root for" (like/preference). Maps to narrative metadata: protagonist-morality (hero/antihero/villain-protagonist), moral-ambiguity level, sympathetic-character presence, just-world outcome.

**Sources**

- <https://en.wikipedia.org/wiki/Affective_disposition_theory>
- <https://onlinelibrary.wiley.com/doi/10.1002/9781118783764.wbieme0081>
- <https://communication.iresearchnet.com/exposure-to-communication-content/affective-disposition-theories/>
- <https://www.researchgate.net/publication/274710596_Testing_Affective_Disposition_Theory_A_comparison_of_the_enjoyment_of_hero_and_antihero_narratives>
- <https://www.semanticscholar.org/paper/Affective-Disposition-Theory-Raney/c8b58182fbbe63a30192992a25379e89caaa7687>

---

### Choice overload, friction, and psychological reactance as rejection causes {#choice-overload-friction-and-psychological-reactance-as-rejection-causes}
**Elicitation Method** _How the question/signal is collected from the user_

> Theory + qualitative evidence motivating a non-content rejection branch: when a user bails, offer a structured 'why did you stop' that includes friction/fatigue options ('too many choices', 'couldn't decide', 'tired of looking') distinct from content-property reasons. Reactance suggests also allowing the user to retain perceived control (e.g. 'let me browse instead').

**Abstraction Level** _At what conceptual level the reason is captured — feature-level (specific content property like violence or pacing), concept-level (narrative/moral, e.g. "too dark"), or viewer-state (not in the mood, wrong context).
_

> viewer-state / meta-level — the rejection is a property of the decision context (decision fatigue, search friction) or a reaction to the personalization process itself (reactance), NOT a content property. Orthogonal to feature- and concept-level content axes.

**Signal Quality For Recommender** _How well the captured reason maps to filterable content metadata or features the system can actually act on. Does the stated reason have a clear content counterpart, or is it too vague / context-dependent to filter on?
_

> Deliberately near-zero as content signal — and that is the contribution: these rejections must be recognised as NON-content so they do not pollute the taste profile. Their value is diagnostic (UX/interface) and as a quarantine flag, not as filterable content metadata.

**Reason Attributability** _Can the captured reason be attributed to a stable, system-usable cause (content property, viewer state, social context, friction/fatigue)? Distinct from signal quality — attributability asks whether it's a content fact at all. Mozilla/YouTube data shows much negative signal is unattributable.
_

> Attributable to friction/fatigue or to reactance against personalization, NOT to content. The whole point is that the true cause is process/context; mis-attributing it to content corrupts the profile. The Netflix study documents an absence of explicit feedback, so these causes are usually invisible and silently mis-attributed.

**Cold Start Applicability** _Does the method work before the system has watch history? Some elicitation approaches require prior interactions to make sense.
_

> yes — choice overload and reactance can occur on the very first session (arguably more acutely, since the new user has the least guidance); the branch is needed from session one.

**Cognitive Load** _Effort required for the user to answer honestly and accurately. High cognitive load increases drop-off and increases the Wilson & Schooler introspection-harm risk (articulating reasons degrades preference quality).
_

> low — a single 'too many options / couldn't decide' tap; the state is self-evident to the user. But high choice-overload itself is what drives drop-off, so the elicitation must be minimal to avoid adding to the fatigue.

**Introspection Harm Risk** _Does this elicitation method risk degrading the underlying preference signal by asking the user to consciously articulate reasons? (Wilson & Schooler 1991: thinking too much can make stated preferences worse-predicting of later satisfaction.) Flagging where "tell us why" backfires.
_

> Low — reporting decision fatigue or 'too much choice' is direct and accessible; minimal rationalisation of taste involved.

**Folk Theory Dependence** _Does the method require the user to correctly model what the system will do with their answer? E.g. "not interested" only works if the user's mental model of the system matches its actual behaviour — a documented failure point.
_

> Moderate — reactance specifically is triggered when users perceive personalization as threatening their freedom of choice, which is itself a folk theory about the system; and the friction option only helps if users trust it won't be read as a content dislike. Legible, control-preserving UI is required.

**Negative Positive Symmetry** _Does the method capture dislike as a first-class signal, or only as absence / weak-negative? Most systems treat implicit signals as positive-only; dislike needs its own channel ("Reasons Against").
_

> Specialised negative channel — captures a non-content negative explicitly so it is not silently treated as either a content dislike or a weak non-action. Not a like/dislike-of-content axis at all.

**Confounded With Friction Flag** _Whether the captured rejection could actually be decision fatigue, search friction, or psychological reactance rather than a taste signal at all. Must be isolable to avoid corrupting the content-preference profile.
_

> This item IS the friction-confound concern. A large fraction of 'rejections' are decision fatigue / search friction (Netflix qualitative study, Springer 2024), and psychological reactance is a meta-level dislike of being personalized-at. Both MUST be isolable so they do not corrupt the content-preference signal — the central rationale for a dedicated non-content branch.

**Key Finding** _The primary empirical finding or design recommendation from this source/concept that a system designer should act on.
_

> Netflix users experience pronounced choice overload and decision fatigue with a notable ABSENCE of explicit feedback, meaning many 'rejections' are search-friction/fatigue artefacts rather than taste (Springer, Psychological Studies, 2024). Separately, psychological reactance means personalization that is perceived to threaten choice freedom produces meta-level resistance orthogonal to content. Both confound the taste signal if not isolated.

**Gap From Real Practice** _Difference between what the research recommends and what major industry systems (Netflix, Spotify, YouTube, TikTok) currently do. The gap is the design opportunity for HelpME2C.
_

> Streaming UIs respond to choice overload with auto-play, thumbnail steering, and 'next' prediction — and read the resulting skips/abandons straight into the content model, conflating friction and reactance with taste. No mainstream system offers a 'this is friction, not the content' escape hatch or a reactance-aware control-preserving option. Research says isolate these causes; practice absorbs them as content negatives.

**Proposed Taxonomy Contribution** _What specific dislike/like reason category or axis does this item suggest for a cold-start onboarding taxonomy? Concrete labels a user would recognise immediately, plus the content signal each label maps to.
_

> Adds a top-level NON-CONTENT rejection class (friction/fatigue + reactance), sibling to the viewer-state class, that is quarantined from the taste profile entirely. Concrete labels: "too many options / couldn't decide", "just tired of looking", "don't want to be told what to watch — let me browse". Maps to: zero content down-weight; routes to UX remedies (shorter shortlists, more user control) instead of profile updates.

**Sources**

- <https://link.springer.com/article/10.1007/s12646-024-00807-0>
- <https://www.researchgate.net/publication/384321498_User's_Dilemma_A_Qualitative_Study_on_the_Influence_of_Netflix_Recommender_Systems_on_Choice_Overload>
- <https://www.ajpor.org/article/129993-why-does-netflix-syndrome-occur-a-study-on-the-effect-of-content-choice-deferral-on-stress>

---

### Cold-start preference elicitation research {#cold-start-preference-elicitation-research}
**Elicitation Method** _How the question/signal is collected from the user_

> Structured active elicitation: decision-tree rating elicitation (item ratings at tree nodes) extended with (a) attribute-level preference queries (e.g. genre likes/dislikes) and (b) pairwise comparison at each node instead of single-item ratings. Survey (MDPI 2021) catalogues elicitation routes for acquiring auxiliary information when no history exists (explicit interviews, attribute/demographic capture, cross-domain transfer).

**Abstraction Level** _At what conceptual level the reason is captured — feature-level (specific content property like violence or pacing), concept-level (narrative/moral, e.g. "too dark"), or viewer-state (not in the mood, wrong context).
_

> feature-level (attributes such as genre) combined with item-level pairwise judgements. The attribute-aware branch deliberately lifts elicitation above individual items toward filterable content properties.

**Signal Quality For Recommender** _How well the captured reason maps to filterable content metadata or features the system can actually act on. Does the stated reason have a clear content counterpart, or is it too vague / context-dependent to filter on?
_

> High for the attribute-aware branch: genre/attribute preferences map directly to filterable content metadata and improve user clustering. Pairwise judgements give cleaner relative signal than absolute ratings but are item-bound and need translation to attributes to be filterable. Overall stronger map-to-metadata than free-text.

**Reason Attributability** _Can the captured reason be attributed to a stable, system-usable cause (content property, viewer state, social context, friction/fatigue)? Distinct from signal quality — attributability asks whether it's a content fact at all. Mozilla/YouTube data shows much negative signal is unattributable.
_

> Good — answers are bound to a known attribute or a known item pair, so the cause is system-defined by construction (the user is answering about a content fact the system already models). Little unattributable noise compared to implicit signals.

**Cold Start Applicability** _Does the method work before the system has watch history? Some elicitation approaches require prior interactions to make sense.
_

> yes — purpose-built for the first session before any watch history exists; the entire method targets new-user cold start.

**Cognitive Load** _Effort required for the user to answer honestly and accurately. High cognitive load increases drop-off and increases the Wilson & Schooler introspection-harm risk (articulating reasons degrades preference quality).
_

> medium — pairwise comparison ("which of these two?") is lower load and more reliable than absolute rating; attribute queries are a short pick-from-list. Decision-tree adaptivity keeps the number of queries low, which the 2025 paper highlights as a strength.

**Introspection Harm Risk** _Does this elicitation method risk degrading the underlying preference signal by asking the user to consciously articulate reasons? (Wilson & Schooler 1991: thinking too much can make stated preferences worse-predicting of later satisfaction.) Flagging where "tell us why" backfires.
_

> Low-to-moderate. Pairwise choice ("pick one") sidesteps the Wilson & Schooler articulate-your-reasons trap because the user reveals preference through choice rather than verbal justification; attribute queries ask for a category, not a rationale.

**Folk Theory Dependence** _Does the method require the user to correctly model what the system will do with their answer? E.g. "not interested" only works if the user's mental model of the system matches its actual behaviour — a documented failure point.
_

> Low — the user does not need a mental model of system behaviour; the system drives an adaptive interview and interprets answers itself.

**Confounded With Friction Flag** _Whether the captured rejection could actually be decision fatigue, search friction, or psychological reactance rather than a taste signal at all. Must be isolable to avoid corrupting the content-preference profile.
_

> Low — a deliberate onboarding interview is an explicit user action, not passive rejection, so answers are unlikely to be friction/fatigue artefacts (though long trees risk abandonment, which is drop-off, not a taste signal).

**Key Finding** _The primary empirical finding or design recommendation from this source/concept that a system designer should act on.
_

> Augmenting decision-tree rating elicitation with (1) attribute-level preference queries and (2) pairwise item comparisons at each node improves cold-start recommendation quality, especially under a reduced query budget (arXiv 2510.27342, 2025). The MDPI 2021 survey establishes that the under-examined step is HOW to derive and obtain the auxiliary information for cold start, not just how to model it.

**Gap From Real Practice** _Difference between what the research recommends and what major industry systems (Netflix, Spotify, YouTube, TikTok) currently do. The gap is the design opportunity for HelpME2C.
_

> Industry cold-start onboarding (Netflix taste-picker, Spotify artist-picker) collects positive item/attribute picks but rarely uses adaptive pairwise comparison or attribute-level dislike capture, and almost never minimises the query budget adaptively per user. The research recommends adaptive, attribute-aware, comparison-based elicitation; practice ships static like-only pick grids.

**Proposed Taxonomy Contribution** _What specific dislike/like reason category or axis does this item suggest for a cold-start onboarding taxonomy? Concrete labels a user would recognise immediately, plus the content signal each label maps to.
_

> Supports an attribute-level axis in onboarding: ask users to express preference at the genre/theme/attribute level (not just pick titles), and capture it as a relative/pairwise signal ("more like A than B") rather than absolute ratings. Concrete labels: liked-attributes and disliked-attributes pulled from the cross-medium taxonomy, surfaced as comparative picks. This is the structural backbone onto which the disliked-reason categories from the other items attach.

**Sources**

- <https://arxiv.org/abs/2510.27342>
- <https://arxiv.org/html/2510.27342v1>
- <https://www.mdpi.com/2076-3417/11/20/9608>
- <https://arxiv.org/abs/2406.00973>

_Uncertain fields (skipped): negative_positive_symmetry_

---

### Critique-based recommender systems (FindMe, Entree; survey Springer/UMUAI) {#critique-based-recommender-systems-findme-entree-survey-springerumuai}
**Elicitation Method** _How the question/signal is collected from the user_

> Conversational, iterative critiquing: after a recommendation is shown (and often rejected), the user states a directional critique on item features — 'cheaper', 'larger', 'different manufacturer'. Two forms: UNIT critiques (constrain one feature at a time; FindMe/Entree, fixed pre-designed set) and COMPOUND critiques (dynamically generated combinations of multiple unit critiques, e.g. 'different make, lower processor speed and cheaper'; Reilly et al. 2004). Aspect-anchored, structured — not free text, not bare binary.

**Abstraction Level** _At what conceptual level the reason is captured — feature-level (specific content property like violence or pacing), concept-level (narrative/moral, e.g. "too dark"), or viewer-state (not in the mood, wrong context).
_

> Predominantly feature-level — critiques are bound to concrete, filterable item attributes (price, size, processor speed, cuisine, manufacturer). This is the method's strength and its limitation: it captures exactly what is in the feature schema and nothing outside it (so concept-level 'too dark' or viewer-state 'not in the mood' have no native expression).

**Signal Quality For Recommender** _How well the captured reason maps to filterable content metadata or features the system can actually act on. Does the stated reason have a clear content counterpart, or is it too vague / context-dependent to filter on?
_

> High — arguably the highest of any method here for actionability. Because every critique is feature-mapped by construction, each one is directly executable as a filter/constraint update. There is no gap between the stated reason and a content property; the reason IS a content property. Compound critiques carry more bits per interaction than unit critiques.

**Reason Attributability** _Can the captured reason be attributed to a stable, system-usable cause (content property, viewer state, social context, friction/fatigue)? Distinct from signal quality — attributability asks whether it's a content fact at all. Mozilla/YouTube data shows much negative signal is unattributable.
_

> High and explicit — the reason is anchored to a named feature with a direction, so attribution to a stable content cause is built in. This is the cleanest attributability of all six items: the critique cannot be a confabulated narrative because it is selected from a structured, feature-grounded space.

**Cold Start Applicability** _Does the method work before the system has watch history? Some elicitation approaches require prior interactions to make sense.
_

> yes (a notable strength) — critiquing is the classic remedy for cold start: it works from the very first recommendation with NO prior watch history, because it elicits constraints conversationally rather than learning from history. The user navigates by reacting to concrete examples.

**Cognitive Load** _Effort required for the user to answer honestly and accurately. High cognitive load increases drop-off and increases the Wilson & Schooler introspection-harm risk (articulating reasons degrades preference quality).
_

> medium to high — higher than a thumb. Unit critiques are low-medium (pick one feature direction); compound critiques and multi-turn navigation raise load and session length. The survey notes the central trade-off: compound critiques cut the number of cycles but each decision is harder. This is the cost paid for high signal quality.

**Introspection Harm Risk** _Does this elicitation method risk degrading the underlying preference signal by asking the user to consciously articulate reasons? (Wilson & Schooler 1991: thinking too much can make stated preferences worse-predicting of later satisfaction.) Flagging where "tell us why" backfires.
_

> Low-to-moderate — because critiques are recognition-from-a-structured-set rather than free generation of reasons, they sidestep most of the Wilson & Schooler confabulation harm. The user reacts to a concrete shown item ('I want it cheaper than THIS') rather than introspecting abstract preferences in a vacuum, which grounds the judgement.

**Folk Theory Dependence** _Does the method require the user to correctly model what the system will do with their answer? E.g. "not interested" only works if the user's mental model of the system matches its actual behaviour — a documented failure point.
_

> Low — the system makes its response legible: a critique visibly tightens the candidate set in the next cycle, so the user's mental model is continuously corrected by the interaction loop. Little reliance on a correct prior theory of system behaviour.

**Negative Positive Symmetry** _Does the method capture dislike as a first-class signal, or only as absence / weak-negative? Most systems treat implicit signals as positive-only; dislike needs its own channel ("Reasons Against").
_

> Symmetric and directional — critiquing is inherently a 'why not / what's wrong with this one' mechanism. Rejection ('not this') is first-class and is immediately converted into a constructive constraint, which is exactly the negative-channel that thumbs-down lacks. This is the strongest negative-signal handling of the six.

**Confounded With Friction Flag** _Whether the captured rejection could actually be decision fatigue, search friction, or psychological reactance rather than a taste signal at all. Must be isolable to avoid corrupting the content-preference profile.
_

> Low — a directional feature critique ('cheaper', 'less violent') is hard to confuse with fatigue or friction; it carries explicit content semantics. The risk is the opposite: the structured space may force a feature reason when the true cause was viewer-state, mislabelling a mood rejection as a feature critique.

**Key Finding** _The primary empirical finding or design recommendation from this source/concept that a system designer should act on.
_

> Chen & Pu, 'Critiquing-based recommenders: survey and emerging trends', UMUAI 22(1-2), 2012: structured critiquing yields high-quality, directly-actionable, feature-mapped preference signal and is effective for cold start. Unit critiques (single feature, FindMe/Entree) are low-load but slow; compound critiques (Reilly et al. 2004) carry more information per cycle and reduce session length but raise per-decision cognitive cost. The best-supported design is system-suggested, structured, aspect-anchored critiques — neither free text nor bare binary — balancing signal quality against effort.

**Gap From Real Practice** _Difference between what the research recommends and what major industry systems (Netflix, Spotify, YouTube, TikTok) currently do. The gap is the design opportunity for HelpME2C.
_

> Research demonstrated structured aspect-anchored critiquing decades ago, yet mainstream TV/music/video recommenders (Netflix, Spotify, YouTube, TikTok) ship only bare binary thumbs and an unattributed 'Not interested'. None expose a 'why not — which aspect?' critique after a rejection. The entire structured-critique middle path between free text and binary is absent from consumer streaming UIs — the direct design opportunity.

**Proposed Taxonomy Contribution** _What specific dislike/like reason category or axis does this item suggest for a cold-start onboarding taxonomy? Concrete labels a user would recognise immediately, plus the content signal each label maps to.
_

> Directly motivates the core taxonomy proposal: after a like/dislike, offer a small set of system-suggested, aspect-anchored reason chips mapped to filterable content metadata (e.g. for dislike: 'too violent', 'too slow', 'tone too dark', 'not this genre', 'didn't like the lead') — i.e. unit-critiques recast as recognisable chips. Plus optional compound combinations for power cases. Crucially, each chip must have a defined content-feature counterpart so it is executable, exactly as in critiquing systems.

**Sources**

- <https://link.springer.com/article/10.1007/s11257-011-9108-6>
- <https://link.springer.com/content/pdf/10.1007/s11257-011-9108-6.pdf>
- <https://ieeexplore.ieee.org/document/1410796/>
- <https://link.springer.com/article/10.1007/s13042-016-0611-2>
- <https://link.springer.com/article/10.1007/s12559-018-9586-5>

---

### Folk psychology of taste (Nisbett & Wilson lineage) {#folk-psychology-of-taste-nisbett-wilson-lineage}
**Elicitation Method** _How the question/signal is collected from the user_

> Foundational research critiquing free-text / open-ended 'explain your reasons' elicitation. Nisbett & Wilson (1977) reviewed verbal self-reports of mental process; Wilson & Schooler (1991) manipulated 'analyse why you feel this way' (reasons analysis) vs. control before a preference judgement. The relevant elicitation method under study is conscious verbal reason-articulation.

**Abstraction Level** _At what conceptual level the reason is captured — feature-level (specific content property like violence or pacing), concept-level (narrative/moral, e.g. "too dark"), or viewer-state (not in the mood, wrong context).
_

> Concept-level and meta-level. The work is about whether people can validly report the causes of their own preferences at all — across feature-level (jam attributes), concept-level (course qualities), and inferred-cause levels. Finding: introspected reasons drift toward whatever is verbally accessible/plausible rather than what actually drove the affective preference.

**Signal Quality For Recommender** _How well the captured reason maps to filterable content metadata or features the system can actually act on. Does the stated reason have a clear content counterpart, or is it too vague / context-dependent to filter on?
_

> Low when the signal is a user-articulated reason. The articulated reason is systematically NOT the true driver of the preference (confabulation), so it maps poorly to filterable content properties. Implication: the affective like/dislike act itself is higher-quality signal than the reason the user gives for it.

**Reason Attributability** _Can the captured reason be attributed to a stable, system-usable cause (content property, viewer state, social context, friction/fatigue)? Distinct from signal quality — attributability asks whether it's a content fact at all. Mozilla/YouTube data shows much negative signal is unattributable.
_

> Poor by design — this is the central thesis. People lack introspective access to the actual causes of their preferences (Nisbett & Wilson 1977), so a stated reason cannot be reliably attributed to a stable content cause. Attributability of the act ('I liked this') is fine; attributability of the volunteered why is unreliable.

**Cold Start Applicability** _Does the method work before the system has watch history? Some elicitation approaches require prior interactions to make sense.
_

> yes — works on first session (it is about in-the-moment preference judgement, not history). But the warning applies most acutely at cold start, where the system most wants a 'reason' and the user is most likely to confabulate one.

**Cognitive Load** _Effort required for the user to answer honestly and accurately. High cognitive load increases drop-off and increases the Wilson & Schooler introspection-harm risk (articulating reasons degrades preference quality).
_

> high — reason-analysis is the explicit manipulation. The harm scales with the load: asking users to articulate reasons is exactly the high-load condition shown to degrade preference quality.

**Folk Theory Dependence** _Does the method require the user to correctly model what the system will do with their answer? E.g. "not interested" only works if the user's mental model of the system matches its actual behaviour — a documented failure point.
_

> Low — the finding is independent of the user's model of any system; it is about the user's model of their own mind. Folk THEORY of one's own taste (folk psychology) is the thing shown to be unreliable.

**Negative Positive Symmetry** _Does the method capture dislike as a first-class signal, or only as absence / weak-negative? Most systems treat implicit signals as positive-only; dislike needs its own channel ("Reasons Against").
_

> Symmetric in scope — the confabulation effect applies to both liking and disliking judgements. Neither direction is protected from the introspection-degradation effect.

**Confounded With Friction Flag** _Whether the captured rejection could actually be decision fatigue, search friction, or psychological reactance rather than a taste signal at all. Must be isolable to avoid corrupting the content-preference profile.
_

> Indirectly relevant — confabulated reasons may post-hoc rationalise a rejection that was actually driven by mood, fatigue, or salience, mislabelling a friction/state rejection as a content-property rejection. The reason cannot disambiguate friction from taste.

**Key Finding** _The primary empirical finding or design recommendation from this source/concept that a system designer should act on.
_

> Wilson & Schooler (1991, JPSP 60:181-192): introspecting about reasons reduces the quality of preferences and decisions — reason-analysis subjects' choices corresponded LESS with expert opinion than controls'. Nisbett & Wilson (1977, Psych Review 84:231-259): people 'tell more than they can know' — they readily produce explanations for their behaviour that are not the actual causes, because they lack introspective access to the underlying processes. Design corollary: prefer eliciting the affective act (liked/disliked) over the user's articulated reason; treat any 'tell us why' free-text as confabulation-prone.

**Gap From Real Practice** _Difference between what the research recommends and what major industry systems (Netflix, Spotify, YouTube, TikTok) currently do. The gap is the design opportunity for HelpME2C.
_

> Industry has partially internalised this (Netflix's stars-to-thumbs switch was explicitly justified as stars 'force you to think too much'), but most 'tell us why' / reason-tagging / review-text features ignore the introspection-harm literature and treat volunteered reasons as ground truth. The gap: no major system distinguishes the high-validity affective act from the low-validity articulated reason, and several actively solicit free-text reasons that the research predicts will be confabulated.

**Proposed Taxonomy Contribution** _What specific dislike/like reason category or axis does this item suggest for a cold-start onboarding taxonomy? Concrete labels a user would recognise immediately, plus the content signal each label maps to.
_

> Argues AGAINST free-text 'why' fields at cold start and FOR a small, closed set of recognisable, pre-validated reason chips so the user recognises rather than generates a reason (recognition lowers confabulation and cognitive load vs. free recall). Also argues the like/dislike act should be capturable WITHOUT a mandatory reason — reason is optional, never gating. Taxonomy axis suggested: separate 'affective verdict' (liked/disliked, mandatory, one tap) from 'optional structured reason' (recognition-from-list, never free text).

**Sources**

- <https://pubmed.ncbi.nlm.nih.gov/2016668/>
- <http://bear.warrington.ufl.edu/brenner/mar7588/Papers/wilson-schooler-jpsp-1991.pdf>
- <https://journals.sagepub.com/doi/abs/10.1177/0146167293193010>
- <https://home.csulb.edu/~cwallis/382/readings/482/nisbett%20saying%20more.pdf>
- <https://philpapers.org/rec/NISTMT>
- <https://guilfordjournals.com/doi/10.1521/soco.2016.34.3.167>

_Uncertain fields (skipped): introspection_harm_risk_

---

### Folk theories of algorithms (DeVito; "Beyond Explicit and Implicit" 2025) {#folk-theories-of-algorithms-devito-beyond-explicit-and-implicit-2025}
**Elicitation Method** _How the question/signal is collected from the user_

> Studies the full repertoire of user feedback channels: explicit (thumbs, 'Not interested', 6 behaviours), intentional-implicit (deliberate swipe/ignore/search to steer the feed, 9 behaviours), and unintentional-implicit (incidental likes/watches, 13 behaviours). Central insight: users SELECT among these channels strategically, not just respond. Method examined is therefore the user's channel-choice itself, governed by folk theory.

**Abstraction Level** _At what conceptual level the reason is captured — feature-level (specific content property like violence or pacing), concept-level (narrative/moral, e.g. "too dark"), or viewer-state (not in the mood, wrong context).
_

> Meta-level (mental model of the system) plus viewer-state. Distinct from folk psychology of taste: this is the user's theory of what the SYSTEM will do with a given action, not why they like something. Operates above feature/concept level — users reason about 'if I swipe, the algorithm learns X'.

**Signal Quality For Recommender** _How well the captured reason maps to filterable content metadata or features the system can actually act on. Does the stated reason have a clear content counterpart, or is it too vague / context-dependent to filter on?
_

> Systematically degraded by channel-choice mismatch. Because platforms read most implicit behaviour as positive, the large share of intentional-implicit NEGATIVE signalling (swipe/ignore meant as 'less of this') is silently inverted — recorded as engagement/positive. Signal quality is low not because the user is vague but because the system mis-maps the user's intended polarity.

**Reason Attributability** _Can the captured reason be attributed to a stable, system-usable cause (content property, viewer state, social context, friction/fatigue)? Distinct from signal quality — attributability asks whether it's a content fact at all. Mozilla/YouTube data shows much negative signal is unattributable.
_

> Low at the system end despite being intentional at the user end. The user has a clear reason ('I am telling it I dislike this by scrolling past') but the system cannot attribute the scroll to dislike vs. context vs. accidental — the channel carries no polarity or cause. The attributability failure is structural, not introspective.

**Cold Start Applicability** _Does the method work before the system has watch history? Some elicitation approaches require prior interactions to make sense.
_

> partial — folk theories are weakest and most uncertain at cold start (the user has not yet learned how this specific system responds), so channel-choice is least reliable early. Users import folk theories from other platforms, which may not transfer.

**Cognitive Load** _Effort required for the user to answer honestly and accurately. High cognitive load increases drop-off and increases the Wilson & Schooler introspection-harm risk (articulating reasons degrades preference quality).
_

> low per action (a swipe), but high cumulative cognitive overhead from having to maintain and reason with an uncertain theory of system behaviour. The strategising is the load, not the tap.

**Introspection Harm Risk** _Does this elicitation method risk degrading the underlying preference signal by asking the user to consciously articulate reasons? (Wilson & Schooler 1991: thinking too much can make stated preferences worse-predicting of later satisfaction.) Flagging where "tell us why" backfires.
_

> Low — this method does not ask the user to articulate taste reasons, so the Wilson & Schooler degradation does not apply. The risk here is misinterpretation, not introspection harm.

**Folk Theory Dependence** _Does the method require the user to correctly model what the system will do with their answer? E.g. "not interested" only works if the user's mental model of the system matches its actual behaviour — a documented failure point.
_

> VERY HIGH — this is the defining property. The method only works if the user's mental model of system behaviour matches reality. The paper documents that it routinely does NOT: users swipe/ignore believing the system reads it as negative, while the system reads it as neutral/positive. Folk-theory dependence is the core failure mode.

**Negative Positive Symmetry** _Does the method capture dislike as a first-class signal, or only as absence / weak-negative? Most systems treat implicit signals as positive-only; dislike needs its own channel ("Reasons Against").
_

> Severely asymmetric in practice. Users WANT a negative channel and improvise one out of implicit behaviour (21 participants used ignore/swipe as negative feedback), but systems provide no first-class implicit-negative channel and treat the improvised signal as positive. The asymmetry is the headline problem.

**Confounded With Friction Flag** _Whether the captured rejection could actually be decision fatigue, search friction, or psychological reactance rather than a taste signal at all. Must be isolable to avoid corrupting the content-preference profile.
_

> High — swipe/ignore is maximally confounded: it can mean dislike, 'already seen', wrong-mood, accidental, or simple scroll momentum. The system cannot separate intentional-negative swipes from incidental ones, so friction and taste are fused in the dominant signal.

**Key Finding** _The primary empirical finding or design recommendation from this source/concept that a system designer should act on.
_

> DeVito et al., CHI 2025 (arXiv:2502.09869): users provide feedback through three categories — explicit, intentional-implicit, unintentional-implicit — and choose among them strategically based on folk theories of the algorithm. Platforms interpret implicit feedback as positive, but 21/participants deliberately use ignoring/swiping to signal DISINTEREST, so a large fraction of intended-negative signal is silently misread as positive. Recommendation: add non-intrusive confirmation cues, detect repeated-skip patterns and prompt ('Want to see less of this?'), and offer purpose-oriented controls rather than relying on a single binary 'Not interested'.

**Gap From Real Practice** _Difference between what the research recommends and what major industry systems (Netflix, Spotify, YouTube, TikTok) currently do. The gap is the design opportunity for HelpME2C.
_

> Research says: give users a confirmed, first-class implicit-negative channel and reflect back what the system understood. Industry: provides only a weak explicit 'Not interested' (which users distrust) and reads all implicit behaviour as positive, with no feedback loop confirming what was registered. The gap is the missing intentional-implicit-negative channel and the missing confirmation/transparency that would let folk theories converge on reality.

**Proposed Taxonomy Contribution** _What specific dislike/like reason category or axis does this item suggest for a cold-start onboarding taxonomy? Concrete labels a user would recognise immediately, plus the content signal each label maps to.
_

> Suggests the onboarding/feedback design must make polarity EXPLICIT rather than inferred, and must CONFIRM registration so the user's folk theory calibrates. Taxonomy contribution: a 'show me less of this — because…' construct that converts ambiguous swipe-negatives into attributed negatives, with reason chips distinguishing 'disliked the content' from 'already seen' / 'not now / wrong mood'. Argues against relying on swipe/ignore as a taste signal at all without an attribution layer.

**Sources**

- <https://arxiv.org/html/2502.09869v1>
- <https://dl.acm.org/doi/full/10.1145/3706598.3713241>
- <https://ar5iv.labs.arxiv.org/html/2502.09869>
- <https://crl.acrl.org/index.php/crl/article/view/25767/34452>

---

### Mood Management Theory & viewer state effects (Zillmann, Reinecke) {#mood-management-theory-viewer-state-effects-zillmann-reinecke}
**Elicitation Method** _How the question/signal is collected from the user_

> Implies a dedicated viewer-state elicitation branch separate from content rating: a structured categorical 'not in the mood / wrong moment' option attached to a rejection, rather than letting the rejection fall through to the content-preference model. A one-tap state tag at decline time.

**Abstraction Level** _At what conceptual level the reason is captured — feature-level (specific content property like violence or pacing), concept-level (narrative/moral, e.g. "too dark"), or viewer-state (not in the mood, wrong context).
_

> viewer-state — the dislike is about the user's transient mood/context (in need of mood repair, wrong time, low energy), not a stable content property. Explicitly the third level in the field taxonomy.

**Signal Quality For Recommender** _How well the captured reason maps to filterable content metadata or features the system can actually act on. Does the stated reason have a clear content counterpart, or is it too vague / context-dependent to filter on?
_

> Deliberately LOW as a content signal and that is the point: a mood-mismatch rejection should NOT map to filterable content properties or down-weight the title. Its value is as a routing flag that quarantines the rejection from the content-preference profile, plus a possible momentary-mood input for re-ranking the current session.

**Reason Attributability** _Can the captured reason be attributed to a stable, system-usable cause (content property, viewer state, social context, friction/fatigue)? Distinct from signal quality — attributability asks whether it's a content fact at all. Mozilla/YouTube data shows much negative signal is unattributable.
_

> Attributable to viewer state rather than content — the whole contribution is to make this distinction explicit. Without the branch, the signal is mis-attributed to the content (false negative).

**Cold Start Applicability** _Does the method work before the system has watch history? Some elicitation approaches require prior interactions to make sense.
_

yes — applies from the first session; current mood is independent of watch history and can be captured immediately.

**Cognitive Load** _Effort required for the user to answer honestly and accurately. High cognitive load increases drop-off and increases the Wilson & Schooler introspection-harm risk (articulating reasons degrades preference quality).
_

> low — a single 'not in the mood right now' tap; the user already knows their own state, no reflection about content needed.

**Introspection Harm Risk** _Does this elicitation method risk degrading the underlying preference signal by asking the user to consciously articulate reasons? (Wilson & Schooler 1991: thinking too much can make stated preferences worse-predicting of later satisfaction.) Flagging where "tell us why" backfires.
_

> Low — reporting current mood/state is direct and accessible; little risk of the articulate-your-reasons degradation since no rationalisation of taste is required.

**Folk Theory Dependence** _Does the method require the user to correctly model what the system will do with their answer? E.g. "not interested" only works if the user's mental model of the system matches its actual behaviour — a documented failure point.
_

> Moderate — the option only helps if the user understands that selecting 'not in the mood' will NOT permanently down-weight the title (otherwise they may avoid it). The UI must make the system's behaviour legible to avoid the 'not interested' folk-theory failure.

**Negative Positive Symmetry** _Does the method capture dislike as a first-class signal, or only as absence / weak-negative? Most systems treat implicit signals as positive-only; dislike needs its own channel ("Reasons Against").
_

> symmetric in intent — it is explicitly a negative-signal channel, but a specialised one that captures a NON-content negative so it is not conflated with a content dislike.

**Confounded With Friction Flag** _Whether the captured rejection could actually be decision fatigue, search friction, or psychological reactance rather than a taste signal at all. Must be isolable to avoid corrupting the content-preference profile.
_

> This field IS the core concern: a mood/state mismatch is exactly the kind of rejection that must be isolable so it does not corrupt the content-preference signal. Mood-management theory provides the theoretical basis for treating state-content mismatch as a distinct, non-taste rejection class.

**Key Finding** _The primary empirical finding or design recommendation from this source/concept that a system designer should act on.
_

> Media selection is heavily driven by current mood: people in negative moods select positively-valenced/distracting content for mood repair; selection reflects anticipated affective payoff (Zillmann 1988; Reinecke et al. 2012 reframe it as intrinsic-need satisfaction). Design implication: some dislikes are state-content mismatches ('right show, wrong moment') that must not permanently down-weight the content.

**Gap From Real Practice** _Difference between what the research recommends and what major industry systems (Netflix, Spotify, YouTube, TikTok) currently do. The gap is the design opportunity for HelpME2C.
_

> Almost no consumer recommender offers a viewer-state branch at rejection time; Netflix/YouTube/Spotify funnel a skip or thumbs-down straight into the content model with no way to say 'good show, wrong mood'. The research says state and content must be separated; practice conflates them. This is flagged as HelpME2C's clearest differentiation opening.

**Proposed Taxonomy Contribution** _What specific dislike/like reason category or axis does this item suggest for a cold-start onboarding taxonomy? Concrete labels a user would recognise immediately, plus the content signal each label maps to.
_

> Adds a top-level VIEWER-STATE rejection class, orthogonal to content-property reasons, that quarantines the rejection from the taste profile. Concrete labels: "not in the mood right now", "wrong time / too heavy for tonight", "want something lighter/easier", "save for later". Maps to: no permanent content down-weight; optional session-level mood re-rank input only.

**Sources**

- <https://en.wikipedia.org/wiki/Mood_management_theory>
- <https://www.communicationtheory.org/mood-management-theory/>
- <https://www.researchgate.net/publication/319265020_Mood_Management_Theory>
- <https://www.semanticscholar.org/paper/Mood-Management-in-the-Context-of-Selective-Theory-Zillmann/d09300820648ed171449386ed05cb8e66e40a522>
- <https://pmc.ncbi.nlm.nih.gov/articles/PMC10731070/>

---

### Netflix taste preference UI & signal design {#netflix-taste-preference-ui-signal-design}
**Elicitation Method** _How the question/signal is collected from the user_

> Binary explicit feedback: thumbs up / thumbs down (introduced 2017, later extended to two-thumbs-up). Onboarding 'taste preferences' flow asks the new user to pick LIKED titles from a grid before any history exists. Implicit behavioural signal (play/abandon/completion) feeds the homepage. Reasons are NOT collected — neither for likes nor dislikes; thumbs-down is coarse and unattributed.

**Abstraction Level** _At what conceptual level the reason is captured — feature-level (specific content property like violence or pacing), concept-level (narrative/moral, e.g. "too dark"), or viewer-state (not in the mood, wrong context).
_

> Title-level / item-level only. The thumb attaches to a whole title with no decomposition into feature, concept, or viewer-state. The system internally infers feature/taxonomy structure, but the elicited signal carries no abstraction — there is no place for the user to say WHAT about the title they liked or rejected.

**Signal Quality For Recommender** _How well the captured reason maps to filterable content metadata or features the system can actually act on. Does the stated reason have a clear content counterpart, or is it too vague / context-dependent to filter on?
_

> Volume-high, attribution-low. The 2017 switch doubled rating VOLUME (thumbs got ~200% more ratings than stars), improving coverage — but each rating is one undifferentiated bit. A thumbs-down does not map to any specific content property, so quality-per-signal is low even though aggregate volume rose. Netflix explicitly found stars measured aspirational self-image, not behaviour.

**Reason Attributability** _Can the captured reason be attributed to a stable, system-usable cause (content property, viewer state, social context, friction/fatigue)? Distinct from signal quality — attributability asks whether it's a content fact at all. Mozilla/YouTube data shows much negative signal is unattributable.
_

> Poor — a thumbs-down is unattributed by design. It cannot be assigned to a content property, viewer state, or friction; the system must guess. This is the documented weakness the taxonomy aims to fix.

**Cold Start Applicability** _Does the method work before the system has watch history? Some elicitation approaches require prior interactions to make sense.
_

> yes — the onboarding 'pick titles you like' grid is purpose-built for cold start and works on first session with no history. Note it elicits LIKES first (recognition from a curated grid), avoiding free recall and the introspection-harm trap.

**Cognitive Load** _Effort required for the user to answer honestly and accurately. High cognitive load increases drop-off and increases the Wilson & Schooler introspection-harm risk (articulating reasons degrades preference quality).
_

> low — one tap. The 2017 redesign was explicitly justified by load reduction: Todd Yellin said five-star rating 'takes thought' / 'forces you to think too much', whereas a binary yes/no is easy to commit to. The load reduction is the stated reason volume doubled.

**Introspection Harm Risk** _Does this elicitation method risk degrading the underlying preference signal by asking the user to consciously articulate reasons? (Wilson & Schooler 1991: thinking too much can make stated preferences worse-predicting of later satisfaction.) Flagging where "tell us why" backfires.
_

> Low by design — and intentionally so. Netflix's stars-to-thumbs rationale is a near-verbatim industry echo of Wilson & Schooler: forcing graded reflection (5 stars) produced worse, more aspirational signal than a fast affective binary. The thumb minimises introspection harm. (No reason field means no confabulation surface.)

**Folk Theory Dependence** _Does the method require the user to correctly model what the system will do with their answer? E.g. "not interested" only works if the user's mental model of the system matches its actual behaviour — a documented failure point.
_

> Moderate for the thumb (users broadly grasp up=more, down=less), but higher than it appears: users do not know whether thumbs-down removes the title, the genre, or the actor, so the negative action's effect is opaque and folk theories diverge. The onboarding grid has low folk-theory dependence (clearly 'tell us what you like').

**Negative Positive Symmetry** _Does the method capture dislike as a first-class signal, or only as absence / weak-negative? Most systems treat implicit signals as positive-only; dislike needs its own channel ("Reasons Against").
_

> Asymmetric in richness. Positive has gradation (thumb-up vs two-thumbs-up 'love'); negative is a single coarse thumb-down with no gradation and no reason. Onboarding asks only for LIKES, never dislikes — the negative channel is an afterthought, exactly the asymmetry the project targets.

**Confounded With Friction Flag** _Whether the captured rejection could actually be decision fatigue, search friction, or psychological reactance rather than a taste signal at all. Must be isolable to avoid corrupting the content-preference profile.
_

> HIGH and empirically supported. Sahni et al. / 'User's Dilemma' (Psychological Studies, Springer 2024) qualitative study finds Netflix recommendations frequently produce frustration, choice-overload and choice-deferral; a large share of apparent rejections is decision fatigue and friction, not a content-property judgement. With 80% of streaming hours from homepage recs, abandonment is heavily confounded with overload rather than dislike.

**Key Finding** _The primary empirical finding or design recommendation from this source/concept that a system designer should act on.
_

> The 2017 stars-to-thumbs switch (Yellin, Variety/TechCrunch 2017) doubled rating volume (~200%) by cutting cognitive load — stars 'force you to think too much' and measured aspirational rather than actual taste. But the resulting thumbs-down is coarse and unattributed, and the 'User's Dilemma' study (Springer 2024) shows much apparent rejection is choice-overload/friction, not content dislike. Net: Netflix optimised for VOLUME and low load while abandoning attribution and conflating friction with taste.

**Gap From Real Practice** _Difference between what the research recommends and what major industry systems (Netflix, Spotify, YouTube, TikTok) currently do. The gap is the design opportunity for HelpME2C.
_

> Research (critiquing literature; DeVito 2025) calls for attributed, aspect-anchored negative signal and for isolating friction from taste. Netflix does the opposite on the negative side: one undifferentiated thumb, no reason, no friction-disambiguation, and onboarding that never elicits dislikes. The gap is a structured 'why not' layer on rejection plus a friction/mood escape hatch so abandonment is not misread as dislike.

**Proposed Taxonomy Contribution** _What specific dislike/like reason category or axis does this item suggest for a cold-start onboarding taxonomy? Concrete labels a user would recognise immediately, plus the content signal each label maps to.
_

> Validates 'likes-first, low-load, recognition-from-grid' as the correct cold-start positive primitive — keep it. The contribution is to ADD what Netflix omits: (1) a first-class dislike channel with reason chips, (2) a viewer-state/'not now' option distinct from 'disliked' to absorb friction/overload rejections, so abandonment and mood-mismatch never corrupt the taste profile. Taxonomy axis: 'liked it / not for me (content) / not now (state)'.

**Sources**

- <https://variety.com/2017/digital/news/netflix-thumbs-vs-stars-1202010492/>
- <https://techcrunch.com/2017/03/16/netflix-is-replacing-five-star-ratings-with-thumbs-up-or-down/>
- <https://variety.com/2017/digital/news/netflix-kills-star-ratings-thumbs-up-thumbs-down-1202023257/>
- <https://link.springer.com/article/10.1007/s12646-024-00807-0>
- <https://www.ajpor.org/article/129993-why-does-netflix-syndrome-occur-a-study-on-the-effect-of-content-choice-deferral-on-stress>

---

### REASONER dataset (arXiv 2303.00168) & aspect-based preference modeling {#reasoner-dataset-arxiv-230300168-aspect-based-preference-modeling}
**Elicitation Method** _How the question/signal is collected from the user_

> Dataset, not a live method — but it operationalises multi-aspect labelled elicitation: real users (~3,000) on a purpose-built video platform tagged recommendation explanations with multi-aspect ground-truth reasons for like AND dislike, including User Aspect Preference and Item Aspect Quality, plus free-text-to-aspect linkage. Combines structured aspect labels with rating/explanation feedback.

**Abstraction Level** _At what conceptual level the reason is captured — feature-level (specific content property like violence or pacing), concept-level (narrative/moral, e.g. "too dark"), or viewer-state (not in the mood, wrong context).
_

> feature/aspect-level — reasons are decomposed into discrete content aspects (the 'aspects' of items), bridging free-text 'why' to a fixed aspect vocabulary. Sits at feature-to-concept level depending on the aspect.

**Signal Quality For Recommender** _How well the captured reason maps to filterable content metadata or features the system can actually act on. Does the stated reason have a clear content counterpart, or is it too vague / context-dependent to filter on?
_

> High — this is its core value: it explicitly separates User Aspect Preference (does the user care about this aspect) from Item Aspect Quality (how the item rates on it), giving a directly filterable, aspect-anchored signal. It is the bridge from free-text 'why' to actionable aspect-level features.

**Reason Attributability** _Can the captured reason be attributed to a stable, system-usable cause (content property, viewer state, social context, friction/fatigue)? Distinct from signal quality — attributability asks whether it's a content fact at all. Mozilla/YouTube data shows much negative signal is unattributable.
_

> Strong — every reason is bound to a labelled aspect with real-user ground truth, so attributability to a concrete content fact is empirically grounded rather than inferred. This is the closest available empirical anchor for validating that a stated dislike maps to a stable cause.

**Cold Start Applicability** _Does the method work before the system has watch history? Some elicitation approaches require prior interactions to make sense.
_

> partial — the dataset itself is collected with interaction/explanation context, not a pure first-session interview, but the aspect vocabulary and User-Aspect-Preference structure are directly reusable to drive and validate a cold-start aspect-elicitation taxonomy.

**Cognitive Load** _Effort required for the user to answer honestly and accurately. High cognitive load increases drop-off and increases the Wilson & Schooler introspection-harm risk (articulating reasons degrades preference quality).
_

> medium — labelling reasons by aspect (pick aspects + polarity) is moderate effort; lighter than free-text, and the dataset shows real users will do it at scale.

**Introspection Harm Risk** _Does this elicitation method risk degrading the underlying preference signal by asking the user to consciously articulate reasons? (Wilson & Schooler 1991: thinking too much can make stated preferences worse-predicting of later satisfaction.) Flagging where "tell us why" backfires.
_

> Moderate — asking users to decompose a reaction into aspects is more reflective than a single tap, carrying some Wilson & Schooler risk, but the recognition-based aspect picker (choose from a fixed list) limits over-rationalisation compared to open articulation.

**Folk Theory Dependence** _Does the method require the user to correctly model what the system will do with their answer? E.g. "not interested" only works if the user's mental model of the system matches its actual behaviour — a documented failure point.
_

> Low — users label why they like/dislike content aspects, reasoning about content not about the recommender's behaviour, so no correct system model is required.

**Negative Positive Symmetry** _Does the method capture dislike as a first-class signal, or only as absence / weak-negative? Most systems treat implicit signals as positive-only; dislike needs its own channel ("Reasons Against").
_

> symmetric — REASONER collects ground-truth reasons for BOTH like and dislike at the aspect level, making it one of the few empirical resources that treats dislike reasons as first-class, structured signal.

**Confounded With Friction Flag** _Whether the captured rejection could actually be decision fatigue, search friction, or psychological reactance rather than a taste signal at all. Must be isolable to avoid corrupting the content-preference profile.
_

> Low for the captured aspect reasons (they are content-anchored), but the dataset does not explicitly isolate friction/fatigue rejections; that separation must come from the taxonomy's non-content branches.

**Key Finding** _The primary empirical finding or design recommendation from this source/concept that a system designer should act on.
_

> A real-user, multi-aspect explainable-recommendation dataset with ground-truth reasons for like and dislike, splitting User Aspect Preference from Item Aspect Quality, enables benchmarking of explainable models on genuine human-labelled reasons (10 models, unified framework). It empirically bridges free-text 'why' to filterable aspect-level signal — the closest available ground truth for validating a dislike taxonomy.

**Gap From Real Practice** _Difference between what the research recommends and what major industry systems (Netflix, Spotify, YouTube, TikTok) currently do. The gap is the design opportunity for HelpME2C.
_

> Industry never collects or exposes aspect-level, polarity-labelled real reasons at this granularity; production negative feedback is a coarse thumbs-down with no aspect decomposition and no separation of user-preference-for-aspect vs item-quality-on-aspect. REASONER shows the richer signal is collectable and modelable; practice leaves it on the table.

**Proposed Taxonomy Contribution** _What specific dislike/like reason category or axis does this item suggest for a cold-start onboarding taxonomy? Concrete labels a user would recognise immediately, plus the content signal each label maps to.
_

> Provides the empirical aspect vocabulary and the User-Aspect-Preference vs Item-Aspect-Quality split to structure and VALIDATE the HelpME2C dislike taxonomy. Concretely: define each cold-start dislike label as an (aspect, polarity) pair and validate against REASONER's real-user aspect labels; use the preference/quality split so a dislike is recorded as 'I care about aspect X' + 'item was bad on X' rather than a flat negative.

**Sources**

- <https://arxiv.org/abs/2303.00168>

---

### Reasons For and Reasons Against framing (arXiv 2009.01953) {#reasons-for-and-reasons-against-framing-arxiv-200901953}
**Elicitation Method** _How the question/signal is collected from the user_

> Argument/justification framing applied to recommendation. For elicitation it motivates a structured 'reasons against' field — asking 'why not?' as a first-class, equally-weighted question alongside 'why yes', rather than treating dislike as the absence of a positive signal. Built on knowledge graphs + Snedegar's practical-reasoning theory.

**Abstraction Level** _At what conceptual level the reason is captured — feature-level (specific content property like violence or pacing), concept-level (narrative/moral, e.g. "too dark"), or viewer-state (not in the mood, wrong context).
_

> concept-level / structural — the framing is about elevating negative reasons to parity with positive ones; the reasons themselves span feature- and concept-level (knowledge-graph attributes). It is a meta-principle for how to structure both like and dislike capture.

**Signal Quality For Recommender** _How well the captured reason maps to filterable content metadata or features the system can actually act on. Does the stated reason have a clear content counterpart, or is it too vague / context-dependent to filter on?
_

> High potential: because reasons are grounded in a knowledge graph of item attributes, a captured 'reason against' maps to a specific filterable attribute rather than a diffuse thumbs-down. The structure forces the negative signal into an actionable, attribute-anchored form.

**Reason Attributability** _Can the captured reason be attributed to a stable, system-usable cause (content property, viewer state, social context, friction/fatigue)? Distinct from signal quality — attributability asks whether it's a content fact at all. Mozilla/YouTube data shows much negative signal is unattributable.
_

> Strong — by design each reason (for or against) is tied to a knowledge-graph node/attribute, so a stated objection is attributable to a concrete content property rather than left as unattributable negative noise.

**Cold Start Applicability** _Does the method work before the system has watch history? Some elicitation approaches require prior interactions to make sense.
_

> partial — the paper's evaluated use is at recommendation/explanation time, but the principle (ask 'reasons against' as first-class) transfers directly to cold-start onboarding by asking new users for structured dislikes, not just likes.

**Cognitive Load** _Effort required for the user to answer honestly and accurately. High cognitive load increases drop-off and increases the Wilson & Schooler introspection-harm risk (articulating reasons degrades preference quality).
_

> medium — selecting from structured reasons-against (knowledge-graph-backed options) is moderate; lower than free-text, higher than a single tap. The structure does the heavy lifting so the user recognises rather than generates.

**Introspection Harm Risk** _Does this elicitation method risk degrading the underlying preference signal by asking the user to consciously articulate reasons? (Wilson & Schooler 1991: thinking too much can make stated preferences worse-predicting of later satisfaction.) Flagging where "tell us why" backfires.
_

> Moderate — surfacing pre-structured 'reasons against' for recognition limits the harm, but explicitly prompting users to enumerate objections could induce post-hoc rationalisation. Recognition-over-generation again mitigates.

**Folk Theory Dependence** _Does the method require the user to correctly model what the system will do with their answer? E.g. "not interested" only works if the user's mental model of the system matches its actual behaviour — a documented failure point.
_

> Low-to-moderate — the framing is transparency-oriented (it shows the user the reasons), which actually reduces folk-theory dependence by making system reasoning legible; the user need not guess what the system does with a dislike.

**Negative Positive Symmetry** _Does the method capture dislike as a first-class signal, or only as absence / weak-negative? Most systems treat implicit signals as positive-only; dislike needs its own channel ("Reasons Against").
_

> symmetric — this is the canonical source for the symmetry principle: dislike ('reasons against') is treated as a first-class signal with equal standing to 'reasons for', not as weak-negative or non-action.

**Confounded With Friction Flag** _Whether the captured rejection could actually be decision fatigue, search friction, or psychological reactance rather than a taste signal at all. Must be isolable to avoid corrupting the content-preference profile.
_

> Not directly addressed — the framing structures content reasons-against but does not itself separate taste from friction/fatigue; that isolation has to come from a separate non-content branch (see mood-state and choice-overload items).

**Key Finding** _The primary empirical finding or design recommendation from this source/concept that a system designer should act on.
_

> Presenting and eliciting both 'reasons for' and 'reasons against' a recommendation (grounded in a knowledge graph and Snedegar's practical reasoning) yields significant gains in trust, engagement, and persuasion versus recommendation-only systems. Dislike deserves first-class, structured, attribute-anchored treatment rather than being modelled as absence of positive signal.

**Gap From Real Practice** _Difference between what the research recommends and what major industry systems (Netflix, Spotify, YouTube, TikTok) currently do. The gap is the design opportunity for HelpME2C.
_

> Mainstream systems collect dislike only as a coarse, unstructured thumbs-down / 'not interested' with no 'why not', and use it mainly to suppress, not to learn structured negative preference. The research says capture structured reasons-against at parity with reasons-for; practice offers an asymmetric, low-information negative channel.

**Proposed Taxonomy Contribution** _What specific dislike/like reason category or axis does this item suggest for a cold-start onboarding taxonomy? Concrete labels a user would recognise immediately, plus the content signal each label maps to.
_

> Establishes the structural principle that the cold-start taxonomy must have a fully-fledged dislike side, not a single thumbs-down. Concrete contribution: a 'reasons against' picker presented at parity with 'reasons for', each option anchored to a filterable attribute/theme in the cross-medium taxonomy, so a new user can say specifically WHY not (e.g. 'too violent', 'too slow', 'unlikable lead') as first-class onboarding signal.

**Sources**

- <https://arxiv.org/abs/2009.01953>

---

### Spotify implicit negative signal (skips, replays, explicit dislikes) {#spotify-implicit-negative-signal-skips-replays-explicit-dislikes}
**Elicitation Method** _How the question/signal is collected from the user_

> Predominantly implicit behavioural: skip (early skip = strong negative; <30s commonly treated as non-stream/negative), completion, replay (strong positive), save/playlist-add/share (strongest positive). Plus a sparse explicit channel: 'hide this song' / 'don't play this again' / thumbs on some surfaces (Radio, AI DJ). Skip is the dominant implicit-negative.

**Abstraction Level** _At what conceptual level the reason is captured — feature-level (specific content property like violence or pacing), concept-level (narrative/moral, e.g. "too dark"), or viewer-state (not in the mood, wrong context).
_

> Track-level / item-level, with strong viewer-state (listener-state) confounding. A skip attaches to one track but conflates content judgement with momentary context (mood, activity, over-play). No feature- or concept-level decomposition is elicited from the user.

**Reason Attributability** _Can the captured reason be attributed to a stable, system-usable cause (content property, viewer state, social context, friction/fatigue)? Distinct from signal quality — attributability asks whether it's a content fact at all. Mozilla/YouTube data shows much negative signal is unattributable.
_

> Low — a skip carries no reason. Evidence that skip approximates dislike but is not identical: in a related music-personalization model (arXiv:2406.04488) skip embeddings sit at cosine 0.82 to thumbs-down but only 0.16 to thumbs-up, AND are learned as a distinct embedding from explicit down-thumbs — i.e. skip is negative-ish but systematically NOT the same as an attributed dislike. The gap is the unattributed context.

**Cold Start Applicability** _Does the method work before the system has watch history? Some elicitation approaches require prior interactions to make sense.
_

> no for the implicit signal (skips require an active listening stream, hence prior interaction). Spotify's actual cold start uses a separate explicit step (pick artists you like) outside the skip/replay loop. The skip/replay machinery is a post-history mechanism.

**Cognitive Load** _Effort required for the user to answer honestly and accurately. High cognitive load increases drop-off and increases the Wilson & Schooler introspection-harm risk (articulating reasons degrades preference quality).
_

> very low — skip is a single tap embedded in normal listening and often happens without deliberate intent. This is its strength (frictionless, high volume) and its curse (carries almost no deliberate semantic content).

**Introspection Harm Risk** _Does this elicitation method risk degrading the underlying preference signal by asking the user to consciously articulate reasons? (Wilson & Schooler 1991: thinking too much can make stated preferences worse-predicting of later satisfaction.) Flagging where "tell us why" backfires.
_

> None — no reason articulation is requested, so Wilson & Schooler degradation does not apply. The problem is interpretive (the system over-reads an ambiguous behaviour), not introspective.

**Folk Theory Dependence** _Does the method require the user to correctly model what the system will do with their answer? E.g. "not interested" only works if the user's mental model of the system matches its actual behaviour — a documented failure point.
_

> Moderate-to-high — users skip believing it trains the algorithm, but the actual effect (does an early skip ban the song? the artist? lower the genre?) is undocumented and opaque, so folk theories diverge widely. The explicit 'hide' control depends on the user knowing it exists.

**Confounded With Friction Flag** _Whether the captured rejection could actually be decision fatigue, search friction, or psychological reactance rather than a taste signal at all. Must be isolable to avoid corrupting the content-preference profile.
_

> VERY HIGH — this is the defining problem. A skip is maximally confounded between dislike, over-play of a liked song, mood/activity mismatch, intro-too-long, and idle scrubbing. The 2406.04488 paper explicitly notes skips capture mixed motivations ('taste changes or a liked song is overplayed'). Skip cannot be cleanly separated into taste vs. context.

**Key Finding** _The primary empirical finding or design recommendation from this source/concept that a system designer should act on.
_

> Skip is Spotify's dominant implicit-negative but is fundamentally ambiguous between dislike and context. Modelling evidence (arXiv:2406.04488, music personalization) shows skip behaves like thumbs-down (cos 0.82) far more than thumbs-up (cos 0.16) yet is learned as a DISTINCT signal from explicit dislike — confirming a skip is negative-leaning but not an attributed taste verdict. Exact production weighting of skip vs. save vs. completion is not publicly documented. Useful contrast: music's high-frequency low-stakes skip differs from video's rare high-stakes abandonment.

**Gap From Real Practice** _Difference between what the research recommends and what major industry systems (Netflix, Spotify, YouTube, TikTok) currently do. The gap is the design opportunity for HelpME2C.
_

> Research models skip as a distinct, context-laden signal kept separate from explicit dislike; Spotify's consumer UI still leans on the ambiguous skip as the primary negative and exposes no easy way for the user to attribute a skip ('disliked' vs 'not now' vs 'overplayed'). The gap is the missing attribution layer that would let a skip declare its own polarity and cause.

**Proposed Taxonomy Contribution** _What specific dislike/like reason category or axis does this item suggest for a cold-start onboarding taxonomy? Concrete labels a user would recognise immediately, plus the content signal each label maps to.
_

> Reinforces that implicit-negative MUST NOT be treated as attributed dislike, and motivates separating 'not now / over-served / wrong context' from 'genuinely not for me' — directly transferable to TV as a 'skip reason' distinction. Cross-medium note: because TV abandonment is rarer and costlier than a music skip, a TV abandonment is a STRONGER per-event negative and more deserving of a follow-up attribution prompt than a music skip would be.

**Sources**

- <https://arxiv.org/html/2406.04488v1>
- <https://arxiv.org/pdf/1711.05237>
- <https://www.music-tomorrow.com/blog/how-spotify-recommendation-system-works-complete-guide>
- <https://www.chartlex.com/blog/streaming/30-second-rule-spotify-intro-skip-rate>

_Uncertain fields (skipped): signal_quality_for_recommender, negative_positive_symmetry_

---

### YouTube / TikTok "Not interested" signal quality (Mozilla 2022) {#youtube-tiktok-not-interested-signal-quality-mozilla-2022}
**Elicitation Method** _How the question/signal is collected from the user_

> Explicit categorical negative buttons: YouTube's 'Dislike', 'Not interested', 'Don't recommend channel', 'Remove from watch history'; TikTok's long-press 'Not interested'. All are single-tap, undifferentiated negative actions with no attached reason. TikTok additionally denoises noisy implicit signals at scale. Mozilla's audit added a synthetic 'Stop recommending' control to A/B the real ones.

**Abstraction Level** _At what conceptual level the reason is captured — feature-level (specific content property like violence or pacing), concept-level (narrative/moral, e.g. "too dark"), or viewer-state (not in the mood, wrong context).
_

> Video-level / item-level, mostly. 'Don't recommend channel' rises to source-level (channel), which is why it works better. None of the buttons capture feature, concept, or viewer-state — the user cannot say WHY, only that this item is unwanted.

**Signal Quality For Recommender** _How well the captured reason maps to filterable content metadata or features the system can actually act on. Does the stated reason have a clear content counterpart, or is it too vague / context-dependent to filter on?
_

> Demonstrably poor for the undifferentiated buttons. Mozilla (2022): 'Not interested' stopped only ~11% of unwanted recommendations, 'Dislike' ~12% — the two weakest controls. Source-level 'Don't recommend channel' (~43%) and 'Remove from watch history' (~29%) worked far better, showing signal quality rises with attribution/scope and collapses for bare item-level negatives.

**Reason Attributability** _Can the captured reason be attributed to a stable, system-usable cause (content property, viewer state, social context, friction/fatigue)? Distinct from signal quality — attributability asks whether it's a content fact at all. Mozilla/YouTube data shows much negative signal is unattributable.
_

> Very low — this item is the canonical evidence that negative signal is largely unattributable. A 'Not interested' tap gives the system no cause (topic? creator? format? mood?), so it is mostly discarded or weakly applied — hence the 11% effectiveness. Users also conflate 'Dislike' (a content-quality verdict) with 'Not interested' (a recommendation-routing request), further muddying attribution.

**Cold Start Applicability** _Does the method work before the system has watch history? Some elicitation approaches require prior interactions to make sense.
_

> no — these controls act on already-recommended items, so they presuppose a running feed and history. They are corrective post-history mechanisms, not cold-start elicitation.

**Cognitive Load** _Effort required for the user to answer honestly and accurately. High cognitive load increases drop-off and increases the Wilson & Schooler introspection-harm risk (articulating reasons degrades preference quality).
_

> low — one tap / one long-press. But the low load buys low signal: the effort is trivial precisely because the button captures nothing beyond a binary, undifferentiated negative.

**Introspection Harm Risk** _Does this elicitation method risk degrading the underlying preference signal by asking the user to consciously articulate reasons? (Wilson & Schooler 1991: thinking too much can make stated preferences worse-predicting of later satisfaction.) Flagging where "tell us why" backfires.
_

> None — no reason is requested, so no Wilson & Schooler degradation. The failure is interpretive and structural (the button is too coarse and ambiguous to act on), not introspective.

**Folk Theory Dependence** _Does the method require the user to correctly model what the system will do with their answer? E.g. "not interested" only works if the user's mental model of the system matches its actual behaviour — a documented failure point.
_

> VERY HIGH — and a documented failure point. Users press 'Not interested'/'Dislike' under a folk theory that it suppresses similar content; Mozilla shows it barely does (11-12%), so the user's model is systematically wrong. Users further conflate 'Dislike' and 'Not interested', not knowing which the system treats as a routing signal vs. a quality vote. The method only works if the user correctly models system behaviour — and they don't.

**Negative Positive Symmetry** _Does the method capture dislike as a first-class signal, or only as absence / weak-negative? Most systems treat implicit signals as positive-only; dislike needs its own channel ("Reasons Against").
_

> Nominally symmetric (explicit negative buttons exist) but functionally asymmetric — the negative buttons are the weakest controls and largely ignored, while positive engagement (watch, like) drives the feed. So dislike is offered as a first-class channel but treated as second-class signal.

**Confounded With Friction Flag** _Whether the captured rejection could actually be decision fatigue, search friction, or psychological reactance rather than a taste signal at all. Must be isolable to avoid corrupting the content-preference profile.
_

> High and adversarially exploitable. The undifferentiated negative cannot distinguish dislike from topic-fatigue, mood, or 'already seen'. Worse, because the buttons are noisy and unattributed, they are gameable: coordinated groups (~1% of users) can weaponise the 'Not interested' button to degrade recommendations broadly — direct evidence that undifferentiated negatives yield noisy, low-trust data. TikTok's response is large-scale denoising of false positives/negatives in implicit feedback.

**Key Finding** _The primary empirical finding or design recommendation from this source/concept that a system designer should act on.
_

> Mozilla RegretsReporter audit (Sept 2022; 20,000+ participants, 500M+ videos): YouTube's user controls largely fail — 'Not interested' stopped only ~11% and 'Dislike' ~12% of unwanted recommendations (the weakest), versus 'Don't recommend channel' ~43% and 'Remove from watch history' ~29%. Effectiveness scales with attribution/scope; bare item-level negatives are near-useless. Users conflate 'Dislike' and 'Not interested'. TikTok denoises noisy implicit negatives at scale, and 'Not interested' there is exploitable by small coordinated groups — proving undifferentiated negative buttons produce noisy, low-signal, gameable data.

**Gap From Real Practice** _Difference between what the research recommends and what major industry systems (Netflix, Spotify, YouTube, TikTok) currently do. The gap is the design opportunity for HelpME2C.
_

> Research and Mozilla's own data say give negatives ATTRIBUTION and SCOPE (the source-level control worked 4x better) and confirm what was registered. Industry ships a single coarse, scope-ambiguous, reason-less 'Not interested' that users misunderstand and that the system mostly ignores. The gap is an attributed, scoped, confirmed negative — exactly the structured aspect-anchored 'why not' the critiquing literature prescribes.

**Proposed Taxonomy Contribution** _What specific dislike/like reason category or axis does this item suggest for a cold-start onboarding taxonomy? Concrete labels a user would recognise immediately, plus the content signal each label maps to.
_

> Strongest evidence FOR a differentiated negative taxonomy. Replace one undifferentiated 'Not interested' with attributed, scoped reason chips: distinguish (a) content-property dislike ('too violent', 'tone'), (b) source/scope ('not this creator/franchise' — the high-performing axis), (c) already-seen, (d) viewer-state 'not now'. Splitting these is what turns an 11%-effective button into actionable signal; the channel-level result proves SCOPE is itself a first-class taxonomy axis alongside reason.

**Sources**

- <https://www.mozillafoundation.org/en/blog/mozilla-investigation-youtubes-dislike-button-other-user-controls-largely-fail-to-stop-unwanted-recommendations/>
- <https://www.engadget.com/mozilla-youtube-recommendation-study-080006930.html>
- <https://www.androidpolice.com/youtube-dislike-and-other-feedback-mozilla-report/>
- <https://www.tiktok.com/transparency/en-us/recommendation-system/>
- <https://cybernews.com/tech/weaponize-tiktok-not-interested-button-degrade-recommendations/>

---


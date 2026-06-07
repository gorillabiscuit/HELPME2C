# Signal: Free-text "what are you in the mood for tonight?"

**Currently collected:** No
**Recommended tier:** DON'T-ASK (for Phase 1A scoring) / NICE-TO-HAVE (only as opt-in Phase 2 training-data collection, and only if rigorously justified)

## What it is

A free-form text field at signup or session-start where the user types a sentence describing what they want: "something dark and slow", "uplifting comedy for me and my partner who hates anime", "Studio Ghibli but for adults". Distinct from closed-form mood pills (a researched-separately signal — see `mood-context-at-signup.md`) in that it is unconstrained natural language. Implementations in this space include Tastedive's "tell us what you like" free-text input ([Tastedive](https://tastedive.com/)), Letterboxd's nanogenre browse system ([Letterboxd — Film Feelings: using nanogenres](https://letterboxd.com/journal/film-feelings-nanogenres/)) — which is the *closed* taxonomic version, derived from review-text mining via Nanocrowd — and Mubi's curated-list discovery interface, which is editorially driven rather than user-typed ([Mubi UX Case Study — Emily T](https://medium.com/@emilytyx719/ui-ux-case-study-mubi-2e27045f4a90)).

## Predictive value (literature / industry)

This is where the brutal honesty has to land. The academic case for natural-language preference elicitation is strong — *if you have an LLM in the loop*. Sanner et al.'s RecSys '23 paper "Large Language Models are Competitive Near Cold-start Recommenders for Language- and Item-based Preferences" finds that LLMs make language-based preference representations competitive with state-of-the-art item-based collaborative filtering in the cold-start regime, and adds that language preferences are "more explainable and scrutable" than vector or item representations ([Sanner et al. 2023, arXiv 2307.14225](https://arxiv.org/abs/2307.14225); [RecSys '23 paper PDF](https://ssanner.github.io/papers/recsys23_llmrec.pdf)). Follow-on work — Bayesian optimisation with LLM-based acquisition functions for natural-language preference elicitation at RecSys '24 ([Austin et al. 2024](https://dl.acm.org/doi/abs/10.1145/3640457.3688142)), and Springer's "Tell me what you Like" study on conversational movie-recommendation assistants ([Journal of Intelligent Information Systems](https://link.springer.com/article/10.1007/s10844-023-00835-8)) — extends the result: free-text is a *good* signal, but it requires either an LLM or a hand-built conversational system to convert text into preference vectors or retrieval queries. None of this transfers to a rule-based scorer.

The plausible "no ML" path would be keyword-matching the free text against HelpME2C's theme taxonomy in `packages/ml`. This works for a narrow case — the user types a word that happens to be a tag ("dark", "uplifting", "slow-burn") and we boost candidates with that tag. It fails for almost everything else: synonyms ("not too heavy" ≠ "lighthearted" in a string-match), negation ("nothing too violent" should *demote* violent themes, not boost them), comparative phrasing ("like Severance but funnier" requires understanding both anchor and modifier), and multi-clause inputs ("uplifting for me, my partner hates anime"). A keyword matcher would catch maybe 20–30% of typed inputs in a useful way, produce silent failures on the rest, and — worst — produce *confidently wrong boosts* when negation is missed. That last failure mode actively damages the 4/5 quality metric.

The "anchor picks + rated titles" signal already in `packages/ml/src/recommendation.ts` outperforms what a keyword-matched free-text input could contribute, because anchor picks *are* a structured preference signal with known semantics, and they don't suffer from negation or synonym brittleness. Adding a fragile signal alongside a stronger structured one risks net-negative quality.

The Phase 2 ML case is genuinely different. If HelpME2C lands an LLM-based retrieval/ranking layer, free-text becomes a high-value input: Sanner et al. show competitive cold-start performance from language preferences alone, and Letterboxd's Nanocrowd partnership demonstrates that *review-text language* is rich enough to define entire mood-based genres ([Nanocrowd + Letterboxd](https://nanocrowd.com/nanocrowd-letterboxd/)). So the question for Phase 1A is narrower: should we collect free-text *now*, store it, and use it for Phase 2 model training later, even though we cannot score on it today?

## GDPR / consent cost

Free text is the single highest-risk field in a signup form from a privacy perspective. Three concrete reasons:

(1) **Accidental special-category disclosure under Article 9.** A user typing "something light, I just got a bad cancer diagnosis and don't want anything heavy" has volunteered health data — a special category under [Article 9 GDPR](https://gdpr-info.eu/art-9-gdpr/) — into a field whose purpose was movie taste. The system did not ask for it, but the system now holds it, and Article 9 attaches the moment it's processed. Worse, a recommender that *infers* from free text can also derive special-category attributes algorithmically — the ICO is explicit that special-category data "includes gathered, inferred or guessed details" if the inference is deliberate ([ICO — What is special category data?](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/what-is-special-category-data/)). HelpME2C's free-text field would almost certainly be a special-category-data processing risk in practice even if its purpose is benign.

(2) **Data minimisation principle (Art. 5(1)(c)).** If the Phase 1A scorer cannot use the text, collecting it fails the minimisation test — there is no current purpose for the data being held. "We might want it for ML training later" is *not* a valid current purpose without a separately consented training-data clause, and even with consent the bar against speculative collection is high. ADR-0012 territory; this is the kind of question that should not be made unilaterally by an agent.

(3) **Deletion and DSAR cost.** Free text is harder to anonymise than structured fields. A user invoking right-to-erasure or right-to-portability (Articles 17 / 20) forces HelpME2C to extract and delete text that may be embedded in logs, vector indices, training corpora, or analytics events. Every free-text field added to the data model is a future deletion-engineering tax.

The constraints box says "everything must be opt-in with a clear 'why we're asking' affordance" — for free text, the *why* answer in Phase 1A is "we are storing this but not using it yet." That sentence reads as honest, but it reads as bad UX and worse privacy.

## UX / drop-off cost

Open-ended questions drop completion by 5–15 percentage points per question, with all-open surveys collapsing to 40–50% completion ([Informizely — open-ended vs closed-ended](https://www.informizely.com/blog/using-open-ended-and-closed-ended-questions-in-online-surveys); also NN/g's open-ended vs closed-question guidance, [NN/g](https://www.nngroup.com/articles/open-ended-questions/)). Baymard's broader form-length data is consistent: free-text fields rank with "unclear or unexpected fields" (22% of self-reported abandonment) and the form-length factor (37%) compounds when the field is open ([Baymard — Checkout Optimization](https://baymard.com/blog/checkout-flow-average-form-fields)).

The qualitative pattern is well documented: free-text demands more cognitive effort than picking from a list, fatigued users provide minimal or irrelevant answers ("idk", "anything good"), and the response-quality cliff happens early. For a *signup* free-text field — i.e. before any value has been delivered — the abandonment risk is highest, because the user has not yet invested anything and has no built-up motivation to complete. Compare against Canva's "what will you design?" pattern, which works because the answer is a 1–3 word constrained vocabulary (poster, presentation, social post) and the value of the answer to the user is *immediate and visible*: it filters templates. A HelpME2C free-text field, where the user's answer feeds nothing visible, fails the value-exchange test that makes Canva's question work ([SaaS Onboarding Benchmarks](https://www.getmonetizely.com/articles/understanding-onboarding-completion-rate-a-critical-metric-for-saas-success)).

The closed-form alternative — mood pills, nanogenres, theme chips — has all the benefits with none of the costs, which is why Letterboxd built nanogenres rather than a free-text box, and why Mubi's discovery layer is editorially-curated lists rather than a typed prompt. Both products have ML capability that could power free-text; both chose not to expose it as the primary cold-start affordance.

## Path into scoring

In Phase 1A, with rule-based scoring only, the honest answer is: nothing meaningful. The two viable paths are (a) keyword-match the typed text against the theme taxonomy in `packages/ml`, which is brittle and high-failure-mode as analysed above, or (b) store the text with no scoring impact and surface it only at Phase 2. Path (a) is a net quality risk for the 4/5 metric; path (b) is a privacy-and-consent cost with no offsetting current value.

If — *and only if* — Phase 1A wanted a thin, defensible version, the way to do it would be a *closed* "mood right now" chip selector (4–8 chips: cosy, intense, funny, sad-and-cathartic, romantic, action, comfort-rewatch, surprise-me), not a free-text box. That collapses to the separately-researched mood-context-at-signup signal and inherits its scoring path (small additive boost on tags in the theme taxonomy that match the chip). The free-text variant offers no scoring path Phase 1A can use that the chip version doesn't offer better and more safely.

## Tier justification

**Recommended: DON'T-ASK in Phase 1A.**

Three constraints from the brief converge on this answer. (1) **Phase 1A is rule-based only.** Without an LLM or a conversational layer, free text cannot be turned into a reliable scoring signal — the academic evidence is clear that natural-language preference elicitation works *because of* the language model, not in spite of its absence (Sanner et al. 2023). A keyword-matched degradation is fragile enough to actively harm the 4/5 quality metric. (2) **Privacy-by-default bar.** Free text is the highest-risk field in a signup form for accidental Article 9 disclosure and the worst-fit field under data-minimisation when there is no current scoring use. The bar — "materially improves rec quality, not might be useful" — is decisively not met. (3) **Drop-off cost.** Open-ended questions cost 5–15 percentage points of completion each, with no offsetting value-exchange to motivate the user. The closed-form alternative (mood chips) does the same job at lower privacy cost and lower UX cost — see `mood-context-at-signup.md`.

**Caveat — Phase 2 reconsideration.** When and if HelpME2C adds an LLM-based scoring/retrieval layer, the answer flips. Free text becomes a high-value signal, defensible under a separately-consented training-and-inference clause, and worth A/B testing as an optional power-user affordance ("describe what you're after"). At that point, revisit and likely promote to SHOULD-ASK as a Phase 2 onboarding option. But this is explicitly out-of-scope for the current MVP, and the brief is clear that mood/context layers are deferred to Phase 1B.

## Sources

- [Sanner et al. 2023 — Large Language Models are Competitive Near Cold-start Recommenders for Language- and Item-based Preferences (arXiv 2307.14225)](https://arxiv.org/abs/2307.14225)
- [Sanner et al. 2023 — RecSys '23 paper PDF](https://ssanner.github.io/papers/recsys23_llmrec.pdf)
- [Austin et al. 2024 — Bayesian Optimization with LLM-Based Acquisition Functions for Natural Language Preference Elicitation (RecSys '24)](https://dl.acm.org/doi/abs/10.1145/3640457.3688142)
- [Andolina et al. — Tell me what you Like: introducing natural language preference elicitation strategies in a virtual assistant for the movie domain (Springer JIIS)](https://link.springer.com/article/10.1007/s10844-023-00835-8)
- [Letterboxd Journal — Film Feelings: using nanogenres to find similar films](https://letterboxd.com/journal/film-feelings-nanogenres/)
- [Nanocrowd + Letterboxd partnership](https://nanocrowd.com/nanocrowd-letterboxd/)
- [Mubi UX case study — Emily T (Medium)](https://medium.com/@emilytyx719/ui-ux-case-study-mubi-2e27045f4a90)
- [Tastedive — recommendation engine](https://tastedive.com/)
- [Eliciting Auxiliary Information for Cold Start User Recommendation: A Survey (MDPI, 2021)](https://www.mdpi.com/2076-3417/11/20/9608)
- [Art. 9 GDPR — Processing of special categories of personal data](https://gdpr-info.eu/art-9-gdpr/)
- [ICO — What is special category data?](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/what-is-special-category-data/)
- [NN/g — Open-Ended vs. Closed Questions in User Research](https://www.nngroup.com/articles/open-ended-questions/)
- [Informizely — Using open-ended and closed-ended questions in online surveys](https://www.informizely.com/blog/using-open-ended-and-closed-ended-questions-in-online-surveys)
- [Baymard — Checkout Optimization: Minimize Form Fields](https://baymard.com/blog/checkout-flow-average-form-fields)
- [wpforms — 101 Online Form Statistics & Facts (Baymard + NN/g data)](https://wpforms.com/online-form-statistics-facts/)
- [Monetizely — Understanding Onboarding Completion Rate](https://www.getmonetizely.com/articles/understanding-onboarding-completion-rate-a-critical-metric-for-saas-success)

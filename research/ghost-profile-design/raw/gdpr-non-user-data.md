# GDPR / EU privacy implications of processing data about a non-user described by a registered user

Research for HelpME2C ghost-profile design (Phase 1B). EU region (Neon EU, PostHog EU, Sentry EU). GDPR is the regulatory floor per ADR-0012.

The "registered user" is the account holder. The "ghost target" is their partner/housemate, described by the registered user, who has never visited the site and may not know we exist.

---

## 1. Is the ghost target a "data subject" under GDPR?

Yes. GDPR Article 4(1) defines personal data as "any information relating to an identified or **identifiable** natural person … directly or indirectly, in particular by reference to an identifier such as a name, an identification number, location data, an online identifier or to one or more factors specific to the physical, physiological, genetic, mental, economic, cultural or social identity of that natural person."

The ghost target is *identifiable* by reference to the registered user's household. We do not need their legal name; we have a stable pointer ("user X's partner") that maps to one real human, and we are building a behavioural profile against that pointer. WP29 Opinion 4/2007 on the concept of personal data (still cited by EDPB as a primary reference, despite being pre-GDPR) held that identifiability is satisfied where "means reasonably likely to be used" exist to single the person out — co-location with the registered user does exactly that. The CJEU has been consistently expansive: in *Breyer* (C-582/14, 2016) it held that even dynamic IP addresses, when combined with information held by an ISP, are personal data.

**Conclusion**: the ghost target is a data subject. GDPR applies in full. We are processing their personal data.

---

## 2. Legal basis under Article 6

Walking the six bases:

- **(a) Consent.** The data subject must consent themselves. EDPB Guidelines 05/2020 on consent (v1.1, May 2020) reiterate Article 4(11): consent must be "freely given, specific, informed and unambiguous indication of *the data subject's* wishes by which he or she, *by a statement or by a clear affirmative action*, signifies agreement to the processing of personal data relating to him or her." The registered user cannot consent on their partner's behalf. (The only narrow exception in the Regulation is Article 8 parental consent for children under 16/13 — irrelevant here, and structurally tied to legal capacity, not "I know them well.") Consent is therefore **not available** unless the ghost target themselves opts in, which by construction they have not.
- **(b) Contract.** Article 6(1)(b) requires the processing to be necessary for a contract *to which the data subject is party*. The ghost target has no contract with HelpME2C. N/A.
- **(c) Legal obligation.** N/A.
- **(d) Vital interests.** Life-or-death basis. N/A.
- **(e) Public task.** N/A for a private commercial service.
- **(f) Legitimate interests.** Available, but conditional on a three-part test (purpose, necessity, balancing) per Article 6(1)(f) and ICO guidance. This is the only viable basis.

**Conclusion**: legitimate interests is the only defensible Article 6 basis. Every downstream design choice has to support a balancing test that survives scrutiny.

### The Legitimate Interests Assessment (LIA)

Per [ICO guidance on legitimate interests](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/legitimate-interests/how-do-we-apply-legitimate-interests-in-practice/), the LIA has three parts:

1. **Purpose** — Identify the legitimate interest. For HelpME2C: improving the quality of group recommendations for the registered user, who has explicitly asked us for "what should we watch tonight."
2. **Necessity** — Is the processing necessary, or can the purpose be achieved less intrusively? The candidate less-intrusive paths: (a) ask the registered user to invite the partner as a co-registered user; (b) use only generic "couple" archetypes with no per-partner inference. We can reach the same goal partly without inference, so a strong LIA must show that the *quality uplift* from inference is material and that the scope is tightly bounded.
3. **Balancing test** — Would the data subject reasonably expect this processing? ICO is explicit: *"Their interests are likely to override your legitimate interests if they wouldn't reasonably expect you to use the information in that way."* This is load-bearing. A partner who has never visited the site has, almost by definition, no expectation that a third-party platform is building a profile of them. The balance only tips if (i) the registered user has informed them, (ii) scope is narrow, (iii) the data does not leak into adjacent uses (ads, training, analytics), and (iv) deletion is straightforward.

---

## 3. The household exemption — Article 2(2)(c)

GDPR Article 2(2)(c) excludes processing "by a natural person in the course of a purely personal or household activity." The canonical interpretation comes from:

- **Lindqvist (C-101/01, 6 November 2003)** — the CJEU held that publishing personal data about parishioners on a webpage *fell outside* the household exemption because the data was made "accessible to an indefinite number of people." [GDPRhub summary](https://gdprhub.eu/index.php?title=CJEU_-_C-101/01_-_Bodil_Lindqvist). The exemption is read narrowly: it covers activities "carried out in the course of private or family life of individuals." If data leaves the household, it leaves the exemption.
- **Buivids (C-345/17, 14 February 2019)** — a Latvian citizen filmed police officers and uploaded the video to YouTube. The CJEU again refused the household exemption because publication on the internet "indeterminately" exposes third-party data. [Society for Computers & Law commentary](https://www.scl.org/10571-the-buivids-debate-why-the-cjeu-decision-isn-t-wrong-and-why-the-gdpr-is-out-of-date/) and David Erdos's [INFORRM analysis](https://inforrm.org/2019/02/22/european-data-protection-and-freedom-of-expression-after-buivids-an-increasingly-significant-tension-part-two-the-analysis-david-erdos/) note this entrenches the *Lindqvist* line: any third-party data routed through a commercial platform sits outside the exemption.

**Conclusion for HelpME2C**: the household exemption protects the *registered user* in their own kitchen ("I'm using a site to pick a show for me and my partner") but *not* the platform. We are processing the ghost target's data for our own commercial purposes (improving our recommendation model, retaining users). We are a controller. The household exemption is irrelevant to our obligations. This is the same shape as the Belgian DPA's reasoning against Facebook for tracking non-users (see §7).

---

## 4. Joint controller framing — Article 26

Could the registered user be a joint controller with us? Article 26 covers cases where two or more controllers "jointly determine the purposes and means of processing." The CJEU read this expansively in *Wirtschaftsakademie Schleswig-Holstein* (C-210/16, 5 June 2018) — a Facebook fan-page admin was found jointly responsible with Facebook even without access to the underlying data. [Bird & Bird analysis](https://www.twobirds.com/en/insights/2018/global/what-is-next-after-the-ecj-ruling-on-joint-control), [GDPRhub case](https://gdprhub.eu/index.php?title=CJEU_-_C-210/16_-_Facebook_Fanpages).

For HelpME2C, the registered user does not determine the means (the algorithm, the storage, the retention) — they only provide input. The dominant framing is: **HelpME2C is the sole controller**. The registered user is a *source* of data, not a co-controller. Even so, the EDPB's [Guidelines 07/2020](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-072020-concepts-controller-and-processor-gdpr_en) warn that joint-controller status can arise from "converging decisions," so a privacy review before launch should re-test this once the UX is concrete.

---

## 5. Article 14 — informing a data subject when data is collected from someone else

This is the load-bearing article. Under Article 14, where we obtain personal data not from the data subject, we must inform that data subject of:

- The identity and contact details of the controller (us) and its representative;
- DPO contact details where applicable;
- Purposes of processing and the legal basis (legitimate interests, with the interest specified);
- The categories of personal data concerned;
- Recipients;
- Retention period;
- The data subject's rights (access, rectification, erasure, restriction, portability, objection, complaint to a supervisory authority);
- The source the data came from;
- The existence of any automated decision-making, including profiling.

Timing: "within a reasonable period after obtaining the personal data, but at the latest within one month" (Article 14(3)(a)), or sooner if used to communicate with the subject, or before disclosure to other recipients. [ICO right-to-be-informed guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/) reiterates these timings.

### The Article 14(5)(b) "disproportionate effort" carve-out

Article 14(5)(b) lifts the obligation where "the provision of such information proves impossible or would involve a disproportionate effort … or in so far as the obligation … is likely to render impossible or seriously impair the achievement of the objectives of that processing." Drafted with research/archiving in mind. Could we lean on it?

**Argument for**: we have no contact details for the partner, only their archetype. Reaching them directly is impossible.

**Argument against** (the stronger one): we *do* have a route — through the registered user, who knows them. ICO and the Polish DPA-aligned [commentary on Article 14](https://komentarzrodo.pl/en/home/chapter-iii/section-2/art-14/commentary-on-article-14) both stress that the exemption is interpreted *restrictively* and is "directly connected to the fact that the personal data was obtained other than from the data subject" — it is not a general escape hatch for "we don't have an email." Recital 62 ties this exemption primarily to research/statistics/archiving and *secondarily* to scale ("number of data subjects, age of the data, appropriate safeguards"). A consumer recommendation app processing a small number of identifiable individuals via a routable intermediary cannot credibly invoke 14(5)(b).

**Practical compliance pattern**: route the Article 14 information through the registered user. The standard industry gesture — and the one the design must adopt — is a clear, persistent disclosure at the point the registered user adds a partner: *"By adding your partner here, you confirm they're aware HelpME2C is using information you provide about their tastes to suggest things for the two of you. Show them this page: [public Article 14 notice URL]."* This shifts the *operational* delivery of the notice to the registered user, but does not transfer controllership. We remain the controller; we remain liable if the notice never reaches the partner.

This is consistent with how Article 14 has been argued in HR/employment contexts and in the *noyb*/LinkedIn line of complaints, where the DPC found LinkedIn's privacy policy failed Article 13(1)(c) / 14(1)(c) information requirements (see [Matheson summary, DPC fine](https://www.matheson.com/insights/dpc-imposes-significant-gdpr-fine-on-linkedin/)).

---

## 6. DSAR implications — Articles 15, 16, 17

- **Registered user requests deletion (Article 17).** The ghost profile is derivative — its sole reason to exist was to serve the registered user's group recs. Per ADR-0012's responsible-defaults instinct, the cleanest treatment is **hard-delete the ghost profile alongside the registered user's identifying data**. Anonymised retention of behavioural signal (the ADR-0012 pattern for the registered user) does *not* transfer cleanly here, because the consent/legitimate-interest chain that justified the ghost profile in the first place has been severed: there is no longer a registered user whose recs are being improved.
- **Ghost target registers later.** They have a full Article 15 right of access to any data we hold linkable to them. The platform must (a) be able to surface "we held a ghost profile keyed to your partner; here it is"; (b) offer the now-registered user the choice to claim, merge, or delete it. This is operationally significant — it implies the ghost profile schema needs an addressable identifier (e.g. "partner of registered_user_id=X") that can later be reconciled with a new account.
- **Ghost target asks for erasure before registering.** They may not know we exist; but if they email us — *"my partner is using HelpME2C, please delete anything you hold about me"* — we have to comply, because they're a data subject with Article 17 rights. The operational implication is a path for "non-user deletion requests."
- **Article 16 rectification.** A non-user can also ask for correction. Practically rare, but the path needs to exist.

---

## 7. ICO / CNIL / EDPB guidance and enforcement actions

There is no EDPB guideline specifically titled "inferred profiles about non-users." The closest enforcement and guidance threads:

- **Belgian DPA v. Facebook (Brussels Court of First Instance, 16 February 2018)** — fined Facebook for placing the `datr` cookie on non-users and ordered destruction of any non-user personal data obtained through cookies and social plugins. [Global Freedom of Expression summary](https://globalfreedomofexpression.columbia.edu/cases/belgian-privacy-commission-v-facebook/); [Fieldfisher commentary](https://www.fieldfisher.com/en/services/privacy-security-and-information/privacy-security-and-information-law-blog/convicted-on-the-merits-facebook-must-play-by-the-belgian-privacy-and-cookie-rules). The decision was later overturned on jurisdictional grounds by the Brussels Court of Appeal (8 May 2019) and referred to the CJEU — *the substantive merits were never reversed*. The principle that platforms must not silently process non-user data without a basis and notice remains the working assumption across EU DPAs.
- **noyb-led shadow-profile complaints** (Facebook, 2018 onwards) — noyb's GDPR-day complaints framed Facebook's contact-upload-derived shadow profiles as Article 6 (no lawful basis) and Article 14 (no notice) violations. See [European Parliament briefing on Cambridge Analytica](https://www.europarl.europa.eu/resources/library/media/20180524RES04208/20180524RES04208.pdf?lspt_context=gdpr).
- **CJEU OT v. Vyriausioji tarnybinės etikos komisija (C-184/20, 1 August 2022)** — declarations of interest naming a spouse/cohabitee, when published, became special-category data because they were "liable indirectly to reveal" sexual orientation. [Inside Privacy](https://www.insideprivacy.com/eu-data-protection/special-category-data-by-inference-cjeu-significantly-expands-the-scope-of-article-9-gdpr/), [Trilateral Research](https://trilateralresearch.com/data-protection/landmark-cjeu-judgment-confirms-broad-interpretation-of-special-category-data). Profiling a partner specifically by virtue of their relationship with a registered user is the exact shape this case warns about (see §9).
- **ICO Article 14 / right-to-be-informed guidance** — restrictive reading of the 14(5)(b) exemption (see §5 above).

No DPA, to date, has issued an enforcement action squarely on "recommendation platform inferred a non-user profile from a user's input." HelpME2C would not be tested on settled law — it would be testing the boundary. The defensive posture has to be designed with that in mind.

---

## 8. Defensible responsible-defaults framing for HelpME2C

Drawing the analysis into product principles:

1. **Legal basis: legitimate interests + an LIA documented before the feature ships.** The interest is "improving group recommendations for an explicitly opted-in registered user." Document the necessity argument (why generic archetypes aren't enough) and the balancing test, anchored to the bounded scope below.
2. **Article 14 delivered via the registered user.** A clear, persistent, written disclosure at the add-partner step: the registered user confirms the partner is aware. A standalone public Article 14 page covers the formal information requirements (identity of controller, purposes, legal basis, retention, rights, source).
3. **Bounded scope.** Only signals load-bearing for group recommendations (preferred genres, broad themes, "not interested" lists). No demographics, no health, no political/religious inferences (see §9). Lock the schema in code with an allowlist.
4. **Time-bounded retention.** Auto-delete the ghost profile after N days of inactivity from the registered user (e.g. 90 days). Document the choice in an ADR.
5. **Walled off from secondary uses.** Excluded from analytics, A/B testing, training data, and any future shareable embedding. Tag at the schema level so this is enforceable, not just a policy.
6. **Hard delete on registered-user deletion.** No anonymised retention. The chain of legitimacy collapses when the registered user leaves.
7. **Claim-or-delete path on later registration.** If a new account is created by an address the registered user identified as the partner (or via an explicit "I'm the partner" flow), surface the ghost profile and offer claim/anonymise/delete.
8. **Non-user deletion path.** A documented `/privacy/delete-non-user` flow for partners who learn of HelpME2C and want their derived data removed without ever registering.

These choices are not optional polish; each one is load-bearing on the LIA balancing test and on Article 14 defensibility.

---

## 9. Special categories (Article 9)

Article 9 prohibits processing of data revealing racial/ethnic origin, political opinions, religious or philosophical beliefs, trade-union membership, genetic data, biometric data for unique identification, health data, or data concerning sex life or sexual orientation, unless a 9(2) condition applies (none of which credibly fit HelpME2C's use case).

Post *OT v. Vyriausioji* (C-184/20), the CJEU has made clear that data that *indirectly reveals* a special category — through an "intellectual operation involving comparison or deduction" — falls inside Article 9. [Inside Privacy commentary](https://www.insideprivacy.com/eu-data-protection/special-category-data-by-inference-cjeu-significantly-expands-the-scope-of-article-9-gdpr/). ICO has long held the same position: profiling that *infers* sexual orientation, religious belief, or political opinion processes special-category data even if the input was ordinary preference data ([ICO special category guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/what-is-special-category-data/)).

The risk for HelpME2C: a partner-preference signal like "she loves documentaries about religious cults" or "he won't watch anything with gay leads" routes the inference straight through Article 9 axes. Even less obvious signals can drift: heavy preference for political-thriller and a particular set of LGBTQ+ tags can, in aggregate, "reveal."

**Mitigation**:

- **Filter at ingestion.** Don't ask questions that route through Article 9 axes ("religious belief," "sexual orientation," "political opinion" as preference dimensions). If a free-text input is allowed, scrub or refuse to store free-text that names protected categories.
- **Genre/theme allowlist for the ghost profile.** Use a curated taxonomy that excludes themes which proxy for special categories. Don't use anime tags like `religious-cult`, `lgbt-romance`, or political-extremism tropes as ghost-profile-eligible features. (The model can still use these for the *registered user*, where a different consent basis exists; the ghost profile is a tighter schema.)
- **Inference suppression.** If aggregate behaviour on the ghost profile starts to look like a sensitive cluster, the system should refuse to act on that cluster rather than encode it.
- **Document the filter in an ADR.** This is the kind of design decision that needs to be visible, reviewable, and audit-able later.

---

## Citations

1. [Art. 4 GDPR — definitions](https://gdpr-info.eu/art-4-gdpr/)
2. [Art. 6 GDPR — lawfulness of processing](https://gdpr-info.eu/art-6-gdpr/)
3. [Art. 9 GDPR — special categories](https://gdpr-info.eu/art-9-gdpr/)
4. [Art. 14 GDPR — information when data not obtained from the data subject](https://gdpr-info.eu/art-14-gdpr/)
5. [Art. 26 GDPR — joint controllers](https://gdpr-info.eu/art-26-gdpr/)
6. [EDPB Guidelines 05/2020 on consent (v1.1, May 2020)](https://www.edpb.europa.eu/sites/default/files/files/file1/edpb_guidelines_202005_consent_en.pdf)
7. [EDPB Guidelines 07/2020 on the concepts of controller and processor](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-072020-concepts-controller-and-processor-gdpr_en)
8. [ICO — How do we apply legitimate interests in practice?](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/legitimate-interests/how-do-we-apply-legitimate-interests-in-practice/)
9. [ICO — Right to be informed](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/)
10. [ICO — What is special category data?](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/what-is-special-category-data/)
11. [CJEU C-101/01 Bodil Lindqvist (Curia)](https://curia.europa.eu/juris/document/document.jsf?docid=48382&doclang=en) — household exemption read narrowly
12. [GDPRhub — CJEU C-101/01 Lindqvist summary](https://gdprhub.eu/index.php?title=CJEU_-_C-101/01_-_Bodil_Lindqvist)
13. [SCL — The Buivids Debate (C-345/17)](https://www.scl.org/10571-the-buivids-debate-why-the-cjeu-decision-isn-t-wrong-and-why-the-gdpr-is-out-of-date/)
14. [INFORRM — David Erdos on Buivids](https://inforrm.org/2019/02/22/european-data-protection-and-freedom-of-expression-after-buivids-an-increasingly-significant-tension-part-two-the-analysis-david-erdos/)
15. [GDPRhub — CJEU C-210/16 Wirtschaftsakademie (Facebook Fanpages)](https://gdprhub.eu/index.php?title=CJEU_-_C-210/16_-_Facebook_Fanpages)
16. [Bird & Bird — analysis of the Wirtschaftsakademie ruling](https://www.twobirds.com/en/insights/2018/global/what-is-next-after-the-ecj-ruling-on-joint-control)
17. [Global Freedom of Expression — Belgian Privacy Commission v. Facebook Ireland (datr cookie, 2018)](https://globalfreedomofexpression.columbia.edu/cases/belgian-privacy-commission-v-facebook/)
18. [Fieldfisher — Convicted on the merits: Facebook and the Belgian privacy/cookie rules](https://www.fieldfisher.com/en/services/privacy-security-and-information/privacy-security-and-information-law-blog/convicted-on-the-merits-facebook-must-play-by-the-belgian-privacy-and-cookie-rules)
19. [Inside Privacy — Special Category Data by Inference (CJEU C-184/20 OT v Vyriausioji)](https://www.insideprivacy.com/eu-data-protection/special-category-data-by-inference-cjeu-significantly-expands-the-scope-of-article-9-gdpr/)
20. [Trilateral Research — Landmark CJEU judgment on special category data](https://trilateralresearch.com/data-protection/landmark-cjeu-judgment-confirms-broad-interpretation-of-special-category-data)
21. [Komentarz RODO — restrictive commentary on Article 14](https://komentarzrodo.pl/en/home/chapter-iii/section-2/art-14/commentary-on-article-14)
22. [Measured Collective — "Disproportionate effort" practitioner guide](https://measuredcollective.com/what-is-considered-disproportionate-effort-under-gdpr/)
23. [Matheson — DPC fine on LinkedIn (Article 13/14 information failures)](https://www.matheson.com/insights/dpc-imposes-significant-gdpr-fine-on-linkedin/)
24. [European Parliament — Cambridge Analytica / Facebook briefing](https://www.europarl.europa.eu/resources/library/media/20180524RES04208/20180524RES04208.pdf?lspt_context=gdpr)

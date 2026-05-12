# UX Audit — terminology, hierarchy, scaffolding

**Status:** living working doc · written 2026-05-12 · delete after execution

Walked every visible surface a signed-in user touches. This catalogues what's wrong, proposes fixes, and orders the work. **No code changes yet** — needs your sign-off on the term replacements (especially "anchor") before the implementation pass.

---

## 1. Terminology that must change

| Internal term | Where it appears | Why it fails | Proposed |
|---|---|---|---|
| **anchor** | Onboarding picker, /taste, title detail badge, sticky footer count | Jargon I invented. No user has a mental model for "anchor" in a recs context. The fact that we italicise it in onboarding to "explain" it is the tell. | **Favourites** (universal, instant comprehension). Alts: *Picks* (could conflict with picker semantics), *Top titles* (verbose) |
| "Tell us what you love" | Onboarding picker H1 | Corporate voice ("Tell us") + abstract ("what you love" — at what scale? type?) | "Pick a few favourites" |
| "Refine your taste" | /taste H1, dashboard nav, footer bar | "Refine" + "taste" are both abstract. User has no handle on what they're doing. | "Your favourites" (page H1), nav: "Favourites", or split into "Add favourites" if we want action-shaped |
| "Anchor pick" | Title detail badge | Same as #1 | "On your favourites" |
| "On your list" | Title detail status badge | Ambiguous: list vs library vs watchlist vs favourites | "In your library" — match the /library page name |
| "Seen it" / "Hide" / "Rate" | Rec card buttons | All three ambiguous. "Seen it" — does it mark watched + add to library, or just remove from recs? "Hide" forever or dismiss? "Rate" rates the show or the rec? | "Watched it" / "Not interested" / "Rate this rec" + tooltip on each explaining the effect |
| "Get started" | Dashboard empty-state CTA | Generic; tells user nothing | "Pick your favourites" |
| "Taste" | Top nav link | Half a word — a user reads it and asks "the taste of what?" | "Favourites" |
| "Per GDPR / COPPA we need…" | Age-check page | Acronyms in body copy | "Per privacy regulations, we need…" |

**Internal-only (verify they never leak to UI):** *watch entry*, *tracking entry*, *kind*, *anchor pick* (the JSDoc usage), *rec feedback*. Code can keep these.

---

## 2. Hierarchy — page by page

### Dashboard `/` (signed-in) — **biggest offender**

- H1 is "Welcome back, Wouter". A greeting eats the most visual real estate; it tells the user nothing about *what the page is*.
- The page identity ("Based on your taste — top 20 recommendations") is in `text-sm text-text-body` — small grey.
- The actual `<h2>` saying "Recommendations" is `sr-only` because the visual hierarchy doesn't match the semantic.
- No prominent CTA to the moat (Groups) or to taste-shaping (Favourites). Both are currently nav links.
- Body text uniformly `text-sm` (14px) with low contrast.

**Fix:**
- H1: *"Recommendations for you"* (or whatever lands after the term audit).
- Greeting drops to a small line above or under H1.
- Add two cards above/beside the rec grid: **"Watching with someone tonight? → Build a group"** and **"Want better recs? → Add more favourites"**.
- Bump primary body to 16px (`text-base`).

### Onboarding intro (`/onboarding` step 1)

- Good narrative structure (Step 1 · Next / Step 2 · After).
- Uses "anchors" twice. Replace.
- Body could be one size larger.

### Onboarding picker (`/onboarding` step 2)

- H1 "Tell us what you love" — corporate.
- Subhead uses "anchors".
- Sticky footer: "N anchors picked" → "N favourites picked".

### `/taste`

- H1 "Refine your taste" — abstract.
- Body: "Add or remove anchors to shape your recommendations" — jargon.
- Filter pills work but have no "Filter by:" label.
- "More refinement modes — pairwise comparisons and manual ranking — arrive in a future release." → too technical for a v1 user. Reframe as something like *"Coming soon: smarter ways to shape your taste."*

### `/library`

- H1 "Library" + count. No subhead. A user wonders: what is the library, vs my favourites?
- **Proposed subhead:** *"Everything you're tracking — what you've watched, what you're watching, and what's on deck."*

### `/search`

- H1 "Search" — bare.
- **Proposed subhead:** *"Find a TV show, film, or anime to add to your library."*
- Filter pills work.

### `/groups`

- H1 + good subhead already.
- Missing: a tiny visual or example of *what a group rec looks like*. Without it, a user has no reason to create one. Could be a small illustrated card preview.

### `/groups/[id]`

- "← All groups" backlink — keep this one (intra-section).
- "Group recommendations" card — fine, could be warmer ("Picks for everyone here").
- Empty state: *"the algorithm honestly excludes things one of you would dislike"* — honest but reads like a developer wrote it.
- **Per-member score pills (78/100 etc.) are powerful transparency but UNDOCUMENTED.** A user has no idea what 78 vs 65 means or what they'd do about it. Add an explanatory line above the grid: *"Each pill shows how well this matches each member. Higher is better."*

### `/groups/join/[token]`

- Decent. Replace "anchors" → "favourites".

### `/titles/[id]`

- H1 = title name ✓
- "Tags" section shows chips with no affordance. Click them? Filter by them? Currently nothing happens. Either make clickable (theme browse) or add explanatory copy.
- "Where to watch" — good.
- Button: "Add to list" → "Add to library".
- Badge: "On your list · Anchor pick" → "In your library · Favourite".

### `/settings/account`

- Mostly OK after earlier polish.

### `/settings/providers`

- Fine.

### `/settings/import`

- Fine.

### `/age-check`

- "Per GDPR / COPPA" → "Per privacy regulations" (acronym-free).

### Marketing hero `/` (signed-out)

- Mostly OK. Brand name "HelpME2C" is acknowledged placeholder per PROJECT.md.
- Three bullets work hard.

### Top nav

- Order: Recommendations · Search · Library · Taste · Groups.
- "Taste" should become whatever the term audit lands on (likely "Favourites").

### Rec card actions

- Three buttons all need clearer labels + tooltips (§1).
- Currently no `aria-label` on Seen it / Hide so screen readers also lose context.

### Consent banner

- Fine.

---

## 3. Scaffolding gaps

Consolidated from the earlier conversation:

- **"Why this rec?" affordance** on each card — at minimum, "Because you liked X" or "Theme: dark comedy". The actual moat (theme + cross-medium reasoning) is currently invisible.
- **Action button tooltips** — every Seen it / Hide / Rate / Add gets a one-liner on hover.
- **First-visit dashboard callout** — after the onboarding flow completes, the first dashboard visit shows a dismissible explainer: *"These are your first picks based on the favourites you chose. As you watch and rate, we get smarter."*
- **Loading skeletons** on slow pages — perceived perf, especially mobile.
- **Type scale bump** — primary body 14→16, secondary stays 14, headings get a tighter scale.
- **Tags clickable** — `/tags/<id>` browse, or at least disable the pointer cursor so they don't look interactive.
- **Group recs dashboard module** — prominent card, not a nav link.

---

## 4. Recommended execution order

1. **Lock the term replacement for "anchor"** (your call). Default proposal: **Favourites**. Everything else depends on this.
2. **Bulk find-replace + UI rewrite of every jargon term** (Pass 1: terminology).
3. **Type scale fix** — bump body text site-wide.
4. **Dashboard rewrite** — proper H1, two prominent CTA cards (Groups / Favourites), explanatory subhead.
5. **Page subheaders everywhere** — single sentence per page explaining what it is.
6. **Rec card action labels + tooltips.**
7. **"Why this rec?" affordance** (data is already in the rec engine; surface it).
8. **Per-member score legend on /groups/[id].**
9. **Loading skeletons.**
10. **Re-run impeccable in UX mode** as a second-pass audit to catch what we miss.

---

## 5. Key decisions I need from you (phone-friendly)

1. **"Anchor" replacement:** Favourites (my pick) · Picks · Top titles · something else?
2. **`/taste` page name:** "Favourites" (matches term) · "Your picks" · keep "Refine your taste"?
3. **"Why this rec?" affordance:** ship in this pass, or defer to the visual-design polish round?
4. **Loading skeletons:** ship in this pass, or wait until we've measured perceived perf post-fra1?

Once you decide #1 and #2, the rest follows. The other two are optional in-pass.

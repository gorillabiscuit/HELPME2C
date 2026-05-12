# UX Audit — terminology, hierarchy, scaffolding

**Status:** living working doc · last updated 2026-05-12 (reframe) · delete after execution

This is a working doc capturing the v1 polish pass. Originally a terminology/hierarchy audit; pivoted mid-audit to a more fundamental **reframe of the "anchor" concept** (see §1). Re-read in this order.

---

## 1. The reframe: drop "anchors" entirely

### What we had

The codebase had two distinct concepts feeding the rec engine:

- **Anchors** (`kind='anchor'`): titles the user picked from `/onboarding` or `/taste` as "this represents my taste." High-weight signal, no rating required.
- **Ratings** (`kind='tracking'` + `rating>=1`): tracked entries with a numeric score.

Both feed `extractTasteVector` in `packages/ml`. **But this was invisible to users**, and the dichotomy created a real UX bug: a user couldn't promote a show they discovered later (and rated highly) into the same "taste-defining" tier as their cold-start picks.

### The reframe

There is **one user-facing concept: *your taste*.** It is built from everything you do:

- **High-weight positive:** titles you marked "I love this" (replaces the old anchor concept)
- **Strong positive:** library entries rated 8–10
- **Mild positive:** completed without rating, recs rated *terrific*/*good*
- **Negative:** library entries rated 1–3, status = dropped, recs rated *bad*/*terrible*, dismissed recs

**Continuous refinement is the product premise.** Every action you take in the app refines what we recommend. Users see this surface and *understand* it.

### What changes at the data layer (small)

`kind='anchor'` stays as an internal implementation flag — it represents "I love this, no rating necessary." The user never sees the word.

**One additive schema change is worth doing:** add `loved: boolean default false` to `watch_entries`. Why: today, marking a tracking entry as "loved" would require overwriting `kind` from `tracking` → `anchor`, which loses the watching status. A separate `loved` flag lets a tracking entry coexist with a "this is part of my taste" signal. Engine reads `loved=true` as high-weight. Optional migration; if you'd rather defer, we can ship with the existing schema and accept a minor UX edge case.

### Term decisions

| Concept | User-facing label |
|---|---|
| The aggregate signal | **Your taste** |
| A title flagged as taste-defining (noun) | **Favourite** |
| The action of flagging one (verb) | **Love this** / **Add to my taste** |
| The `/taste` page | **Your taste** (renamed) |
| Top nav link | **Your taste** |

No more "anchor" anywhere in the UI.

---

## 2. New `/taste` page sketch

Replaces the current single-purpose picker.

```
┌─────────────────────────────────────────────────────┐
│ Your taste                                          │
│ Everything that shapes your recommendations. Every  │
│ rating, pick, and dismissal refines what we suggest.│
├─────────────────────────────────────────────────────┤
│ Built from:                                         │
│   12 favourites · 8 ratings · 3 completed shows     │
├─────────────────────────────────────────────────────┤
│ Your favourites               [+ Add favourites ↓]  │
│ ┌────┬────┬────┬────┬────┬────┐                    │
│ │ ▣  │ ▣  │ ▣  │ ▣  │ ▣  │ ▣  │  ← remove on hover  │
│ └────┴────┴────┴────┴────┴────┘                    │
├─────────────────────────────────────────────────────┤
│ Recently rated                                      │
│   Better Call Saul · You rated 9/10 · 2 days ago    │
│   The Bear · You rated 7/10 · last week             │
├─────────────────────────────────────────────────────┤
│ [Add favourites: media-type filter + search + grid] │
└─────────────────────────────────────────────────────┘
```

The picker grid (with media-type filter) lives under "Add favourites." It's still the cold-start funnel for `/onboarding`; on `/taste` it's secondary to the curate view.

---

## 3. Promote-to-taste affordances

You can flag a title as part of your taste from anywhere it appears:

| Surface | Affordance |
|---|---|
| **Rec card on `/`** | New action: **"Love this"** (in addition to *Watched it* / *Not interested* / *Rate*). One click → adds to taste, removes the card from the rec grid. |
| **Title detail `/titles/[id]`** | Primary action: **"Love this"** if not already; **"In your favourites ♥"** if it is. Replaces the "Anchor pick" badge. |
| **Library list** | A heart icon next to each row; click to add/remove from taste. Library entries already rated 9+ get the heart filled automatically. |
| **`/taste` page** | The grid IS the affordance — click to toggle (current picker behaviour). |

---

## 4. What still needs polishing besides the reframe

These were already in the audit before the reframe; they still need doing.

### Per-page hierarchy

**Dashboard `/`** — biggest offender
- H1 is "Welcome back, Wouter" (a greeting). The page identity ("Recommendations") is small grey text. There's a `sr-only` H2 because the visual hierarchy doesn't match the semantic.
- No prominent surfacing of the moat: Groups is a tiny nav link.
- Body text uniformly 14px low contrast.
- **Fix:** H1 = "Recommendations for you" (greeting drops to small line under). Two prominent CTA cards: *"Watch with someone? → Build a group"* and *"Want better recs? → Refine your taste"*. Bump body to 16px.

**Onboarding intro** — good narrative structure (Step 1 · Step 2). Strip "anchor" usage.

**Onboarding picker** — H1 currently "Tell us what you love" → change to "Pick a few favourites". Footer "N anchors picked" → "N favourites picked".

**`/library`** — needs a subhead. *"Everything you're tracking — what you've watched, what you're watching, and what's on deck."*

**`/search`** — needs a subhead. *"Find a TV show, film, or anime to add to your library."*

**`/groups`** — fine, could use a visual example of what a group rec looks like.

**`/groups/[id]`** — empty state copy reads developer-shaped. Per-member score pills (e.g. "Member: 78/100") are undocumented — add a single explanatory line *"Each number shows how well this matches each member; higher is better."*

**`/titles/[id]`** — "Add to list" → "Add to library". "Tags" chips have no affordance — either make clickable (theme browse) or remove `cursor-pointer`. Replace "On your list · Anchor pick" badge per §3.

**`/age-check`** — *"Per GDPR / COPPA"* → *"Per privacy regulations"* (drop acronyms).

**Rec card actions** — three buttons need clearer labels + tooltips:
- "Seen it" → "Watched it" (+ tooltip: *"Marks this as completed in your library."*)
- "Hide" → "Not interested" (+ tooltip: *"We won't suggest this again."*)
- "Rate" → keep, but add tooltip explaining the rating shapes future recs

### Scaffolding additions

- **Loading skeletons** on dashboard, /taste, library, groups (perceived perf, especially mobile)
- **First-visit dashboard callout** (dismissible): *"These are your first recommendations based on your favourites. As you watch, rate, and react, we get smarter."*
- **Page subheaders everywhere** — one sentence per page explaining what it is

### Deferred (engine work)

- **Rec-feedback → engine wiring.** Today, rating a rec card "terrific" stores the rating in `rec_feedback` but **doesn't feed back into the rec engine**. M6 promised this; not yet wired. This is the same conceptual gap as the anchor problem — the user thinks they're refining; they're not. Worth fixing properly in a focused pass, not this one.
- **"Why this rec?" affordance** — show users *why* each rec was suggested (e.g. *"Because you loved Breaking Bad"*). Data exists in the rec engine; needs engine output changes + card UI. Deferred to a focused pass after the copy/scaffolding lands.

---

## 5. Execution order

1. **Schema migration** (optional): add `watch_entries.loved boolean default false`. ~5 lines.
2. **Engine tweak**: rec engine treats `loved=true` as high-weight (whether anchor or tracking).
3. **Replace "anchor" everywhere in UI** with "favourite" + the unified-taste framing.
4. **Promote-to-taste affordances** on rec cards, title detail, library.
5. **`/taste` page rewrite** — unified-taste view per §2.
6. **Onboarding rewrite** — drops "anchor", uses "favourites".
7. **Dashboard rewrite** — proper H1, two prominent CTA cards (Groups + Taste), subhead.
8. **Page subheaders** on library/search/groups/etc.
9. **Rec card action button copy + tooltips.**
10. **Per-member score legend on `/groups/[id]`.**
11. **Type scale fix** — body 14→16, contrast.
12. **Loading skeletons.**
13. **Re-run impeccable in UX mode** as a second-pass audit.

Deferred to follow-ons:
- Rec-feedback → engine wiring (M6 completion)
- "Why this rec?" affordance (engine + card work)

---

## 6. Open decisions before I write code

1. **Add the `loved` column?** Recommended yes — small migration, resolves the edge case where a tracking entry can't also be a favourite. Otherwise we ship with the existing schema and accept that "loving" a tracking entry loses its watching status.
2. **First-visit callout: ship in this pass or after?** Light work either way.

Otherwise the plan is concrete enough to execute on the back of the reframe alone.

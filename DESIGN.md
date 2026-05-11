---
name: HelpME2C
description: Cross-medium, theme-based recommendation engine for TV and anime
colors:
  background: "oklch(1 0 0)"
  foreground: "oklch(0.129 0.042 264.695)"
  card: "oklch(1 0 0)"
  card-foreground: "oklch(0.129 0.042 264.695)"
  popover: "oklch(1 0 0)"
  popover-foreground: "oklch(0.129 0.042 264.695)"
  primary: "oklch(0.208 0.042 265.755)"
  primary-foreground: "oklch(0.984 0.003 247.858)"
  secondary: "oklch(0.968 0.007 247.896)"
  secondary-foreground: "oklch(0.208 0.042 265.755)"
  muted: "oklch(0.968 0.007 247.896)"
  muted-foreground: "oklch(0.554 0.046 257.417)"
  accent: "oklch(0.968 0.007 247.896)"
  accent-foreground: "oklch(0.208 0.042 265.755)"
  destructive: "oklch(0.577 0.245 27.325)"
  border: "oklch(0.929 0.013 255.508)"
  input: "oklch(0.929 0.013 255.508)"
  ring: "oklch(0.704 0.04 256.788)"
typography:
  display:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.025em"
  title:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.025em"
  body:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: "0.225rem"
  md: "0.425rem"
  lg: "0.625rem"
  xl: "0.825rem"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
    height: "2.25rem"
  button-primary-hover:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.lg}"
    padding: "1.5rem"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "0.25rem 0.75rem"
    height: "2.25rem"
---

<!-- Auto-extracted from apps/web/src/app/globals.css and src/components/ui/*
on 2026-05-08 via the impeccable `document` workflow (scan mode).
Qualitative sections (Creative North Star, mood, anti-references, Do's and
Don'ts) are placeholder defaults the user should revise. Marked with
[needs user input] where applicable. -->

## Overview

**Creative North Star:** _[needs user input — suggest 2-3 candidates after read-through; current default below is a working placeholder, not a chosen identity]_

> **The Quiet Reading Room** _(placeholder)_ — sober editorial polish in service of cross-medium taste. Not a vibey discovery feed. Not a streaming-app clone. The interface should feel like an editorial recommendation site that takes its content seriously: clean type, generous whitespace, restrained colour, no mood-board flair. The product wants you to trust its judgment — that trust comes from competence, not ornament.

**Aesthetic philosophy:** restrained over expressive. Tailwind defaults + shadcn primitives with deliberate spacing rhythm. Cool neutral palette tinted toward slate; one near-black `primary` carries action affordance; chromatic accents reserved for charts (5 chart colours in frontmatter, currently unused). Light mode is the default; dark mode tokens exist in CSS but no UI surface uses them yet — Phase 1A ships light-mode-only.

**Anti-references** (what this should NOT feel like):
- _[needs user input]_ — defaults: not Trakt's data-density / table-heavy approach; not Letterboxd's social/editorial-magazine layering; not Crunchyroll's bright commercial-streaming gloss; not MyAnimeList's legacy/cluttered information architecture.

**Register:** **product** (per impeccable's brand-vs-product framing — this is app UI, not a marketing surface). The marketing landing page _is_ a brand surface but doesn't exist yet.

## Colors

The palette is the shadcn/ui default cool-slate set in OKLCH. Token names follow shadcn's role-based vocabulary (`primary`, `secondary`, `muted`, `accent`, `destructive`, `card`, `popover`, `border`, `input`, `ring`) rather than hue-based names. This makes role-driven design natural at the cost of less evocative naming — re-name tokens if a user-driven branding pass lands.

**Palette character** _(qualitative; needs user input)_:
- `primary` — Deep ink, near-black with a slate undertone. Carries the "press this" affordance.
- `foreground` / `background` — Cool off-black on cool off-white. High contrast without harshness.
- `muted-foreground` — Dim slate. Used for metadata, timestamps, "X minutes ago" labels.
- `border` / `input` — Faint slate hairline. Defines structure without weight.
- `destructive` — Saturated red-orange. The only chromatic colour outside chart visualisations; used sparingly for delete confirms.
- `chart-1`..`chart-5` — Defined but unused as of Phase 1A. Reserved for future analytics surfaces.

Per impeccable's color strategy framing, this is a **Restrained** palette: tinted neutrals + one accent (`destructive`) at <5% of surface area. Acceptable default for product surfaces.

## Typography

System-stack typography via Tailwind defaults. No custom font is loaded. The intentional choice _(working hypothesis; mark as [needs user input] for confirmation)_ is that fast loads + native legibility outweigh bespoke type identity at Phase 1A; a brand-tier font selection is deferred to Phase 1B+.

Hierarchy uses the Tailwind text-{size} ramp with weight + tracking modifiers (`font-semibold tracking-tight` for headings, regular for body). Five role tiers in the frontmatter (display / headline / title / body / label) cover the surfaces in use today.

**Hierarchy guidance:**
- Display (3xl, semibold, tight tracking): page-level h1 on dashboard / settings / title detail.
- Headline (2xl): section h2 inside cards, occasionally `<CardTitle>`.
- Title (xl): rare; reserved for dialog headers and emphasised callouts.
- Body (sm regular): default text.
- Label (xs medium): timestamps, "X recs hidden" filter pill counts, status badges.

Body line-length is uncapped today; the dashboard's max-width constraint (`max-w-5xl`) keeps it well under the 65-75ch ceiling impeccable recommends.

## Elevation

Flat. The system uses tonal layering instead of shadows for depth:

- `bg-background` — page surface
- `bg-card` — same as background today (pure white) but tokenised separately so a future move to a tinted card surface is one token away
- `bg-slate-50` / `bg-slate-100` — used inline (not yet tokenised) for inset hover states and timestamp pills
- Cards use `border border-slate-200` for definition, no box-shadow

The one shadow vocabulary in code today is `shadow-lg` on the `<ConsentBanner>` (it's a fixed-bottom dialog that needs to feel detached from the page) and `shadow-xs` on `<Input>` focus rings. Both are Tailwind defaults; no custom elevation tokens.

This flat-but-tonal approach matches impeccable's preference for "tonal layering instead of shadow vocabulary"; the trade-off is that depth cues are subtle. If a future surface needs more contrast (modals, popovers landing over busy backgrounds), introduce a single shadow token rather than escalating ad-hoc.

## Components

The component library is shadcn/ui primitives ([apps/web/src/components/ui/](apps/web/src/components/ui/)), kept narrow:

- `Button` — six variants (`default` / `destructive` / `outline` / `secondary` / `ghost` / `link`), eight sizes including icon-only. The default variant is filled `primary` (deep ink); outline is the "secondary action" shape; ghost is the "tertiary inline" shape.
- `Card` (`<Card>` / `<CardHeader>` / `<CardTitle>` / `<CardContent>`) — the dominant container. Used for "Where to watch", "Group recommendations", "Account & privacy", every settings sub-section. Typically `mt-6` or `mt-8` rhythm between cards.
- `Dialog` — used for consent preferences, library edit, account-delete confirm. Right-aligned actions, `outline` cancel + `default` confirm pattern.
- `Input` — text input. The destructive-confirm pattern uses `Input` for the "type 'delete my account'" check.
- `Label` — semantic-label pair with `Input`.
- `Switch` — exists but few surfaces use it; consent banner toggles + Group rec future use.

**Custom one-off patterns** (worth tokenising if they recur):
- **Pill / chip** — small rounded-md inset elements with `bg-slate-100 px-2 py-1 text-xs`. Used for streaming-provider chips, per-member score pills on group recs, tag chips on title pages. Currently inline; not a primitive.
- **Toggle-pill picker** (settings/providers) — checked state has `bg-slate-900 text-white`, unchecked has `border border-slate-200 bg-white`. Inline tailwind.
- **Confirm-then-delete UX** (account-delete page) — disabled until typed phrase matches. Pattern: tail in red-tinted card border, type-to-confirm field, destructive button.

Anti-pattern check (impeccable's catch list): no purple gradients, no nested cards. The dashboard rec grid uses `<li>` items with the rec card flush; that's the right shape (the title is the affordance, not a card-within-card).

## Do's and Don'ts

**Do:**
- Reach for shadcn primitives first. Card, Button, Dialog, Input cover ~90% of new surfaces.
- Default to the cool-slate role tokens (`muted-foreground` for secondary text, `border` for hairlines). Don't reach for `slate-N` numbered variants except when specifically needing the granular ramp.
- Match `mt-6` / `mt-8` between cards, `mt-4` inside a card. Spacing rhythm is what makes the layout feel deliberate.
- Use `text-sm text-slate-600` as the body default; `text-xs text-slate-500` for secondary metadata.
- Surface filter / preference state inline (the dashboard's "Filtering by [chips] · X hidden" row is the right pattern — visible without being intrusive).

**Don't:**
- Don't introduce custom colours outside the role tokens without an ADR. The `destructive` is the only chromatic accent; if you need another, you're probably about to dilute the system.
- Don't nest cards inside cards. The dashboard / title / settings layouts are deliberately flat at the card level; tonal depth is via inset `bg-slate-50` panels, not card-in-card.
- Don't add custom shadows ad-hoc. If you need elevation, add a single token first.
- Don't auto-detect dark mode based on `prefers-color-scheme` until Phase 1B+ — the dark-mode tokens exist but no surface uses them, and partial dark support feels broken.
- Don't introduce purple gradients or rainbow accents (impeccable's named anti-pattern). The system is sober; that's a feature.
- Don't reach for `font-{family}` overrides. System stack is the choice.

<!-- IMPECCABLE: Sidecar (component props the Stitch 8-prop schema doesn't cover)

  button-primary-focus:
    focus-ring: "3px {colors.ring}/50 outside"
  card:
    border: "1px solid {colors.border}"
  input:
    focus-ring: "3px {colors.ring}/50"
    border: "1px solid {colors.input}"

These don't fit Stitch's strict 8-prop schema (backgroundColor, textColor,
typography, rounded, padding, size, height, width), so live in this
markdown sidecar. The shadcn primitives encode them at the component level.
-->

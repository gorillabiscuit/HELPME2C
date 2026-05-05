# ADR-0016: Component library (shadcn/ui)

**Status:** Accepted
**Date:** 2026-05-05
**Supersedes:** —

## What we chose

shadcn/ui as the primary React component system for `apps/web`, built on Radix UI primitives and Tailwind v4 (per [ADR-0014](0014-styling-approach-web.md)). Components are added via `npx shadcn add <name>`, which copies source files into `apps/web/src/components/ui/` — we own the code, no npm dep on shadcn itself. App-specific composed components (TitleCard, RecommendationList, GroupCompositionUI, etc) live in `apps/web/src/components/` and compose shadcn primitives.

`@mui/x-data-grid` is explicitly allowed as a standalone import for screens that genuinely need a serious data table (admin views, content moderation, etc). Importing the full `@mui/material`, `@mui/lab`, or any other `@mui/*` package is forbidden — Material Design is the wrong aesthetic for HelpME2C's consumer-facing surface, and Emotion (MUI's runtime CSS-in-JS) is banned by [apps/web/CLAUDE.md](../../apps/web/CLAUDE.md) except as the transitive dep that comes with DataGrid.

Lucide is pinned as the icon library (shadcn's default — removes one Phase 3 decision).

## What we rejected

- **Material UI (full `@mui/material`)** — Material Design baked in is wrong for a consumer recommendation app; theming MUI to look non-Material costs more than building from owned primitives. Emotion runtime CSS-in-JS is banned project-wide.
- **Mantine** — has its own styling system that conflicts with [ADR-0014](0014-styling-approach-web.md); picking Mantine effectively undoes that decision.
- **Bare Radix UI primitives only** — shadcn already does the styling work on top of Radix; reinventing it gives no benefit unless we have a strong design system that diverges from shadcn defaults (we don't).
- **Tailwind UI / Catalyst ($299)** — beautiful but smaller component surface than shadcn, paid, and concentrates vendor risk on one company.
- **Park UI / Ark UI** — promising newer system from the Chakra UI team but smaller ecosystem than Radix/shadcn, thinner AI tool training data, and no clear win for our needs.

## Why

Phase 1A's UI surface is overwhelmingly forms, cards, dialogs, lists, and modals — exactly what shadcn covers. The components shadcn doesn't ship (data tables, charts) aren't on the Phase 1A roadmap; when they show up, the standalone-DataGrid carve-out handles the one MUI component that's genuinely best-in-class without paying the cost of the full MUI bundle.

The code-ownership model matches HelpME2C's project ethos consistently: no version-upgrade hell, no theme system to fight, no proprietary lock-in. Same logic as the explicit anti-vendor-lock-in stance in `packages/ml`'s clean-module invariant ([CLAUDE.md §2](../../CLAUDE.md)) and in the planned ADR-0017 hosting decision.

The Tailwind v4 alignment is load-bearing — Mantine and full MUI both impose their own styling systems and would either fight or replace [ADR-0014](0014-styling-approach-web.md). shadcn slots in cleanly as the visual layer on top of the Tailwind decision we already made. Radix UI underneath gives industry-standard accessibility — the same primitive layer that powers most modern React component libraries.

AI tool training data is a real solo-dev velocity factor. shadcn is the dominant assumption in modern React+TS examples; that compounds across Phase 3+ ticket work.

## What would change our mind

- HelpME2C pivots toward heavy admin/dashboard work where MUI's component surface dominates (DataGrid, DatePicker, Autocomplete, charts) — switch to MUI as the primary system at that point.
- shadcn changes ownership or maintenance in a way that compromises the project — fall back to bare Radix UI primitives or pick up Park UI.
- A critical accessibility requirement emerges that shadcn's defaults don't meet — fork the relevant file (the code-ownership model is exactly the escape hatch for this).
- Tailwind itself gets deprecated as our styling choice (i.e. [ADR-0014](0014-styling-approach-web.md) is superseded) — re-evaluate the entire component-styling stack together.

## Related

- ADR-0002 (frontend framework — Next.js)
- ADR-0014 (styling approach — Tailwind v4)
- ADR-0015 (API deployment shape — tRPC inside Next.js)
- apps/web/CLAUDE.md §banned-patterns (no runtime CSS-in-JS — Emotion via `@mui/x-data-grid` is the only carve-out)
- packages/ui/CLAUDE.md §what-this-is-not (shadcn components live in apps/web/src/components/ui/, NOT in packages/ui)
- PROJECT.md §Phase 1A scope (consumer-facing recommendation discovery)

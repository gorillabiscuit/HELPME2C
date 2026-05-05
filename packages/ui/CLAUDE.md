# packages/ui — package-specific CLAUDE.md

Inherits from root `CLAUDE.md`. Holds rules specific to the **web** React component library.

---

## What this is

React components designed for `apps/web` (Next.js, web React, `react-dom`).

Phase 1A scope: minimal cross-app primitives only (e.g. `<Mono>`). Most app-specific composed components (TitleCard, RecommendationList, etc) live in `apps/web/src/components/`. shadcn/ui primitives (per [ADR-0016](../../docs/decisions/0016-component-library.md)) live in `apps/web/src/components/ui/` per shadcn convention, NOT here. This package is reserved for things genuinely shared across apps or with no good app-level home.

## What this is NOT

- **React Native components** — those live in `packages/mobile-ui` (Phase 2 mobile work). Web React JSX is incompatible with React Native.
- **Pure logic / hooks / types** — those live in `packages/shared` (platform-agnostic).
- **App-specific screens or composed UIs** — those live in the consuming app (`apps/web/src/components/`).
- **Style systems independent of Tailwind** — Tailwind v4 is the styling system per ADR-0014. CSS modules are an escape hatch; runtime CSS-in-JS is banned.

## Imports allowed

- `react`, `react-dom` (declared as dependencies)
- `@helpme2c/shared` (types, hooks, utils)
- Tailwind utility classes via `className`

## Imports forbidden

- `react-native`, `expo-*` — wrong platform.
- `next/*` — components must be framework-agnostic React. Next.js conveniences (`next/link`, `next/image`) get re-wrapped in `apps/web` if needed, not pulled in here.
- `@helpme2c/ml`, `@helpme2c/web`, `apps/*` — wrong direction in the dependency graph.

## Server vs Client Components

Components default to **presentational** and work in either Server or Client Component contexts in the consumer. Components that use hooks (`useState`, `useEffect`, etc) MUST start with `'use client'` so consumers don't accidentally use them where they don't work.

## Tests

Component tests use Vitest + React Testing Library + jsdom — infrastructure to be added when the first non-trivial component lands. Trivial Phase 2 bootstrap components (like `<Mono>`) ship without tests; typecheck + lint catch the failure modes that matter at this size.

---

_Refine as components accumulate._

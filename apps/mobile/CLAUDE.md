# apps/mobile — package-specific CLAUDE.md

> **Phase 2 stub.** No mobile work in Phase 1A. This directory exists so the monorepo structure is correct from day 1, but **do not write code here until Phase 2 is officially opened.**

---

## What this will be (Phase 2)

Expo SDK 52+ (React Native 0.76+), Expo Router v4 for navigation, TypeScript strict, deployed via EAS Build. Consumes the same tRPC API as `apps/web`.

## Why a separate `mobile-ui` package

Web React and React Native have different rendering primitives, gesture handling, animation libraries (Reanimated 3 on RN, no equivalent on web), styling (StyleSheet vs CSS), navigation patterns. Trying to share UI components across is a productivity tar-pit.

What WILL be shared (in `packages/shared`):

- Types
- Zod schemas
- Pure-logic hooks (no platform APIs)
- Utility functions
- API client setup (tRPC client config, query hooks via TanStack Query — adapted per platform but same procedures)

What WILL NOT be shared:

- UI components
- Styling
- Navigation
- Animation
- Form components

## Imports allowed (when this becomes real)

- From `packages/shared` — types, schemas, hooks, utils
- From `packages/mobile-ui` — RN-specific components (will exist when mobile starts)
- From `packages/ml` — recommendation engine module (consumed via tRPC, NOT directly)
- React Native / Expo libraries

## Imports forbidden

- From `packages/ui` — that's web React. Different React.
- From `apps/web` — never cross-app.
- DOM-specific libraries.

---

_Do not write code here in Phase 1A. Phase 2 reopens this stub._

# packages/mobile-ui — package-specific CLAUDE.md

> **FROZEN — Phase 2 stub.** No code in Phase 1A. The "separate package from
> `packages/ui`" decision is **provisional** — written without a real RN
> consumer. Per reviewer feedback (2026-05-07): "wait for the second real
> consumer before extracting." When Phase 2 opens, re-evaluate against a real
> RN screen; if there's no clear win, fold this back into the consuming app
> rather than preserving the package out of inertia. **Do not write code here
> until Phase 2 mobile work is officially opened.** See
> [README.md](./README.md) for the freeze rationale.

---

## What this will be (Phase 2)

The React Native parallel of [`packages/ui`](../ui/CLAUDE.md). Components designed for React Native (`react-native`, Expo, Reanimated 3) — same role for `apps/mobile` that `packages/ui` plays for `apps/web`.

## Why a separate package from `packages/ui`

React Native components and web React components share the React API but render to fundamentally different primitives (`<View>` vs `<div>`, `StyleSheet` vs CSS classes, `Pressable` vs `<button>`, etc). Attempting to share component implementations across platforms is a known productivity tar-pit per [apps/mobile/CLAUDE.md](../../apps/mobile/CLAUDE.md).

The shared contract lives in [`packages/shared`](../shared/CLAUDE.md): types, Zod schemas, pure-logic hooks, API client setup. The platform-specific UI lives here (mobile) or in `packages/ui` (web), never crossing.

## Imports allowed (when this becomes real)

- `react`, `react-native`, `expo-*` (peer or runtime deps)
- `@helpme2c/shared` — types, schemas, hooks, utils
- React Native ecosystem libraries (Reanimated, Gesture Handler, Skia, etc)

## Imports forbidden

- `react-dom`, `next/*`, any DOM API — wrong platform.
- `@helpme2c/ui` — that's web React, different rendering primitives.
- `@helpme2c/ml` — never imported by UI packages; consumed via tRPC by the app layer.
- `apps/*` — never cross-app.

---

_Do not write code here in Phase 1A. Phase 2 mobile work reopens this stub with a real `package.json`, Expo + RN deps, and the first component._

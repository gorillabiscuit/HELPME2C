# packages/mobile-ui

> **Frozen — Phase 2.** No source, no `package.json`, no real RN consumer.
> The "separate package from `packages/ui`" decision is **provisional**
> until [`apps/mobile`](../../apps/mobile/) exists and demonstrates the
> need.

This directory exists only as a placeholder referenced by root [CLAUDE.md §2](../../CLAUDE.md)
and by [`apps/mobile/CLAUDE.md`](../../apps/mobile/CLAUDE.md). There is
intentionally nothing else here.

## Why this might be wrong

The case for splitting RN UI into its own package (separate from
`packages/ui` for web) is real — different rendering primitives, different
styling, different gesture handling. But that case was made on paper,
without a real RN consumer to test it against. When `apps/mobile` becomes
real, the right structure may be:

- This separate package, as currently planned, OR
- A single `packages/ui` with a platform-detection layer (some teams ship
  this way), OR
- No shared UI package at all — components inlined in each app until a
  second consumer demonstrates a need

Per reviewer feedback (2026-05-07): "wait for the second real consumer
before extracting." This package is the *first* attempted extraction; if
mobile arrives and there's no clear win, **fold this back into the
consuming app** rather than preserving the package out of inertia.

## What happens when Phase 2 opens

1. Re-evaluate the case for this package against a real RN screen, not
   against the description in `CLAUDE.md`.
2. If kept: add `package.json`, peer-dep on `react-native` + Expo SDK,
   first component.
3. If killed: delete the directory and update root CLAUDE.md §2 to remove
   the now-defunct invariant.

Until then, do not write code here.

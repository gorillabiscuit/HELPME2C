# apps/mobile

> **Frozen — Phase 2.** No source, no `package.json`, no real RN consumer.
> Boundaries described here and in `CLAUDE.md` are **provisional** until a
> real Expo / React Native app exists.

This directory exists only as a placeholder so that root [CLAUDE.md §2](../../CLAUDE.md)'s
cross-package import-direction invariant has a referenceable path. There is
intentionally nothing else here.

## Why frozen and not deleted

Per reviewer feedback (2026-05-07): "abstractions designed for one consumer
always are wrong." The boundaries we'd enforce based on this stub were
written without a real Expo / RN consumer to validate them against —
designing the integration before the integrating system exists is a known
way to lock in incorrect assumptions.

Killing the directory entirely would mean re-creating it (with the same
provisional boundaries) when Phase 2 opens. Freezing keeps the placeholder
addressable but visibly marks it as not-load-bearing.

## What happens when Phase 2 opens

1. Re-read [CLAUDE.md §2](../../CLAUDE.md) and the mobile-related lines in
   it. **Treat them as a hypothesis to validate, not a contract to obey.**
2. Initialise this directory as an Expo app (SDK current at the time, not
   the SDK number guessed at in `CLAUDE.md` here).
3. Add the first real RN screen consuming `packages/shared`.
4. Adjust the cross-package import boundaries based on what that real
   consumer needs — split `packages/mobile-ui` only if there's a clear
   second consumer; otherwise inline.

Until then, do not write code here.

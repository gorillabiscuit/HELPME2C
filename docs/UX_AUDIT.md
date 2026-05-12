# UX Audit — superseded

**Status:** historical · superseded 2026-05-12 by the rated-taste reframe.

This doc captured an earlier "unified-taste / favourites" model that was
shipped, then rolled back when the user identified that:

1. "Love this without watching" is logically incoherent.
2. Favouriting on top of rating is redundant.
3. Without ranking, there's no product differentiator to show alpha
   testers.

The replacement — the **rated-taste model** with Elo pairwise + manual
drag ranking, both brought forward from Phase 1B into v1A — is what's
now live. See:

- `apps/web/src/components/taste-workspace.tsx` for the `/taste` UI
  (Ranked / Compare / Add tabs).
- `apps/web/src/server/routers/watch.ts` for the procedures
  (taste, setRankedOrder, recordPairwise, getPairwisePair).
- `apps/web/src/inngest/functions/recommend.ts` for the engine
  integration (Elo influences effective rating).
- ROADMAP.md for the updated scope.

This file can be deleted once the rated-taste UI has settled in
production.

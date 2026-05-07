import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { titles, userRecommendations } from '../schema';
import { resolveInternalUserId } from '../lib/resolve-user';
import { protectedProcedure, router } from '../trpc';

// Read path for pre-computed personal recommendations. Per ADR-0008 the
// scoring runs offline (Inngest job — apps/web/src/inngest/functions/recommend.ts);
// per ADR-0013 the cache is a single Postgres row per user with a JSONB
// payload. This procedure does the read + a JOIN to titles for display data.
//
// Empty result is the same shape regardless of cause:
//   - User has no row in users (auth race after signup): []
//   - User has no row in user_recommendations (cron hasn't run yet): []
//   - User's payload has empty items (cold-start with no anchors): []
//   - Payload has unrecognised schemaVersion (forward-incompat from a
//     future writer): [] (the caller should refresh; the next nightly cron
//     will overwrite with a current-version payload)
//
// The home page distinguishes "you have no anchors yet, go pick some" from
// "your recs are still computing" by also looking at the user's anchor
// count via watch.list — this procedure stays simple and just returns
// what's cached.
export const recommendationsRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(200).optional().default(20),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20;

      const internalUserId = await resolveInternalUserId(ctx.db, ctx.userId);
      if (!internalUserId) return { items: [], computedAt: null };

      const [row] = await ctx.db
        .select()
        .from(userRecommendations)
        .where(eq(userRecommendations.userId, internalUserId))
        .limit(1);

      if (!row) return { items: [], computedAt: null };

      const { payload } = row;
      // Schema-version guard. v1 is the current shape; anything else means
      // a writer from a future commit ran ahead of this reader. Returning
      // [] makes the home page render the "computing" state until the next
      // cron writes a v1-compatible payload.
      if (payload.schemaVersion !== 1) {
        return { items: [], computedAt: row.computedAt };
      }

      // Slice to top-N first, then resolve title metadata. Fetching titles
      // for the full 200-item payload would waste a JOIN since the home
      // page only renders ~20 cards.
      const topItems = payload.items.slice(0, limit);
      if (topItems.length === 0) {
        return { items: [], computedAt: row.computedAt };
      }

      const titleIds = topItems.map((item) => item.titleId);
      const titleRows = await ctx.db
        .select({
          id: titles.id,
          title: titles.title,
          mediaType: titles.mediaType,
          releaseYear: titles.releaseYear,
          posterUrl: titles.posterUrl,
        })
        .from(titles)
        .where(inArray(titles.id, titleIds));

      // Map for O(1) lookup; reconstruct rank order from the cached payload.
      // Titles that have been deleted between cache write and read are
      // silently dropped — better to show 19 instead of 20 than to show a
      // broken link.
      const titleById = new Map(titleRows.map((t) => [t.id, t]));
      const items = topItems.flatMap((item) => {
        const title = titleById.get(item.titleId);
        if (!title) return [];
        return [{ ...title, score: item.score }];
      });

      return {
        items,
        computedAt: row.computedAt,
      };
    }),
});

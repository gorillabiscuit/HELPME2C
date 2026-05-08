import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import {
  streamingAvailability,
  titles,
  userRecommendations,
  userStreamingProviders,
} from '../schema';
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
          country: z
            .string()
            .regex(/^[A-Z]{2}$/i, 'expected ISO 3166-1 alpha-2')
            .optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20;
      const country = input?.country?.toUpperCase() ?? 'US';

      const internalUserId = await resolveInternalUserId(ctx.db, ctx.userId);
      if (!internalUserId) return { items: [], computedAt: null, filtered: false };

      const [row] = await ctx.db
        .select()
        .from(userRecommendations)
        .where(eq(userRecommendations.userId, internalUserId))
        .limit(1);

      if (!row) return { items: [], computedAt: null, filtered: false };

      const { payload } = row;
      // Schema-version guard. v1 is the current shape; anything else means
      // a writer from a future commit ran ahead of this reader. Returning
      // [] makes the home page render the "computing" state until the next
      // cron writes a v1-compatible payload.
      if (payload.schemaVersion !== 1) {
        return { items: [], computedAt: row.computedAt, filtered: false };
      }

      // Connected-providers filter per ADR-0021: post-ranking, country-strict,
      // never a ranking signal. If the user has 0 providers selected,
      // skip the filter entirely (their selection is "I don't care, show
      // everything"). With 1+ selected, restrict to titles that have a
      // streaming_availability row in the request country with one of those
      // provider_ids — counts both type='streaming' and type='free' as
      // available; rent/buy don't qualify since the user pays per title.
      const connectedRows = await ctx.db
        .select({ providerId: userStreamingProviders.providerId })
        .from(userStreamingProviders)
        .where(eq(userStreamingProviders.userId, internalUserId));
      const connectedProviderIds = connectedRows.map((r) => r.providerId);
      const filterActive = connectedProviderIds.length > 0;

      // Filter the FULL 200-item payload before slicing — otherwise top-20
      // could exclude all available titles and the user would see fewer
      // recs than they should. The full-payload streaming join is a single
      // IN-list query, ~200 ids, fast.
      let allowedTitleIds: Set<string> | null = null;
      if (filterActive && payload.items.length > 0) {
        const allItemIds = payload.items.map((i) => i.titleId);
        const matchingRows = await ctx.db
          .selectDistinct({ titleId: streamingAvailability.titleId })
          .from(streamingAvailability)
          .where(
            and(
              inArray(streamingAvailability.titleId, allItemIds),
              eq(streamingAvailability.countryCode, country),
              inArray(streamingAvailability.type, ['streaming', 'free']),
              inArray(streamingAvailability.providerId, connectedProviderIds),
            ),
          );
        allowedTitleIds = new Set(matchingRows.map((r) => r.titleId));
      }

      const filteredItems = allowedTitleIds
        ? payload.items.filter((i) => allowedTitleIds!.has(i.titleId))
        : payload.items;

      const topItems = filteredItems.slice(0, limit);
      if (topItems.length === 0) {
        return { items: [], computedAt: row.computedAt, filtered: filterActive };
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
        filtered: filterActive,
      };
    }),
});

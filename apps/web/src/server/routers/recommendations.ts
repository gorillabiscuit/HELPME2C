import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import {
  recFeedback,
  streamingAvailability,
  titles,
  userRecommendations,
  userStreamingProviders,
  watchEntries,
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

      // Default filter context — populated only when the user has saved
      // 1+ providers AND payload v1 logic actually ran. The dashboard reads
      // this to render the visible "filtering by N services, X hidden" line.
      const emptyFilter = {
        active: false,
        providers: [] as Array<{
          providerId: string;
          providerName: string;
          providerLogoUrl: string | null;
        }>,
        hiddenCount: 0,
      };

      const internalUserId = await resolveInternalUserId(ctx.db, ctx.userId);
      if (!internalUserId) {
        return { items: [], computedAt: null, filtered: false, filter: emptyFilter };
      }

      const [row] = await ctx.db
        .select()
        .from(userRecommendations)
        .where(eq(userRecommendations.userId, internalUserId))
        .limit(1);

      if (!row) {
        return { items: [], computedAt: null, filtered: false, filter: emptyFilter };
      }

      const { payload } = row;
      // Schema-version guard. v1 is the current shape; anything else means
      // a writer from a future commit ran ahead of this reader. Returning
      // [] makes the home page render the "computing" state until the next
      // cron writes a v1-compatible payload.
      if (payload.schemaVersion !== 1) {
        return { items: [], computedAt: row.computedAt, filtered: false, filter: emptyFilter };
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

      // Read-time exclusion: titles dismissed via rec_feedback OR already
      // in the user's library since the last recompute. Both are user
      // actions that should remove the item from their dashboard
      // immediately, not wait for the nightly cron.
      const [dismissedRows, libraryRows] = await Promise.all([
        ctx.db
          .select({ titleId: recFeedback.titleId })
          .from(recFeedback)
          .where(and(eq(recFeedback.userId, internalUserId), eq(recFeedback.dismissed, true))),
        ctx.db
          .select({ titleId: watchEntries.titleId })
          .from(watchEntries)
          .where(eq(watchEntries.userId, internalUserId)),
      ]);
      const excludedTitleIds = new Set<string>([
        ...dismissedRows.map((r) => r.titleId),
        ...libraryRows.map((r) => r.titleId),
      ]);

      const streamingFiltered = allowedTitleIds
        ? payload.items.filter((i) => allowedTitleIds!.has(i.titleId))
        : payload.items;
      const filteredItems = streamingFiltered.filter((i) => !excludedTitleIds.has(i.titleId));
      // hiddenCount is intentionally scoped to the STREAMING filter only,
      // not dismissed/library exclusions. The dashboard renders this under
      // the "Filtering by [provider chips]" row — implying that this is
      // what the providers are hiding. Mixing in dismissed/library would
      // be misleading: a user with 0 providers selected but 50 library
      // items would otherwise see "50 hidden by my services" without
      // having selected any.
      const hiddenCount = allowedTitleIds ? payload.items.length - streamingFiltered.length : 0;

      // Fetch provider display metadata only when the filter is active.
      // Pulled from streaming_availability (any country, any type) since
      // the same provider_id has the same name+logo everywhere — first row
      // wins. Saves us a separate denormalised store of provider metadata.
      const providersForFilter: Array<{
        providerId: string;
        providerName: string;
        providerLogoUrl: string | null;
      }> = [];
      if (filterActive) {
        const metaRows = await ctx.db
          .selectDistinctOn([streamingAvailability.providerId], {
            providerId: streamingAvailability.providerId,
            providerName: streamingAvailability.providerName,
            providerLogoUrl: streamingAvailability.providerLogoUrl,
          })
          .from(streamingAvailability)
          .where(inArray(streamingAvailability.providerId, connectedProviderIds));
        // Preserve the user's saved order so chips stay stable across reads.
        const byId = new Map(metaRows.map((r) => [r.providerId, r]));
        for (const id of connectedProviderIds) {
          const meta = byId.get(id);
          if (meta) providersForFilter.push(meta);
        }
      }

      const filterContext = filterActive
        ? { active: true as const, providers: providersForFilter, hiddenCount }
        : emptyFilter;

      const topItems = filteredItems.slice(0, limit);
      if (topItems.length === 0) {
        return {
          items: [],
          computedAt: row.computedAt,
          filtered: filterActive,
          filter: filterContext,
        };
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
        filter: filterContext,
      };
    }),
});

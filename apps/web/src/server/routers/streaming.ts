import { and, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { streamingAvailability, userStreamingProviders } from '../schema';
import { resolveInternalUserId } from '../lib/resolve-user';
import { protectedProcedure, router } from '../trpc';

// User-side streaming endpoints — list available providers in the user's
// country, read/save which ones they subscribe to. Per ADR-0021 these
// drive a post-ranking FILTER on recs, never a ranking signal.

const COUNTRY_REGEX = /^[A-Z]{2}$/;

export const streamingRouter = router({
  // Catalogue of providers shown to the user on the settings page —
  // de-duplicated by provider_id, scoped to the user's country, ordered
  // by how many titles they currently cover (higher = more useful pick).
  // Caps at 60 — beyond that the picker becomes a wall.
  //
  // Filters to type ∈ {streaming, free} because subscription / ad-supported
  // services are what users "have"; rent and buy are transactional and
  // don't make sense as a per-user toggle.
  listProviders: protectedProcedure
    .input(
      z
        .object({
          country: z
            .string()
            .regex(COUNTRY_REGEX, 'expected ISO 3166-1 alpha-2')
            .optional()
            .default('US'),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const country = (input?.country ?? 'US').toUpperCase();
      const rows = await ctx.db
        .select({
          providerId: streamingAvailability.providerId,
          providerName: streamingAvailability.providerName,
          providerLogoUrl: streamingAvailability.providerLogoUrl,
          titleCount: count(sql`distinct ${streamingAvailability.titleId}`),
        })
        .from(streamingAvailability)
        .where(
          and(
            eq(streamingAvailability.countryCode, country),
            inArray(streamingAvailability.type, ['streaming', 'free']),
          ),
        )
        .groupBy(
          streamingAvailability.providerId,
          streamingAvailability.providerName,
          streamingAvailability.providerLogoUrl,
        )
        .orderBy(desc(count(sql`distinct ${streamingAvailability.titleId}`)))
        .limit(60);
      return { country, providers: rows };
    }),

  // The user's currently-saved provider_ids. Empty array if they haven't
  // configured any yet. Settings page uses this to mark checkboxes;
  // recommendations.list uses it to decide whether to apply the filter.
  listMyProviders: protectedProcedure.query(async ({ ctx }) => {
    const internalUserId = await resolveInternalUserId(ctx.db, ctx.userId);
    if (!internalUserId) return { providerIds: [] };
    const rows = await ctx.db
      .select({ providerId: userStreamingProviders.providerId })
      .from(userStreamingProviders)
      .where(eq(userStreamingProviders.userId, internalUserId));
    return { providerIds: rows.map((r) => r.providerId) };
  }),

  // Replace the user's saved provider set in one shot. Simpler than
  // diffing add/remove and matches the settings-page UX (user submits
  // their full chosen set on save). DELETE-then-INSERT in two statements
  // — the Neon HTTP driver doesn't support multi-statement transactions,
  // but the worst-case mid-call interleaving is a brief window where the
  // user has no providers set; the next save fully overwrites either way.
  saveProviders: protectedProcedure
    .input(
      z.object({
        providerIds: z.array(z.string().min(1)).max(60),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const internalUserId = await resolveInternalUserId(ctx.db, ctx.userId);
      if (!internalUserId) throw new Error('user row missing');

      // Dedupe — the form might submit an id twice if a user re-checks fast.
      const unique = Array.from(new Set(input.providerIds));

      await ctx.db
        .delete(userStreamingProviders)
        .where(eq(userStreamingProviders.userId, internalUserId));

      if (unique.length > 0) {
        await ctx.db.insert(userStreamingProviders).values(
          unique.map((providerId) => ({
            userId: internalUserId,
            providerId,
          })),
        );
      }

      return { saved: unique.length };
    }),
});

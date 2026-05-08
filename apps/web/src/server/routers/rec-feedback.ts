import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { recFeedback, recFeedbackRatingEnum } from '../schema';
import { resolveInternalUserId } from '../lib/resolve-user';
import { protectedProcedure, router } from '../trpc';

// Per-rec feedback writes. Rating is for future algorithm tuning;
// dismissed drives the dashboard read-time filter.
//
// Either field can be set independently — passing { dismissed: true }
// without a rating dismisses without rating, and vice versa. Omitted
// fields are left untouched on the existing row (partial update).

const ratingValues = recFeedbackRatingEnum.enumValues;

export const recFeedbackRouter = router({
  upsert: protectedProcedure
    .input(
      z
        .object({
          titleId: z.string().uuid(),
          rating: z.enum(ratingValues).nullable().optional(),
          dismissed: z.boolean().optional(),
        })
        .refine((data) => data.rating !== undefined || data.dismissed !== undefined, {
          message: 'at least one of rating or dismissed is required',
        }),
    )
    .mutation(async ({ ctx, input }) => {
      const internalUserId = await resolveInternalUserId(ctx.db, ctx.userId);
      if (!internalUserId) throw new Error('user row missing');

      // Build the partial update set — keep existing values for fields the
      // caller didn't provide. Same pattern as watch.upsert.
      const updateSet: { rating?: typeof input.rating; dismissed?: boolean; updatedAt: Date } = {
        updatedAt: new Date(),
      };
      if (input.rating !== undefined) updateSet.rating = input.rating;
      if (input.dismissed !== undefined) updateSet.dismissed = input.dismissed;

      await ctx.db
        .insert(recFeedback)
        .values({
          userId: internalUserId,
          titleId: input.titleId,
          rating: input.rating ?? null,
          dismissed: input.dismissed ?? false,
        })
        .onConflictDoUpdate({
          target: [recFeedback.userId, recFeedback.titleId],
          set: updateSet,
        });

      return { ok: true };
    }),

  // Convenience reader — used when we want to know "is this dismissed?"
  // for a single title page or similar. Not currently consumed; included
  // for symmetry with the upsert and so future surfaces don't need to
  // re-derive the schema.
  get: protectedProcedure
    .input(z.object({ titleId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const internalUserId = await resolveInternalUserId(ctx.db, ctx.userId);
      if (!internalUserId) return null;
      const [row] = await ctx.db
        .select({
          rating: recFeedback.rating,
          dismissed: recFeedback.dismissed,
        })
        .from(recFeedback)
        .where(and(eq(recFeedback.userId, internalUserId), eq(recFeedback.titleId, input.titleId)))
        .limit(1);
      return row ?? null;
    }),
});

import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { recFeedback, recFeedbackRatingEnum } from '../schema';
import { resolveInternalUserId } from '../lib/resolve-user';
import { protectedProcedure, router } from '../trpc';

// Per-rec feedback writes. Three independent flags on (user, title):
//   - rating: future algorithm-tuning enum (terrible…terrific)
//   - dismissed: "Not interested" — engine excludes from future recs
//   - unfamiliar: "Don't know it" — soft signal, NOT used for exclusion;
//     just recorded for analytics + future learning. Distinct from
//     dismissed: a dismissed title is "I know it and don't want it"
//     (real negative signal); an unfamiliar title is "I have no
//     opinion because I don't recognise it" (no signal).
//
// Each field independent — pass any subset. Omitted fields are left
// untouched on the existing row (partial update). At least one of the
// three must be set.

const ratingValues = recFeedbackRatingEnum.enumValues;

export const recFeedbackRouter = router({
  upsert: protectedProcedure
    .input(
      z
        .object({
          titleId: z.string().uuid(),
          rating: z.enum(ratingValues).nullable().optional(),
          dismissed: z.boolean().optional(),
          unfamiliar: z.boolean().optional(),
        })
        .refine(
          (data) =>
            data.rating !== undefined ||
            data.dismissed !== undefined ||
            data.unfamiliar !== undefined,
          { message: 'at least one of rating, dismissed, or unfamiliar is required' },
        ),
    )
    .mutation(async ({ ctx, input }) => {
      const internalUserId = await resolveInternalUserId(ctx.db, ctx.userId);
      if (!internalUserId) throw new Error('user row missing');

      // Build the partial update set — keep existing values for fields the
      // caller didn't provide. Same pattern as watch.upsert.
      const updateSet: {
        rating?: typeof input.rating;
        dismissed?: boolean;
        unfamiliar?: boolean;
        updatedAt: Date;
      } = {
        updatedAt: new Date(),
      };
      if (input.rating !== undefined) updateSet.rating = input.rating;
      if (input.dismissed !== undefined) updateSet.dismissed = input.dismissed;
      if (input.unfamiliar !== undefined) updateSet.unfamiliar = input.unfamiliar;

      await ctx.db
        .insert(recFeedback)
        .values({
          userId: internalUserId,
          titleId: input.titleId,
          rating: input.rating ?? null,
          dismissed: input.dismissed ?? false,
          unfamiliar: input.unfamiliar ?? false,
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
          unfamiliar: recFeedback.unfamiliar,
        })
        .from(recFeedback)
        .where(and(eq(recFeedback.userId, internalUserId), eq(recFeedback.titleId, input.titleId)))
        .limit(1);
      return row ?? null;
    }),

  // Returns every (titleId, dismissed, unfamiliar) row for the current
  // user. Used by /onboarding so the picker can hide titles the user has
  // already actioned via "Not interested" or "Don't know it" — the watch
  // entries alone aren't enough because those buttons only write here.
  list: protectedProcedure.query(async ({ ctx }) => {
    const internalUserId = await resolveInternalUserId(ctx.db, ctx.userId);
    if (!internalUserId) return [];
    return ctx.db
      .select({
        titleId: recFeedback.titleId,
        dismissed: recFeedback.dismissed,
        unfamiliar: recFeedback.unfamiliar,
      })
      .from(recFeedback)
      .where(eq(recFeedback.userId, internalUserId));
  }),
});

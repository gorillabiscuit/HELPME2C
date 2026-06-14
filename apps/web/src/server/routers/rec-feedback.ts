import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { recFeedback, recFeedbackRatingEnum } from '../schema';
import { resolveInternalUserId } from '../lib/resolve-user';
import { protectedProcedure, router } from '../trpc';

// Per-rec feedback writes. Three independent flags on (user, title):
//   - rating: future algorithm-tuning enum (terrible…terrific)
//   - dismissed: "Not interested" — engine excludes from future recs
//   - unfamiliar: "Don't know it" — soft signal, NOT used for exclusion
//   - dismissalReason: structured reason chip picked after "Not interested"
//
// Special case for dismissalReason === 'not_in_mood': sets dismissed=false
// and dismissedUntil=7 days from now. The title re-surfaces after the
// window without any further DB write. All other reasons set dismissed=true.
//
// Each field independent — pass any subset. Omitted fields are left
// untouched on the existing row (partial update). At least one of the
// three primary signals must be set.

const ratingValues = recFeedbackRatingEnum.enumValues;

const DISMISSAL_REASONS = [
  'too_dark',
  'too_violent',
  'not_in_mood',
  'already_seen',
  'not_my_thing',
] as const;

const NOT_IN_MOOD_SUPPRESSION_DAYS = 7;

export const recFeedbackRouter = router({
  upsert: protectedProcedure
    .input(
      z
        .object({
          titleId: z.string().uuid(),
          rating: z.enum(ratingValues).nullable().optional(),
          dismissed: z.boolean().optional(),
          unfamiliar: z.boolean().optional(),
          dismissalReason: z.enum(DISMISSAL_REASONS).optional(),
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

      // Compute derived dismissal fields.
      // not_in_mood: title is suppressed temporarily (dismissed_until), not
      // permanently excluded (dismissed stays false). All other reasons set
      // dismissed=true with no expiry.
      let resolvedDismissed = input.dismissed;
      let dismissedUntil: Date | null = null;
      if (input.dismissed && input.dismissalReason === 'not_in_mood') {
        resolvedDismissed = false;
        dismissedUntil = new Date(Date.now() + NOT_IN_MOOD_SUPPRESSION_DAYS * 24 * 60 * 60 * 1000);
      }

      // Build the partial update set — keep existing values for fields the
      // caller didn't provide. Same pattern as watch.upsert.
      const updateSet: {
        rating?: typeof input.rating;
        dismissed?: boolean;
        unfamiliar?: boolean;
        dismissalReason?: (typeof DISMISSAL_REASONS)[number] | null;
        dismissedUntil?: Date | null;
        updatedAt: Date;
      } = {
        updatedAt: new Date(),
      };
      if (input.rating !== undefined) updateSet.rating = input.rating;
      if (resolvedDismissed !== undefined) updateSet.dismissed = resolvedDismissed;
      if (input.unfamiliar !== undefined) updateSet.unfamiliar = input.unfamiliar;
      if (input.dismissalReason !== undefined) {
        updateSet.dismissalReason = input.dismissalReason;
        updateSet.dismissedUntil = dismissedUntil;
      }

      await ctx.db
        .insert(recFeedback)
        .values({
          userId: internalUserId,
          titleId: input.titleId,
          rating: input.rating ?? null,
          dismissed: resolvedDismissed ?? false,
          unfamiliar: input.unfamiliar ?? false,
          dismissalReason: input.dismissalReason ?? null,
          dismissedUntil,
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

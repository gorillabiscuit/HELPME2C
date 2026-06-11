import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { currentUser } from '@clerk/nextjs/server';
import {
  pairwiseComparisons,
  privacyLevelEnum,
  recFeedback,
  userPreferences,
  userRecommendations,
  users,
  watchEntries,
} from '../schema';
import { ensureUserFromClerk } from '../lib/ensure-user';
import { router, protectedProcedure } from '../trpc';

// Public/private only at this surface. Friends-only stays in the DB enum
// (Phase 1B social graph) but isn't selectable until that ships.
const settableDefaultPrivacySchema = z.enum(['public', 'private']);
const privacySchema = z.enum(privacyLevelEnum.enumValues);

export const meRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.select().from(users).where(eq(users.clerkId, ctx.userId)).limit(1);
    return rows[0] ?? null;
  }),

  // Fallback path: upserts the current user's DB row from Clerk's source-of-truth.
  // The Clerk user.created/user.updated webhook is the primary path (sets the
  // dbSynced session-token claim after upsert so this fallback is skipped on
  // subsequent renders). This mutation still exists for the brief window after
  // first signup before the webhook lands, and as a safety net if webhook
  // delivery ever fails.
  ensure: protectedProcedure.mutation(async () => {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    return ensureUserFromClerk({
      id: clerkUser.id,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      publicMetadata: clerkUser.publicMetadata,
    });
  }),

  // Sets the default privacy applied to NEW watch entries when the user
  // doesn't pick one explicitly. Existing entries are NOT updated — the
  // user retains per-entry control and we never silently change visibility
  // of already-saved data (ADR-0012: surprising visibility changes are a
  // privacy bug).
  //
  // Accepts only 'public' | 'private' even though the DB enum also has
  // 'friends'; the friends-only path is blocked on the Phase 1B social
  // graph and shouldn't be settable yet. `privacy` schema (full enum) is
  // re-exported below for callers that need it (the watch.upsert input
  // already validates against it server-side).
  setDefaultPrivacy: protectedProcedure
    .input(z.object({ defaultPrivacy: settableDefaultPrivacySchema }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(users)
        .set({ defaultPrivacy: input.defaultPrivacy, updatedAt: new Date() })
        .where(eq(users.clerkId, ctx.userId))
        .returning({ defaultPrivacy: users.defaultPrivacy });

      if (!row) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User row not found — was me.ensure called for this session?',
        });
      }
      return row;
    }),

  // Wipe the user's full taste profile and watch history. Deletes:
  //   - All watch entries (anchor picks from onboarding + manual tracking)
  //   - User preference vector (insight slugs, personality axes)
  //   - All rec feedback (dismissed / unfamiliar signals)
  //   - All computed recommendations (stale after the wipe)
  //   - All pairwise comparisons (Elo taste-ranking data)
  //
  // The user's account, settings (privacy, audio prefs, country, household)
  // and group memberships are preserved — only the taste/watch data is removed.
  //
  // No anonymous signal preservation is done here (unlike full account
  // deletion in /api/account/delete). A taste reset is a deliberate
  // "start over" gesture; the user is still present, so preserving
  // anonymised signal from their old profile would ghost-pollute future
  // rec training. The data is hard-deleted.
  resetTasteData: protectedProcedure.mutation(async ({ ctx }) => {
    const [userRow] = await ctx.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkId, ctx.userId))
      .limit(1);

    if (!userRow) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User row not found — was me.ensure called for this session?',
      });
    }

    const userId = userRow.id;

    // Run all deletes in parallel — each is independent.
    await Promise.all([
      ctx.db.delete(watchEntries).where(eq(watchEntries.userId, userId)),
      ctx.db.delete(userPreferences).where(eq(userPreferences.userId, userId)),
      ctx.db.delete(recFeedback).where(eq(recFeedback.userId, userId)),
      ctx.db.delete(userRecommendations).where(eq(userRecommendations.userId, userId)),
      ctx.db.delete(pairwiseComparisons).where(eq(pairwiseComparisons.userId, userId)),
    ]);
  }),

  // Whether trailer-preview modals start with audio on. Mirrors the
  // schema field on users.preview_audio_enabled. The modal also has a
  // per-session mute toggle that doesn't write back here.
  setPreviewAudioEnabled: protectedProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(users)
        .set({ previewAudioEnabled: input.enabled, updatedAt: new Date() })
        .where(eq(users.clerkId, ctx.userId))
        .returning({ previewAudioEnabled: users.previewAudioEnabled });

      if (!row) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User row not found — was me.ensure called for this session?',
        });
      }
      return row;
    }),

  // Save birth year, gender, and streaming-filter opt-in collected during
  // onboarding. All fields are optional — partial updates are safe because
  // we only set whichever fields are provided.
  updateProfile: protectedProcedure
    .input(
      z.object({
        birthYear: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
        gender: z.enum(['male', 'female', 'non-binary', 'prefer_not_to_say']).optional(),
        filterProviders: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const patch: Record<string, unknown> = { updatedAt: new Date() };
      if (input.birthYear !== undefined) patch.birthYear = input.birthYear;
      if (input.gender !== undefined) patch.gender = input.gender;
      if (input.filterProviders !== undefined) patch.filterProviders = input.filterProviders;

      const [row] = await ctx.db
        .update(users)
        .set(patch)
        .where(eq(users.clerkId, ctx.userId))
        .returning({
          birthYear: users.birthYear,
          gender: users.gender,
          filterProviders: users.filterProviders,
        });

      if (!row) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User row not found — was me.ensure called for this session?',
        });
      }
      return row;
    }),
});

export { privacySchema };

import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { currentUser } from '@clerk/nextjs/server';
import { privacyLevelEnum, users } from '../schema';
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
});

export { privacySchema };

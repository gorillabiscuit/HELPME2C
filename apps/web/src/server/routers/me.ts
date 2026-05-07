import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { currentUser } from '@clerk/nextjs/server';
import { users } from '../schema';
import { ensureUserFromClerk } from '../lib/ensure-user';
import { router, protectedProcedure } from '../trpc';

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
});

import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { currentUser } from '@clerk/nextjs/server';
import { users } from '../schema';
import { router, protectedProcedure } from '../trpc';

export const meRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.select().from(users).where(eq(users.clerkId, ctx.userId)).limit(1);
    return rows[0] ?? null;
  }),

  // Upserts the current user's DB row from Clerk's source-of-truth data.
  // Idempotent (ON CONFLICT updates), safe to call on every signed-in render.
  // Pulls from currentUser() rather than accepting input so the client can't
  // forge displayName/region/ageVerified state.
  ensure: protectedProcedure.mutation(async ({ ctx }) => {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    const displayName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null;
    const region = clerkUser.publicMetadata.region ?? 'eu';
    const ageVerified = clerkUser.publicMetadata.ageVerified ?? false;
    const ageVerifiedAt = clerkUser.publicMetadata.ageVerifiedAt
      ? new Date(clerkUser.publicMetadata.ageVerifiedAt)
      : null;

    const [row] = await ctx.db
      .insert(users)
      .values({
        clerkId: ctx.userId,
        displayName,
        region,
        ageVerified,
        ageVerifiedAt,
      })
      .onConflictDoUpdate({
        target: users.clerkId,
        set: {
          displayName,
          region,
          ageVerified,
          ageVerifiedAt,
          updatedAt: new Date(),
        },
      })
      .returning();

    return row;
  }),
});

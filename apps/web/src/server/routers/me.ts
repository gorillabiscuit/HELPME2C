import { eq } from 'drizzle-orm';
import { users } from '../schema';
import { router, protectedProcedure } from '../trpc';

export const meRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.select().from(users).where(eq(users.clerkId, ctx.userId)).limit(1);
    return rows[0] ?? null;
  }),
});
